import { z } from "zod";
import { parseMoneyToCents } from "./format";

// ───────── Primitivos

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} é obrigatório.` })
    .trim()
    .min(min, min === 1 ? `${label} é obrigatório.` : `${label} deve ter ao menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

export const emailSchema = z
  .string({ required_error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .email("E-mail inválido.")
  .max(160);

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .regex(/[a-zA-Z]/, "A senha deve conter letras.")
  .regex(/[0-9]/, "A senha deve conter números.");

const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const cents = parseMoneyToCents(v);
      if (!Number.isFinite(cents) || cents < 0) {
        ctx.addIssue({ code: "custom", message: `${label} inválido.` });
        return z.NEVER;
      }
      return cents;
    });

const intInRange = (label: string, min: number, max: number) =>
  z.coerce
    .number({ invalid_type_error: `${label} inválido.` })
    .int(`${label} deve ser um número inteiro.`)
    .min(min, `${label} mínimo: ${min}.`)
    .max(max, `${label} máximo: ${max}.`);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

const imagePath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Use um caminho local (/uploads/...) ou uma URL https.");

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || v.startsWith("/") || /^https?:\/\//.test(v), "URL inválida.");

const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal (#RRGGBB).");

const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Data inválida." });
      return z.NEVER;
    }
    return d;
  });

// ───────── Autenticação

export const registerSchema = z
  .object({
    name: trimmed(2, 80, "Nome"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: checkbox.refine((v) => v, "Você precisa aceitar os termos de uso."),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha.").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ token: z.string().min(10), password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

export const profileSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[0-9()+\-\s]{8,20}$/.test(v), "Telefone inválido."),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Informe a senha atual."), password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

// ───────── Loja

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: intInRange("Nota", 1, 5),
  comment: trimmed(5, 1000, "Comentário"),
});

export const leadSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  email: emailSchema,
  interest: optionalText(300),
  source: z.string().trim().max(60).default("Site"),
});

// ───────── CPF / CNPJ / telefone

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function validCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + w * Number(cnpj[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

/** CPF ou CNPJ válido, normalizado para somente números. */
export const documentSchema = z
  .string({ required_error: "Informe seu CPF ou CNPJ." })
  .transform(onlyDigits)
  .refine((v) => validCpf(v) || validCnpj(v), "CPF ou CNPJ inválido.");

/** Telefone brasileiro com DDD (10 ou 11 dígitos), normalizado para somente números. */
export const phoneDigitsSchema = z
  .string({ required_error: "Informe seu telefone com DDD." })
  .transform((v) => onlyDigits(v).replace(/^55(?=\d{10,11}$)/, ""))
  .refine((v) => /^[1-9]{2}9?\d{8}$/.test(v), "Telefone inválido. Use DDD + número.");

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "BOLETO"], { errorMap: () => ({ message: "Escolha um método de pagamento." }) }),
  notes: optionalText(500),
  acceptTerms: checkbox.refine((v) => v, "Você precisa aceitar os termos de compra."),
});

// ───────── Admin

export const specsSchema = z
  .string()
  .optional()
  .transform((raw) => {
    if (!raw) return [] as { label: string; value: string }[];
    return raw
      .split(/\r?\n/)
      .map((line) => line.split(":"))
      .filter((parts) => parts.length >= 2 && parts[0].trim())
      .map(([label, ...rest]) => ({ label: label.trim().slice(0, 60), value: rest.join(":").trim().slice(0, 200) }))
      .slice(0, 20);
  });

export const productSchema = z.object({
  name: trimmed(3, 120, "Nome"),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Slug deve conter apenas letras minúsculas, números e hífens."),
  shortDescription: trimmed(10, 200, "Descrição curta"),
  description: trimmed(20, 8000, "Descrição"),
  price: money("Preço").refine((c) => c > 0, "O preço deve ser maior que zero."),
  discountPercent: intInRange("Desconto", 0, 90),
  sku: optionalText(40),
  stock: intInRange("Estoque", 0, 1_000_000),
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  platform: optionalText(60),
  deliveryType: trimmed(3, 80, "Tipo de entrega"),
  specs: specsSchema,
  active: checkbox,
  featured: checkbox,
  manualDelivery: checkbox,
  images: z.array(imagePath).max(10, "Máximo de 10 imagens."),
});

