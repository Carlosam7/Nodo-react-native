export interface ChatMessage {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
}
