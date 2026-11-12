import type { User } from "@/features/auth/domain/user";
import type { Project } from "@/features/projects/types/project";
import type { Applicant } from "../types/applicant";
import { calculateDecisionSpots } from "../domain/application-rules";

export interface ApplicationDecisionRepository {
  updateApplicationStatus(recordId: string, status: "accepted" | "rejected"): Promise<void>;
  updateProjectSpots(recordId: string, filledSpots: number): Promise<void>;
}

export async function decideApplication(
  repository: ApplicationDecisionRepository,
  params: { applicant: Applicant; project: Project; newStatus: "accepted" | "rejected"; actor: User },
): Promise<{ updatedApplicant: Applicant; updatedFilledSpots: number }> {
  const { applicant, project, newStatus, actor } = params;
  const nextSpots = calculateDecisionSpots(project, applicant, newStatus, actor.id);
  await repository.updateApplicationStatus(applicant.recordId, newStatus);
  if (nextSpots !== project.filledSpots) {
    await repository.updateProjectSpots(project.recordId, nextSpots);
  }
  return { updatedApplicant: { ...applicant, status: newStatus }, updatedFilledSpots: nextSpots };
}
