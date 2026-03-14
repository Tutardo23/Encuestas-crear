"use client";
// src/components/survey/SurveyResponder.tsx
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option { id: string; text: string; order: number }
interface Question {
  id: string; type: string; text: string; isRequired: boolean; order: number;
  minValue: number | null; maxValue: number | null; minLabel: string | null; maxLabel: string | null;
  options: Option[];
}
interface SurveyData {
  recipientName: string; surveyTitle: string; surveyDescription: string | null;
  showProgressBar: boolean; thankYouMessage: string; questions: Question[];
}
type Answer = { questionId: string; textValue?: string; numberValue?: number; selectedOptionId?: string };
type PageState = "loading" | "error" | "survey" | "done";

const ERROR_MESSAGES: Record<string, string> = {
  "410": "Este link expiró o la encuesta ya no está disponible.",
  "409": "Ya respondiste esta encuesta. ¡Gracias!",
  "404": "Este link no es válido.",
};

export function SurveyResponder({ token }: { token: string }) {
  const [pageState, setPageState]   = useState<PageState>("loading");
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`/api/response?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) { setErrorMsg(ERROR_MESSAGES[String(res.status)] ?? json.error ?? "Error inesperado."); setPageState("error"); return; }
        setSurveyData(json.data); setPageState("survey");
      })
      .catch(() => { setErrorMsg("No se pudo cargar la encuesta."); setPageState("error"); });
  }, [token]);

  const questions   = surveyData?.questions ?? [];
  const currentQ    = questions[currentIdx];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;

  const setAnswer = (patch: Partial<Answer>) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: { ...prev[currentQ.id], questionId: currentQ.id, ...patch } }));
  };

  const canAdvance = (): boolean => {
    if (!currentQ) return false;
    if (!currentQ.isRequired) return true;
    const a = currentAnswer;
    if (!a) return false;
    if (currentQ.type === "TEXT") return (a.textValue ?? "").trim().length > 0;
    if (currentQ.type === "SINGLE_CHOICE") return !!a.selectedOptionId;
    if (currentQ.type === "RATING" || currentQ.type === "NPS") return a.numberValue !== undefined;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers: Object.values(answers) }),
      });
      const json = await res.json();
      if (!res.ok) { setSubmitError(json.error ?? "Error al enviar"); return; }
      setPageState("done");
    } finally { setSubmitting(false); }
  };

  if (pageState === "loading") return <Shell><div className="flex justify-center py-20"><Loader2 size={28} className="text-white/30 animate-spin" /></div></Shell>;

  if (pageState === "error") return (
    <Shell>
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center"><AlertCircle size={24} className="text-red-400" /></div>
        <p className="text-gray-800 font-medium">{errorMsg}</p>
        <p className="text-gray-400 text-sm">Si creés que es un error, contactá a quien te envió el link.</p>
      </div>
    </Shell>
  );

  if (pageState === "done") return (
    <Shell>
      <div className="flex flex-col items-center py-16 gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Gracias, {surveyData?.recipientName.split(" ")[0]}!</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm">{surveyData?.thankYouMessage}</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C84B31]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Torx Survey</span>
        </div>
      </div>
    </Shell>
  );

  const isLast = currentIdx === questions.length - 1;

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#C84B31] mb-1">Encuesta para {surveyData!.recipientName}</p>
        <h1 className="text-lg font-semibold text-gray-900 leading-tight">{surveyData!.surveyTitle}</h1>
        {surveyData!.surveyDescription && <p className="text-sm text-gray-500 mt-1">{surveyData!.surveyDescription}</p>}
      </div>

      {/* Progress */}
      {surveyData!.showProgressBar && (
        <div className="mb-8">
          <div className="flex justify-between text-[10px] text-gray-400 mb-2">
            <span>Pregunta {currentIdx + 1} de {questions.length}</span>
            <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#C84B31] rounded-full transition-all duration-500" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Question */}
      {currentQ && (
        <div key={currentQ.id} className="animate-fade-in">
          <div className="mb-2">
            <span className="text-[10px] font-bold text-[#C84B31] uppercase tracking-widest">P{currentIdx + 1}{currentQ.isRequired && " *"}</span>
          </div>
          <p className="text-base font-medium text-gray-900 mb-6 leading-relaxed">{currentQ.text}</p>

          {currentQ.type === "SINGLE_CHOICE" && (
            <div className="space-y-2">
              {currentQ.options.map((opt) => {
                const selected = currentAnswer?.selectedOptionId === opt.id;
                return (
                  <button key={opt.id} onClick={() => setAnswer({ selectedOptionId: opt.id })}
                    className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all",
                      selected ? "bg-[#C84B31]/8 border-[#C84B31]/50 text-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    )}>
                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", selected ? "border-[#C84B31]" : "border-gray-300")}>
                      {selected && <div className="w-2 h-2 rounded-full bg-[#C84B31]" />}
                    </div>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          )}

          {currentQ.type === "TEXT" && (
            <textarea value={currentAnswer?.textValue ?? ""} onChange={(e) => setAnswer({ textValue: e.target.value })}
              rows={4} placeholder="Escribí tu respuesta acá..."
              className="w-full border border-gray-200 focus:border-[#C84B31]/50 focus:ring-1 focus:ring-[#C84B31]/20 text-gray-800 placeholder-gray-300 text-sm px-4 py-3 rounded-xl outline-none resize-none transition-all bg-white"
            />
          )}

          {(currentQ.type === "RATING" || currentQ.type === "NPS") && (
            <div>
              {(currentQ.minLabel || currentQ.maxLabel) && (
                <div className="flex justify-between text-xs text-gray-400 mb-3">
                  <span>{currentQ.minLabel}</span><span>{currentQ.maxLabel}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: (currentQ.maxValue ?? 10) - (currentQ.minValue ?? 0) + 1 }).map((_, i) => {
                  const val = (currentQ.minValue ?? (currentQ.type === "NPS" ? 0 : 1)) + i;
                  const selected = currentAnswer?.numberValue === val;
                  return (
                    <button key={val} onClick={() => setAnswer({ numberValue: val })}
                      className={cn("w-11 h-11 rounded-xl border text-sm font-semibold transition-all",
                        selected ? "bg-[#C84B31] border-[#C84B31] text-white scale-105" : "bg-white border-gray-200 text-gray-500 hover:border-[#C84B31]/40"
                      )}>
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {submitError && <p className="mt-4 text-sm text-red-500 text-center">{submitError}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-0 disabled:pointer-events-none transition-all">
          <ArrowLeft size={14} /> Anterior
        </button>
        {isLast ? (
          <button onClick={handleSubmit} disabled={!canAdvance() || submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C84B31] text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all hover:bg-[#b03d26]">
            {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={14} /> Enviar respuestas</>}
          </button>
        ) : (
          <button onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={!canAdvance()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C84B31] text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all hover:bg-[#b03d26]">
            Siguiente <ArrowRight size={14} />
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0ede8] flex items-start justify-center pt-12 pb-16 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-[#0B1220] rounded-t-2xl px-6 py-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C84B31]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Torx Survey</span>
        </div>
        <div className="bg-white rounded-b-2xl shadow-xl shadow-black/8 px-6 py-8">{children}</div>
        <p className="text-center text-[10px] text-black/20 mt-4 uppercase tracking-widest">Encuesta privada · Solo para el destinatario</p>
      </div>
    </div>
  );
}
