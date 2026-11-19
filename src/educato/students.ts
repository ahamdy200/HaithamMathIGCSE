export const DOMAINS = ['Mr.HaithamHusseinig', 'IGCSE-Online'] as const;
export type PortalDomain = (typeof DOMAINS)[number] | string;
export const RCIS_CAPACITY = 3500;

export interface Student {
  id: number;
  domain?: string;
  username: string;
  password: string;
  fullName: string;
  grade: string;
  section: string;
  parentEmail?: string;
}

export interface ParentAccount {
  id: number;
  domain: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  linkedStudentId: number;
  linkedStudentName: string;
  grade: string;
  section: string;
  role: 'parent';
}

export const STUDENTS: Student[] = [];

export const TEACHER_ACCOUNT = {
  username: "teacher",
  password: "haitham2024",
  fullName: "Mr. Haitham",
  domain: "Mr.HaithamHusseinig",
  role: "teacher" as const,
};

export const ASSISTANT_ACCOUNT = {
  id: 2,
  username: "assistant",
  password: "assistant2024",
  fullName: "Teaching Assistant (Homework Review)",
  domain: "Mr.HaithamHusseinig",
  role: "teacher" as const,
  isAssistant: true,
};

export const PARENTS: ParentAccount[] = [];
