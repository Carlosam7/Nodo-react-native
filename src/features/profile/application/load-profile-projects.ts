import type { Applicant } from "@/features/applicants/types/applicant";
import type { Project } from "@/features/projects/types/project";

export interface ProfileProjectsRepository {
  fetchProjects(): Promise<Project[]>;
  fetchProjectById(id: string): Promise<Project | null>;
}
export interface ProfileApplicationsRepository {
  fetchMyApplications(userId: string): Promise<Applicant[]>;
}
export interface JoinedProject {
  project: Project;
  application: Applicant | null;
}
export async function loadProfileProjects(userId: string, projects: ProfileProjectsRepository, applications: ProfileApplicationsRepository) {
  const [allProjects, myApplications] = await Promise.all([
    projects.fetchProjects(), applications.fetchMyApplications(userId),
  ]);
  const relevant = myApplications.filter((item) => item.status === "accepted" || item.status === "pending");
  const joined = await Promise.all(relevant.map(async (application) => {
    const project = await projects.fetchProjectById(application.projectId);
    return project ? { project, application: application.status === "pending" ? application : null } : null;
  }));
  return {
    createdProjects: allProjects.filter((project) => project.creatorId === userId),
    joinedProjects: joined.filter((item): item is JoinedProject => item !== null),
  };
}
