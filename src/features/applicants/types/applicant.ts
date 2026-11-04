export type ApplicantStatus = "pending" | "accepted" | "rejected";

export interface Applicant {
  id: string;
  recordId: string;
  projectId: string;
  applicantId: string;
  name: string;
  program: string;
  university: string;
  motivation: string;
  experience: string;
  skills: string[];
  status: ApplicantStatus;
  submittedAt: Date;
  avatarUrl?: string | null;
  attachmentName?: string | null;
  attachmentSizeLabel?: string | null;
  attachmentUrl?: string | null;
}

export interface ApplicationDraft {
  projectId: string;
  motivation: string;
  experience: string;
  skills: string[];
}
