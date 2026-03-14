// src/app/api/surveys/route.ts
import { NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { createSurveySchema } from "@/lib/validations";
import { auditLog } from "@/lib/security";

export const GET = withAuth(async (_req, { session }) => {
  const userId = (session.user as { id: string }).id;
  const surveys = await prisma.survey.findMany({
    where: { creatorId: userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true, status: true, createdAt: true, updatedAt: true, _count: { select: { recipients: true, questions: true } } },
  });
  const surveysWithStats = await Promise.all(
    surveys.map(async (s: { id: string; [key: string]: unknown }) => {
      const completed = await prisma.recipient.count({ where: { surveyId: s.id, status: "COMPLETED" } });
      return { ...s, completedCount: completed };
    })
  );
  return ok(surveysWithStats);
});

export const POST = withAuth(
  async (req, { session, ip }) => {
    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const data = createSurveySchema.parse(body);
    const survey = await prisma.survey.create({
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null, creatorId: userId },
    });
    await auditLog({ userId, action: "SURVEY_CREATED", entity: "Survey", entityId: survey.id, metadata: { title: survey.title }, ip });
    return created(survey);
  },
  { rateLimit: { limit: 20, windowSeconds: 60 } }
);
