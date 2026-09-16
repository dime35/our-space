import { SessionPayload, verifySessionToken } from "./session";

export function requireSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return verifySessionToken(token);
}
