// src/app/api/surveys/[id]/route.ts
import { NextRequest } from "next/server";
import { withAuth, ok, notFound, forbidden, serverError } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { updateSurveySchema } from "@/lib/validations";
import { auditLog } from "@/lib/security";

type Params = { params: { id: string } };

// Verificar que el survey pertenece al usuario
async function getSurveyOrFail(surveyId: string, userId: string) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) return { survey: null, error: notFound("Encuesta") };
  if (survey.creatorId !== userId) return { survey: null, error: forbidden() };
  return { survey, error: null };
}

// GET /api/surveys/[id]
export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(async (_, { session }) => {
    const userId = (session.user as any).id as string;
    const { survey, error } = await getSurveyOrFail(params.id, userId);
    if (error) return error;

    const full = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: { orderBy: { order: "asc" } },
          },
        },
        recipients: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            sentAt: true,
            token: false, // NUNCA exponer el token en listados
          },
        },
        _count: { select: { recipients: true, questions: true } },
      },
    });

    return ok(full);
  })(req, { params });
}

// PATCH /api/surveys/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (request, { session, ip }) => {
    const userId = (session.user as any).id as string;
    const { survey, error } = await getSurveyOrFail(params.id, userId);
    if (error) return error;

    // No permitir editar encuestas activas con respuestas
    if (survey!.status === "ACTIVE") {
      const responseCount = await prisma.response.count({
        where: { recipient: { surveyId: params.id } },
      });
      if (responseCount > 0) {
        const { err } = await import("@/lib/api");
        return err("No se puede editar una encuesta con respuestas.", 409);
      }
    }

    const body = await request.json();
    const data = updateSurveySchema.parse(body);

    const updated = await prisma.survey.update({
      where: { id: params.id },
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    await auditLog({ userId, action: "SURVEY_UPDATED", entity: "Survey", entityId: params.id, ip });
    return ok(updated);
  })(req, { params });
}

// DELETE /api/surveys/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  return withAuth(async (_, { session, ip }) => {
    const userId = (session.user as any).id as string;
    const { survey, error } = await getSurveyOrFail(params.id, userId);
    if (error) return error;

    if (survey!.status === "ACTIVE") {
      const { err } = await import("@/lib/api");
      return err("Pausá la encuesta antes de eliminarla.", 409);
    }

    await prisma.survey.delete({ where: { id: params.id } });
    await auditLog({ userId, action: "SURVEY_DELETED", entity: "Survey", entityId: params.id, ip });

    return ok({ deleted: true });
  })(req, { params });
}
