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

export const STUDENTS: Student[] = [
  { id: 1, username: "student01", password: "edu2024@01", fullName: "Renad Al-Sayed", grade: "Year 10", section: "A" },
  { id: 2, username: "student02", password: "edu2024@02", fullName: "Youssef Ibrahim", grade: "Year 10", section: "A" },
  { id: 3, username: "student03", password: "edu2024@03", fullName: "Nour Hassan", grade: "Year 10", section: "A" },
  { id: 4, username: "student04", password: "edu2024@04", fullName: "Omar Khaled", grade: "Year 10", section: "A" },
  { id: 5, username: "student05", password: "edu2024@05", fullName: "Layla Mahmoud", grade: "Year 10", section: "A" },
  { id: 6, username: "student06", password: "edu2024@06", fullName: "Ahmed Tarek", grade: "Year 10", section: "B" },
  { id: 7, username: "student07", password: "edu2024@07", fullName: "Sara Mohamed", grade: "Year 10", section: "B" },
  { id: 8, username: "student08", password: "edu2024@08", fullName: "Karim Adel", grade: "Year 10", section: "B" },
  { id: 9, username: "student09", password: "edu2024@09", fullName: "Hana Farid", grade: "Year 10", section: "B" },
  { id: 10, username: "student10", password: "edu2024@10", fullName: "Mahmoud Ali", grade: "Year 10", section: "B" },
  { id: 11, username: "student11", password: "edu2024@11", fullName: "Farida Youssef", grade: "Year 10", section: "C" },
  { id: 12, username: "student12", password: "edu2024@12", fullName: "Hassan Amr", grade: "Year 10", section: "C" },
  { id: 13, username: "student13", password: "edu2024@13", fullName: "Mariam Sherif", grade: "Year 10", section: "C" },
  { id: 14, username: "student14", password: "edu2024@14", fullName: "Tamer Hossam", grade: "Year 10", section: "C" },
  { id: 15, username: "student15", password: "edu2024@15", fullName: "Dina Mostafa", grade: "Year 10", section: "C" },
  { id: 16, username: "student16", password: "edu2024@16", fullName: "Ali Gamal", grade: "Year 11", section: "A" },
  { id: 17, username: "student17", password: "edu2024@17", fullName: "Reem Samir", grade: "Year 11", section: "A" },
  { id: 18, username: "student18", password: "edu2024@18", fullName: "Khaled Nasser", grade: "Year 11", section: "A" },
  { id: 19, username: "student19", password: "edu2024@19", fullName: "Yasmin Taha", grade: "Year 11", section: "A" },
  { id: 20, username: "student20", password: "edu2024@20", fullName: "Mohamed Essam", grade: "Year 11", section: "A" },
  { id: 21, username: "student21", password: "edu2024@21", fullName: "Salma Wael", grade: "Year 11", section: "B" },
  { id: 22, username: "student22", password: "edu2024@22", fullName: "Ibrahim Fathy", grade: "Year 11", section: "B" },
  { id: 23, username: "student23", password: "edu2024@23", fullName: "Jana Hesham", grade: "Year 11", section: "B" },
  { id: 24, username: "student24", password: "edu2024@24", fullName: "Amr Reda", grade: "Year 11", section: "B" },
  { id: 25, username: "student25", password: "edu2024@25", fullName: "Malak Ashraf", grade: "Year 11", section: "B" },
  { id: 26, username: "student26", password: "edu2024@26", fullName: "Ayman Hazem", grade: "Year 11", section: "C" },
  { id: 27, username: "student27", password: "edu2024@27", fullName: "Nada Karim", grade: "Year 11", section: "C" },
  { id: 28, username: "student28", password: "edu2024@28", fullName: "Sherif Magdy", grade: "Year 11", section: "C" },
  { id: 29, username: "student29", password: "edu2024@29", fullName: "Lina Osama", grade: "Year 11", section: "C" },
  { id: 30, username: "student30", password: "edu2024@30", fullName: "Tarek Sameh", grade: "Year 11", section: "C" },
  { id: 31, username: "student31", password: "edu2024@31", fullName: "Habiba Waleed", grade: "Year 10", section: "D" },
  { id: 32, username: "student32", password: "edu2024@32", fullName: "Ziad Hamdy", grade: "Year 10", section: "D" },
  { id: 33, username: "student33", password: "edu2024@33", fullName: "Aya Emad", grade: "Year 10", section: "D" },
  { id: 34, username: "student34", password: "edu2024@34", fullName: "Adham Sami", grade: "Year 10", section: "D" },
  { id: 35, username: "student35", password: "edu2024@35", fullName: "Roaa Belal", grade: "Year 10", section: "D" },
  { id: 36, username: "student36", password: "edu2024@36", fullName: "Seif Maher", grade: "Year 11", section: "D" },
  { id: 37, username: "student37", password: "edu2024@37", fullName: "Menna Ehab", grade: "Year 11", section: "D" },
  { id: 38, username: "student38", password: "edu2024@38", fullName: "Mostafa Ragab", grade: "Year 11", section: "D" },
  { id: 39, username: "student39", password: "edu2024@39", fullName: "Nourhan Ayman", grade: "Year 11", section: "D" },
  { id: 40, username: "student40", password: "edu2024@40", fullName: "Bassem Fouad", grade: "Year 11", section: "D" },
  { id: 41, username: "student41", password: "edu2024@41", fullName: "Heba Shaker", grade: "Year 10", section: "E" },
  { id: 42, username: "student42", password: "edu2024@42", fullName: "Yasser Medhat", grade: "Year 10", section: "E" },
  { id: 43, username: "student43", password: "edu2024@43", fullName: "Rania Khattab", grade: "Year 10", section: "E" },
  { id: 44, username: "student44", password: "edu2024@44", fullName: "Waleed Nabil", grade: "Year 10", section: "E" },
  { id: 45, username: "student45", password: "edu2024@45", fullName: "Sama Ossama", grade: "Year 10", section: "E" },
  { id: 46, username: "student46", password: "edu2024@46", fullName: "Hazem Lotfy", grade: "Year 11", section: "E" },
  { id: 47, username: "student47", password: "edu2024@47", fullName: "Fatma Gamal", grade: "Year 11", section: "E" },
  { id: 48, username: "student48", password: "edu2024@48", fullName: "Kareem Helmy", grade: "Year 11", section: "E" },
  { id: 49, username: "student49", password: "edu2024@49", fullName: "Lamis Bahgat", grade: "Year 11", section: "E" },
  { id: 50, username: "student50", password: "edu2024@50", fullName: "Hesham Sobhy", grade: "Year 11", section: "E" },
];

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

export const PARENTS: ParentAccount[] = STUDENTS.map((student) => {
  const suffix = String(student.id).padStart(2, '0');
  return {
    id: 1000 + student.id,
    domain: 'Mr.HaithamHusseinig',
    username: `parent${suffix}`,
    password: `parent2024@${suffix}`,
    fullName: `Parent of ${student.fullName}`,
    email: student.parentEmail || `parent.${student.username}@mrhaithamhusseinig.edu`,
    linkedStudentId: student.id,
    linkedStudentName: student.fullName,
    grade: student.grade,
    section: student.section,
    role: 'parent' as const,
  };
});
