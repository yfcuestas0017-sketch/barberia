# Guía de producción: Neon + Render + Vercel (todo gratis)

Orden: **1 Neon → 2 Cloudinary → 3 Brevo → 4 GitHub → 5 Render → 6 Vercel → 7 volver a Render**

---

## 1. Base de datos en Neon

1. Crea cuenta en neon.tech → **New Project** (nombre: barberia).
2. En el panel copia el **Connection string** (termina en `?sslmode=require`). Ese es tu `DATABASE_URL`.
3. **Pasar tus datos de local a Neon.** El proyecto solo trae migraciones (001–004), no la
   estructura base, así que hay que copiar tu base local completa:

   **Opción A – pgAdmin:** clic derecho en tu base → *Backup…* → Format: **Plain** →
   marca *Only schema* + *Data* (todo) y desmarca *Owner* y *Privilege* → guarda el `.sql`.
   Luego en Neon abre **SQL Editor**, pega el contenido y ejecuta
   (si es muy grande, usa la opción B).

   **Opción B – terminal:**
   ```bash
   pg_dump --no-owner --no-privileges "TU_DATABASE_URL_LOCAL" > barberia.sql
   psql "TU_DATABASE_URL_DE_NEON" -f barberia.sql
   ```
4. Verifica en Neon (*Tables*) que existan `usuarios`, `codigos_recuperacion`, etc.

> Las fotos que subiste en local tienen URLs `http://localhost:5000/uploads/...` y NO se verán en
> producción. Vuelve a subirlas desde el panel de administrador (ya se guardarán en Cloudinary).

## 2. Imágenes en Cloudinary

El disco de Render se borra en cada deploy, por eso las fotos van a Cloudinary.
1. Cuenta en cloudinary.com (gratis) → en el *Dashboard* copia **Cloud name**, **API Key** y **API Secret**.

## 3. Correos en Brevo (gratis, 300/día)

Render gratis **bloquea el SMTP** (Gmail), por eso en producción se usa la API de Brevo por HTTPS.
1. Cuenta en brevo.com.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: pon el correo desde el que enviarás
   y confírmalo con el enlace que te llega. Ese correo es tu `EMAIL_FROM`.
3. **SMTP & API → API Keys → Generate a new API key**. Es tu `BREVO_API_KEY`.

> Si el remitente es un @gmail.com, algunos correos pueden caer en spam (Gmail restringe que otros
> servicios envíen "como Gmail"). Lo ideal a futuro es un dominio propio verificado en Brevo.

## 4. Subir el código a GitHub

En la carpeta `barberia` (la que contiene `backend` y `frontend`):
```bash
git init
git add .
git commit -m "Barbería lista para producción"
```
Crea un repositorio **privado** en github.com y sigue las instrucciones para hacer `git push`.
El `.gitignore` ya excluye tus `.env` (no se suben las claves).

## 5. Backend en Render

1. render.com → **New → Web Service** → conecta tu repo.
2. Configura:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
3. En **Environment** agrega:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | el de Neon |
   | `JWT_SECRET` | texto largo aleatorio **nuevo** (no el de local) |
   | `FRONTEND_URL` | por ahora `http://localhost:5173` (lo cambias en el paso 7) |
   | `BACKEND_URL` | la URL que te dé Render (ej. `https://barberia-api.onrender.com`) |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | los del paso 2 |
   | `BREVO_API_KEY` | el del paso 3 |
   | `EMAIL_FROM` | el remitente verificado en Brevo |

4. Deploy. Prueba abrir `https://TU-API.onrender.com/api/health` → debe responder `{"ok":true,...}`.

(Opcional: el archivo `render.yaml` de la raíz permite crear el servicio como *Blueprint*.)

## 6. Frontend en Vercel

1. vercel.com → **Add New → Project** → importa el mismo repo.
2. Configura:
   - **Root Directory:** `frontend`
   - Framework: Vite (lo detecta solo)
3. En **Environment Variables**:
   - `VITE_API_URL` = `https://TU-API.onrender.com/api`  (con `/api` al final)
4. Deploy. Vercel te da una URL como `https://barberia-xxxx.vercel.app`.
   (`vercel.json` ya evita el error 404 al recargar rutas como /login.)

## 7. Conectar los dos (CORS)

En Render → Environment cambia `FRONTEND_URL` por la URL de Vercel, **sin "/" al final**:
`https://barberia-xxxx.vercel.app`  (puedes poner varias separadas por coma, ej. tu dominio propio).
Render redeploya solo. Si cambias `VITE_API_URL` en Vercel, hay que hacer *Redeploy*.

---

## Notas importantes

- **Render gratis se duerme** tras ~15 min sin visitas: la primera petición tarda ~50 s. Para evitarlo,
  crea un monitor gratis en uptimerobot.com que consulte `/api/health` cada 5 minutos.
- Si olvidas contraseña y no llega el correo: revisa spam y los *Logs* de Render
  (busca `Error enviando correo`).
- Nunca subas tus `.env` ni pegues claves en chats o repositorios. Si una clave se expuso, regenérala.
