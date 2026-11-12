import { useEffect, useRef, useState } from "react";
import { friendlyErrorMessage } from "@/core/errors/failures";
import { useServices } from "@/core/presentation/services-context";
import { useAuth } from "@/features/auth/context/auth-context";
import type { Project, ProjectStatus, TeamMember } from "@/features/projects/types/project";

export function usePublishUpdate(id?: string) {
  const { projects } = useServices();
  const { signedInUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newStatus, setNewStatus] = useState<ProjectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };
    (async () => {
      try {
        const item = await projects.fetchProjectById(id);
        if (!item) throw new Error("No se encontró el proyecto.");
        const team = await projects.fetchTeamMembers(item);
        if (active) { setProject(item); setMembers(team); }
      } catch (err) {
        if (active) setLoadError(friendlyErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, projects]);

  const isCreator = Boolean(project && signedInUser?.id === project.creatorId);
  const isMember = members.some((member) => member.userId === signedInUser?.id && !member.isCreator);
  const submit = async (): Promise<boolean> => {
    if (busy.current || !project || !signedInUser) return false;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await projects.publishUpdate({ projectId: project.id, author: signedInUser, title, body, newStatus: newStatus && newStatus !== project.status ? newStatus : null });
      return true;
    } catch (err) {
      setError(friendlyErrorMessage(err));
      return false;
    } finally { busy.current = false; setSubmitting(false); }
  };
  return { project, title, setTitle, body, setBody, newStatus, setNewStatus, isLoading: Boolean(id && loading), isSubmitting: submitting, loadError, error, isCreator, isMember, submit };
}
