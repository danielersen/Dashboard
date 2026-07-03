import nodemailer from "nodemailer";

export async function sendMail(env, body = {}) {
  if (!env?.EMAIL || !env?.SMTP_HOST || !env?.SMTP_PASSWORD || !env?.SMTP_PORT) {
    throw new Error("Missing SMTP configuration");
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.EMAIL,
      pass: env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"${body.fromName || "Dahsboard"}" <${env.EMAIL}>`,
    to: body.to || env.EMAIL,
    subject: body.subject || "Notification",
    text: body.text || body.message || "",
    html: body.html || null,
  };

  return transporter.sendMail(mailOptions);
}

export default sendMail;

