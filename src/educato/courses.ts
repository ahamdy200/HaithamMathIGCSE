import type { QuizDefinition } from '../types';

export interface CourseEnrollment {
  studentId: number;
  studentUsername: string;
  studentName: string;
  grade?: string;
  section?: string;
  courseId: string;
  courseTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  teacherNote?: string;
}

export interface CourseVideo {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  url: string;
  youtubeUrl?: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'ppt' | 'link';
  size?: string;
  url: string;
  category?: 'explain' | 'homework' | 'resource';
  majorFolderId?: string;
  subFolderId?: string;
  isA3?: boolean;
  teacherOnly?: boolean;
  hiddenForStudents?: boolean;
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
  board: string;
  icon: string;
  color: string;
  teacher: string;
  description: string;
  videos: CourseVideo[];
  materials: CourseMaterial[];
}

export const COURSES: Course[] = [
  {
    id: 'year-9',
    name: 'Year 9',
    code: 'PRE-IGCSE Y9',
    board: 'Pre-IGCSE Foundation',
    icon: 'H',
    color: '#163252',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Year 9 Pre-IGCSE Mathematics covering BIDMAS, directed numbers, algebraic manipulation, linear equations, and foundational geometry.',
    videos: [],
    materials: [
      { id: 'y9-m1', title: 'Explain Notes — Ch.1 BIDMAS & Algebraic Manipulation', type: 'pdf', size: '2.4 MB', url: '#', category: 'explain' },
      { id: 'y9-m4', title: 'HW Sheet 1 — Mixed BIDMAS & Linear Equations (A3 Spread)', type: 'pdf', size: '1.6 MB', url: '#', category: 'homework', isA3: true },
      { id: 'y9-m2', title: 'BIDMAS & Algebra Worked Model Key', type: 'pdf', size: '1.1 MB', url: '#', category: 'resource', teacherOnly: true },
      { id: 'y9-m3', title: 'Formula Sheet & Revision Checklist', type: 'pdf', size: '520 KB', url: '#', category: 'explain' },
    ],
  },
  {
    id: 'ol-edexcel-modular-g1',
    name: 'OL Edexcel Modular Group 1',
    code: '4XMA1 • Group 1',
    board: 'Pearson Edexcel Modular',
    icon: 'H',
    color: '#1d4ed8',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Pearson Edexcel International GCSE Mathematics A (Modular) — Group 1 covering Unit 1H & Unit 2H higher tier modules with exam-style practice.',
    videos: [],
    materials: [
      { id: 'eg1-m1', title: 'Explain Guide — Pearson Edexcel Modular Spec (4XMA1)', type: 'pdf', size: '2.8 MB', url: '#', category: 'explain' },
      { id: 'eg1-m2', title: 'Group 1 Monthly Exam 1 — Official Model Answer Key', type: 'pdf', size: '1.6 MB', url: '#', category: 'resource', teacherOnly: true },
      { id: 'eg1-m3', title: 'HW Pack — Unit 1H & 2H Past Paper Practice (A3 Spread)', type: 'pdf', size: '4.1 MB', url: '#', category: 'homework', isA3: true },
    ],
  },
  {
    id: 'ol-edexcel-linear',
    name: 'OL Edexcel Linear',
    code: '4MA1 (1H / 2H)',
    board: 'Pearson Edexcel Linear',
    icon: 'H',
    color: '#4338ca',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Pearson Edexcel International GCSE Mathematics A (Linear 4MA1) — Full Higher Tier Papers 1H & 2H preparation with step-by-step worked training.',
    videos: [],
    materials: [
      { id: 'el-m1', title: 'Edexcel 4MA1 Linear Formula Booklet', type: 'pdf', size: '940 KB', url: '#' },
      { id: 'el-m2', title: 'Linear Paper 1H & 2H Model Mark Schemes', type: 'pdf', size: '3.2 MB', url: '#', teacherOnly: true },
      { id: 'el-m3', title: 'High-Frequency Grade 9 Problem Set', type: 'pdf', size: '1.9 MB', url: '#' },
    ],
  },
  {
    id: 'ol-cambridge',
    name: 'OL Cambridge',
    code: '0580 / 0980',
    board: 'Cambridge IGCSE',
    icon: 'H',
    color: '#214266',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Cambridge IGCSE Mathematics (0580 / 0980 Extended) covering Papers 2 & 4 with step-by-step method feedback and structured homework review.',
    videos: [],
    materials: [
      { id: 'oc-m1', title: 'Explain Notes — Cambridge 0580 / 0980 Core Concepts', type: 'pdf', size: '2.1 MB', url: '#', category: 'explain' },
      { id: 'oc-m2', title: 'Order of Operations — Official Model Answer Key', type: 'pdf', size: '880 KB', url: '#', category: 'resource', teacherOnly: true },
      { id: 'oc-m3', title: 'HW Paper 2 (Non-Calculator) Specimen Pack (A3 Spread)', type: 'pdf', size: '2.0 MB', url: '#', category: 'homework', isA3: true },
      { id: 'oc-m4', title: 'HW Paper 4 Extended Revision Workbook', type: 'pdf', size: '3.5 MB', url: '#', category: 'homework' },
    ],
  },
  {
    id: 'year-8',
    name: 'Year 8',
    code: 'KS3-Y8',
    board: 'Lower Secondary Math',
    icon: 'H',
    color: '#0f766e',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Year 8 Mathematics building fluency in integers, fractions, decimals, expressions, angles, area/volume, and structured problem solving.',
    videos: [],
    materials: [
      { id: 'y8-m1', title: 'Year 8 Core Practice Pack', type: 'pdf', size: '1.8 MB', url: '#' },
      { id: 'y8-m2', title: 'BIDMAS Warm-Up Homework & Model Key', type: 'pdf', size: '740 KB', url: '#', teacherOnly: true },
    ],
  },
  {
    id: 'ol-edexcel-modular-g2',
    name: 'OL Edexcel Modular Group 2',
    code: '4XMA1 • Group 2',
    board: 'Pearson Edexcel Modular',
    icon: 'H',
    color: '#0369a1',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Pearson Edexcel International GCSE Mathematics A (Modular) — Group 2 cohort with structured homework checkpoints and teacher-reviewed progress reports.',
    videos: [],
    materials: [
      { id: 'eg2-m1', title: 'Group 2 Modular Revision Guide', type: 'pdf', size: '2.2 MB', url: '#' },
      { id: 'eg2-m2', title: 'Group 2 Weekly Homework Booklet', type: 'pdf', size: '1.5 MB', url: '#' },
    ],
  },
  {
    id: 'ol-edexcel-modular-g3',
    name: 'OL Edexcel Modular Group 3',
    code: '4XMA1 • Group 3',
    board: 'Pearson Edexcel Modular',
    icon: 'H',
    color: '#7c3aed',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Pearson Edexcel International GCSE Mathematics A (Modular) — Group 3 track focusing on algebra mastery, graphs, and exam speed.',
    videos: [],
    materials: [
      { id: 'eg3-m1', title: 'Group 3 Modular Practice Booklet', type: 'pdf', size: '2.0 MB', url: '#' },
      { id: 'eg3-m2', title: 'Group 3 Timed Quiz & Model Solutions', type: 'pdf', size: '1.3 MB', url: '#', teacherOnly: true },
    ],
  },
  {
    id: 'ol-edexcel-modular-rcis',
    name: 'OL Edexcel Modular Mr.HaithamHusseinig',
    code: '4XMA1 • Mr.HaithamHusseinig',
    board: 'Pearson Edexcel Modular (Mr.HaithamHusseinig)',
    icon: 'H',
    color: '#b45309',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Pearson Edexcel International GCSE Mathematics A (Modular) — Mr.HaithamHusseinig cohort featuring tailored assignments and detailed teacher feedback from Mr. Haitham Hussien.',
    videos: [],
    materials: [
      { id: 'rcis-m1', title: 'Explain Booklet — Mr.HaithamHusseinig Edexcel Modular Unit 1H', type: 'pdf', size: '2.6 MB', url: '#', category: 'explain' },
      { id: 'rcis-m3', title: 'HW Booklet 1 — Unit 1H Quadratics & Surds (A3 Double Spread)', type: 'pdf', size: '1.9 MB', url: '#', category: 'homework', isA3: true },
      { id: 'rcis-m2', title: 'Mr.HaithamHusseinig Monthly Exam & Official Model Key', type: 'pdf', size: '1.7 MB', url: '#', category: 'resource', teacherOnly: true },
    ],
  },
];

