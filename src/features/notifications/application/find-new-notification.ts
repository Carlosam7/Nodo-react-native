import type { AppNotification } from "../domain/notification";

/** Sin línea base no se muestran avisos anteriores como nuevos. */
export function findNewNotification(previousIds: ReadonlySet<string> | null, items: AppNotification[]): AppNotification | null {
  if (!previousIds) return null;
  return items.find((item) => !item.readAt && !previousIds.has(item.id)) ?? null;
}
