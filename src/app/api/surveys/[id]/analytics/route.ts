// src/app/api/surveys/[id]/analytics/route.ts
import { NextRequest } from "next/server";
import { withAuth, ok, notFound, forbidden } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(async (_, { session }) => {
    const userId = (session.user as { id: string }).id;
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } }, answers: { include: { selectedOption: true } } } },
        recipients: { select: { status: true } },
      },
    });
    if (!survey) return notFound("Encuesta");
    if (survey.creatorId !== userId) return forbidden();

    const totalSent      = survey.recipients.filter((r: { status: string }) => r.status !== "PENDING").length;
    const totalOpened    = survey.recipients.filter((r: { status: string }) => ["OPENED","COMPLETED"].includes(r.status)).length;
    const totalCompleted = survey.recipients.filter((r: { status: string }) => r.status === "COMPLETED").length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = survey.questions.map((q: any) => {
      const answers = q.answers;
      if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
        const results = q.options.map((opt: { id: string; text: string }) => {
          const count = answers.filter((a: { selectedOptionId: string | null }) => a.selectedOptionId === opt.id).length;
          const pct   = totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0;
          return { optionId: opt.id, text: opt.text, count, pct };
        });
        return { id: q.id, type: q.type, text: q.text, results };
      }
      if (q.type === "RATING" || q.type === "NPS") {
        const min = q.minValue ?? (q.type === "NPS" ? 0 : 1);
        const max = q.maxValue ?? (q.type === "NPS" ? 10 : 5);
        const distribution = Array.from({ length: max - min + 1 }, (_: unknown, i: number) => {
          const val   = min + i;
          const count = answers.filter((a: { numberValue: number | null }) => a.numberValue === val).length;
          return { value: val, count };
        });
        const sum = answers.reduce((acc: number, a: { numberValue: number | null }) => acc + (a.numberValue ?? 0), 0);
        const avg = answers.length > 0 ? sum / answers.length : null;
        return { id: q.id, type: q.type, text: q.text, distribution, avg };
      }
      const textAnswers = answers
        .map((a: { textValue: string | null }) => a.textValue)
        .filter((t: string | null): t is string => !!t && t.trim().length > 0)
        .slice(0, 100);
      return { id: q.id, type: q.type, text: q.text, answers: textAnswers };
    });

    return ok({ totalSent, totalOpened, totalCompleted, questions });
  })(req, { params });
}
