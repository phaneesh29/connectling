import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { env } from './config/env.js';

const trustedOrigins = env.CORS_ORIGIN.includes(',')
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : [env.CORS_ORIGIN];

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins,
  rateLimit: {
    enabled: true,
  },
  account: {
    encryptOAuthTokens: true,
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
      trustedProxyHeaders: true,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
