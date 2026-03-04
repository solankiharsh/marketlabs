import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3002'),
  NODE_ENV: z.string().default('development'),
  PRIVY_APP_ID: z.string().optional().default('dev-privy-app-id'),
  PRIVY_APP_SECRET: z.string().optional().default('dev-privy-app-secret'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string(),
  DERIV_APP_ID: z.string().optional().default('1089'), // Default demo app ID
  DERIV_WS_URL: z.string().optional().default('wss://ws.binaryws.com/websockets/v3'),
  OPENAI_API_KEY: z.string().optional(), // For AI analysis
  OPENROUTER_API_KEY: z.string().optional(), // For OpenRouter AI analysis
  OPENROUTER_BASE_URL: z.string().optional().default('https://openrouter.ai/api/v1'),
  FMP_API_KEY: z.string().optional(), // For Financial Modeling Prep news API
  ANTHROPIC_API_KEY: z.string().optional(), // For Claude AI (news synthesis)
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

