import type { User as RobleUser } from "@/features/auth/domain/user";
import type { Database } from "@/core/domain/database";
import { RowParsing } from '@/core/db/row-parsing';
import type { PublishUpdateInput } from '../application/publish-update';
import type { CatalogRepository } from "@/core/application/repositories";
import { generateUuidV4 } from '@/core/utils/uuid';
import {
  Project,
  ProjectDraft,
  ProjectEdit,
  ProjectStatus,
  ProjectUpdate,
  TeamMember,
} from '../types/project';

export class RobleProjectRepository {
  constructor(
    private readonly db: Database,
    private readonly catalog: CatalogRepository,
    private readonly projectGradients: readonly (readonly string[])[]
  ) {}

  static readonly ALL_CATEGORIES = 'TODAS';

  private getRandomGradient(seed: string): string[] {
    const list = this.projectGradients;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % list.length;
    return [...list[index]];
  }

  async fetchCategories(): Promise<string[]> {
    try {
      const catMap = await this.catalog.readAll('categories');
      const names = Object.values(catMap).sort();
      return [RobleProjectRepository.ALL_CATEGORIES, ...names];
    } catch {
      return [RobleProjectRepository.ALL_CATEGORIES];
    }
  }

  async fetchProjects(): Promise<Project[]> {

    const [projectsRows, categoriesMap, projCategoriesRows, skillsMap, projSkillsRows] =
      await Promise.all([
        this.db.read<Record<string, unknown>>('projects'),
        this.catalog.readAll('categories').catch(() => ({})),
        this.safeRead('project_categories'),
        this.catalog.readAll('skills').catch(() => ({})),
        this.safeRead('project_skills'),
      ]);

    const categoriesByProject = this.groupBridge(
      projCategoriesRows,
      'category_id',
      categoriesMap
    );
    const skillsByProject = this.groupBridge(
      projSkillsRows,
      'skill_id',
      skillsMap
    );

    const projects: Project[] = projectsRows.filter((row) => !RowParsing.text(row.deleted_at)).map((row) => {
      const id = RowParsing.schemaId(row);
      const statusRaw = RowParsing.text(row.status);
      const status: ProjectStatus =
        statusRaw === 'en_desarrollo' || statusRaw === 'cerrado'
          ? statusRaw
          : 'idea';

      return {
        id,
        recordId: RowParsing.recordId(row),
        title: RowParsing.text(row.title) || 'Proyecto sin título',
        description: RowParsing.text(row.description) || '',
        categories: categoriesByProject.get(id) || [],
        skills: skillsByProject.get(id) || [],
        filledSpots: RowParsing.integer(row.filled_spots, 0),
        totalSpots: Math.max(1, RowParsing.integer(row.total_spots, 1)),
        creatorId: RowParsing.text(row.creator_id) || '',
        createdAt: RowParsing.dateTime(row.created_at) || null,
        status,
        gradientColors:
          RowParsing.colors(row.gradient_colors) ||
          this.getRandomGradient(id || 'default'),
      };
    });

    return projects;
  }

