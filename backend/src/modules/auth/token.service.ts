import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface TokenPayload {
  /** User id. */
  sub: string;
  /** Token version — must match users.token_version to be valid. */
  tv: number;
}

// Pinning issuer/audience/algorithm blocks key-confusion attacks and rejects tokens
// minted for other environments that happen to share a secret.
const ISSUER = 'metria-api';
const AUDIENCE = 'metria-app';

export class TokenService {
  sign(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  }

  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
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
