// src/app/api/response/route.ts — Ruta PÚBLICA
import { NextRequest } from "next/server";
import { withPublicRateLimit, ok, notFound, err } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { submitResponseSchema } from "@/lib/validations";
import { hashIp, auditLog } from "@/lib/security";

// POST — enviar respuestas
export const POST = withPublicRateLimit(
  async (req, ip) => {
    const body = await req.json();
    const { token, answers } = submitResponseSchema.parse(body);

    const recipient = await prisma.recipient.findUnique({
      where: { token },
      include: {
        survey: { include: { questions: { include: { options: true } } } },
        response: true,
      },
    });

    if (!recipient) return notFound("Encuesta");
    if (recipient.tokenExpiresAt && recipient.tokenExpiresAt < new Date()) {
      return err("Este link expiró.", 410);
    }
    if (recipient.survey.status !== "ACTIVE") {
      return err("Esta encuesta ya no está disponible.", 410);
    }
    if (recipient.response && !recipient.survey.allowMultipleResponses) {
      return err("Ya respondiste esta encuesta.", 409);
    }

    const questionIds = new Set(
      recipient.survey.questions.map((q: { id: string }) => q.id)
    );
    for (const answer of answers) {
      if (!questionIds.has(answer.questionId)) return err("Datos inválidos.", 400);
    }

    // PrismaNeonHttp no soporta $transaction — operaciones secuenciales
    // 1. Crear la respuesta
    const response = await prisma.response.create({
      data: {
        recipientId: recipient.id,
        ipHash:      hashIp(ip),
        userAgent:   req.headers.get("user-agent")?.substring(0, 200) ?? undefined,
      },
    });

    // 2. Crear todas las answers
    await Promise.all(
      answers.map((a) =>
        prisma.answer.create({
          data: {
            responseId:       response.id,
            questionId:       a.questionId,
            textValue:        a.textValue        ?? null,
            numberValue:      a.numberValue      ?? null,
            selectedOptionId: a.selectedOptionId ?? null,
          },
        })
      )
    );

    // 3. Marcar recipient como completado
    await prisma.recipient.update({
      where: { id: recipient.id },
      data:  { status: "COMPLETED" },
    });

    await auditLog({
      action:   "RESPONSE_SUBMITTED",
      entity:   "Survey",
      entityId: recipient.surveyId,
      metadata: { recipientId: recipient.id },
      ip,
    });

    return ok({ thankYouMessage: recipient.survey.thankYouMessage });
  },
  { limit: 5, windowSeconds: 60 }
);

// GET — cargar datos de encuesta por token
export const GET = withPublicRateLimit(
  async (req, _ip) => {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token || token.length < 10) return err("Token inválido.", 400);

    const recipient = await prisma.recipient.findUnique({
      where: { token },
      include: {
        survey: {
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: { options: { orderBy: { order: "asc" } } },
            },
          },
        },
        response: { select: { id: true } },
      },
    });

    if (!recipient) return notFound("Encuesta");
    if (recipient.tokenExpiresAt && recipient.tokenExpiresAt < new Date()) {
      return err("Este link expiró.", 410);
    }
    if (recipient.survey.status !== "ACTIVE") {
      return err("Esta encuesta ya no está disponible.", 410);
    }
    if (recipient.response && !recipient.survey.allowMultipleResponses) {
      return err("Ya respondiste esta encuesta.", 409);
    }

    if (recipient.status === "SENT") {
      await prisma.recipient.update({
        where: { id: recipient.id },
        data:  { status: "OPENED", openedAt: new Date() },
      });
    }

    return ok({
      recipientName:    recipient.name,
      surveyTitle:      recipient.survey.title,
      surveyDescription: recipient.survey.description,
      showProgressBar:  recipient.survey.showProgressBar,
      thankYouMessage:  recipient.survey.thankYouMessage,
      questions: recipient.survey.questions.map((q: {
        id: string; type: string; text: string; isRequired: boolean; order: number;
        minValue: number | null; maxValue: number | null;
        minLabel: string | null; maxLabel: string | null;
        options: Array<{ id: string; text: string; order: number }>;
      }) => ({
        id: q.id, type: q.type, text: q.text,
        isRequired: q.isRequired, order: q.order,
        minValue: q.minValue, maxValue: q.maxValue,
        minLabel: q.minLabel, maxLabel: q.maxLabel,
        options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
      })),
    });
  },
  { limit: 30, windowSeconds: 60 }
);