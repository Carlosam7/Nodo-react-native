/**
 * Jerarquía de errores y excepciones para la interacción con Roble
 * y validación de reglas de negocio en la aplicación.
 */

import { ValidationFailure } from '../domain/validation-failure';
export { ValidationFailure } from '../domain/validation-failure';

export class RobleApiException extends Error {
  readonly code?: unknown;
  readonly statusCode?: number;

  constructor(message: string, options?: { code?: unknown; statusCode?: number }) {
    super(message);
    this.name = 'RobleApiException';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
  }
}

export class RobleApiForbiddenException extends RobleApiException {
  constructor(message: string, code?: unknown) {
    super(message, { code, statusCode: 403 });
    this.name = 'RobleApiForbiddenException';
  }
}

export class RobleApiNotFoundException extends RobleApiException {
  constructor(message: string, code?: unknown) {
    super(message, { code, statusCode: 404 });
    this.name = 'RobleApiNotFoundException';
  }
}

export class RobleApiConflictException extends RobleApiException {
  constructor(message: string, code?: unknown) {
    super(message, { code, statusCode: 409 });
    this.name = 'RobleApiConflictException';
  }
}

export class RobleApiNetworkException extends RobleApiException {
  constructor(message = 'Sin conexión a internet') {
    super(message);
    this.name = 'RobleApiNetworkException';
  }
}

export class RobleApiAuthException extends RobleApiException {
  constructor(message: string) {
    super(message, { statusCode: 401 });
    this.name = 'RobleApiAuthException';
  }
}

/**
 * Traduce cualquier error técnico a un mensaje amigable para el usuario en la UI.
 */
export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ValidationFailure) {
    return error.message;
  }

  if (error instanceof RobleApiForbiddenException) {
    return 'Tu cuenta no tiene permiso para realizar esta acción.';
  }

  if (error instanceof RobleApiNotFoundException) {
    return 'El registro solicitado ya no existe.';
  }

  if (error instanceof RobleApiConflictException) {
    return 'El registro ya existe o entra en conflicto con los datos actuales.';
  }

  if (error instanceof RobleApiNetworkException) {
    return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  }

  if (error instanceof RobleApiAuthException) {
    return 'Tu sesión expiró o las credenciales son inválidas. Inicia sesión de nuevo.';
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('internet') || msg.includes('timeout') || msg.includes('failed to fetch')) {
      return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    }
    if (msg.includes('401') || msg.includes('unauthorized')) {
      return 'Credenciales incorrectas o sesión expirada.';
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      return 'No tienes permiso para realizar esta acción.';
    }
    if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('unique')) {
      return 'El registro ya existe.';
    }
    return error.message;
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
