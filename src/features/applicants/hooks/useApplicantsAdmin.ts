import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/presentation/services-context";
import { useAuth } from "@/features/auth/context/auth-context";
import type { Project, ProjectStatus } from "@/features/projects/types/project";
import type { Applicant, ApplicantStatus } from "../types/applicant";
import { loadApplicants } from "../application/load-applicants";

export function useApplicantsAdmin(id?: string) {
  const { projects, applicants: applicantService } = useServices();
  const { signedInUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedTab, setSelectedTab] = useState<ApplicantStatus>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const loadData = useCallback(async () => {
    if (!id) { setIsLoading(false); setIsRefreshing(false); return; }
    try {
      const result = await loadApplicants(projects, applicantService, id, signedInUser?.id);
      setProject(result?.project ?? null); setApplicants(result?.applicants ?? []);
    } catch (err) { console.warn("Error al cargar panel de administración:", err); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, [id, signedInUser, projects, applicantService]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);
  const retry = () => { setIsLoading(true); void loadData(); };
  const refresh = () => { setIsRefreshing(true); void loadData(); };
  const changeStatus = async (status: ProjectStatus) => {
    if (!project || !signedInUser) return;
    await projects.updateProjectStatus(project.id, status, signedInUser);
    setProject((prev) => prev ? { ...prev, status } : null);
  };
  const decide = async (applicant: Applicant, decision: "accepted" | "rejected") => {
    if (!project || !signedInUser) return;
    setActionInProgressId(applicant.id);
    try {
      const { updatedApplicant, updatedFilledSpots } = await applicantService.decideApplication({ applicant, project, newStatus: decision, actor: signedInUser });
      setApplicants((previous) => previous.map((item) => item.id === updatedApplicant.id ? updatedApplicant : item));
      setProject((previous) => previous ? { ...previous, filledSpots: updatedFilledSpots } : null);
    } finally { setActionInProgressId(null); }
  };
  return { project, applicants, selectedTab, setSelectedTab, isLoading, isRefreshing, actionInProgressId, canManage: Boolean(project && signedInUser?.id === project.creatorId), retry, refresh, changeStatus, decide };
}
