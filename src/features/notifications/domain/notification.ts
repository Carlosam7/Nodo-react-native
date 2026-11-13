export type NotificationKind = "application" | "accepted" | "rejected" | "update";
export interface AppNotification {
  id: string;
  recordId: string;
  recipientId: string;
  projectId: string;
  title: string;
  body: string;
  kind: NotificationKind;
  createdAt: Date;
  readAt: Date | null;
}
export type NewNotification = Pick<AppNotification, "recipientId" | "projectId" | "title" | "body" | "kind">;
