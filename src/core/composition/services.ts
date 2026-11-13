import type { ProjectOperations, ApplicantOperations } from "@/core/application/services";
import { NodoColors } from "@/core/theme/colors";
import { roble } from "@/core/db/roble-client";
import { catalogService, userProfileService } from "@/core/composition/repositories";
import { ProjectService } from "@/features/projects/application/project-service";
import { RobleProjectRepository } from "@/features/projects/infrastructure/roble-project-repository";
import { ApplicantService } from "@/features/applicants/application/applicant-service";
import { RobleApplicantRepository } from "@/features/applicants/infrastructure/roble-applicant-repository";
import { ChatService } from "@/features/chat/application/chat-service";
import { RobleChatRepository } from "@/features/chat/infrastructure/roble-chat-repository";
import { NotificationService } from "@/features/notifications/application/notification-service";
import { RobleNotificationRepository } from "@/features/notifications/infrastructure/roble-notification-repository";

export const notifications = new NotificationService(new RobleNotificationRepository(roble));
export const projects: ProjectOperations = new ProjectService(new RobleProjectRepository(roble, catalogService, NodoColors.projectGradients), userProfileService, notifications);
export const applicants: ApplicantOperations = new ApplicantService(new RobleApplicantRepository(roble, catalogService), userProfileService, projects, notifications);
export const chat = new ChatService(projects, new RobleChatRepository(roble));
