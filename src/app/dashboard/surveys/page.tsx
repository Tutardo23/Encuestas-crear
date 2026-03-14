// src/app/dashboard/surveys/page.tsx
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, ArrowRight, ClipboardList } from "lucide-react";

export const metadata = { title: "Encuestas" };

interface SurveyRow {
  id: string; title: string; status: string; updatedAt: Date;
  _count: { questions: number; recipients: number };
}

export default async function SurveysPage() {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const surveys: SurveyRow[] = await prisma.survey.findMany({
    where: { creatorId: userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true, recipients: true } } },
  });

  const completedCounts: number[] = await Promise.all(
    surveys.map((s) => prisma.recipient.count({ where: { surveyId: s.id, status: "COMPLETED" } }))
  );

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    ACTIVE:  { label: "Activa",   cls: "badge-active" },
    DRAFT:   { label: "Borrador", cls: "badge-draft" },
    PAUSED:  { label: "Pausada",  cls: "badge-paused" },
    CLOSED:  { label: "Cerrada",  cls: "badge-closed" },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-torx-red mb-1">Gestión</p>
          <h1 className="text-2xl font-semibold text-white">Mis encuestas</h1>
        </div>
        <Link href="/dashboard/surveys/new" className="btn-primary flex items-center gap-2"><Plus size={15} /> Nueva encuesta</Link>
      </div>

      {surveys.length === 0 ? (
        <div className="card border-dashed border-white/10 text-center py-16">
          <ClipboardList size={40} className="mx-auto text-white/15 mb-4" />
          <p className="text-white/50 text-base mb-2">Todavía no creaste ninguna encuesta</p>
          <Link href="/dashboard/surveys/new" className="btn-primary inline-flex items-center gap-2 mt-4"><Plus size={14} /> Crear encuesta</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((s, i) => {
            const st = STATUS_MAP[s.status] ?? STATUS_MAP.DRAFT;
            const completed = completedCounts[i] ?? 0;
            const sent = s._count.recipients;
            const rate = sent > 0 ? Math.round((completed / sent) * 100) : 0;
            return (
              <Link key={s.id} href={`/dashboard/surveys/${s.id}`} className="card-hover flex items-center gap-5 group">
                <div className={`w-1 h-12 rounded-full shrink-0 ${s.status === "ACTIVE" ? "bg-green-500" : s.status === "DRAFT" ? "bg-amber-500" : s.status === "PAUSED" ? "bg-blue-500" : "bg-white/20"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-medium text-white/90 truncate">{s.title}</p>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                  <p className="text-xs text-white/30">{s._count.questions} preguntas · {formatDate(s.updatedAt)}</p>
                </div>
                <div className="hidden md:flex items-center gap-6 shrink-0">
                  {[{ label: "Enviadas", val: sent }, { label: "Resp.", val: completed }, { label: "Tasa", val: `${rate}%` }].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <p className="text-base font-semibold text-white/70">{val}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>
                <ArrowRight size={15} className="text-white/20 group-hover:text-torx-red transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
