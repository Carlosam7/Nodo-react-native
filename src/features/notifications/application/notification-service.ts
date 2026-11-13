import type { AppNotification, NewNotification } from "../domain/notification";

export interface NotificationRepository {
  list(recipientId: string): Promise<AppNotification[]>;
  insert(notification: NewNotification): Promise<void>;
  markRead(recordId: string): Promise<void>;
}
export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}
  list(recipientId: string) { return this.repository.list(recipientId); }
  async markRead(notification: AppNotification, recipientId: string) {
    if (notification.recipientId !== recipientId) throw new Error("No puedes modificar esta notificación.");
    if (!notification.readAt) await this.repository.markRead(notification.recordId);
  }
  send(notification: NewNotification) { return this.repository.insert(notification); }
}