export const DEFAULT_COURSE_QUIZZES: QuizDefinition[] = [
  {
    id: 'quiz-rcis-u1',
    courseId: 'ol-edexcel-modular-rcis',
    title: 'Unit 1H Checkpoint Quiz — Indices, Surds & Quadratics',
    kind: 'quiz',
    gradingSystem: 'edexcel',
    instructions: 'Answer all questions clearly. Mr. Haitham reviews your answers and releases your official 3-Phase report.',
    createdAt: '2026-11-01T09:00:00Z',
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        prompt: 'Simplify (3x^2)^3 / 9x^4:',
        options: ['3x^2', '9x^2', '3x^4', '27x^2'],
        correctAnswer: '3x^2',
        marks: 2,
      },
      {
        id: 'q2',
        type: 'short',
        prompt: 'Solve 2x^2 - 7x + 3 = 0 by factorisation. Show both roots.',
        correctAnswer: 'x = 0.5, x = 3',
        marks: 3,
      },
    ],
  },
  {
    id: 'essay-rcis-u1',
    courseId: 'ol-edexcel-modular-rcis',
    title: 'Structured Proof & Justification Essay — Circle Theorems & Vectors',
    kind: 'essay',
    gradingSystem: 'ib',
    instructions: 'Explain every geometrical step in complete sentences with theorem names before stating your final result.',
    createdAt: '2026-11-02T09:00:00Z',
    questions: [
      {
        id: 'e1',
        type: 'short',
        prompt: 'Prove why the angle subtended by a diameter at the circumference is always 90 degrees, and explain how collinearity is shown using vector multiples.',
        correctAnswer: 'Isosceles triangle base angles + triangle angle sum = 180 -> 90; parallel vector multiple + common point.',
        marks: 8,
      },
    ],
  },
  {
    id: 'quiz-cambridge-ch1',
    courseId: 'ol-cambridge',
    title: 'Cambridge 0580 Quick Quiz — BIDMAS & Standard Form',
    kind: 'quiz',
    gradingSystem: 'marks',
    instructions: 'Evaluate without a calculator and write final answers in standard form where requested.',
    createdAt: '2026-11-01T09:00:00Z',
    questions: [
      {
        id: 'c1',
        type: 'mcq',
        prompt: 'Evaluate 18 - 3 x 4 + 6 / 2:',
        options: ['9', '63', '33', '12'],
        correctAnswer: '9',
        marks: 2,
      },
      {
        id: 'c2',
        type: 'short',
        prompt: 'Write 0.000452 in standard form.',
        correctAnswer: '4.52 x 10^-4',
        marks: 2,
      },
    ],
  },
];
