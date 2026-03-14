"use client";
// src/components/admin/AnalyticsPanel.tsx
import { useEffect, useState } from "react";
import { BarChart2, Users, CheckCircle2, TrendingUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { surveyId: string }

// ── CSV EXPORT ────────────────────────────────────────────────────────
function exportToCsv(rows: Record<string, string>[], filename: string) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escape = (val: string) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsPanel({ surveyId }: Props) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}/analytics`)
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-white/20 border-t-torx-red rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.totalCompleted === 0) {
    return (
      <div className="p-8 text-center">
        <BarChart2 size={40} className="mx-auto text-white/15 mb-4" />
        <p className="text-white/40 text-sm">Todavía no hay respuestas para mostrar.</p>
      </div>
    );
  }

  const { totalSent, totalCompleted, totalOpened, questions, exportRows } = data;
  const responseRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;
  const openRate     = totalSent > 0 ? Math.round((totalOpened    / totalSent) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── HEADER con botón exportar ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
          {totalCompleted} respuesta{totalCompleted !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => exportToCsv(exportRows, `respuestas-${surveyId}.csv`)}
          className="flex items-center gap-2 btn-primary text-xs px-4 py-2"
        >
          <Download size={13} />
          Exportar CSV
        </button>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Enviadas",      val: totalSent,          icon: Users,        color: "text-blue-400"  },
          { label: "Abrieron",      val: `${openRate}%`,     icon: TrendingUp,   color: "text-amber-400" },
          { label: "Respondieron",  val: totalCompleted,     icon: CheckCircle2, color: "text-green-400" },
          { label: "Tasa resp.",    val: `${responseRate}%`, icon: BarChart2,    color: "text-torx-red"  },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className={cn("text-2xl font-semibold", color)}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── PREGUNTAS ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {questions.map((q: any, qi: number) => (
          <div key={q.id} className="card">
            <p className="text-[10px] font-bold uppercase tracking-widest text-torx-red mb-1">
              Pregunta {qi + 1}
            </p>
            <p className="text-sm font-medium text-white/80 mb-4">{q.text}</p>

            {/* OPCIÓN MÚLTIPLE */}
            {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
              <div className="space-y-3">
                {q.results.map((r: any) => (
                  <div key={r.optionId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/60">{r.text}</span>
                      <span className="text-xs font-semibold text-white/70">
                        {r.count} ({r.pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-torx-red rounded-full transition-all duration-700"
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                    {/* Quiénes eligieron esta opción */}
                    {r.respondents?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {r.respondents.map((p: any, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded-full"
                            title={p.email}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* RATING / NPS */}
            {(q.type === "RATING" || q.type === "NPS") && (
              <div>
                {/* Gráfico de barras */}
                <div className="flex items-end gap-1 h-16 mb-2">
                  {q.distribution.map((d: any) => (
                    <div key={d.value} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-torx-red/40 rounded-sm transition-all"
                        style={{ height: `${Math.max(4, (d.count / totalCompleted) * 60)}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mb-3">
                  {q.distribution.map((d: any) => (
                    <span key={d.value} className="text-[10px] text-white/30 flex-1 text-center">
                      {d.value}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/40 mb-3">
                  Media: <span className="text-white/70 font-semibold">{q.avg?.toFixed(1)}</span>
                </p>
                {/* Lista individual */}
                <div className="space-y-1">
                  {q.individual?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/50">{item.name}</span>
                      <span className="font-semibold text-white/70 tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEXTO LIBRE */}
            {q.type === "TEXT" && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {q.answers.length === 0 ? (
                  <p className="text-xs text-white/25 italic">Sin respuestas.</p>
                ) : (
                  q.answers.map((a: any, ai: number) => (
                    <div
                      key={ai}
                      className="bg-white/3 border border-white/[0.06] px-3 py-2.5 rounded-lg"
                    >
                      <p className="text-xs text-white/60 mb-1">&ldquo;{a.text}&rdquo;</p>
                      <p className="text-[10px] text-white/30">
                        — {a.name}
                        <span className="ml-1 opacity-60">({a.email})</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}