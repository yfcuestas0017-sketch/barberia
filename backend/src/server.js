import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { ensureSchema } from "./config/ensureSchema.js";

const PORT = process.env.PORT || 5000;

await ensureSchema();

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
