// src/app/dashboard/surveys/[id]/page.tsx
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { SurveyEditor } from "@/components/admin/SurveyEditor";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  const survey = await prisma.survey.findUnique({ where: { id: params.id }, select: { title: true } });
  return { title: survey?.title ?? "Encuesta" };
}

export default async function SurveyDetailPage({ params }: Props) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      recipients: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, email: true,
          status: true, sentAt: true, openedAt: true,
        },
      },
      _count: { select: { questions: true, recipients: true } },
    },
  });

  if (!survey) notFound();
  if (survey.creatorId !== userId) redirect("/dashboard/surveys");

  // Stats de respuestas
  const completedCount = await prisma.recipient.count({
    where: { surveyId: params.id, status: "COMPLETED" },
  });

  return (
    <SurveyEditor
      survey={JSON.parse(JSON.stringify(survey))}
      completedCount={completedCount}
    />
  );
}
