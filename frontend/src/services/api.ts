export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface OkEnvelope<T> {
  ok: true;
  data: T;
}

interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

type Envelope<T> = OkEnvelope<T> | ErrorEnvelope;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

let onUnauthorized: (() => void) | null = null;

/** Called once by the auth store: a 401 on any authenticated route means the
 *  session is dead (expired/revoked token) and the app must sign out instead
 *  of rendering screens that all silently fail. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  // FormData sets its own multipart boundary — never send a manual Content-Type for it.
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken !== null) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  let body: Envelope<T>;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Invalid response from server', response.status);
  }

  if (!body.ok) {
    // Auth endpoints 401 on wrong credentials — only a rejected *session* token
    // (a 401 outside /api/auth while a token is set) means the session is dead.
    if (response.status === 401 && authToken !== null && !path.startsWith('/api/auth/')) {
      onUnauthorized?.();
    }
    throw new ApiError(body.error.code, body.error.message, response.status);
  }
  return body.data;
}
