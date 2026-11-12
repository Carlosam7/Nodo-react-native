import type { User } from "@/features/auth/domain/user";

export type CatalogKind = "categories" | "skills";
export interface CatalogRepository {
  readAll(kind: CatalogKind): Promise<Record<string, string>>;
  ensure(kind: CatalogKind, name: string): Promise<string>;
}
export interface UserProfileRepository {
  ensureProfile(user: User): Promise<void>;
}
