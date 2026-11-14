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
    color: '#800020',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Year 9 Pre-IGCSE Mathematics covering BIDMAS, directed numbers, algebraic manipulation, linear equations, and foundational geometry.',
    videos: [
      { id: 'y9-v1', title: 'Chapter 1: Order of Operations (BIDMAS) & Number Sense', duration: '42:15', thumbnail: '', url: '#' },
      { id: 'y9-v2', title: 'Chapter 2: Expanding Brackets & Algebraic Expressions', duration: '38:40', thumbnail: '', url: '#' },
      { id: 'y9-v3', title: 'Chapter 3: Solving Linear Equations & Inequalities', duration: '46:10', thumbnail: '', url: '#' },
      { id: 'y9-v4', title: 'Chapter 4: Percentages, Ratios & Proportion', duration: '44:25', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'y9-m1', title: 'Year 9 Math Workbook — Term 1', type: 'pdf', size: '2.4 MB', url: '#' },
      { id: 'y9-m2', title: 'BIDMAS & Algebra Worked Model Key', type: 'pdf', size: '1.1 MB', url: '#' },
      { id: 'y9-m3', title: 'Formula Sheet & Revision Checklist', type: 'pdf', size: '520 KB', url: '#' },
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
      'Pearson Edexcel International GCSE Mathematics A (Modular) — Group 1 covering Unit 1H & Unit 2H higher tier modules with exam-style diagnostics.',
    videos: [
      { id: 'eg1-v1', title: 'Unit 1H: Surds, Indices & Fractional Powers', duration: '51:20', thumbnail: '', url: '#' },
      { id: 'eg1-v2', title: 'Unit 1H: Quadratics & Completing the Square', duration: '49:05', thumbnail: '', url: '#' },
      { id: 'eg1-v3', title: 'Unit 2H: Functions, Differentiation & Rates of Change', duration: '54:30', thumbnail: '', url: '#' },
      { id: 'eg1-v4', title: 'Unit 2H: Circle Theorems & Vectors', duration: '47:15', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'eg1-m1', title: 'Pearson Edexcel Modular Specification (4XMA1)', type: 'pdf', size: '2.8 MB', url: '#' },
      { id: 'eg1-m2', title: 'Group 1 Monthly Exam 1 — Official Model Answer Key', type: 'pdf', size: '1.6 MB', url: '#' },
      { id: 'eg1-m3', title: 'Unit 1H & 2H Past Paper Pack', type: 'pdf', size: '4.1 MB', url: '#' },
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
      'Pearson Edexcel International GCSE Mathematics A (Linear 4MA1) — Full Higher Tier Papers 1H & 2H preparation with step-by-step mark scheme training.',
    videos: [
      { id: 'el-v1', title: 'Paper 1H Core Algebra & Simultaneous Equations', duration: '48:50', thumbnail: '', url: '#' },
      { id: 'el-v2', title: 'Paper 2H Sequences, Series & Graphs', duration: '52:10', thumbnail: '', url: '#' },
      { id: 'el-v3', title: 'Trigonometry: Sine & Cosine Rules in 3D', duration: '45:35', thumbnail: '', url: '#' },
      { id: 'el-v4', title: 'Histograms, Cumulative Frequency & Probability', duration: '41:00', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'el-m1', title: 'Edexcel 4MA1 Linear Formula Booklet', type: 'pdf', size: '940 KB', url: '#' },
      { id: 'el-m2', title: 'Linear Paper 1H & 2H Model Mark Schemes', type: 'pdf', size: '3.2 MB', url: '#' },
      { id: 'el-m3', title: 'High-Frequency Grade 9 Problem Set', type: 'pdf', size: '1.9 MB', url: '#' },
    ],
  },
  {
    id: 'ol-cambridge',
    name: 'OL Cambridge',
    code: '0580 / 0980',
    board: 'Cambridge IGCSE',
    icon: 'H',
    color: '#9f1239',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Cambridge IGCSE Mathematics (0580 / 0980 Extended) covering Papers 2 & 4 with AI-verified method marks, NotebookLM study briefs, and model keys.',
    videos: [
      { id: 'oc-v1', title: 'Chapter 1: Order of Operations (BIDMAS) & Number Skills', duration: '45:20', thumbnail: '', url: '#' },
      { id: 'oc-v2', title: 'Chapter 2: Algebraic Fractions & Quadratic Inequalities', duration: '43:15', thumbnail: '', url: '#' },
      { id: 'oc-v3', title: 'Chapter 3: Functions, Calculus & Kinematics Graphs', duration: '53:00', thumbnail: '', url: '#' },
      { id: 'oc-v4', title: 'Chapter 4: Transformations, Vectors & Mensuration', duration: '46:45', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'oc-m1', title: 'Cambridge 0580 / 0980 Syllabus 2025-2026', type: 'pdf', size: '2.1 MB', url: '#' },
      { id: 'oc-m2', title: 'Order of Operations — Official Model Answer Key', type: 'pdf', size: '880 KB', url: '#' },
      { id: 'oc-m3', title: 'Cambridge Paper 2 (Non-Calculator) Specimen Pack', type: 'pdf', size: '2.0 MB', url: '#' },
      { id: 'oc-m4', title: 'Cambridge Paper 4 Extended Revision Workbook', type: 'pdf', size: '3.5 MB', url: '#' },
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
    videos: [
      { id: 'y8-v1', title: 'Integers, Factors, Multiples & Prime Decomposition', duration: '36:20', thumbnail: '', url: '#' },
      { id: 'y8-v2', title: 'Fractions, Decimals, Percentages & BIDMAS', duration: '40:10', thumbnail: '', url: '#' },
      { id: 'y8-v3', title: 'Simplifying Expressions & Solving Equations', duration: '39:05', thumbnail: '', url: '#' },
      { id: 'y8-v4', title: 'Angles in Parallel Lines & Polygons', duration: '37:50', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'y8-m1', title: 'Year 8 Core Practice Pack', type: 'pdf', size: '1.8 MB', url: '#' },
      { id: 'y8-m2', title: 'BIDMAS Warm-Up Homework & Model Key', type: 'pdf', size: '740 KB', url: '#' },
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
      'Pearson Edexcel International GCSE Mathematics A (Modular) — Group 2 cohort with structured homework checkpoints and AI grading reports.',
    videos: [
      { id: 'eg2-v1', title: 'Unit 1H: Indices, Standard Form & Bounds', duration: '44:15', thumbnail: '', url: '#' },
      { id: 'eg2-v2', title: 'Unit 1H: Inequalities & Linear Programming', duration: '48:00', thumbnail: '', url: '#' },
      { id: 'eg2-v3', title: 'Unit 2H: Similarity, Congruence & Trigonometry', duration: '50:25', thumbnail: '', url: '#' },
    ],
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
    videos: [
      { id: 'eg3-v1', title: 'Unit 1H: Algebraic Fractions & Formula Rearrangement', duration: '46:40', thumbnail: '', url: '#' },
      { id: 'eg3-v2', title: 'Unit 2H: Transforming Graphs & Differentiation', duration: '52:55', thumbnail: '', url: '#' },
      { id: 'eg3-v3', title: 'Unit 2H: Venn Diagrams & Tree Diagrams', duration: '41:30', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'eg3-m1', title: 'Group 3 Modular Practice Booklet', type: 'pdf', size: '2.0 MB', url: '#' },
      { id: 'eg3-m2', title: 'Group 3 Timed Quiz & Model Solutions', type: 'pdf', size: '1.3 MB', url: '#' },
    ],
  },
  {
    id: 'ol-edexcel-modular-rcis',
    name: 'OL Edexcel Modular RCIS',
    code: '4XMA1 • RCIS',
    board: 'Pearson Edexcel Modular (RCIS)',
    icon: 'H',
    color: '#b45309',
    teacher: 'Mr. Haitham Hussien',
    description:
      'Pearson Edexcel International GCSE Mathematics A (Modular) — RCIS cohort featuring tailored assignments, model keys, and NotebookLM feedback.',
    videos: [
      { id: 'rcis-v1', title: 'RCIS Unit 1H: Number, Ratio & Percentages', duration: '45:10', thumbnail: '', url: '#' },
      { id: 'rcis-v2', title: 'RCIS Unit 1H: Quadratics & Simultaneous Systems', duration: '49:45', thumbnail: '', url: '#' },
      { id: 'rcis-v3', title: 'RCIS Unit 2H: Vectors, Circle Geometry & Calculus', duration: '54:15', thumbnail: '', url: '#' },
    ],
    materials: [
      { id: 'rcis-m1', title: 'RCIS Edexcel Modular Course Pack', type: 'pdf', size: '2.6 MB', url: '#' },
      { id: 'rcis-m2', title: 'RCIS Monthly Exam & Official Model Key', type: 'pdf', size: '1.7 MB', url: '#' },
    ],
  },
];
