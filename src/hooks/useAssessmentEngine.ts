import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  groupAnswerRows,
  useCreateUpdateAssessmentStubMutation,
  useGetAssessmentSessionDetailsQuery,
  useGetQuestionSummaryQuery,
  useGetSessionAnswersQuery,
  useGetSessionQuestionsQuery,
} from '../redux/api/assessmentApi';
import type {
  AssessmentAnswer,
  AssessmentEnginePhase,
  AssessmentSection,
  AssessmentSessionDetails,
  AssessmentSessionQuestion,
  MatchSelectionItem,
  QuestionSummary,
} from '../types/assessmentSession.types';
import { formatAssessmentEndTime, formatAttendedDuration } from '../utils/assessmentDate';

export type UseAssessmentEngineArgs = {
  publishId: number;
  coursePublishId?: number;
  courseId?: number;
};

function buildQuestionMaps(sections: AssessmentSection[]) {
  const testQuestions: Record<string, AssessmentSessionQuestion> = {};
  const questionIds: string[] = [];

  for (const section of sections) {
    for (const q of section.questions) {
      testQuestions[q.id] = { ...q };
      questionIds.push(q.id);
    }
  }

  return { testQuestions, questionIds, questionSection: sections };
}

function countStats(testQuestions: Record<string, AssessmentSessionQuestion>) {
  let attempted = 0;
  let flagged = 0;
  let unattempted = 0;
  for (const q of Object.values(testQuestions)) {
    const isAttempted = Boolean(q.attempted) || (q.user_selection?.length ?? 0) > 0;
    if (isAttempted) attempted += 1;
    else unattempted += 1;
    if (Boolean(q.flagged)) flagged += 1;
  }
  return { attempted, flagged, unattempted };
}

