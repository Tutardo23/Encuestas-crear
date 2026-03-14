// src/app/dashboard/page.tsx
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ClipboardList, Send, CheckCircle2, TrendingUp, ArrowRight, Plus } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const [totalSurveys, activeSurveys, totalSent, totalCompleted, recentSurveys] = await Promise.all([
    prisma.survey.count({ where: { creatorId: userId } }),
    prisma.survey.count({ where: { creatorId: userId, status: "ACTIVE" } }),
    prisma.recipient.count({ where: { survey: { creatorId: userId }, status: { not: "PENDING" } } }),
    prisma.recipient.count({ where: { survey: { creatorId: userId }, status: "COMPLETED" } }),
    prisma.survey.findMany({ where: { creatorId: userId }, orderBy: { updatedAt: "desc" }, take: 5, include: { _count: { select: { recipients: true } } } }),
  ]);

  const responseRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;
  const stats = [
    { label: "Encuestas totales", value: totalSurveys, icon: ClipboardList, color: "text-blue-400" },
    { label: "Activas ahora",     value: activeSurveys, icon: TrendingUp,   color: "text-green-400" },
    { label: "Enviadas",          value: totalSent,     icon: Send,          color: "text-amber-400" },
    { label: "Tasa de respuesta", value: `${responseRate}%`, icon: CheckCircle2, color: "text-torx-red" },
  ];

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    ACTIVE:  { label: "Activa",   cls: "badge-active" },
    DRAFT:   { label: "Borrador", cls: "badge-draft" },
    PAUSED:  { label: "Pausada",  cls: "badge-paused" },
    CLOSED:  { label: "Cerrada",  cls: "badge-closed" },
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-torx-red mb-1">Panel principal</p>
          <h1 className="text-2xl font-semibold text-white">Hola, {session.user.name?.split(" ")[0]} 👋</h1>
        </div>
        <Link href="/dashboard/surveys/new" className="btn-primary flex items-center gap-2"><Plus size={15} /> Nueva encuesta</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{s.label}</span>
              <s.icon size={15} className={s.color} />
            </div>
            <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Encuestas recientes</h2>
          <Link href="/dashboard/surveys" className="flex items-center gap-1 text-xs text-torx-red hover:text-torx-red-light transition-colors">Ver todas <ArrowRight size={12} /></Link>
        </div>
        {recentSurveys.length === 0 ? (
          <div className="card border-dashed border-white/10 text-center py-12">
            <ClipboardList size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 text-sm mb-4">No hay encuestas todavía</p>
            <Link href="/dashboard/surveys/new" className="btn-primary inline-flex items-center gap-2"><Plus size={14} /> Crear primera encuesta</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSurveys.map((s: { id: string; title: string; status: string; updatedAt: Date; _count: { recipients: number } }) => {
              const st = STATUS_MAP[s.status] ?? STATUS_MAP.DRAFT;
              return (
                <Link key={s.id} href={`/dashboard/surveys/${s.id}`} className="card-hover flex items-center gap-4 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate group-hover:text-white">{s.title}</p>
                    <p className="text-xs text-white/30 mt-0.5">Actualizada {formatDate(s.updatedAt)} · {s._count.recipients} destinatarios</p>
                  </div>
                  <span className={st.cls}>{st.label}</span>
                  <ArrowRight size={14} className="text-white/20 group-hover:text-torx-red transition-all" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