  async fetchProjectById(projectId: string): Promise<Project | null> {
    const rows = await this.db.read<Record<string, unknown>>('projects', {
      id: projectId,
    });
    if (rows.length === 0) return null;

    const row = rows[0];
    if (RowParsing.text(row.deleted_at)) return null;
    const id = RowParsing.schemaId(row);

    const [categoriesMap, projCategoriesRows, skillsMap, projSkillsRows] =
      await Promise.all([
        this.catalog.readAll('categories').catch((): Record<string, string> => ({})),
        this.safeRead('project_categories', { project_id: id }),
        this.catalog.readAll('skills').catch((): Record<string, string> => ({})),
        this.safeRead('project_skills', { project_id: id }),
      ]);

    const categories = projCategoriesRows
      .map((r) => categoriesMap[String(r.category_id)])
      .filter(Boolean)
      .sort();

    const skills = projSkillsRows
      .map((r) => skillsMap[String(r.skill_id)])
      .filter(Boolean)
      .sort();

    const statusRaw = RowParsing.text(row.status);
    const status: ProjectStatus =
      statusRaw === 'en_desarrollo' || statusRaw === 'cerrado'
        ? statusRaw
        : 'idea';

    return {
      id,
      recordId: RowParsing.recordId(row),
      title: RowParsing.text(row.title) || 'Proyecto sin título',
      description: RowParsing.text(row.description) || '',
      categories,
      skills,
      filledSpots: RowParsing.integer(row.filled_spots, 0),
      totalSpots: Math.max(1, RowParsing.integer(row.total_spots, 1)),
      creatorId: RowParsing.text(row.creator_id) || '',
      createdAt: RowParsing.dateTime(row.created_at) || null,
      status,
      gradientColors:
        RowParsing.colors(row.gradient_colors) ||
        this.getRandomGradient(id || 'default'),
    };
  }

  async saveProject(draft: ProjectDraft, creator: RobleUser): Promise<Project> {
    const id = generateUuidV4();
    const gradients = draft.gradientColors || this.getRandomGradient(id);

    const data: Record<string, unknown> = {
      id,
      creator_id: creator.id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      total_spots: draft.totalSpots,
      filled_spots: 0,
      status: 'idea',
      gradient_colors: RowParsing.encodeColors(gradients),
      created_at: new Date().toISOString(),
    };

    let inserted: Record<string, unknown>;
    try {
      inserted = await this.db.insert('projects', data);
    } catch {
      // Fallback si la columna status no existe en Roble
      const fallback = { ...data };
      delete fallback.status;
      inserted = await this.db.insert('projects', fallback);
    }

    const recordId = RowParsing.recordId(inserted);

    try {
      for (const catName of draft.categories) {
        const catId = await this.catalog.ensure('categories', catName);
        await this.db.insert('project_categories', {
          project_id: id,
          category_id: catId,
        });
      }

      for (const skillName of draft.skills) {
        const skillId = await this.catalog.ensure('skills', skillName);
        await this.db.insert('project_skills', {
          project_id: id,
          skill_id: skillId,
        });
      }
    } catch (bridgeErr) {
      // Rollback: Si falla asociar categorías/habilidades, eliminamos el proyecto incompleto
      if (recordId) {
        try {
          await this.db.delete('projects', recordId);
        } catch {
          // Mantener error original
        }
      }
      throw bridgeErr;
    }

    return {
      id,
      recordId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      categories: [...draft.categories],
      skills: [...draft.skills],
      filledSpots: 0,
      totalSpots: draft.totalSpots,
      creatorId: creator.id,
      createdAt: new Date(),
      status: 'idea',
      gradientColors: gradients,
    };
  }

  async saveProjectEdit(recordId: string, draft: ProjectEdit): Promise<void> {
    await this.db.update('projects', recordId, {
      title: draft.title,
      description: draft.description,
      total_spots: draft.totalSpots,
      updated_at: new Date().toISOString(),
    });
  }

  async archiveProject(recordId: string): Promise<void> {
    await this.db.update('projects', recordId, { deleted_at: new Date().toISOString() });
  }

