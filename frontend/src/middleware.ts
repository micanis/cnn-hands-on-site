// frontend/src/middleware.ts
import { clerkMiddleware } from '@clerk/astro/server';

export const onRequest = clerkMiddleware();