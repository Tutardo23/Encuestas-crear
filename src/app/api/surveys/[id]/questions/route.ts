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

    const responseCount = await prisma.response.count({ where: { recipient: { surveyId: params.id } } });
    if (responseCount > 0) return err("No se pueden editar preguntas de una encuesta con respuestas.", 409);

    const body = await request.json();
    const { questions } = saveQuestionsSchema.parse({ surveyId: params.id, questions: body.questions });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      await tx.question.deleteMany({ where: { surveyId: params.id } });
      return Promise.all(
        questions.map((q) =>
          tx.question.create({
            data: {
              surveyId: params.id,
              type: q.type, text: q.text, isRequired: q.isRequired, order: q.order,
              minValue: q.minValue, maxValue: q.maxValue, minLabel: q.minLabel, maxLabel: q.maxLabel,
              options: q.options?.length
                ? { create: q.options.map((o) => ({ text: o.text, order: o.order })) }
                : undefined,
            },
            include: { options: { orderBy: { order: "asc" } } },
          })
        )
      );
    });

    await auditLog({ userId, action: "QUESTIONS_SAVED", entity: "Survey", entityId: params.id, metadata: { count: result.length }, ip });
    return ok((result as Array<{ order: number }>).sort((a, b) => a.order - b.order));
  })(req, { params });
}
