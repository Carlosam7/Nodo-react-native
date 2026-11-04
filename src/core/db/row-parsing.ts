/**
 * Utilidades para interpretar filas retornadas por la API de Roble
 * sin asumir tipos exactos.
 */
export const RowParsing = {
  /** Llave primaria del esquema (`id`), la que referencian las llaves foráneas. */
  schemaId(row: Record<string, unknown>): string {
    return this.text(row.id) ?? this.text(row._id) ?? '';
  },

  /** Identificador interno de Roble (`_id`), el que usan update y delete. */
  recordId(row: Record<string, unknown>): string {
    return this.text(row._id) ?? this.text(row.id) ?? '';
  },

  text(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const str = String(value).trim();
    if (!str || str === 'null' || str === 'undefined') return undefined;
    return str;
  },

  integer(value: unknown, fallback = 0): number {
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  },

  dateTime(value: unknown): Date | undefined {
    const raw = this.text(value);
    if (!raw) return undefined;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? undefined : d;
  },

  /**
   * `gradient_colors` se almacena como JSON: `["0xFF7B6CF0", "0xFFB8A9FF"]`
   * o `["#7B6CF0", "#B8A9FF"]`.
   */
  colors(value: unknown): string[] | undefined {
    const raw = this.text(value);
    if (!raw) return undefined;
    try {
      const decoded = JSON.parse(raw);
      if (Array.isArray(decoded) && decoded.length >= 2) {
        return decoded.map((c) => {
          const str = String(c);
          if (str.startsWith('0xFF') || str.startsWith('0xff')) {
            return `#${str.slice(4)}`;
          }
          if (str.startsWith('0x') || str.startsWith('0X')) {
            return `#${str.slice(2)}`;
          }
          return str.startsWith('#') ? str : `#${str}`;
        });
      }
    } catch {
      // Ignorar error de parsing
    }
    return undefined;
  },

  encodeColors(colors: string[]): string {
    return JSON.stringify(
      colors.map((c) => {
        const hex = c.replace('#', '');
        return `0xFF${hex.toUpperCase()}`;
      })
    );
  },
};
