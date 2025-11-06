import nodemailer from "nodemailer";

const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const buildTransport = () => {
  const host = requireEnv(process.env.SMTP_HOST, "SMTP_HOST");
  const port = parseInt(requireEnv(process.env.SMTP_PORT, "SMTP_PORT"), 10);
  const user = requireEnv(process.env.SMTP_USER, "SMTP_USER");
  const pass = requireEnv(process.env.SMTP_PASS, "SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const transporter = buildTransport();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const from = requireEnv(process.env.SMTP_FROM, "SMTP_FROM");
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
