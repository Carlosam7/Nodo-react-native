import type { Database } from "@/core/domain/database";
import { RowParsing } from '../db/row-parsing';
import { generateUuidV4 } from '../utils/uuid';

export type CatalogTable = 'categories' | 'skills';

export class CatalogService {
  private cache: Record<CatalogTable, Map<string, string> | null> = {
    categories: null,
    skills: null,
  };

  static readonly nameMinLength = 2;
  static readonly nameMaxLength = 40;

  constructor(private readonly database: Database) {}

  static normalize(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  static validateName(value: string): string | null {
    const name = this.normalize(value);
    if (name.length < this.nameMinLength) {
      return `Mínimo ${this.nameMinLength} caracteres`;
    }
    if (name.length > this.nameMaxLength) {
      return `Máximo ${this.nameMaxLength} caracteres`;
    }
    return null;
  }

  /**
   * Lee todo el catálogo devolviendo un Record `id -> nombre`.
   * Hace uso de caché en memoria para proteger la cuota de peticiones.
   */
  async readAll(
    table: CatalogTable,
    forceRefresh = false
  ): Promise<Record<string, string>> {
    if (forceRefresh) {
      this.cache[table] = null;
    }

    if (this.cache[table]) {
      return Object.fromEntries(this.cache[table]!.entries());
    }

    const rows = await this.database.read<Record<string, unknown>>(table);
    const map = new Map<string, string>();

    for (const row of rows) {
      const name = RowParsing.text(row.name);
      const id = RowParsing.schemaId(row);
      if (name && id) {
        map.set(id, name);
      }
    }

    this.cache[table] = map;
    return Object.fromEntries(map.entries());
  }

  /**
   * Retorna el `id` de un ítem existente o crea uno nuevo con UUID.
   */
  async ensure(table: CatalogTable, name: string): Promise<string> {
    const normalized = CatalogService.normalize(name);
    const existing = await this.findId(table, normalized);
    if (existing) return existing;

    const id = generateUuidV4();
    try {
      await this.database.insert(table, { id, name: normalized });
      this.cache[table]?.set(id, normalized);
      return id;
    } catch {
      // Si otro usuario lo insertó concurrentemente (UNIQUE):
      const found = await this.findId(table, normalized, true);
      if (found) return found;
      throw new Error(`No se pudo registrar en ${table}: ${normalized}`);
    }
  }

  private async findId(
    table: CatalogTable,
    normalizedName: string,
    forceRefresh = false
  ): Promise<string | null> {
    const all = await this.readAll(table, forceRefresh);
    for (const [id, name] of Object.entries(all)) {
      if (name === normalizedName) return id;
    }
    return null;
  }
}
