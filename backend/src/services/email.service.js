import nodemailer from "nodemailer";

const FROM_NAME = "Vitery Barber";

// =====================================================
// Envío genérico: usa el primer proveedor configurado
// (Apps Script → Brevo → Gmail → consola en desarrollo)
// =====================================================

// Traduce los errores típicos de Brevo a algo que se pueda arreglar
const brevoHint = (status, body) => {
  const text = String(body || "").toLowerCase();

  if (status === 401 && (text.includes("ip") || text.includes("unrecognised"))) {
    return (
      "Brevo bloqueó la IP del servidor. Ve a Brevo → Security → Authorised IPs " +
      "y desactiva el bloqueo por IP (Render usa IPs que cambian)."
    );
  }
  if (status === 401) {
    return "BREVO_API_KEY inválida o mal copiada. Genera una nueva en Brevo → SMTP & API → API Keys.";
  }
  if (text.includes("sender") || text.includes("not valid") || text.includes("not been validated")) {
    return (
      "El remitente EMAIL_FROM no está verificado en Brevo. Ve a Brevo → Senders, " +
      "Domains & Dedicated IPs → Senders y confirma ese correo."
    );
  }
  if (status === 403 || text.includes("not enabled") || text.includes("account")) {
    return "La cuenta de Brevo aún no está activada para enviar correos transaccionales (revisa el correo de Brevo o contacta a su soporte).";
  }
  if (status === 402 || text.includes("limit") || text.includes("quota")) {
    return "Se superó el límite diario de envíos de Brevo.";
  }
  return "";
};

const sendWithBrevo = async ({ to, nombre, subject, text, html }) => {
  const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();
  const EMAIL_FROM = (process.env.EMAIL_FROM || "").trim();

  if (!EMAIL_FROM) {
    throw new Error("Falta EMAIL_FROM (el remitente verificado en Brevo)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let response;

  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: EMAIL_FROM },
        to: [{ email: to, name: nombre }],
        subject,
        textContent: text,
        htmlContent: html
      })
    });
  } catch (error) {
    throw new Error(
      error.name === "AbortError"
        ? "Brevo no respondió a tiempo (15 s)"
        : `No se pudo conectar con Brevo: ${error.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    const hint = brevoHint(response.status, body);

    throw new Error(
      `Brevo ${response.status}: ${body}${hint ? `\n   → CAUSA PROBABLE: ${hint}` : ""}`
    );
  }
};

const sendWithGmail = async ({ to, subject, text, html }) => {
  const { EMAIL_HOST = "smtp.gmail.com", EMAIL_PORT = "465", EMAIL_USER, EMAIL_PASS } =
    process.env;

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
};

const sendWithAppsScript = async ({ to, subject, text, html }) => {
  const { APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN } = process.env;

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: APPS_SCRIPT_TOKEN, to, subject, text, html })
  });

  const body = await response.text();

  if (!response.ok || body.trim() !== "ok") {
    throw new Error(`AppsScript ${response.status}: ${body.slice(0, 200)}`);
  }
};

export const sendEmail = async (message) => {
  const { BREVO_API_KEY, EMAIL_USER, EMAIL_PASS, NODE_ENV, APPS_SCRIPT_URL } =
    process.env;

  if (APPS_SCRIPT_URL) return sendWithAppsScript(message);

  if (BREVO_API_KEY) return sendWithBrevo(message);

  if (EMAIL_USER && EMAIL_PASS) return sendWithGmail(message);

  if (NODE_ENV === "production") {
    throw new Error("Falta BREVO_API_KEY en las variables de entorno");
  }

  console.log(
    `\n[EMAIL - MODO DESARROLLO] Para ${message.to}\nAsunto: ${message.subject}\n${message.text}\n`
  );
};


// =====================================================
// Recuperar contraseña (igual que antes)
// =====================================================

export const sendResetCode = async (to, nombre, code) =>
  sendEmail({
    to,
    nombre,
    subject: "Código para recuperar tu contraseña",
    text: `Hola ${nombre}, tu código es ${code}. Vence en 10 minutos. Si no lo pediste, ignora este mensaje.`,
    html: `
  <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
    <h2>Recuperar contraseña</h2>
    <p>Hola ${nombre}, usa este código para crear una contraseña nueva:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
    <p style="color:#666">Vence en 10 minutos. Si no lo pediste, ignora este mensaje.</p>
  </div>`
  });


// =====================================================
// Aviso de nueva cita al barbero
// =====================================================

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const sendNewAppointmentEmail = async (to, barberoNombre, cita) => {
  const {
    cliente, telefono, servicio, fecha, hora, precio
  } = cita;

  const text =
    `Hola ${barberoNombre}, tienes una nueva cita.\n\n` +
    `Cliente: ${cliente}\n` +
    (telefono ? `Teléfono: ${telefono}\n` : "") +
    `Servicio: ${servicio}\n` +
    `Fecha: ${fecha}\n` +
    `Hora: ${hora}\n` +
    `Precio: ${precio}`;

  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666">${label}</td>` +
    `<td style="padding:6px 0"><strong>${esc(value)}</strong></td></tr>`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:auto">
    <h2 style="margin-bottom:4px">✂️ Nueva cita agendada</h2>
    <p>Hola ${esc(barberoNombre)}, un cliente acaba de reservar contigo:</p>
    <table style="border-collapse:collapse;font-size:15px">
      ${row("Cliente", cliente)}
      ${telefono ? row("Teléfono", telefono) : ""}
      ${row("Servicio", servicio)}
      ${row("Fecha", fecha)}
      ${row("Hora", hora)}
      ${row("Precio", precio)}
    </table>
  </div>`;

  return sendEmail({
    to,
    nombre: barberoNombre,
    subject: `Nueva cita: ${cliente} - ${fecha} ${hora}`,
    text,
    html
  });
};
