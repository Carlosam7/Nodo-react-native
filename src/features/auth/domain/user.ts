export interface User {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
  isGuest: boolean;
  extra?: Record<string, unknown> | null;
}
