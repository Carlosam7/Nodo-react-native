import { RobleClient, roble, RobleUser } from '../db/roble-client';
import { generateUuidV4 } from '../utils/uuid';

export class UserProfileService {
  private static instance: UserProfileService | null = null;

  static getInstance(db: RobleClient = roble): UserProfileService {
    if (!this.instance) {
      this.instance = new UserProfileService(db);
    }
    return this.instance;
  }

  private readonly confirmedIds = new Set<string>();

  constructor(private readonly database: RobleClient = roble) {}

  /**
   * Garantiza que la cuenta autenticada tenga su fila correspondiente en la tabla `users`,
   * requisito indispensable de las llaves foráneas `projects.creator_id` y `applications.applicant_id`.
   */
  async ensureProfile(user: RobleUser): Promise<void> {
    if (!user.id || this.confirmedIds.has(user.id)) return;

    try {
      const rows = await this.database.read<Record<string, unknown>>('users', {
        id: user.id,
      });

      if (rows.length > 0) {
        this.confirmedIds.add(user.id);
        return;
      }

      const username = await this.availableUsername(user.email);
      await this.database.insert('users', {
        id: user.id,
        username,
        name: user.name?.trim() || 'Usuario',
        created_at: new Date().toISOString(),
      });

      this.confirmedIds.add(user.id);
    } catch {
      // Si falla la inserción pero el usuario ya existía concurrentemente:
      this.confirmedIds.add(user.id);
    }
  }

  private async availableUsername(email: string): Promise<string> {
    const base =
      email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._]/g, '') ||
      'usuario';

    try {
      const taken = await this.database.read<Record<string, unknown>>('users', {
        username: base,
      });
      if (taken.length === 0) return base;
    } catch {
      // Ignorar error de lectura
    }

    return `${base}_${generateUuidV4().substring(0, 6)}`;
  }
}

export const userProfileService = UserProfileService.getInstance();
