import { ValidationFailure } from "@/core/domain/validation-failure";
import type { Project } from "@/features/projects/types/project";
import type { Applicant } from "../types/applicant";

export function assertCanApply(project: Project, applicantId: string): void {
  if (project.creatorId === applicantId) throw new ValidationFailure("No puedes postularte a tu propio proyecto.");
  if (project.filledSpots >= project.totalSpots) throw new ValidationFailure("El proyecto ya cubrió la totalidad de sus cupos disponibles.");
}

export function calculateDecisionSpots(project: Project, applicant: Applicant, newStatus: "accepted" | "rejected", actorId: string): number {
    // Regla: Matriz de permisos asimétrica (solo el creador decide)
    if (project.creatorId !== actorId) {
      throw new ValidationFailure(
        "Solo el líder o creador del proyecto tiene permiso para gestionar postulantes.",
      );
    }

  let nextSpots = project.filledSpots;

    if (newStatus === "accepted") {
      if (applicant.status !== "accepted") {
        if (project.filledSpots >= project.totalSpots) {
          throw new ValidationFailure(
            "El cupo de colaboradores ya está completo. No es posible admitir nuevos postulantes.",
          );
        }
        nextSpots += 1;
      }
    } else if (newStatus === "rejected") {
      if (applicant.status === "accepted") {
        nextSpots = Math.max(0, nextSpots - 1);
      }
    }

  return nextSpots;
}
