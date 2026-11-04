import { Env } from '../config/env';
import {
  RobleApiAuthException,
  RobleApiConflictException,
  RobleApiException,
  RobleApiForbiddenException,
  RobleApiNetworkException,
  RobleApiNotFoundException,
} from '../errors/failures';
import { TokenStorage } from './token-storage';

export interface RobleUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
  isGuest: boolean;
  extra?: Record<string, unknown> | null;
}

export class RobleClient {
  private static instance: RobleClient | null = null;

  static getInstance(): RobleClient {
    if (!this.instance) {
      this.instance = new RobleClient();
    }
    return this.instance;
  }

  readonly baseUrl: string;
  readonly contractId: string;
  readonly authUrl: string;
  readonly dataUrl: string;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private persistTokens = true;
  private isRefreshing = false;

  constructor(baseUrl = Env.baseUrl, contractId = Env.contractId) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.contractId = contractId.trim();
    this.authUrl = `${this.baseUrl}/auth/${this.contractId}`;
    this.dataUrl = `${this.baseUrl}/database/${this.contractId}`;
  }

  private get storageKey(): string {
    return `roble.session.${this.contractId}`;
  }

  get isLoggedIn(): boolean {
    return Boolean(this.accessToken);
  }

  get currentToken(): string | null {
    return this.accessToken;
  }

  // ==========================================
  // SESIÓN Y PERSISTENCIA
  // ==========================================

  async restoreSession(): Promise<RobleUser | null> {
    try {
      const raw = await TokenStorage.getItem(this.storageKey);
      if (!raw) return null;

      const data = JSON.parse(raw);
      if (!data?.refreshToken) return null;

      this.refreshToken = data.refreshToken;
      this.accessToken = data.accessToken || null;
      this.persistTokens = true;

      await this.refreshAccessToken();
      return await this.currentUser();
    } catch (err) {
      if (err instanceof RobleApiNetworkException) {
        throw err;
      }
      await this.clearTokens();
      return null;
    }
  }

  private async persistSession(): Promise<void> {
    try {
      if (this.persistTokens && this.accessToken && this.refreshToken) {
        await TokenStorage.setItem(
          this.storageKey,
          JSON.stringify({
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
          })
        );
      } else {
        await TokenStorage.removeItem(this.storageKey);
      }
    } catch {
      // Ignorar error de storage
    }
  }

  private async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    await TokenStorage.removeItem(this.storageKey);
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new RobleApiAuthException('No hay token de refresco disponible');
    }

    const res = await this.makeRequest<Record<string, unknown>>(
      'POST',
      'refresh-token',
      {
        body: { refreshToken: this.refreshToken },
        isAuthRequest: true,
        skipAuth: true,
      }
    );

    if (res && typeof res.accessToken === 'string') {
      this.accessToken = res.accessToken;
      if (typeof res.refreshToken === 'string') {
        this.refreshToken = res.refreshToken;
      }
      await this.persistSession();
    } else {
      throw new RobleApiAuthException('Respuesta inválida al refrescar sesión');
    }
  }

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  async login(
    email: string,
    password: string,
    persistSession = true
  ): Promise<RobleUser> {
    this.persistTokens = persistSession;

    const res = await this.makeRequest<Record<string, unknown>>(
      'POST',
      'login',
      {
        body: { email: email.trim(), password },
        isAuthRequest: true,
        skipAuth: true,
      }
    );

    if (res && typeof res.accessToken === 'string') {
      this.accessToken = res.accessToken;
      this.refreshToken = (res.refreshToken as string) || null;
      await this.persistSession();
    }

    return await this.currentUser();
  }

  async register(
    email: string,
    password: string,
    name: string,
    autoLogin = true
  ): Promise<RobleUser> {
    await this.makeRequest('POST', 'signup-direct', {
      body: {
        email: email.trim(),
        password,
        name: name.trim(),
      },
      isAuthRequest: true,
      skipAuth: true,
    });

    if (autoLogin) {
      return await this.login(email, password);
    }

    return {
      id: '',
      userId: '',
      email: email.trim(),
      name: name.trim(),
      isGuest: false,
    };
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await this.makeRequest('POST', 'logout', { isAuthRequest: true });
      }
    } catch {
      // Ignorar error al cerrar sesión
    } finally {
      await this.clearTokens();
    }
  }

  async signInAsGuest(): Promise<RobleUser> {
    if (Env.hasGuestCredentials) {
      try {
        return await this.login(Env.guestEmail, Env.guestPassword, false);
      } catch {
        // Fallback si no funciona el usuario guest configurado
      }
    }

    // Si Roble tiene activo signin anónimo:
    try {
      const res = await this.makeRequest<Record<string, unknown>>(
        'POST',
        'signin-anonymous',
        { isAuthRequest: true, skipAuth: true }
      );
      if (res && typeof res.accessToken === 'string') {
        this.accessToken = res.accessToken;
        this.refreshToken = (res.refreshToken as string) || null;
      }
      return await this.currentUser();
    } catch {
      // Devolver usuario temporal en memoria
      return {
        id: 'guest',
        userId: 'guest',
        email: Env.guestEmail,
        name: 'Invitado',
        isGuest: true,
      };
    }
  }

  async currentUser(): Promise<RobleUser> {
    const raw = await this.makeRequest<Record<string, unknown>>('GET', 'me', {
      isAuthRequest: true,
    });

    const userObj = (raw.user as Record<string, unknown>) || raw;
    const userId = String(
      userObj.userId || userObj.id || userObj._id || userObj.sub || ''
    );
    const email = String(userObj.email || '');
    const name = String(userObj.name || (email ? email.split('@')[0] : 'Usuario'));
    const role = (userObj.role as string) || null;
    const isGuest =
      email === Env.guestEmail ||
      role === 'readonly' ||
      role === 'anonymous' ||
      !email;

    return {
      id: userId,
      userId,
      email,
      name,
      role,
      isGuest,
      avatarUrl: (userObj.avatarUrl as string) || (userObj.avatar as string) || null,
      extra: (userObj.extra as Record<string, unknown>) || null,
    };
  }

  // ==========================================
  // OPERACIONES CRUD EN TABLAS ROBLE
  // ==========================================

  async read<T = Record<string, unknown>>(
    tableName: string,
    filters?: Record<string, unknown>
  ): Promise<T[]> {
    if (!this.isLoggedIn) {
      return this.publicRead<T>(tableName, filters);
    }

    const queryParams: Record<string, string> = { tableName };
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          queryParams[key] = String(val);
        }
      }
    }

    const res = await this.makeRequest<unknown>('GET', 'read', { queryParams });
    if (Array.isArray(res)) return res as T[];
    if (res && typeof res === 'object' && Array.isArray((res as { data?: unknown[] }).data)) {
      return (res as { data: T[] }).data;
    }
    return [];
  }

  async publicRead<T = Record<string, unknown>>(
    tableName: string,
    filters?: Record<string, unknown>
  ): Promise<T[]> {
    const queryParams: Record<string, string> = { tableName };
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          queryParams[key] = String(val);
        }
      }
    }

    const res = await this.makeRequest<unknown>('GET', 'public-read', {
      queryParams,
      skipAuth: true,
    });
    if (Array.isArray(res)) return res as T[];
    if (res && typeof res === 'object' && Array.isArray((res as { data?: unknown[] }).data)) {
      return (res as { data: T[] }).data;
    }
    return [];
  }

  async insert<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const cleanData = { ...data };
    delete cleanData._owner;

    const res = await this.makeRequest<Record<string, unknown>>(
      'POST',
      'insert-one',
      {
        body: {
          tableName,
          record: cleanData,
        },
      }
    );

    return (res || cleanData) as T;
  }

  async update(
    tableName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const updates = { ...data };
    delete updates._id;
    delete updates.id;
    delete updates._owner;

    await this.makeRequest('PUT', 'update', {
      body: {
        tableName,
        idColumn: '_id',
        idValue: recordId,
        updates,
      },
    });
  }

  async delete(tableName: string, recordId: string): Promise<void> {
    await this.makeRequest('DELETE', 'delete', {
      body: {
        tableName,
        idColumn: '_id',
        idValue: recordId,
      },
    });
  }

  // ==========================================
  // DISPATCHER HTTP CENTRAL
  // ==========================================

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    options?: {
      body?: Record<string, unknown>;
      queryParams?: Record<string, string>;
      isAuthRequest?: boolean;
      skipAuth?: boolean;
    }
  ): Promise<T> {
    const { body, queryParams, isAuthRequest = false, skipAuth = false } =
      options || {};

    const baseUrl = isAuthRequest ? this.authUrl : this.dataUrl;
    let url = endpoint ? `${baseUrl}/${endpoint}` : baseUrl;

    if (queryParams && Object.keys(queryParams).length > 0) {
      const qs = new URLSearchParams(queryParams).toString();
      url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new RobleApiNetworkException();
    }

    // Auto-refresh token ante 401 para peticiones autenticadas
    if (
      response.status === 401 &&
      this.refreshToken &&
      !isAuthRequest &&
      !skipAuth &&
      !this.isRefreshing
    ) {
      this.isRefreshing = true;
      try {
        await this.refreshAccessToken();
        this.isRefreshing = false;
        // Reintentar la llamada una sola vez
        return await this.makeRequest<T>(method, endpoint, options);
      } catch (refreshErr) {
        this.isRefreshing = false;
        await this.clearTokens();
        throw new RobleApiAuthException(
          'Sesión expirada y no se pudo renovar: ' + String(refreshErr)
        );
      }
    }

    let responseData: any = null;
    const text = await response.text();
    if (text) {
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }

    if (response.ok) {
      return responseData as T;
    }

    // Manejo de errores HTTP
    const message =
      (responseData && typeof responseData === 'object' && (responseData.message || responseData.error)) ||
      (typeof responseData === 'string' ? responseData : response.statusText);

    const code = responseData?.code;

    switch (response.status) {
      case 401:
        throw new RobleApiAuthException(message);
      case 403:
        throw new RobleApiForbiddenException(message, code);
      case 404:
        throw new RobleApiNotFoundException(message, code);
      case 409:
        throw new RobleApiConflictException(message, code);
      default:
        throw new RobleApiException(message, { statusCode: response.status, code });
    }
  }
}

export const roble = RobleClient.getInstance();
