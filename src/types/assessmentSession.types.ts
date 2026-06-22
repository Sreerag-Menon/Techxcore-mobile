/** Assessment session types — mirrors web StudentAssessments state. */

export type AssessmentSessionDetails = {
  publishId: number;
  testId: number;
  title: string;
  identifier?: string;
  description?: string;
  duration: number;
  status: string;
  testState: string;
  testStateName: string;
  testType?: number;
  totMarks: number;
  obtMarks: number;
  totQuestions: number;
  correct: number;
  incorrect: number;
  missed?: number;
  attempted: number;
  unattempted: number;
  flagged: number;
  multiAttempt: boolean;
  attemptCount: number;
  groupedTest: number;
  summary_viewable: boolean;
  rand_question?: number;
  rand_section?: number;
  start_from?: string;
  difference_time?: number;
  current_time?: string;
  dateFrom?: string;
  dateTo?: string;
  elapsedTime?: string;
  feedback?: string;
  coursePublishId?: number;
  courseId?: number;
  latestAssessmentId?: number;
};

export type AssessmentSessionQuestion = {
  id: string;
  question: string;
  type: number;
  section_order: number;
  section_name: string;
  sequence: number;
  image?: string;
  points: number;
  flagged: boolean | number;
  attempted: boolean | number;
  user_selection: string[];
  match_selection?: MatchSelectionItem[];
  content?: string;
  content_format?: number;
  content_source?: string;
  max_selection?: number;
  math_symbol?: number;
  media_link?: string;
  is_record?: number;
  assignment_content?: string;
  asgnmt_content_format?: number;
};

export type MatchSelectionItem = {
  answerCode: string;
  answer: string;
};

export type MatchQuestionItem = {
  questionCode: string;
  question: string;
};

export type MatchAnswerItem = {
  answerCode: string;
  answer: string;
};

export type AssessmentSection = {
  section_order: number;
  section_name: string;
  content?: string;
  content_format?: number;
  content_source?: string;
  description?: string;
  max_questions?: number;
  questions_attempted?: number;
  questions: AssessmentSessionQuestion[];
  open?: boolean;
};

export type AssessmentAnswer = {
  choices: Array<{ answerText: string; answerImage?: string }>;
  answers: Array<string | MatchAnswerItem>;
  comments: string[];
  reviewStarts: number[];
  reviewEnds: number[];
  questions: MatchQuestionItem[];
};

export type AssessmentAnswerRow = {
  question_id: string;
  answer: string;
  image?: string;
  is_correct_ans?: boolean;
  answer_code?: string;
  question_code?: string;
  question?: string;
  answer_comment?: string;
  review_start_pos?: number;
  review_end_pos?: number;
};

export type QuestionSummary = {
  question_name: string;
  question_type: number;
  answers: unknown[];
  status: string;
  obt_marks: number;
  section_name: string;
  section_order: number;
  evaluated: boolean;
  feedback?: string;
};

export type AssessmentStubResponse = {
  StatusValue?: number;
  StatusText?: string;
  testassessmentid?: number;
  duration?: number;
  notify_assessment_submit?: number;
  progress_status?: unknown;
  course_publish_id?: number;
  course_id?: number;
};

export type AssessmentEnginePhase =
  | 'idle'
  | 'loading'
  | 'landing'
  | 'answering'
  | 'submitted'
  | 'summary';
