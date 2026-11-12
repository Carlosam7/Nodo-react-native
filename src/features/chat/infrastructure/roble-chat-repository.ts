import type { Database } from "@/core/domain/database";
import { RowParsing } from "@/core/db/row-parsing";
import { generateUuidV4 } from "@/core/utils/uuid";
import type { User } from "@/features/auth/domain/user";
import type { ChatRepository } from "../application/chat-service";
import type { ChatMessage } from "../domain/message";

export class RobleChatRepository implements ChatRepository {
  constructor(private readonly database: Database) {}
  async fetchMessages(projectId: string): Promise<ChatMessage[]> {
    const rows = await this.database.read<Record<string, unknown>>("project_messages", { project_id: projectId });
    return rows.map((row) => ({
      id: RowParsing.schemaId(row), projectId: RowParsing.text(row.project_id) || "",
      authorId: RowParsing.text(row.author_id) || "", authorName: RowParsing.text(row.author_name) || "Integrante",
      body: RowParsing.text(row.body) || "", createdAt: RowParsing.dateTime(row.created_at) || new Date(0),
    })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  }
  async saveMessage(projectId: string, author: User, body: string): Promise<ChatMessage> {
    const message = { id: generateUuidV4(), projectId, authorId: author.id, authorName: author.name || "Integrante", body, createdAt: new Date() };
    await this.database.insert("project_messages", {
      id: message.id, project_id: message.projectId, author_id: message.authorId,
      author_name: message.authorName, body: message.body, created_at: message.createdAt.toISOString(),
    });
    return message;
  }
}
