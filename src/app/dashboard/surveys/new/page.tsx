"use client";
// src/app/dashboard/surveys/new/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

// Definir el tipo del formulario directamente (sin pasar por Zod resolver)
// Validación del servidor via Zod es suficiente para producción
interface FormValues {
  title: string;
  description?: string;
  senderName: string;
  emailSubject: string;
  thankYouMessage?: string;
  showProgressBar: boolean;
  allowMultipleResponses: boolean;
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      senderName: "Equipo Torx",
      emailSubject: "{{nombre}}, te pedimos 2 minutos",
      thankYouMessage: "¡Gracias por tu respuesta! Tu opinión nos ayuda a mejorar.",
      showProgressBar: true,
      allowMultipleResponses: false,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setServerError("");
    if (!data.title?.trim()) { setServerError("El título es requerido"); return; }
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Error al crear la encuesta");
      return;
    }
    const { data: survey } = await res.json();
    router.push(`/dashboard/surveys/${survey.id}`);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/dashboard/surveys" className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
        <ArrowLeft size={14} /> Volver a encuestas
      </Link>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-torx-red mb-1">Nueva encuesta</p>
        <h1 className="text-2xl font-semibold text-white">Configuración general</h1>
        <p className="text-sm text-white/40 mt-1">Podés editar todo esto después.</p>
      </div>

      {serverError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div>
          <label className="label">Título *</label>
          <input {...register("title", { required: "El título es requerido", minLength: { value: 3, message: "Mínimo 3 caracteres" } })} placeholder="ej: NPS Clientes Q1 2026" className="input" />
          {errors.title && <p className="mt-1.5 text-xs text-red-400">{errors.title.message}</p>}
        </div>
        <div>
          <label className="label">Descripción interna</label>
          <textarea {...register("description")} rows={2} placeholder="Nota interna, no visible para el respondente" className="input resize-none" />
        </div>
        <div className="divider" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Configuración del mail</p>
        <div>
          <label className="label">Nombre del remitente *</label>
          <input {...register("senderName", { required: true })} className="input" />
        </div>
        <div>
          <label className="label">Asunto del mail *</label>
          <input {...register("emailSubject", { required: true })} className="input" />
          <p className="mt-1.5 text-xs text-white/30">Usá <code className="text-torx-red bg-torx-red/10 px-1 rounded">{"{{nombre}}"}</code> para personalizar.</p>
        </div>
        <div>
          <label className="label">Mensaje de agradecimiento</label>
          <textarea {...register("thankYouMessage")} rows={2} className="input resize-none" />
        </div>
        <div className="divider" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Opciones</p>
        <div className="space-y-3">
          {(["showProgressBar", "allowMultipleResponses"] as const).map((name) => (
            <label key={name} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" {...register(name)} className="sr-only peer" />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-torx-red transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-white/60">
                {name === "showProgressBar" ? "Mostrar barra de progreso" : "Permitir múltiples respuestas"}
              </span>
            </label>
          ))}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
          {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Crear y agregar preguntas <ArrowRight size={15} /></>}
        </button>
      </form>
    </div>
  );
}
