// Imported first so .env.local is loaded before any module reads serverEnv().
import { config } from "dotenv";

config({ path: ".env.local" });
