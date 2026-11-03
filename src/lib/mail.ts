import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "./db";

// APP_URL tem prioridade; na Vercel, sem ele, usa o domínio de produção do projeto.
const appUrl = () =>
  process.env.APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
export const absoluteUrl = (path: string) => `${appUrl()}${path}`;

let transporter: nodemailer.Transporter | null | undefined;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  transporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Layout padrão dos e-mails da PLAYBOY STORE. `body` deve ser HTML já seguro. */
export function emailLayout(title: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#080808;font-family:Arial,Helvetica,sans-serif;color:#e5e5e5">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111;border:1px solid #222;border-radius:12px">
  <tr><td style="padding:28px 32px;border-bottom:1px solid #222;font-weight:800;letter-spacing:4px;color:#fff;font-size:14px">PLAYBOY STORE</td></tr>
  <tr><td style="padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px;color:#fff">${escape(title)}</h1>
    <div style="font-size:15px;line-height:1.6;color:#bdbdbd">${body}</div>
    ${cta ? `<p style="margin:28px 0 0"><a href="${cta.url}" style="display:inline-block;background:#fff;color:#080808;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">${escape(cta.label)}</a></p>
    <p style="margin:18px 0 0;font-size:12px;color:#777">Se o botão não funcionar, copie este link: ${cta.url}</p>` : ""}
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #222;font-size:12px;color:#666">© ${new Date().getFullYear()} PLAYBOY STORE. Este é um e-mail automático.</td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  let status = "logged";
  if (t) {
    try {
      await t.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
      status = "sent";
    } catch (err) {
      console.error("[mail] falha no envio", err);
      status = "failed";
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log(`[mail] (sem SMTP) Para: ${to} | Assunto: ${subject} — veja em /admin/emails`);
  }
  await prisma.emailMessage.create({ data: { to, subject, html, status } });
}

export { escape as escapeHtml };
