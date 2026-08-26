import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { env } from './config/env.js';

const parsedOrigins = env.CORS_ORIGIN.includes(',')
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : [env.CORS_ORIGIN];

const trustedOrigins = Array.from(
  new Set([
    ...parsedOrigins,
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])
);

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
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: 'compact',
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
