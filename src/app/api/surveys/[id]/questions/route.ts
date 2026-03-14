// src/app/api/surveys/[id]/questions/route.ts
import { NextRequest } from "next/server";
import { withAuth, ok, notFound, forbidden, err } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { saveQuestionsSchema } from "@/lib/validations";
import { auditLog } from "@/lib/security";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  return withAuth(async (request, { session, ip }) => {
    const userId = (session.user as { id: string }).id;

    const survey = await prisma.survey.findUnique({ where: { id: params.id } });
    if (!survey) return notFound("Encuesta");
    if (survey.creatorId !== userId) return forbidden();

    const responseCount = await prisma.response.count({
      where: { recipient: { surveyId: params.id } },
    });
    if (responseCount > 0) {
      return err("No se pueden editar preguntas de una encuesta con respuestas.", 409);
    }

    const body = await request.json();
    const { questions } = saveQuestionsSchema.parse({
      surveyId: params.id,
      questions: body.questions,
    });

    // PrismaNeonHttp NO soporta transacciones ni nested creates con relaciones.
    // Hay que hacer cada operación por separado.

    // 1. Borrar preguntas existentes (cascade borra opciones y answers)
    await prisma.question.deleteMany({ where: { surveyId: params.id } });

    // 2. Crear cada pregunta sin nested options
    const createdQuestions = [];
    for (const q of questions) {
      const question = await prisma.question.create({
        data: {
          surveyId:   params.id,
          type:       q.type,
          text:       q.text,
          isRequired: q.isRequired,
          order:      q.order,
          minValue:   q.minValue ?? null,
          maxValue:   q.maxValue ?? null,
          minLabel:   q.minLabel ?? null,
          maxLabel:   q.maxLabel ?? null,
        },
      });

      // 3. Crear opciones por separado si las hay
      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          await prisma.questionOption.create({
            data: {
              questionId: question.id,
              text:       opt.text,
              order:      opt.order,
            },
          });
        }
      }

      // 4. Leer la pregunta con sus opciones para devolver completa
      const full = await prisma.question.findUnique({
        where:   { id: question.id },
        include: { options: { orderBy: { order: "asc" } } },
      });
      createdQuestions.push(full);
    }

    await auditLog({
      userId,
      action:   "QUESTIONS_SAVED",
      entity:   "Survey",
      entityId: params.id,
      metadata: { count: createdQuestions.length },
      ip,
    });

    return ok(createdQuestions.sort((a: any, b: any) => a.order - b.order));
  })(req, { params });
}