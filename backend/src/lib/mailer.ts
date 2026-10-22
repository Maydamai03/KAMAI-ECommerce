import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isMailConfigured, mailConfig } from "../config/mail";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.port === 465,
      auth: { user: mailConfig.user, pass: mailConfig.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Mengembalikan true bila terkirim. Tidak pernah melempar error. */
export async function sendMail(input: MailInput): Promise<boolean> {
  if (!isMailConfigured()) {
    console.warn(`[mail] SMTP belum dikonfigurasi, email "${input.subject}" dilewati`);
    return false;
  }

  try {
    await getTransporter().sendMail({ from: mailConfig.from, ...input });
    console.log(`[mail] terkirim: ${input.subject}`);
    return true;
  } catch (e) {
    console.error(`[mail] gagal mengirim "${input.subject}":`, e instanceof Error ? e.message : e);
    return false;
  }
}