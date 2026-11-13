export type ProjectStatus = 'idea' | 'en_desarrollo' | 'cerrado';

export interface Project {
  id: string;
  recordId: string;
  title: string;
  description: string;
  categories: string[];
  skills: string[];
  filledSpots: number;
  totalSpots: number;
  creatorId: string;
  createdAt: Date | null;
  status: ProjectStatus;
  gradientColors: string[];
}

export interface ProjectDraft {
  title: string;
  description: string;
  categories: string[];
  skills: string[];
  totalSpots: number;
  gradientColors?: string[];
}

export interface ProjectEdit {
  title: string;
  description: string;
  totalSpots: number;
  gradientColors?: string[];
}

export interface TeamMember {
  userId: string;
  name: string;
  isCreator: boolean;
  avatarUrl?: string | null;
  program?: string | null;
}

export interface ProjectUpdate {
  id: string;
  recordId: string;
  projectId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: Date;
  status?: ProjectStatus | null;
}
