/** Question type enums — mirrors web config.testQuestionTypeE / testQuestionTypeQBE. */

export const QUESTION_TYPE = {
  MULTIPLE_CHOICE: 0,
  FILL_IN_THE_BLANK: 1,
  SURVEY_MULTIPLE_CHOICE: 2,
  COMMENT: 3,
  ASSIGNMENT: 4,
  MATCH_THE_FOLLOWING: 5,
  MULTIPLE_CHOICE_SINGLE: 6,
} as const;

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

/** @deprecated Use QUESTION_TYPE */
export const QuestionTypeE = {
  MULTIPLE_CHOICE: QUESTION_TYPE.MULTIPLE_CHOICE,
  FILL_IN_THE_BLANK: QUESTION_TYPE.FILL_IN_THE_BLANK,
  SURVEY_MULTIPLE_CHOICE: QUESTION_TYPE.SURVEY_MULTIPLE_CHOICE,
  COMMENT: QUESTION_TYPE.COMMENT,
} as const;

/** @deprecated Use QUESTION_TYPE */
export const QuestionTypeQBE = {
  ASSIGNMENT: QUESTION_TYPE.ASSIGNMENT,
  MATCH_THE_FOLLOWING: QUESTION_TYPE.MATCH_THE_FOLLOWING,
  MULTIPLE_CHOICE_SINGLE: QUESTION_TYPE.MULTIPLE_CHOICE_SINGLE,
} as const;

/** Max normalized Levenshtein error rate before marking FITB wrong (web parity). */
export const MAX_FILL_IN_THE_BLANK_ERROR_RATE = 0.35;

export const MAX_TEST_ANSWER_LENGTH = 500;

/** Web maxTestCommentLength parity */
export const MAX_TEST_COMMENT_LENGTH = 1000;
