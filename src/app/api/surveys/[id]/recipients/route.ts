// src/app/api/surveys/[id]/recipients/route.ts
import { NextRequest } from "next/server";
import { withAuth, ok, notFound, forbidden } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { addRecipientsSchema } from "@/lib/validations";
import { generateSurveyToken, generateTokenExpiry, auditLog } from "@/lib/security";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (request, { session, ip }) => {
    const userId = (session.user as { id: string }).id;
    const survey = await prisma.survey.findUnique({ where: { id: params.id } });
    if (!survey) return notFound("Encuesta");
    if (survey.creatorId !== userId) return forbidden();

    const body = await request.json();
    const { recipients } = addRecipientsSchema.parse({ surveyId: params.id, recipients: body.recipients });

    const created = await Promise.all(
      recipients.map((r) =>
        prisma.recipient.upsert({
          where: { surveyId_email: { surveyId: params.id, email: r.email } },
          update: { name: r.name },
          create: {
            surveyId: params.id, name: r.name, email: r.email,
            token: generateSurveyToken(), tokenExpiresAt: generateTokenExpiry(),
          },
        })
      )
    );

    await auditLog({ userId, action: "RECIPIENTS_ADDED", entity: "Survey", entityId: params.id, metadata: { count: created.length }, ip });

    // Omitir token de la respuesta
    return ok(created.map(({ token: _t, ...r }: { token: string; [key: string]: unknown }) => r));
  })(req, { params });
}

export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(async (_, { session }) => {
    const userId = (session.user as { id: string }).id;
    const survey = await prisma.survey.findUnique({ where: { id: params.id } });
    if (!survey) return notFound("Encuesta");
    if (survey.creatorId !== userId) return forbidden();

    const recipients = await prisma.recipient.findMany({
      where: { surveyId: params.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, status: true, sentAt: true, openedAt: true },
    });
    return ok(recipients);
  })(req, { params });
}
