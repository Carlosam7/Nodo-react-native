import { roble, RobleClient, RobleUser } from "@/core/db/roble-client";
import { RowParsing } from "@/core/db/row-parsing";
import { ValidationFailure } from "@/core/errors/failures";
import {
  catalogService,
  CatalogService,
} from "@/core/services/catalog-service";
import {
  userProfileService,
  UserProfileService,
} from "@/core/services/user-profile-service";
import { generateUuidV4 } from "@/core/utils/uuid";
import {
  projectService,
  ProjectService,
} from "@/features/projects/services/project-service";
import { Project } from "@/features/projects/types/project";
import {
  Applicant,
  ApplicantStatus,
  ApplicationDraft,
} from "../types/applicant";

export class ApplicantService {
  private static instance: ApplicantService | null = null;

  static getInstance(): ApplicantService {
    if (!this.instance) {
      this.instance = new ApplicantService();
    }
    return this.instance;
  }

  constructor(
    private readonly db: RobleClient = roble,
    private readonly catalog: CatalogService = catalogService,
    private readonly profiles: UserProfileService = userProfileService,
    private readonly projects: ProjectService = projectService,
  ) {}

  async fetchApplicantsByProject(projectId: string): Promise<Applicant[]> {
    const rows = await this.db.read<Record<string, unknown>>("applications", {
      project_id: projectId,
    });
    return await this.mapToApplicants(rows);
  }

  async fetchMyApplications(applicantId: string): Promise<Applicant[]> {
    const rows = await this.db.read<Record<string, unknown>>("applications", {
      applicant_id: applicantId,
    });
    const apps = await this.mapToApplicants(rows);
    apps.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    return apps;
  }

  async fetchMyJoinedProjects(userId: string): Promise<Project[]> {
    const myApps = await this.fetchMyApplications(userId);
    const acceptedApps = myApps.filter((a) => a.status === "accepted");

    const projectPromises = acceptedApps.map((a) =>
      this.projects.fetchProjectById(a.projectId),
    );
    const results = await Promise.all(projectPromises);
    return results.filter((p): p is Project => p !== null);
  }

  async submitApplication(
    draft: ApplicationDraft,
    applicant: RobleUser,
    project: Project,
  ): Promise<Applicant> {
    // 1. Regla: Restricción de auto-postulación
    if (project.creatorId === applicant.id) {
      throw new ValidationFailure("No puedes postularte a tu propio proyecto.");
    }

    // 2. Regla: Restricción de capacidad (Cupo lleno)
    if (project.filledSpots >= project.totalSpots) {
      throw new ValidationFailure(
        "El proyecto ya cubrió la totalidad de sus cupos disponibles.",
      );
    }

    // 3. Regla: Control contra postulaciones redundantes
    const existing = await this.db.read<Record<string, unknown>>(
      "applications",
      {
        project_id: project.id,
        applicant_id: applicant.id,
      },
    );
    if (existing.length > 0) {
      throw new ValidationFailure(
        "Ya tienes una postulación registrada para esta iniciativa.",
      );
    }

    await this.profiles.ensureProfile(applicant);

    const id = generateUuidV4();
    const now = new Date();

    const data: Record<string, unknown> = {
      id,
      project_id: project.id,
      applicant_id: applicant.id,
      motivation: draft.motivation.trim(),
      experience: draft.experience.trim(),
      status: "pending",
      submitted_at: now.toISOString(),
    };

    const inserted = await this.db.insert<Record<string, unknown>>(
      "applications",
      data,
    );

    // Guardar competencias en perfil del usuario (user_skills)
    if (draft.skills.length > 0) {
      await this.linkUserSkills(applicant.id, draft.skills);
    }

    return {
      id,
      recordId: RowParsing.recordId(inserted),
      projectId: project.id,
      applicantId: applicant.id,
      name: applicant.name,
      program: "Estudiante",
      university: "Universidad del Norte",
      motivation: draft.motivation.trim(),
      experience: draft.experience.trim(),
      skills: [...draft.skills],
      status: "pending",
      submittedAt: now,
      avatarUrl: applicant.avatarUrl,
    };
  }

