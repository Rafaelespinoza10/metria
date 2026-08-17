import type { Request, Response } from 'express';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import type { AuthService } from './auth.service.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const input = registerSchema.parse(req.body);
    const result = await this.authService.register(input);
    ok(res, result, 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = loginSchema.parse(req.body);
    const result = await this.authService.login(input);
    ok(res, result);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logout(currentUser(req).id);
    ok(res, { loggedOut: true });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const input = forgotPasswordSchema.parse(req.body);
    await this.authService.forgotPassword(input.email);
    ok(res, { requested: true });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const input = resetPasswordSchema.parse(req.body);
    await this.authService.resetPassword(input.token, input.newPassword);
    ok(res, { reset: true });
  };
}
