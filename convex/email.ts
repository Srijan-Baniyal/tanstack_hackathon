"use node";

import nodemailer from "nodemailer";

const optionalEnv = (name: string): string | null => {
  const value = process.env[name as keyof typeof process.env] as
    | string
    | undefined;
  if (!value) return null;
  return value;
};

const requireEnv = (name: string): string => {
  const value = optionalEnv(name);
  if (value) return value;
  if (process.env.NODE_ENV !== "production") {
    globalThis.console?.warn?.(
      `Email disabled in dev: missing ${name}. Set SMTP_* envs to enable email sending.`
    );
    return ""; // Will be checked by callers
  }
  throw new Error(`Missing required environment variable: ${name}`);
};

const buildTransport = () => {
  const host = optionalEnv("SMTP_HOST");
  const portRaw = optionalEnv("SMTP_PORT");
  const user = optionalEnv("SMTP_USER");
  const pass = optionalEnv("SMTP_PASS");

  if (!host || !portRaw || !user || !pass) {
    if (process.env.NODE_ENV !== "production") {
      globalThis.console?.warn?.(
        "SMTP not configured; skipping email sends in development."
      );
      return null;
    }
    throw new Error(
      "Missing SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)."
    );
  }

  const port = parseInt(portRaw, 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const transporter = buildTransport();
  if (!transporter) return; // Dev: silently skip

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const from = requireEnv("SMTP_FROM") || "";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

  const text = `You requested a password reset. Use the following link to choose a new password: ${resetUrl}`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a></p>
    <p>If you did not request this change, you can safely ignore this email.</p>
  `;

  await transporter.sendMail({
    to: email,
    from,
    subject: "Reset your password",
    text,
    html,
  });
};
