"use client";
// src/components/admin/RecipientsPanel.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Upload, CheckCircle2, Mail, Clock, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipient {
  id: string;
  name: string;
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  PENDING:   { label: "Pendiente", color: "text-white/30", icon: Clock },
  SENT:      { label: "Enviado",   color: "text-blue-400",  icon: Mail },
  OPENED:    { label: "Abierto",   color: "text-amber-400", icon: Eye },
  COMPLETED: { label: "Respondió", color: "text-green-400", icon: CheckCircle2 },
  BOUNCED:   { label: "Rebotó",    color: "text-red-400",   icon: Trash2 },
};

interface Props {
  surveyId: string;
  initialRecipients: Recipient[];
}

export function RecipientsPanel({ surveyId, initialRecipients }: Props) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [showCsv, setShowCsv] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: [{ name: name.trim(), email: email.trim() }] }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error"); return; }
      setRecipients((prev) => [...prev, ...json.data]);
      setName(""); setEmail("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  };

  const handleCsvImport = async () => {
    const rows = csvText.trim().split("\n").map((line) => {
      const [rawName, rawEmail] = line.split(",").map((s) => s.trim());
      return { name: rawName, email: rawEmail };
    }).filter((r) => r.name && r.email && r.email.includes("@"));

    if (rows.length === 0) { setError("No se encontraron filas válidas. Formato: Nombre,email@dominio.com"); return; }

    setImporting(true);
    setError("");
    try {
      const res = await fetch(`/api/surveys/${surveyId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: rows }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error"); return; }
      setRecipients((prev) => [...prev, ...json.data]);
      setCsvText(""); setShowCsv(false);
      router.refresh();
    } finally {
      setImporting(false);
    }
  };

  const initials = (name: string) =>
    name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k] = recipients.filter((r) => r.status === k).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Stats bar */}
      {recipients.length > 0 && (
        <div className="flex gap-4 mb-6 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([k, { label, color }]) => (
            statusCounts[k] > 0 && (
              <div key={k} className="flex items-center gap-1.5">
                <span className={cn("text-base font-semibold", color)}>{statusCounts[k]}</span>
                <span className="text-xs text-white/30">{label}</span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add single */}
      <div className="card mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Agregar destinatario</p>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            className="input flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@empresa.com"
            type="email"
            className="input flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim() || !email.trim()}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            {adding
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <UserPlus size={15} />
            }
            Agregar
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <button
          onClick={() => setShowCsv(!showCsv)}
          className="mt-3 flex items-center gap-2 text-xs text-white/30 hover:text-torx-red transition-colors"
        >
          <Upload size={12} /> Importar desde CSV
        </button>

        {showCsv && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-white/30">Una fila por línea: <code className="text-torx-red bg-torx-red/10 px-1 rounded">Nombre Apellido,email@dominio.com</code></p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              placeholder={"Juan García,juan@empresa.com\nMaría López,maria@otra.com"}
              className="input font-mono text-xs resize-none"
            />
            <button onClick={handleCsvImport} disabled={importing || !csvText.trim()} className="btn-primary text-xs px-4 py-2 flex items-center gap-2">
              {importing
                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Upload size={12} />
              }
              Importar
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {recipients.length === 0 ? (
        <div className="card border-dashed border-white/10 text-center py-10">
          <p className="text-white/30 text-sm">No hay destinatarios todavía.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {recipients.map((r) => {
            const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = sc.icon;
            return (
              <div key={r.id} className="card py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-torx-red/15 flex items-center justify-center text-[11px] font-semibold text-torx-red shrink-0">
                  {initials(r.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{r.name}</p>
                  <p className="text-xs text-white/30 truncate">{r.email}</p>
                </div>
                <div className={cn("flex items-center gap-1.5 text-xs font-medium", sc.color)}>
                  <StatusIcon size={12} />
                  {sc.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
