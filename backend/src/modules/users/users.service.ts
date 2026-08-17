import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/app-error.js';
import type { StoragePort } from '../../shared/storage/storage.port.js';
import type { UpdateProfileData, UsersRepository } from './users.repository.js';
import { toPublicUser, type PublicUser } from './users.types.js';

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly storage: StoragePort,
  ) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.usersRepository.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    return toPublicUser(user);
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<PublicUser> {
    const updated = await this.usersRepository.updateProfile(userId, data);
    if (!updated) throw AppError.notFound('User not found');
    return toPublicUser(updated);
  }

  async softDelete(userId: string): Promise<void> {
    await this.usersRepository.softDelete(userId);
  }

  async permanentDelete(userId: string, password: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) throw AppError.unauthorized('Invalid credentials');
    await this.usersRepository.hardDelete(userId);
    // All personal data: DB rows cascade, stored files are wiped here.
    await this.storage.deleteUserFiles(userId);
  }
}
