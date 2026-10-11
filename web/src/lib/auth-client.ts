import { createAuthClient } from 'better-auth/react';
import { oneTapClient } from 'better-auth/client/plugins';
import { SERVER_URL, GOOGLE_CLIENT_ID } from './config';

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    oneTapClient({
      clientId: GOOGLE_CLIENT_ID,
      autoSelect: false,
      context: 'signin',
    }),
  ],
});

export const {
  signIn,
  signOut,
  useSession,
  getSession,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
  oneTap,
} = authClient;
