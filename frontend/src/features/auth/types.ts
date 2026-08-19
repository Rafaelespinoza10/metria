export interface AuthUser {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  birthDate: string | null;
  heightCm: number | null;
  createdAt: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  locale?: string;
  timezone?: string;
}