export function useAssessmentEngine({
  publishId,
  coursePublishId,
  courseId,
}: UseAssessmentEngineArgs) {
  const { data: sessionDetails, isLoading: detailsLoading, error: detailsError } =
    useGetAssessmentSessionDetailsQuery({ publishId });

  const [phase, setPhase] = useState<AssessmentEnginePhase>('loading');
  const [studentAssessmentId, setStudentAssessmentId] = useState(0);
  const [testQuestions, setTestQuestions] = useState<Record<string, AssessmentSessionQuestion>>({});
  const [testAnswers, setTestAnswers] = useState<Record<string, AssessmentAnswer>>({});
  const [questionSection, setQuestionSection] = useState<AssessmentSection[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [summary, setSummary] = useState<QuestionSummary[]>([]);
  const [createStub, { isLoading: stubLoading }] = useCreateUpdateAssessmentStubMutation();
  const startTimeRef = useRef<Date>(new Date());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  const shouldLoadQuestions = studentAssessmentId > 0;
  const { data: sections = [], isLoading: questionsLoading } = useGetSessionQuestionsQuery(
    { studentAssessmentId },
    { skip: !shouldLoadQuestions },
  );
  const { data: answerRows = [] } = useGetSessionAnswersQuery(
    { studentAssessmentId },
    { skip: !shouldLoadQuestions },
  );

  const { data: summaryData } = useGetQuestionSummaryQuery(
    { testAssessmentId: studentAssessmentId },
    { skip: phase !== 'summary' || studentAssessmentId <= 0 },
  );

  useEffect(() => {
    if (summaryData) setSummary(summaryData);
  }, [summaryData]);

  useEffect(() => {
    if (detailsLoading) {
      setPhase('loading');
      return;
    }
    if (!sessionDetails) {
      setPhase('idle');
      return;
    }

    const isActive =
      sessionDetails.testStateName === 'Yet to Start' ||
      sessionDetails.testStateName === 'In Progress';

    if (!isActive) {
      setPhase('submitted');
      if (sessionDetails.latestAssessmentId) {
        setStudentAssessmentId(sessionDetails.latestAssessmentId);
      }
      return;
    }

    setPhase('landing');
  }, [detailsLoading, sessionDetails]);

  useEffect(() => {
    if (!shouldLoadQuestions || sections.length === 0) return;
    const maps = buildQuestionMaps(sections);
    setTestQuestions(maps.testQuestions);
    setQuestionIds(maps.questionIds);
    setQuestionSection(maps.questionSection);
    setTestAnswers(groupAnswerRows(answerRows, maps.testQuestions));
    setSelectedItem((prev) => prev ?? maps.questionIds[0] ?? null);
    setPhase('answering');
    startTimeRef.current = new Date();
  }, [answerRows, sections, shouldLoadQuestions]);

  const attendedDuration = useCallback(
    () => formatAttendedDuration(startTimeRef.current),
    [],
  );

  const buildStubArgs = useCallback(
    (status: number, interval?: number) => ({
      publishId,
      studentAssessmentId,
      testQuestions,
      testAnswers,
      endTime: formatAssessmentEndTime(),
      status,
      coursePublishId: coursePublishId ?? sessionDetails?.coursePublishId,
      courseId: courseId ?? sessionDetails?.courseId,
      groupedTest: sessionDetails?.groupedTest ?? 0,
      attendedDuration: attendedDuration(),
      interval,
    }),
    [
      attendedDuration,
      courseId,
      coursePublishId,
      publishId,
      sessionDetails,
      studentAssessmentId,
      testAnswers,
      testQuestions,
    ],
  );

  const startAssessment = useCallback(async () => {
    setPhase('loading');
    startTimeRef.current = new Date();
    try {
      const rsp = await createStub(buildStubArgs(0)).unwrap();
      const id = rsp.testassessmentid ?? 0;
      setStudentAssessmentId(id);
    } catch {
      setPhase('landing');
    }
  }, [buildStubArgs, createStub]);

  const updateElapsedTime = useCallback(
    async (interval = 30000) => {
      if (studentAssessmentId <= 0) return;
      try {
        await createStub(buildStubArgs(4, interval)).unwrap();
      } catch {
        // non-blocking checkpoint
      }
    },
    [buildStubArgs, createStub, studentAssessmentId],
  );

  const save = useCallback(async () => {
    await createStub(buildStubArgs(1)).unwrap();
  }, [buildStubArgs, createStub]);

  const submit = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setPhase('submitted');
    try {
      const rsp = await createStub(buildStubArgs(3)).unwrap();
      const id = rsp.testassessmentid ?? studentAssessmentId;
      setStudentAssessmentId(id);
      if (sessionDetails?.summary_viewable) {
        setPhase('summary');
      }
    } catch {
      autoSubmittedRef.current = false;
      setPhase('answering');
    }
  }, [buildStubArgs, createStub, sessionDetails?.summary_viewable, studentAssessmentId]);

  const exit = useCallback(async () => {
    try {
      await createStub(buildStubArgs(5)).unwrap();
    } finally {
      setPhase('landing');
    }
  }, [buildStubArgs, createStub]);

  const flag = useCallback((questionId: string) => {
    setTestQuestions((prev) => {
      const q = prev[questionId];
      if (!q) return prev;
      const nextFlagged = !Boolean(q.flagged);
      return {
        ...prev,
        [questionId]: {
          ...q,
          flagged: nextFlagged ? 1 : 0,
        },
      };
    });
  }, []);

  const navigate = useCallback(
    (questionId: string) => {
      if (questionIds.includes(questionId)) setSelectedItem(questionId);
    },
    [questionIds],
  );

  const navigateRelative = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedItem) return;
      const index = questionIds.indexOf(selectedItem);
      const nextIndex = direction === 'next' ? index + 1 : index - 1;
      if (nextIndex >= 0 && nextIndex < questionIds.length) {
        setSelectedItem(questionIds[nextIndex]!);
      }
    },
    [questionIds, selectedItem],
  );

  const answerQuestion = useCallback(
    (
      questionId: string,
      selection: string[],
      matchSelection?: MatchSelectionItem[],
    ) => {
      setTestQuestions((prev) => {
        const q = prev[questionId];
        if (!q) return prev;
        const sectionOrder = q.section_order;
        const attempted =
          selection.length > 0 || (matchSelection?.length ?? 0) > 0 ? 1 : 0;
        const nextQuestion = {
          ...q,
          user_selection: selection,
          ...(matchSelection != null ? { match_selection: matchSelection } : {}),
          attempted,
        };
        const next = {
          ...prev,
          [questionId]: nextQuestion,
        };
        setQuestionSection((sections) =>
          sections.map((section) => {
            if (section.section_order !== sectionOrder) return section;
            const questions = section.questions.map((item) =>
              item.id === questionId ? nextQuestion : item,
            );
            const questions_attempted = questions.filter((item) => Boolean(item.attempted)).length;
            return { ...section, questions, questions_attempted };
          }),
        );
        return next;
      });
    },
    [],
  );

  const stats = useMemo(() => countStats(testQuestions), [testQuestions]);

  const remainingMs = useMemo(() => {
    if (!sessionDetails?.duration) return 0;
    return sessionDetails.duration;
  }, [sessionDetails?.duration]);

  useEffect(() => {
    if (phase !== 'answering' || remainingMs <= 0) return;

    const checkpoint = setInterval(() => {
      void updateElapsedTime(30000);
    }, 30000);

    timerIntervalRef.current = checkpoint;
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase, remainingMs, updateElapsedTime]);

  const viewSummary = useCallback(() => {
    setPhase('summary');
  }, []);

  return {
    phase,
    sessionDetails: sessionDetails as AssessmentSessionDetails | undefined,
    detailsLoading,
    detailsError,
    stubLoading,
    questionsLoading,
    studentAssessmentId,
    testQuestions,
    testAnswers,
    questionSection,
    questionIds,
    selectedItem,
    selectedQuestion: selectedItem ? testQuestions[selectedItem] : undefined,
    summary,
    stats,
    remainingMs,
    startAssessment,
    updateElapsedTime,
    save,
    submit,
    exit,
    flag,
    navigate,
    navigateRelative,
    answerQuestion,
    viewSummary,
    setPhase,
  };
}
