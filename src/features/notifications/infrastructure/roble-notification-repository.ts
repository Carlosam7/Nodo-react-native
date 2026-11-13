import type { Database } from "@/core/domain/database";
import { RowParsing } from "@/core/db/row-parsing";
import { generateUuidV4 } from "@/core/utils/uuid";
import type { AppNotification, NewNotification, NotificationKind } from "../domain/notification";
import type { NotificationRepository } from "../application/notification-service";

export class RobleNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Database) {}
  async list(recipientId: string): Promise<AppNotification[]> {
    const rows = await this.db.read<Record<string, unknown>>("notifications", { recipient_id: recipientId });
    return rows.map((row) => ({
      id: RowParsing.schemaId(row), recordId: RowParsing.recordId(row),
      recipientId: RowParsing.text(row.recipient_id) ?? "", projectId: RowParsing.text(row.project_id) ?? "",
      title: RowParsing.text(row.title) ?? "Notificación", body: RowParsing.text(row.body) ?? "",
      kind: (RowParsing.text(row.kind) ?? "update") as NotificationKind,
      createdAt: RowParsing.dateTime(row.created_at) ?? new Date(0), readAt: RowParsing.dateTime(row.read_at) ?? null,
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async insert(item: NewNotification): Promise<void> {
    await this.db.insert("notifications", { id: generateUuidV4(), recipient_id: item.recipientId, project_id: item.projectId, title: item.title, body: item.body, kind: item.kind, created_at: new Date().toISOString() });
  }
  async markRead(recordId: string): Promise<void> { await this.db.update("notifications", recordId, { read_at: new Date().toISOString() }); }
}