  async decideApplication(params: {
    applicant: Applicant;
    project: Project;
    newStatus: "accepted" | "rejected";
    actor: RobleUser;
  }): Promise<{ updatedApplicant: Applicant; updatedFilledSpots: number }> {
    const { applicant, project, newStatus, actor } = params;

    // Regla: Matriz de permisos asimétrica (solo el creador decide)
    if (project.creatorId !== actor.id) {
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

    // Actualizar estado de la solicitud en applications
    await this.db.update("applications", applicant.recordId, {
      status: newStatus,
    });

    // Actualizar cupos en projects si hubo cambio
    if (nextSpots !== project.filledSpots) {
      await this.db.update("projects", project.recordId, {
        filled_spots: nextSpots,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      updatedApplicant: {
        ...applicant,
        status: newStatus,
      },
      updatedFilledSpots: nextSpots,
    };
  }

  private async linkUserSkills(
    userId: string,
    skills: string[],
  ): Promise<void> {
    try {
      const existing = await this.db.read<Record<string, unknown>>(
        "user_skills",
        {
          user_id: userId,
        },
      );
      const linked = new Set(
        existing.map((r) => RowParsing.text(r.skill_id)).filter(Boolean),
      );

      for (const skill of skills) {
        const skillId = await this.catalog.ensure("skills", skill);
        if (!linked.has(skillId)) {
          await this.db.insert("user_skills", {
            user_id: userId,
            skill_id: skillId,
          });
          linked.add(skillId);
        }
      }
    } catch {
      // Ignorar si falla el guardado de competencias secundario
    }
  }

  private async mapToApplicants(
    rows: Record<string, unknown>[],
  ): Promise<Applicant[]> {
    if (rows.length === 0) return [];

    const [userRows, userSkillsRows, skillsMap] = await Promise.all([
      this.safeRead("users"),
      this.safeRead("user_skills"),
      this.catalog.readAll("skills").catch((): Record<string, string> => ({})),
    ]);

    const usersById = new Map<string, Record<string, unknown>>();
    for (const u of userRows) {
      usersById.set(RowParsing.schemaId(u), u);
    }

    const skillsByUser = new Map<string, string[]>();
    for (const link of userSkillsRows) {
      const uid = RowParsing.text(link.user_id);
      const skillName = skillsMap[String(link.skill_id)];
      if (!uid || !skillName) continue;

      if (!skillsByUser.has(uid)) {
        skillsByUser.set(uid, []);
      }
      skillsByUser.get(uid)!.push(skillName);
    }

    return rows.map((r) => {
      const applicantId = RowParsing.text(r.applicant_id) || "";
      const user = usersById.get(applicantId);

      const statusRaw = RowParsing.text(r.status);
      const status: ApplicantStatus =
        statusRaw === "accepted" || statusRaw === "rejected"
          ? statusRaw
          : "pending";

      const userSkills = skillsByUser.get(applicantId) || [];
      userSkills.sort();

      return {
        id: RowParsing.schemaId(r),
        recordId: RowParsing.recordId(r),
        projectId: RowParsing.text(r.project_id) || "",
        applicantId,
        name: (user && RowParsing.text(user.name)) || "Usuario",
        program: (user && RowParsing.text(user.program)) || "Estudiante",
        university:
          (user && RowParsing.text(user.university)) || "Universidad del Norte",
        motivation: RowParsing.text(r.motivation) || "",
        experience: RowParsing.text(r.experience) || "",
        skills: userSkills,
        status,
        submittedAt: RowParsing.dateTime(r.submitted_at) || new Date(),
        avatarUrl: (user && RowParsing.text(user.avatar_url)) || null,
        attachmentName: RowParsing.text(r.attachment_name) || null,
        attachmentSizeLabel: RowParsing.text(r.attachment_size_label) || null,
        attachmentUrl: RowParsing.text(r.attachment_url) || null,
      };
    });
  }

  private async safeRead(
    table: string,
    filters?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.db.read<Record<string, unknown>>(table, filters);
    } catch {
      return [];
    }
  }
}

export const applicantService = ApplicantService.getInstance();
