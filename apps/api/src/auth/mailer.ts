/**
 * Nodemailer transport for OTP + invite emails. Uses SMTP creds from validated env
 * (SES-backed in prod). Falls back to logging when SMTP is unconfigured (local dev).
 */

import nodemailer from "nodemailer";
import { env } from "@techno-deployer/env";

const transport =
  env.SMTP_HOST && env.SMTP_USER
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

async function send(to: string, subject: string, text: string): Promise<void> {
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, text });
}

export function sendOtpEmail(email: string, otp: string, type: string): Promise<void> {
  return send(
    email,
    "Your Techno-Deployer sign-in code",
    `Your ${type} code is: ${otp}\n\nIt expires shortly. If you didn't request this, ignore this email.`,
  );
}

export function sendInviteEmail(email: string, url: string): Promise<void> {
  return send(
    email,
    "You're invited to Techno-Deployer",
    `You've been invited. Accept your invite and sign in here:\n${url}`,
  );
}

export function sendAlertEmail(email: string, subject: string, body: string): Promise<void> {
  return send(email, subject, body);
}

export function sendDeployEmail(
  email: string,
  projectName: string,
  state: "ready" | "failed",
  url?: string,
): Promise<void> {
  const ok = state === "ready";
  return send(
    email,
    `Deploy ${ok ? "succeeded" : "failed"}: ${projectName}`,
    ok
      ? `Your deployment of "${projectName}" is live${url ? ` at ${url}` : ""}.`
      : `Your deployment of "${projectName}" failed. Check the build/deploy logs.`,
  );
}
