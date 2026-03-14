// src/app/dashboard/analytics/page.tsx
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { BarChart2, ArrowRight, ClipboardList } from "lucide-react";

export const metadata = { title: "Resultados" };

export default async function AnalyticsPage() {
  const session = await requireAuth();
  const userId  = (session.user as { id: string }).id;

  const surveys = await prisma.survey.findMany({
    where:   { creatorId: userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true, recipients: true } } },
  });

  const surveysWithStats = await Promise.all(
    surveys.map(async (s: any) => {
      const completed = await prisma.recipient.count({
        where: { surveyId: s.id, status: "COMPLETED" },
      });
      const sent = await prisma.recipient.count({
        where: { surveyId: s.id, status: { not: "PENDING" } },
      });
      return { ...s, completed, sent };
    })
  );

  const withResponses = surveysWithStats.filter((s) => s.completed > 0);

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    ACTIVE:  { label: "Activa",   cls: "badge-active" },
    DRAFT:   { label: "Borrador", cls: "badge-draft" },
    PAUSED:  { label: "Pausada",  cls: "badge-paused" },
    CLOSED:  { label: "Cerrada",  cls: "badge-closed" },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-torx-red mb-1">Análisis</p>
        <h1 className="text-2xl font-semibold text-white">Resultados</h1>
        <p className="text-sm text-white/40 mt-1">
          Seleccioná una encuesta para ver sus respuestas y exportarlas.
        </p>
      </div>

      {withResponses.length === 0 ? (
        <div className="card border-dashed border-white/10 text-center py-16">
          <BarChart2 size={40} className="mx-auto text-white/15 mb-4" />
          <p className="text-white/50 text-base mb-2">Todavía no hay respuestas</p>
          <p className="text-white/25 text-sm mb-6">
            Cuando alguien complete una encuesta, aparecerá acá.
          </p>
          <Link href="/dashboard/surveys" className="btn-primary inline-flex items-center gap-2">
            <ClipboardList size={14} /> Ver encuestas
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {withResponses.map((s: any) => {
            const st   = STATUS_MAP[s.status] ?? STATUS_MAP.DRAFT;
            const rate = s.sent > 0 ? Math.round((s.completed / s.sent) * 100) : 0;
            return (
              <Link
                key={s.id}
                // ← Abre directo en el tab de resultados
                href={`/dashboard/surveys/${s.id}?tab=analytics`}
                className="card-hover flex items-center gap-5 group"
              >
                <div className={`w-1 h-12 rounded-full shrink-0 ${
                  s.status === "ACTIVE" ? "bg-green-500" :
                  s.status === "DRAFT"  ? "bg-amber-500" :
                  s.status === "PAUSED" ? "bg-blue-500"  : "bg-white/20"
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                      {s.title}
                    </p>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                  <p className="text-xs text-white/30">
                    Actualizada {formatDate(s.updatedAt)}
                  </p>
                </div>

                <div className="hidden md:flex items-center gap-6 shrink-0">
                  {[
                    { label: "Enviadas",      val: s.sent      },
                    { label: "Respondieron",  val: s.completed },
                    { label: "Tasa",          val: `${rate}%`  },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <p className="text-base font-semibold text-white/70">{val}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-torx-red font-medium">Ver resultados</span>
                  <ArrowRight size={15} className="text-torx-red" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}