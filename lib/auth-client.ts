'use client';

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // Same-origin in the browser; no baseURL needed.
});

export const { signIn, signUp, signOut, useSession } = authClient;
