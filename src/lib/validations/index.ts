// src/lib/validations/index.ts — Zod v4
import { z } from "zod";

// ===========================
// AUTH
// ===========================
export const loginSchema = z.object({
  email:    z.string().email("Email inválido").toLowerCase().trim(),
  password: z.string().min(1, "Contraseña requerida").max(128),
});

export const registerSchema = z.object({
  name:            z.string().min(2, "Mínimo 2 caracteres").max(80).trim(),
  email:           z.string().email("Email inválido").toLowerCase().trim(),
  password:        z.string()
    .min(8, "Mínimo 8 caracteres").max(128)
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener un carácter especial"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// ===========================
// SURVEYS
// ===========================
export const createSurveySchema = z.object({
  title:                 z.string().min(3, "Mínimo 3 caracteres").max(120).trim(),
  description:           z.string().max(500).optional(),
  senderName:            z.string().min(2).max(80).trim(),
  emailSubject:          z.string().min(5).max(200).trim(),
  thankYouMessage:       z.string().max(500).optional(),
  showProgressBar:       z.boolean().default(true),
  allowMultipleResponses: z.boolean().default(false),
  // Zod v4: iso() reemplaza a datetime() en algunos casos, pero datetime() sigue funcionando
  expiresAt:             z.string().datetime().optional().nullable(),
});

export const updateSurveySchema = createSurveySchema.partial();

// ===========================
// QUESTIONS
// ===========================
const questionOptionSchema = z.object({
  id:    z.string().optional(),
  text:  z.string().min(1).max(300).trim(),
  order: z.number().int().min(0),
});

export const questionSchema = z.object({
  id:         z.string().optional(),
  type:       z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "RATING", "NPS"]),
  text:       z.string().min(3, "La pregunta es muy corta").max(500).trim(),
  isRequired: z.boolean().default(false),
  order:      z.number().int().min(0),
  minValue:   z.number().int().optional().nullable(),
  maxValue:   z.number().int().optional().nullable(),
  minLabel:   z.string().max(50).optional().nullable(),
  maxLabel:   z.string().max(50).optional().nullable(),
  options:    z.array(questionOptionSchema).max(20).optional(),
}).refine((q) => {
  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(q.type)) {
    return (q.options?.length ?? 0) >= 2;
  }
  return true;
}, { message: "Las preguntas de opción múltiple necesitan al menos 2 opciones", path: ["options"] });

export const saveQuestionsSchema = z.object({
  surveyId:  z.string().cuid(),
  questions: z.array(questionSchema).min(1).max(30),
});

// ===========================
// RECIPIENTS
// ===========================
export const recipientSchema = z.object({
  name:  z.string().min(2).max(120).trim(),
  email: z.string().email().toLowerCase().trim(),
});

export const addRecipientsSchema = z.object({
  surveyId:   z.string().cuid(),
  recipients: z.array(recipientSchema).min(1).max(500),
});

// ===========================
// RESPONSES (público)
// ===========================
export const answerSchema = z.object({
  questionId:       z.string().cuid(),
  textValue:        z.string().max(2000).optional().nullable(),
  numberValue:      z.number().int().min(0).max(10).optional().nullable(),
  selectedOptionId: z.string().cuid().optional().nullable(),
});

export const submitResponseSchema = z.object({
  token:   z.string().min(10).max(60),
  answers: z.array(answerSchema).min(1).max(30),
});

// ===========================
// TIPOS INFERIDOS
// ===========================
export type LoginInput          = z.infer<typeof loginSchema>;
export type RegisterInput        = z.infer<typeof registerSchema>;
export type CreateSurveyInput    = z.infer<typeof createSurveySchema>;
export type QuestionInput        = z.infer<typeof questionSchema>;
export type RecipientInput       = z.infer<typeof recipientSchema>;
export type SubmitResponseInput  = z.infer<typeof submitResponseSchema>;