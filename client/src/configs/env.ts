import { z } from "zod";

// Define the schema
const envSchema = z.object({
  VITE_APP_WEBSOCKET_URL: z.string().url(),
});

// Parse and validate environment variables
const env = envSchema.parse(import.meta.env);

export default env;