  async updateProjectStatus(
    projectRecordId: string,
    status: ProjectStatus
  ): Promise<void> {
    await this.db.update('projects', projectRecordId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async fetchUpdates(projectId: string): Promise<ProjectUpdate[]> {
    try {
      const rows = await this.db.read<Record<string, unknown>>('project_updates', {
        project_id: projectId,
      });

      const updates: ProjectUpdate[] = rows.map((r) => {
        const statusRaw = RowParsing.text(r.status);
        const status: ProjectStatus | null =
          statusRaw === 'idea' || statusRaw === 'en_desarrollo' || statusRaw === 'cerrado'
            ? statusRaw
            : null;

        return {
          id: RowParsing.schemaId(r),
          recordId: RowParsing.recordId(r),
          projectId: RowParsing.text(r.project_id) || '',
          authorId: RowParsing.text(r.author_id) || '',
          authorName: RowParsing.text(r.author_name) || 'Integrante',
          title: RowParsing.text(r.title) || '',
          body: RowParsing.text(r.body) || '',
          createdAt: RowParsing.dateTime(r.created_at) || new Date(),
          status,
        };
      });

      updates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return updates;
    } catch {
      return [];
    }
  }

  async saveUpdate(params: PublishUpdateInput): Promise<ProjectUpdate> {
    const { projectId, author, title, body, newStatus } = params;
    const id = generateUuidV4();
    const now = new Date();

    const data: Record<string, unknown> = {
      id,
      project_id: projectId,
      author_id: author.id,
      author_name: author.name,
      title: title.trim(),
      body: body.trim(),
      created_at: now.toISOString(),
      ...(newStatus ? { status: newStatus } : {}),
    };

    const inserted = await this.db.insert<Record<string, unknown>>('project_updates', data);

    return {
      id,
      recordId: RowParsing.recordId(inserted),
      projectId,
      authorId: author.id,
      authorName: author.name,
      title: title.trim(),
      body: body.trim(),
      createdAt: now,
      status: newStatus || null,
    };
  }

  async fetchTeamMembers(project: Project): Promise<TeamMember[]> {
    const members: TeamMember[] = [];

    // 1. Creador del proyecto
    let creatorName = 'Creador';
    let creatorAvatar: string | null = null;

    if (project.creatorId) {
      try {
        const userRows = await this.db.read<Record<string, unknown>>('users', {
          id: project.creatorId,
        });
        if (userRows.length > 0) {
          creatorName = RowParsing.text(userRows[0].name) || creatorName;
          creatorAvatar = RowParsing.text(userRows[0].avatar_url) || null;
        }
      } catch {
        // Ignorar si falla lectura de users
      }

      members.push({
        userId: project.creatorId,
        name: creatorName,
        isCreator: true,
        avatarUrl: creatorAvatar,
      });
    }

    // 2. Postulantes aceptados
    try {
      const appRows = await this.db.read<Record<string, unknown>>('applications', {
        project_id: project.id,
        status: 'accepted',
      });

      if (appRows.length > 0) {
        const userRows = await this.safeRead('users');
        const usersById = new Map<string, Record<string, unknown>>();
        for (const u of userRows) {
          usersById.set(RowParsing.schemaId(u), u);
        }

        for (const app of appRows) {
          const applicantId = RowParsing.text(app.applicant_id);
          if (!applicantId || applicantId === project.creatorId) continue;

          const u = usersById.get(applicantId);
          members.push({
            userId: applicantId,
            name: (u && RowParsing.text(u.name)) || 'Integrante',
            isCreator: false,
            avatarUrl: (u && RowParsing.text(u.avatar_url)) || null,
            program: (u && RowParsing.text(u.program)) || undefined,
          });
        }
      }
    } catch {
      // Ignorar si falla lectura
    }

    return members;
  }

  private async safeRead(
    table: string,
    filters?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.db.read<Record<string, unknown>>(table, filters);
    } catch {
      return [];
    }
  }

  private groupBridge(
    bridgeRows: Record<string, unknown>[],
    targetFk: string,
    namesMap: Record<string, string>
  ): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const row of bridgeRows) {
      const projId = RowParsing.text(row.project_id);
      const targetId = RowParsing.text(row[targetFk]);
      if (!projId || !targetId) continue;

      const name = namesMap[targetId];
      if (!name) continue;

      if (!map.has(projId)) {
        map.set(projId, []);
      }
      map.get(projId)!.push(name);
    }

    for (const list of map.values()) {
      list.sort();
    }
    return map;
  }
}
