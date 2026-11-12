import type { User } from "../domain/user";
import { ValidationFailure } from "@/core/domain/validation-failure";

export interface AuthGateway {
  subscribeSessionExpired(listener: () => void): () => void;
  restoreSession(): Promise<User | null>;
  signInAsGuest(): Promise<User>;
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string, name: string): Promise<User>;
  logout(): Promise<void>;
  currentUser(): Promise<User>;
}

export interface ProfileGateway {
  ensureProfile(user: User): Promise<void>;
}

export interface AuthOperations {
  subscribeSessionExpired(listener: () => void): () => void;
  restoreSession(): Promise<User | null>;
  signInAsGuest(): Promise<User>;
  currentUser(): Promise<User>;
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string, name: string): Promise<User>;
  logout(): Promise<User>;
}

export class AuthService implements AuthOperations {
  constructor(private auth: AuthGateway, private profiles: ProfileGateway) {}

  subscribeSessionExpired(listener: () => void) { return this.auth.subscribeSessionExpired(listener); }

  async restoreSession() {
    const user = await this.auth.restoreSession();
    if (user) await this.profiles.ensureProfile(user);
    return user;
  }

  signInAsGuest() { return this.auth.signInAsGuest(); }
  currentUser() { return this.auth.currentUser(); }

  async login(email: string, password: string) {
    if (!email.trim() || !password.trim()) throw new ValidationFailure("Ingresa tu correo y contraseña");
    const user = await this.auth.login(email, password);
    await this.profiles.ensureProfile(user);
    return user;
  }

  async register(email: string, password: string, name: string) {
    if (!name.trim()) throw new ValidationFailure("Ingresa tu nombre completo");
    if (!email.trim() || !password.trim()) throw new ValidationFailure("Ingresa tu correo y contraseña");
    if (password.length < 6) throw new ValidationFailure("La contraseña debe tener al menos 6 caracteres");
    const user = await this.auth.register(email, password, name);
    await this.profiles.ensureProfile(user);
    return user;
  }

  async logout() {
    await this.auth.logout();
    return this.auth.signInAsGuest();
  }
}
