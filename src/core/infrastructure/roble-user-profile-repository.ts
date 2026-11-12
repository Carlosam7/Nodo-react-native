import type { User as RobleUser } from "@/features/auth/domain/user";
import type { Database } from "@/core/domain/database";
import { generateUuidV4 } from '../utils/uuid';

export class UserProfileService {
  private readonly confirmedIds = new Set<string>();

  constructor(private readonly database: Database) {}

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
    } catch (error) {
      // Una inserción concurrente puede haber creado el perfil; verificarlo.
      let exists = false;
      try {
        const rows = await this.database.read<Record<string, unknown>>('users', { id: user.id });
        exists = rows.length > 0;
      } catch {
        // Conservar el error original cuando no se puede comprobar el perfil.
      }
      if (!exists) throw error;
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
