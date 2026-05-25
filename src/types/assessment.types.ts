/** Assessment and quiz types */

export interface Assessment {
  assessment_id: number;
  test_id: number;
  test_name: string;
  test_description?: string;
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  score?: number;
  percentage?: number;
  attempts_allowed: number;
  attempts_used: number;
  due_date?: string;
}

export interface QuestionOption {
  option_id: number;
  option_text: string;
  is_correct?: boolean;
}

export interface TestQuestion {
  question_id: number;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  options: QuestionOption[];
  marks: number;
  selected_option_id?: number;
  is_answered: boolean;
}

export interface AssessmentResult {
  test_id: number;
  total_questions: number;
  attempted: number;
  correct: number;
  wrong: number;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
}

export interface AssessmentState {
  assessments: Assessment[];
  homeAssessments: Assessment[];
  currentQuestions: TestQuestion[];
  currentResult: AssessmentResult | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}
