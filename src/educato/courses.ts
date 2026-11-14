export interface CourseVideo {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  url: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'ppt' | 'link';
  size?: string;
  url: string;
}

export interface HomeworkSubmission {
  id: string;
  studentId: number;
  studentName: string;
  courseId: string;
  fileName: string;
  fileSize: string;
  submittedAt: string;
  status: 'submitted' | 'graded' | 'late';
  grade?: number;
  maxGrade?: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  teacher: string;
  description: string;
  videos: CourseVideo[];
  materials: CourseMaterial[];
}

export const COURSES: Course[] = [
  {
    id: "math",
    name: "Mathematics",
    code: "0580",
    icon: "📐",
    color: "#3b82f6",
    teacher: "Mr. Haitham",
    description: "IGCSE Mathematics covering algebra, geometry, trigonometry, statistics and probability.",
    videos: [
      { id: "m1", title: "Chapter 1: Number & Algebra Basics", duration: "45:20", thumbnail: "", url: "#" },
      { id: "m2", title: "Chapter 2: Equations & Inequalities", duration: "38:15", thumbnail: "", url: "#" },
      { id: "m3", title: "Chapter 3: Functions & Graphs", duration: "52:00", thumbnail: "", url: "#" },
      { id: "m4", title: "Chapter 4: Geometry & Mensuration", duration: "41:30", thumbnail: "", url: "#" },
      { id: "m5", title: "Chapter 5: Trigonometry", duration: "47:45", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "mm1", title: "Mathematics Syllabus 2025-2026", type: "pdf", size: "2.1 MB", url: "#" },
      { id: "mm2", title: "Formula Sheet", type: "pdf", size: "450 KB", url: "#" },
      { id: "mm3", title: "Past Paper May 2025 Paper 2", type: "pdf", size: "1.8 MB", url: "#" },
      { id: "mm4", title: "Past Paper May 2025 Paper 4", type: "pdf", size: "2.3 MB", url: "#" },
    ],
  },
  {
    id: "physics",
    name: "Physics",
    code: "0625",
    icon: "⚡",
    color: "#f59e0b",
    teacher: "Dr. Amira",
    description: "IGCSE Physics covering mechanics, thermal physics, waves, electricity and magnetism.",
    videos: [
      { id: "p1", title: "Motion, Forces and Energy", duration: "50:10", thumbnail: "", url: "#" },
      { id: "p2", title: "Thermal Physics", duration: "35:20", thumbnail: "", url: "#" },
      { id: "p3", title: "Waves and Light", duration: "42:00", thumbnail: "", url: "#" },
      { id: "p4", title: "Electricity and Magnetism", duration: "55:30", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "pm1", title: "Physics Syllabus 2025-2026", type: "pdf", size: "1.9 MB", url: "#" },
      { id: "pm2", title: "Lab Safety Guide", type: "pdf", size: "800 KB", url: "#" },
      { id: "pm3", title: "Past Paper Collection", type: "pdf", size: "5.2 MB", url: "#" },
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    code: "0620",
    icon: "🧪",
    color: "#10b981",
    teacher: "Ms. Fatima",
    description: "IGCSE Chemistry covering atomic structure, bonding, organic chemistry and more.",
    videos: [
      { id: "c1", title: "States of Matter & Atomic Structure", duration: "44:30", thumbnail: "", url: "#" },
      { id: "c2", title: "Chemical Bonding", duration: "39:15", thumbnail: "", url: "#" },
      { id: "c3", title: "Stoichiometry & Mole Concept", duration: "48:00", thumbnail: "", url: "#" },
      { id: "c4", title: "Organic Chemistry Introduction", duration: "51:20", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "cm1", title: "Chemistry Syllabus 2025-2026", type: "pdf", size: "2.0 MB", url: "#" },
      { id: "cm2", title: "Periodic Table Reference", type: "pdf", size: "350 KB", url: "#" },
      { id: "cm3", title: "Lab Practical Guide", type: "pdf", size: "3.1 MB", url: "#" },
    ],
  },
  {
    id: "biology",
    name: "Biology",
    code: "0610",
    icon: "🧬",
    color: "#22c55e",
    teacher: "Dr. Samir",
    description: "IGCSE Biology covering cells, organisms, genetics, ecology and human biology.",
    videos: [
      { id: "b1", title: "Cell Biology & Organisation", duration: "46:00", thumbnail: "", url: "#" },
      { id: "b2", title: "Plant & Animal Nutrition", duration: "40:25", thumbnail: "", url: "#" },
      { id: "b3", title: "Genetics & Inheritance", duration: "53:10", thumbnail: "", url: "#" },
      { id: "b4", title: "Ecology & Environment", duration: "37:45", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "bm1", title: "Biology Syllabus 2025-2026", type: "pdf", size: "2.2 MB", url: "#" },
      { id: "bm2", title: "Diagram Pack - Cells & Organs", type: "pdf", size: "4.5 MB", url: "#" },
    ],
  },
  {
    id: "english-lang",
    name: "English Language",
    code: "0500",
    icon: "📝",
    color: "#8b5cf6",
    teacher: "Mrs. Helen",
    description: "IGCSE English Language covering reading comprehension, writing skills and directed writing.",
    videos: [
      { id: "el1", title: "Reading Comprehension Techniques", duration: "38:00", thumbnail: "", url: "#" },
      { id: "el2", title: "Directed Writing & Composition", duration: "42:30", thumbnail: "", url: "#" },
      { id: "el3", title: "Summary Writing Skills", duration: "33:15", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "elm1", title: "English Language Syllabus", type: "pdf", size: "1.5 MB", url: "#" },
      { id: "elm2", title: "Writing Toolkit", type: "pdf", size: "900 KB", url: "#" },
    ],
  },
  {
    id: "english-lit",
    name: "English Literature",
    code: "0475",
    icon: "📚",
    color: "#a855f7",
    teacher: "Mr. David",
    description: "IGCSE English Literature covering prose, poetry, drama and unseen texts.",
    videos: [
      { id: "elt1", title: "Poetry Analysis Techniques", duration: "40:20", thumbnail: "", url: "#" },
      { id: "elt2", title: "Prose: Character & Theme Analysis", duration: "45:00", thumbnail: "", url: "#" },
      { id: "elt3", title: "Drama: Shakespeare Introduction", duration: "50:15", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "eltm1", title: "Literature Syllabus", type: "pdf", size: "1.3 MB", url: "#" },
      { id: "eltm2", title: "Set Text List 2025-2026", type: "pdf", size: "200 KB", url: "#" },
    ],
  },
  {
    id: "cs",
    name: "Computer Science",
    code: "0478",
    icon: "💻",
    color: "#06b6d4",
    teacher: "Mr. Tareq",
    description: "IGCSE Computer Science covering algorithms, programming, data representation and networks.",
    videos: [
      { id: "cs1", title: "Data Representation & Binary", duration: "43:00", thumbnail: "", url: "#" },
      { id: "cs2", title: "Algorithms & Flowcharts", duration: "47:30", thumbnail: "", url: "#" },
      { id: "cs3", title: "Programming in Python", duration: "55:00", thumbnail: "", url: "#" },
      { id: "cs4", title: "Networks & Cybersecurity", duration: "38:45", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "csm1", title: "CS Syllabus 2025-2026", type: "pdf", size: "1.7 MB", url: "#" },
      { id: "csm2", title: "Python Cheat Sheet", type: "pdf", size: "500 KB", url: "#" },
      { id: "csm3", title: "Pre-release Material", type: "pdf", size: "1.2 MB", url: "#" },
    ],
  },
  {
    id: "business",
    name: "Business Studies",
    code: "0450",
    icon: "💼",
    color: "#f97316",
    teacher: "Ms. Noha",
    description: "IGCSE Business Studies covering business activity, marketing, finance and operations.",
    videos: [
      { id: "bs1", title: "Business Activity & Enterprise", duration: "36:10", thumbnail: "", url: "#" },
      { id: "bs2", title: "Marketing Mix & Strategy", duration: "41:20", thumbnail: "", url: "#" },
      { id: "bs3", title: "Finance & Accounts", duration: "44:00", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "bsm1", title: "Business Studies Syllabus", type: "pdf", size: "1.6 MB", url: "#" },
      { id: "bsm2", title: "Case Study Pack", type: "pdf", size: "3.0 MB", url: "#" },
    ],
  },
  {
    id: "economics",
    name: "Economics",
    code: "0455",
    icon: "📊",
    color: "#ef4444",
    teacher: "Dr. Mona",
    description: "IGCSE Economics covering microeconomics, macroeconomics, international trade and development.",
    videos: [
      { id: "ec1", title: "Basic Economic Problem", duration: "35:00", thumbnail: "", url: "#" },
      { id: "ec2", title: "Supply and Demand", duration: "42:15", thumbnail: "", url: "#" },
      { id: "ec3", title: "Government & Economy", duration: "39:30", thumbnail: "", url: "#" },
      { id: "ec4", title: "International Trade", duration: "37:00", thumbnail: "", url: "#" },
    ],
    materials: [
      { id: "ecm1", title: "Economics Syllabus 2025-2026", type: "pdf", size: "1.8 MB", url: "#" },
      { id: "ecm2", title: "Key Terms Glossary", type: "pdf", size: "600 KB", url: "#" },
    ],
  },
];
