import type { Applicant } from "../types/applicant";
import type { Project } from "@/features/projects/types/project";

export interface ApplicantAdminProjects {
  fetchProjectById(id: string): Promise<Project | null>;
}
export interface ApplicantAdminApplications {
  fetchApplicantsByProject(id: string): Promise<Applicant[]>;
}

export async function loadApplicants(projects: ApplicantAdminProjects, applications: ApplicantAdminApplications, projectId: string, userId?: string) {
  const project = await projects.fetchProjectById(projectId);
  if (!project) return null;
  const applicants = userId && project.creatorId === userId
    ? await applications.fetchApplicantsByProject(project.id)
    : [];
  return { project, applicants };
}
