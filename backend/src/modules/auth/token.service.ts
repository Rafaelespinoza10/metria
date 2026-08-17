import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface TokenPayload {
  /** User id. */
  sub: string;
  /** Token version — must match users.token_version to be valid. */
  tv: number;
}

export class TokenService {
  sign(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });
  }

  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        typeof decoded.sub === 'string' &&
        typeof (decoded as { tv?: unknown }).tv === 'number'
      ) {
        return { sub: decoded.sub, tv: (decoded as { tv: number }).tv };
      }
      return null;
    } catch {
      return null;
    }
  }
}
