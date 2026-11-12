import { useEffect, useRef, useState } from "react";
import { friendlyErrorMessage } from "@/core/errors/failures";
import { useServices } from "@/core/presentation/services-context";
import { useAuth } from "@/features/auth/context/auth-context";
import type { Project } from "../types/project";

export function useEditProject(id?: string) {
  const { projects } = useServices();
  const { signedInUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [spots, setSpots] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };
    projects.fetchProjectById(id).then((result) => {
      if (!active) return;
      if (!result) { setError("No se encontró el proyecto."); return; }
      if (!signedInUser || result.creatorId !== signedInUser.id) { setError("Solo el creador puede editar este proyecto."); return; }
      setProject(result); setTitle(result.title); setDescription(result.description); setSpots(String(result.totalSpots));
    }).catch((err) => { if (active) setError(friendlyErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, projects, signedInUser]);

  const save = async (): Promise<boolean> => {
    if (busy.current || !project || !signedInUser) return false;
    busy.current = true; setSaving(true); setError(null);
    try {
      await projects.editProject(project.id, { title, description, totalSpots: Number(spots) }, signedInUser);
      return true;
    } catch (err) { setError(friendlyErrorMessage(err)); return false; }
    finally { busy.current = false; setSaving(false); }
  };
  return { project, title, setTitle, description, setDescription, spots, setSpots, loading: Boolean(id && loading), saving, error, save };
}
