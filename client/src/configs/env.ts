import { z } from "zod";

// Define the schema
const envSchema = z.object({
  VITE_APP_ENVIRONTMENT: z.enum(["development", "production"]),
  VITE_APP_WEBSOCKET_URL: z.string().url(),
  VITE_APP_SERVER_URL: z.string().url(),
  VITE_APP_SERVER_REQUEST_TIMEOUT: z.string(),
});

// Parse and validate environment variables
const env = envSchema.parse(import.meta.env);

export default env;
