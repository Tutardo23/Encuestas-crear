"use client";
// src/components/admin/QuestionBuilder.tsx
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type QType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING" | "NPS";

interface Option { id?: string; text: string; order: number }
interface Question {
  id?: string;
  type: QType;
  text: string;
  isRequired: boolean;
  order: number;
  minValue?: number | null;
  maxValue?: number | null;
  minLabel?: string | null;
  maxLabel?: string | null;
  options: Option[];
}

const TYPE_LABELS: Record<QType, string> = {
  SINGLE_CHOICE:   "Opción única",
  MULTIPLE_CHOICE: "Opción múltiple",
  TEXT:            "Texto libre",
  RATING:          "Puntuación",
  NPS:             "NPS (0-10)",
};

interface Props {
  surveyId: string;
  initialQuestions: Question[];
}

export function QuestionBuilder({ surveyId, initialQuestions }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = (type: QType) => {
    const newQ: Question = {
      type,
      text: "",
      isRequired: false,
      order: questions.length,
      options: type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
        ? [{ text: "Opción A", order: 0 }, { text: "Opción B", order: 1 }]
        : [],
      minValue: type === "RATING" ? 1 : type === "NPS" ? 0 : null,
      maxValue: type === "RATING" ? 5 : type === "NPS" ? 10 : null,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const deleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= questions.length) return;
    const arr = [...questions];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setQuestions(arr.map((q, i) => ({ ...q, order: i })));
  };

  const addOption = (qIdx: number) => {
    updateQuestion(qIdx, {
      options: [...questions[qIdx].options, { text: "", order: questions[qIdx].options.length }],
    });
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    const opts = questions[qIdx].options.map((o, i) => (i === oIdx ? { ...o, text } : o));
    updateQuestion(qIdx, { options: opts });
  };

  const deleteOption = (qIdx: number, oIdx: number) => {
    const opts = questions[qIdx].options.filter((_, i) => i !== oIdx).map((o, i) => ({ ...o, order: i }));
    updateQuestion(qIdx, { options: opts });
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Error al guardar");
        return;
      }
      const { data } = await res.json();
      setQuestions(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Save bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-white/40">{questions.length} pregunta{questions.length !== 1 ? "s" : ""}</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn("flex items-center gap-2 btn-primary text-xs px-4 py-2", saved && "bg-green-600 hover:bg-green-600")}
        >
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {saved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
          {error}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3 mb-6">
        {questions.length === 0 && (
          <div className="card border-dashed border-white/10 text-center py-10">
            <p className="text-white/30 text-sm">Agregá tu primera pregunta con los botones de abajo.</p>
          </div>
        )}

        {questions.map((q, qi) => (
          <div key={qi} className="card border-white/10 group">
            {/* Question header */}
            <div className="flex items-start gap-3 mb-4">
              <GripVertical size={16} className="text-white/20 mt-0.5 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-torx-red">
                    P{qi + 1}
                  </span>
                  <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded">
                    {TYPE_LABELS[q.type]}
                  </span>
                </div>

                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  placeholder="Escribí la pregunta..."
                  rows={2}
                  className="input resize-none text-base"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveQuestion(qi, -1)} className="btn-ghost p-1.5" title="Subir">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => moveQuestion(qi, 1)} className="btn-ghost p-1.5" title="Bajar">
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => deleteQuestion(qi)}
                  className="btn-ghost p-1.5 hover:text-red-400 hover:bg-red-500/10"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Options for choice questions */}
            {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
              <div className="ml-7 space-y-2 mb-3">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <div className={cn(
                      "w-3.5 h-3.5 border border-white/20 shrink-0",
                      q.type === "SINGLE_CHOICE" ? "rounded-full" : "rounded-sm"
                    )} />
                    <input
                      value={opt.text}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`Opción ${oi + 1}`}
                      className="input flex-1 py-1.5 text-sm"
                    />
                    {q.options.length > 2 && (
                      <button
                        onClick={() => deleteOption(qi, oi)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 20 && (
                  <button
                    onClick={() => addOption(qi)}
                    className="ml-5 text-xs text-white/30 hover:text-torx-red transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={12} /> Agregar opción
                  </button>
                )}
              </div>
            )}

            {/* Text preview */}
            {q.type === "TEXT" && (
              <div className="ml-7 mb-3">
                <div className="h-16 bg-white/3 border border-white/10 rounded-lg flex items-center px-3">
                  <span className="text-xs text-white/20 italic">El respondente escribirá acá...</span>
                </div>
              </div>
            )}

            {/* Rating / NPS scale labels */}
            {(q.type === "RATING" || q.type === "NPS") && (
              <div className="ml-7 mb-3 flex items-center gap-3">
                <input
                  value={q.minLabel ?? ""}
                  onChange={(e) => updateQuestion(qi, { minLabel: e.target.value })}
                  placeholder={q.type === "NPS" ? "Nada probable" : "Muy malo"}
                  className="input text-xs py-1.5 w-36"
                />
                <div className="flex gap-1">
                  {Array.from({ length: q.type === "NPS" ? 11 : (q.maxValue ?? 5) - (q.minValue ?? 1) + 1 }).map((_, i) => (
                    <div key={i} className="w-7 h-7 bg-white/5 border border-white/10 rounded text-[10px] text-white/30 flex items-center justify-center">
                      {(q.minValue ?? (q.type === "NPS" ? 0 : 1)) + i}
                    </div>
                  ))}
                </div>
                <input
                  value={q.maxLabel ?? ""}
                  onChange={(e) => updateQuestion(qi, { maxLabel: e.target.value })}
                  placeholder={q.type === "NPS" ? "Muy probable" : "Excelente"}
                  className="input text-xs py-1.5 w-36"
                />
              </div>
            )}

            {/* Required toggle */}
            <div className="ml-7 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={q.isRequired}
                    onChange={(e) => updateQuestion(qi, { isRequired: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-white/10 rounded-full peer peer-checked:bg-torx-red transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-3" />
                </div>
                <span className="text-xs text-white/35">Obligatoria</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Add question buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {(Object.keys(TYPE_LABELS) as QType[]).map((type) => (
          <button
            key={type}
            onClick={() => addQuestion(type)}
            className="border border-dashed border-white/15 hover:border-torx-red/40 hover:bg-torx-red/5 text-white/40 hover:text-torx-red text-xs font-medium py-2.5 px-3 rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5"
          >
            <Plus size={12} />
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
