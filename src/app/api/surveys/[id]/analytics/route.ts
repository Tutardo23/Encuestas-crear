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
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: { orderBy: { order: "asc" } },
            answers: {
              include: {
                selectedOption: true,
                // Incluir el recipient a través de la respuesta para saber quién contestó
                response: {
                  include: {
                    recipient: { select: { name: true, email: true } },
                  },
                },
              },
            },
          },
        },
        recipients: { select: { status: true } },
      },
    });

    if (!survey) return notFound("Encuesta");
    if (survey.creatorId !== userId) return forbidden();

    const totalSent      = survey.recipients.filter((r: any) => r.status !== "PENDING").length;
    const totalOpened    = survey.recipients.filter((r: any) => ["OPENED","COMPLETED"].includes(r.status)).length;
    const totalCompleted = survey.recipients.filter((r: any) => r.status === "COMPLETED").length;

    const questions = survey.questions.map((q: any) => {
      const answers = q.answers;

      if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
        const results = q.options.map((opt: any) => {
          const count = answers.filter((a: any) => a.selectedOptionId === opt.id).length;
          const pct   = totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0;
          // Quiénes eligieron esta opción
          const respondents = answers
            .filter((a: any) => a.selectedOptionId === opt.id)
            .map((a: any) => ({
              name:  a.response?.recipient?.name  ?? "—",
              email: a.response?.recipient?.email ?? "—",
            }));
          return { optionId: opt.id, text: opt.text, count, pct, respondents };
        });
        return { id: q.id, type: q.type, text: q.text, results };
      }

      if (q.type === "RATING" || q.type === "NPS") {
        const min = q.minValue ?? (q.type === "NPS" ? 0 : 1);
        const max = q.maxValue ?? (q.type === "NPS" ? 10 : 5);
        const distribution = Array.from({ length: max - min + 1 }, (_: unknown, i: number) => {
          const val   = min + i;
          const count = answers.filter((a: any) => a.numberValue === val).length;
          return { value: val, count };
        });
        const sum = answers.reduce((acc: number, a: any) => acc + (a.numberValue ?? 0), 0);
        const avg = answers.length > 0 ? sum / answers.length : null;
        // Lista individual con nombre
        const individual = answers.map((a: any) => ({
          name:  a.response?.recipient?.name  ?? "—",
          email: a.response?.recipient?.email ?? "—",
          value: a.numberValue,
        }));
        return { id: q.id, type: q.type, text: q.text, distribution, avg, individual };
      }

      // TEXT — incluir nombre junto a cada respuesta
      const textAnswers = answers
        .filter((a: any) => a.textValue && a.textValue.trim().length > 0)
        .slice(0, 200)
        .map((a: any) => ({
          text:  a.textValue,
          name:  a.response?.recipient?.name  ?? "—",
          email: a.response?.recipient?.email ?? "—",
        }));

      return { id: q.id, type: q.type, text: q.text, answers: textAnswers };
    });

    // ── DATOS PARA EXPORTAR CSV ──────────────────────────────────────
    // Tabla plana: una fila por respondente, una columna por pregunta
    const responses = await prisma.response.findMany({
      where: { recipient: { surveyId: params.id } },
      include: {
        recipient: { select: { name: true, email: true } },
        answers: {
          include: {
            question:       { select: { text: true, order: true, type: true } },
            selectedOption: { select: { text: true } },
          },
        },
      },
      orderBy: { completedAt: "asc" },
    });

    const exportRows = responses.map((resp: any) => {
      const row: Record<string, string> = {
        Nombre:  resp.recipient.name,
        Email:   resp.recipient.email,
        Fecha:   new Date(resp.completedAt).toLocaleString("es-AR"),
      };
      // Ordenar las answers por el orden de la pregunta
      const sorted = [...resp.answers].sort(
        (a: any, b: any) => (a.question?.order ?? 0) - (b.question?.order ?? 0)
      );
      for (const ans of sorted) {
        const qText = ans.question?.text ?? "Pregunta";
        if (ans.textValue)                row[qText] = ans.textValue;
        else if (ans.numberValue != null)  row[qText] = String(ans.numberValue);
        else if (ans.selectedOption)       row[qText] = ans.selectedOption.text;
        else                               row[qText] = "—";
      }
      return row;
    });

    return ok({ totalSent, totalOpened, totalCompleted, questions, exportRows });
  })(req, { params });
}