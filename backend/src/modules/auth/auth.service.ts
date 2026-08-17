import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/app-error.js';
import type { UsersRepository } from '../users/users.repository.js';
import { toPublicUser, type PublicUser } from '../users/users.types.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import type { PasswordResetMailer } from './mailer.js';
import type { PasswordResetRepository } from './password-reset.repository.js';
import type { TokenService } from './token.service.js';

const BCRYPT_COST = 12;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly tokenService: TokenService,
    private readonly mailer: PasswordResetMailer,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await this.usersRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      ...(input.locale !== undefined && { locale: input.locale }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
    });

    return {
      user: toPublicUser(user),
      token: this.tokenService.sign({ sub: user.id, tv: user.tokenVersion }),
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.usersRepository.findByEmail(input.email);
    // Generic message: never reveal whether the email exists.
    if (!user) throw AppError.unauthorized('Invalid credentials');

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) throw AppError.unauthorized('Invalid credentials');

    return {
      user: toPublicUser(user),
      token: this.tokenService.sign({ sub: user.id, tv: user.tokenVersion }),
    };
  }

  /** Revokes every issued token by bumping token_version. */
  async logout(userId: string): Promise<void> {
    await this.usersRepository.incrementTokenVersion(userId);
  }

  /** Always resolves — no user enumeration. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.passwordResetRepository.create(user.id, sha256(token), expiresAt);
    await this.mailer.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const row = await this.passwordResetRepository.findValidByHash(sha256(token));
    if (!row) throw AppError.unauthorized('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.usersRepository.updatePassword(row.userId, passwordHash);
    await this.passwordResetRepository.markUsed(row.id);
    // Invalidate all existing sessions after a password change.
    await this.usersRepository.incrementTokenVersion(row.userId);
  }
}
