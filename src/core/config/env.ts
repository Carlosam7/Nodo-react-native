/**
 * Configuración de entorno para conexión con el backend de Roble.
 * Conforme a Expo SDK 58, las variables públicas de cliente usan el prefijo EXPO_PUBLIC_.
 */
export const Env = {
  baseUrl:
    process.env.EXPO_PUBLIC_ROBLE_BASE_URL?.trim() ||
    'https://roble-api.openlab.uninorte.edu.co',
  contractId:
    process.env.EXPO_PUBLIC_ROBLE_CONTRACT_ID?.trim() || 'nodo_a9a72e0eab',
  guestEmail:
    process.env.EXPO_PUBLIC_GUEST_EMAIL?.trim() || 'guest@roble.local',
  guestPassword: process.env.EXPO_PUBLIC_GUEST_PASSWORD?.trim() || 'Guest.123',

  get hasGuestCredentials(): boolean {
    return Boolean(this.guestEmail && this.guestPassword);
  },
};
