// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
}