// ───────── Atendimento

export const ticketMessageSchema = z.object({
  body: z
    .string({ required_error: "Escreva sua mensagem." })
    .trim()
    .min(1, "Escreva sua mensagem.")
    .max(4000, "Mensagem muito longa (máximo de 4.000 caracteres)."),
});

export const newTicketSchema = ticketMessageSchema.extend({
  subject: trimmed(3, 120, "Assunto"),
  orderNumber: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(/\D/g, "")) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Pedido inválido."),
});

export const categorySchema = z.object({
  name: trimmed(2, 60, "Nome"),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Slug inválido."),
  description: optionalText(300),
  imageUrl: optionalUrl,
  sortOrder: intInRange("Ordem", 0, 9999),
  active: checkbox,
});

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use 3–30 caracteres: letras, números, _ ou -."),
    description: optionalText(200),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.string().trim(),
    minOrder: money("Pedido mínimo"),
    maxUses: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Limite de usos inválido."),
    startsAt: optionalDate,
    expiresAt: optionalDate,
    active: checkbox,
  })
  .transform((d, ctx) => {
    let value: number;
    if (d.type === "PERCENT") {
      value = Number(d.value);
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Percentual entre 1 e 100." });
        return z.NEVER;
      }
    } else {
      value = parseMoneyToCents(d.value);
      if (!Number.isFinite(value) || value <= 0) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Valor de desconto inválido." });
        return z.NEVER;
      }
    }
    if (d.startsAt && d.expiresAt && d.expiresAt <= d.startsAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "A expiração deve ser após o início." });
      return z.NEVER;
    }
    return { ...d, value };
  });

export const leadAdminSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  email: emailSchema,
  source: trimmed(2, 60, "Origem"),
  interest: optionalText(300),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "LOST"]),
  notes: optionalText(2000),
});

export const bannerSchema = z.object({
  title: trimmed(3, 100, "Título"),
  subtitle: optionalText(200),
  imageUrl: optionalUrl,
  ctaLabel: optionalText(40),
  ctaUrl: optionalUrl,
  sortOrder: intInRange("Ordem", 0, 9999),
  active: checkbox,
});

export const storeSettingsSchema = z.object({
  storeName: trimmed(2, 60, "Nome da loja"),
  tagline: trimmed(2, 140, "Slogan"),
  contactEmail: emailSchema,
  contactPhone: optionalText(30),
  whatsapp: optionalText(30),
  companyName: optionalText(120),
  companyDocument: optionalText(30),
  address: optionalText(200),
  businessHours: optionalText(120),
  instagramUrl: optionalUrl,
  discordUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

export const themeSettingsSchema = z.object({ logoUrl: optionalUrl, accentColor: hexColor, backgroundColor: hexColor });

export const notificationSettingsSchema = z.object({
  notifyNewOrder: checkbox,
  notifyNewLead: checkbox,
  notifyLowStock: checkbox,
  lowStockThreshold: intInRange("Limite de estoque baixo", 0, 1000),
  notificationEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, "E-mail inválido."),
  purchasePopupEnabled: checkbox,
  purchasePopupMinutes: intInRange("Intervalo", 1, 1440),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"]),
  note: optionalText(300),
});

// ───────── Utilitários

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  redirectTo?: string;
};

export function formToObject(formData: FormData) {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) obj[key] = value;
  }
  return obj;
}

export function zodErrors(error: z.ZodError): ActionState {
  return { ok: false, error: "Revise os campos destacados.", fieldErrors: error.flatten().fieldErrors as FieldErrors };
}
