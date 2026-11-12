/** Operaciones de persistencia utilizadas por los repositorios de la aplicación. */
export interface Database {
  read<T = Record<string, unknown>>(tableName: string, filters?: Record<string, unknown>): Promise<T[]>;
  insert<T = Record<string, unknown>>(tableName: string, data: Record<string, unknown>): Promise<T>;
  update(tableName: string, recordId: string, data: Record<string, unknown>): Promise<void>;
  delete(tableName: string, recordId: string): Promise<void>;
}
