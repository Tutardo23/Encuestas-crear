"use client";
// src/components/admin/SurveyEditor.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Users, Send, BarChart2,
  ArrowLeft, Play, Pause, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QuestionBuilder } from "./QuestionBuilder";
import { RecipientsPanel } from "./RecipientsPanel";
import { AnalyticsPanel } from "./AnalyticsPanel";

type Tab = "questions" | "recipients" | "send" | "analytics";

interface SurveyEditorProps {
  survey: any;
  completedCount: number;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE:  { label: "Activa",   cls: "badge-active" },
  DRAFT:   { label: "Borrador", cls: "badge-draft" },
  PAUSED:  { label: "Pausada",  cls: "badge-paused" },
  CLOSED:  { label: "Cerrada",  cls: "badge-closed" },
};

export function SurveyEditor({ survey: initialSurvey, completedCount }: SurveyEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("questions");
  const [survey, setSurvey] = useState(initialSurvey);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [sendError, setSendError] = useState("");

  const st = STATUS_MAP[survey.status] ?? STATUS_MAP.DRAFT;
  const sentCount = survey.recipients.filter((r: any) => r.status !== "PENDING").length;
  const responseRate = sentCount > 0 ? Math.round((completedCount / sentCount) * 100) : 0;

  const handleStatusToggle = async () => {
    const newStatus = survey.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/surveys/${survey.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setSurvey((s: any) => ({ ...s, status: newStatus }));
      router.refresh();
    }
  };

  const handleSend = async () => {
    setSendError("");
    setSendResult(null);
    setIsSending(true);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setSendError(json.error ?? "Error al enviar"); return; }
      setSendResult(json.data);
      setSurvey((s: any) => ({ ...s, status: "ACTIVE" }));
      router.refresh();
    } finally {
      setIsSending(false);
    }
  };

  const TABS = [
    { id: "questions" as Tab, label: "Preguntas", icon: ClipboardList, count: survey.questions.length },
    { id: "recipients" as Tab, label: "Destinatarios", icon: Users, count: survey.recipients.length },
    { id: "send" as Tab, label: "Envío", icon: Send },
    { id: "analytics" as Tab, label: "Resultados", icon: BarChart2, count: completedCount > 0 ? completedCount : undefined },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="border-b border-white/[0.06] bg-torx-dark-2 px-6 py-3 flex items-center gap-4 shrink-0">
        <Link href="/dashboard/surveys" className="text-white/30 hover:text-white/70 transition-colors">
          <ArrowLeft size={16} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-white truncate">{survey.title}</h1>
            <span className={st.cls}>{st.label}</span>
          </div>
          <p className="text-xs text-white/30 mt-0.5">
            {survey._count.questions} preguntas · {survey._count.recipients} destinatarios
            {completedCount > 0 && ` · ${responseRate}% de respuesta`}
          </p>
        </div>

        {/* Status toggle */}
        {(survey.status === "ACTIVE" || survey.status === "PAUSED") && (
          <button onClick={handleStatusToggle} className="btn-ghost flex items-center gap-2 text-xs">
            {survey.status === "ACTIVE"
              ? <><Pause size={13} /> Pausar</>
              : <><Play size={13} /> Reactivar</>
            }
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06] bg-torx-dark-2 px-6 flex gap-1 shrink-0">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all",
              activeTab === id
                ? "border-torx-red text-torx-red"
                : "border-transparent text-white/35 hover:text-white/60 hover:border-white/20"
            )}
          >
            <Icon size={13} />
            {label}
            {count !== undefined && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                activeTab === id ? "bg-torx-red/20 text-torx-red" : "bg-white/10 text-white/40"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "questions" && (
          <QuestionBuilder surveyId={survey.id} initialQuestions={survey.questions} />
        )}
        {activeTab === "recipients" && (
          <RecipientsPanel surveyId={survey.id} initialRecipients={survey.recipients} />
        )}
        {activeTab === "send" && (
          <div className="p-8 max-w-lg mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-torx-red mb-1">Despacho</p>
            <h2 className="text-xl font-semibold text-white mb-2">Enviar encuesta</h2>
            <p className="text-sm text-white/40 mb-8">
              Se enviarán mails con links únicos a cada destinatario pendiente.
            </p>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: "Preguntas", val: survey.questions.length },
                { label: "Pendientes", val: survey.recipients.filter((r: any) => r.status === "PENDING").length },
                { label: "Ya enviados", val: sentCount },
              ].map(({ label, val }) => (
                <div key={label} className="card text-center">
                  <p className="text-2xl font-semibold text-white">{val}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/35 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {sendError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
                {sendError}
              </div>
            )}

            {sendResult && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
                <CheckCircle2 size={15} />
                {sendResult.sent} mails enviados correctamente
                {sendResult.failed > 0 && ` · ${sendResult.failed} fallaron`}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={
                isSending ||
                survey.questions.length === 0 ||
                survey.recipients.filter((r: any) => r.status === "PENDING").length === 0
              }
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send size={14} /> Enviar ahora</>
              )}
            </button>

            {survey.questions.length === 0 && (
              <p className="text-xs text-amber-400 text-center mt-3">
                Agregá preguntas antes de enviar.
              </p>
            )}
          </div>
        )}
        {activeTab === "analytics" && (
          <AnalyticsPanel surveyId={survey.id} />
        )}
      </div>
    </div>
  );
}
