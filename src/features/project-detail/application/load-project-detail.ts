import type { Applicant } from "@/features/applicants/types/applicant";
import type { Project, ProjectUpdate, TeamMember } from "@/features/projects/types/project";

export interface DetailProjects {
  fetchProjectById(id: string): Promise<Project | null>;
  fetchTeamMembers(project: Project): Promise<TeamMember[]>;
  fetchUpdates(projectId: string): Promise<ProjectUpdate[]>;
}
export interface DetailApplications {
  fetchMyApplications(userId: string): Promise<Applicant[]>;
}

export async function loadProjectDetail(projects: DetailProjects, applications: DetailApplications, projectId: string, userId?: string) {
  const project = await projects.fetchProjectById(projectId);
  if (!project) return null;
  const [members, updates, myApplications] = await Promise.all([
    projects.fetchTeamMembers(project),
    projects.fetchUpdates(project.id),
    userId && userId !== project.creatorId ? applications.fetchMyApplications(userId) : Promise.resolve([]),
  ]);
  return { project, members, updates, myApplication: myApplications.find((application) => application.projectId === project.id) ?? null };
}
