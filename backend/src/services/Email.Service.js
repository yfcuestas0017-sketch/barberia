
import nodemailer from "nodemailer";

const subject = "Código para recuperar tu contraseña";

const buildText = (nombre, code) =>
  `Hola ${nombre}, tu código es ${code}. Vence en 10 minutos. Si no lo pediste, ignora este mensaje.`;

const buildHtml = (nombre, code) => `
  <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
    <h2>Recuperar contraseña</h2>
    <p>Hola ${nombre}, usa este código para crear una contraseña nueva:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
    <p style="color:#666">Vence en 10 minutos. Si no lo pediste, ignora este mensaje.</p>
  </div>`;

const sendWithBrevo = async (to, nombre, code) => {
  const { BREVO_API_KEY, EMAIL_FROM } = process.env;

  if (!EMAIL_FROM) {
    throw new Error("Falta EMAIL_FROM (el remitente verificado en Brevo)");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      sender: { name: "Barbería Bitery Barber", email: EMAIL_FROM },
      to: [{ email: to, name: nombre }],
      subject,
      textContent: buildText(nombre, code),
      htmlContent: buildHtml(nombre, code)
    })
  });

  if (!response.ok) {
    throw new Error(`Brevo ${response.status}: ${await response.text()}`);
  }
};

const sendWithGmail = async (to, nombre, code) => {
  const { EMAIL_HOST = "smtp.gmail.com", EMAIL_PORT = "465", EMAIL_USER, EMAIL_PASS } =
    process.env;

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });

  await transporter.sendMail({
    from: `"Barbería Bitery Barber" <${EMAIL_USER}>`,
    to,
    subject,
    text: buildText(nombre, code),
    html: buildHtml(nombre, code)
  });
};

export const sendResetCode = async (to, nombre, code) => {
  const { BREVO_API_KEY, EMAIL_USER, EMAIL_PASS, NODE_ENV } = process.env;

  if (BREVO_API_KEY) return sendWithBrevo(to, nombre, code);

  if (EMAIL_USER && EMAIL_PASS) return sendWithGmail(to, nombre, code);

  if (NODE_ENV === "production") {
    throw new Error("Falta BREVO_API_KEY en las variables de entorno");
  }

  console.log(`\n[EMAIL - MODO DESARROLLO] Código para ${to}: ${code}\n`);
};
