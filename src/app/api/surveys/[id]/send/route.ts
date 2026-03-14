// src/app/api/surveys/[id]/send/route.ts
import { NextRequest } from "next/server";
import { withAuth, ok, notFound, forbidden, err } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { auditLog } from "@/lib/security";
import { sendSurveyEmail } from "@/lib/email";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(
    async (_request, { session, ip }) => {
      const userId = (session.user as { id: string }).id;

      const survey = await prisma.survey.findUnique({
        where: { id: params.id },
        include: {
          questions: true,
          recipients: { where: { status: "PENDING" } },
        },
      });

      if (!survey) return notFound("Encuesta");
      if (survey.creatorId !== userId) return forbidden();
      if (survey.questions.length === 0) return err("La encuesta no tiene preguntas.", 400);
      if (survey.recipients.length === 0) return err("No hay destinatarios pendientes.", 400);

      if (survey.status === "DRAFT") {
        await prisma.survey.update({ where: { id: params.id }, data: { status: "ACTIVE" } });
      }

      const BATCH_SIZE = 50;
      const results = { sent: 0, failed: 0, errors: [] as string[] };

      for (let i = 0; i < survey.recipients.length; i += BATCH_SIZE) {
        const batch = survey.recipients.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (recipient: { id: string; email: string; name: string; token: string }) => {
            try {
              await sendSurveyEmail({
                to: recipient.email,
                recipientName: recipient.name,
                senderName: survey.senderName,
                subject: survey.emailSubject.replace("{{nombre}}", recipient.name),
                surveyTitle: survey.title,
                token: recipient.token,
              });
              await prisma.recipient.update({ where: { id: recipient.id }, data: { status: "SENT", sentAt: new Date() } });
              results.sent++;
            } catch (error) {
              results.failed++;
              results.errors.push(recipient.email);
              console.error(`[Email Error] ${recipient.email}:`, error);
            }
          })
        );
      }

      await auditLog({ userId, action: "SURVEY_SENT", entity: "Survey", entityId: params.id, metadata: { sent: results.sent, failed: results.failed }, ip });
      return ok({ sent: results.sent, failed: results.failed, failedEmails: results.failed > 0 ? results.errors : undefined });
    },
    { rateLimit: { limit: 3, windowSeconds: 60 } }
  )(req, { params });
}
