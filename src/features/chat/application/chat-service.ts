import { ValidationFailure } from "@/core/domain/validation-failure";
import type { User } from "@/features/auth/domain/user";
import type { Project, TeamMember } from "@/features/projects/types/project";
import type { ChatMessage } from "../domain/message";

export interface ChatProjects {
  fetchProjectById(id: string): Promise<Project | null>;
  fetchTeamMembers(project: Project): Promise<TeamMember[]>;
}
export interface ChatRepository {
  fetchMessages(projectId: string): Promise<ChatMessage[]>;
  saveMessage(projectId: string, author: User, body: string): Promise<ChatMessage>;
}
export interface ChatOperations {
  fetchMessages(projectId: string, actor: User): Promise<ChatMessage[]>;
  sendMessage(projectId: string, actor: User, body: string): Promise<ChatMessage>;
}

export class ChatService implements ChatOperations {
  constructor(private readonly projects: ChatProjects, private readonly messages: ChatRepository) {}
  private async checkMembership(projectId: string, actor: User): Promise<void> {
    if (!actor.id || actor.isGuest) throw new ValidationFailure("Inicia sesión para usar el chat.");
    const project = await this.projects.fetchProjectById(projectId);
    if (!project) throw new ValidationFailure("No se encontró el proyecto.");
    if (project.creatorId === actor.id) return;
    const members = await this.projects.fetchTeamMembers(project);
    if (!members.some((member) => member.userId === actor.id && !member.isCreator)) {
      throw new ValidationFailure("Solo el líder y los integrantes aceptados pueden usar el chat.");
    }
  }
  async fetchMessages(projectId: string, actor: User): Promise<ChatMessage[]> {
    await this.checkMembership(projectId, actor);
    return this.messages.fetchMessages(projectId);
  }
  async sendMessage(projectId: string, actor: User, body: string): Promise<ChatMessage> {
    const text = body.trim();
    if (!text) throw new ValidationFailure("Escribe un mensaje antes de enviarlo.");
    if (text.length > 1000) throw new ValidationFailure("El mensaje puede tener hasta 1000 caracteres.");
    await this.checkMembership(projectId, actor);
    return this.messages.saveMessage(projectId, actor, text);
  }
}
