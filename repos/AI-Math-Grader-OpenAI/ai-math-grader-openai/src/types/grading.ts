// Type definitions for the grading system

export interface QuestionResult {
    question_number: string | number;
    question_text: string;
    student_answer: string;
    correct_answer: string;
    score: number;
    max_score: number;
    is_correct?: boolean;
    feedback: string;
}

export interface ExamInfo {
    year?: string;
    detected_year?: string;
    exam_type: string;
    total_questions: number;
}

export interface GradingResult {
    exam_info: ExamInfo;
    total_score: number;
    max_possible_score: number;
    percentage: number;
    per_question: QuestionResult[];
    overall_feedback: string;
    strengths: string[];
    areas_to_improve: string[];
    study_recommendations?: string[];
}

export interface UploadState {
    isUploading: boolean;
    isGrading: boolean;
    error: string | null;
    result: GradingResult | null;
    streamingText: string;
}
