import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  groupAnswerRows,
  useCreateUpdateAssessmentStubMutation,
  useGetAssessmentSessionDetailsQuery,
  useGetQuestionSummaryQuery,
  useGetSessionAnswersQuery,
  useGetSessionQuestionsQuery,
  useRecordAssessmentPointsMutation,
  type RecordAssessmentPointsArgs,
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
import { logAssessment, logAssessmentError, logAssessmentWarn } from '../utils/assessmentDebugLog';

export type UseAssessmentEngineArgs = {
  publishId: number;
  coursePublishId?: number;
  courseId?: number;
  /** Needed for insert_update_trainee_points after submit (in-course context only). */
  curriculumId?: number;
  memberId?: number;
  acadYearId?: number;
  chapterId?: number;
  classId?: number;
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
    const isAttempted = q.attempted === 1 || (q.user_selection?.length ?? 0) > 0;
    if (isAttempted) attempted += 1;
    else unattempted += 1;
    if (q.flagged === 1) flagged += 1;
  }
  return { attempted, flagged, unattempted };
}

/** Deep-clone the testQuestions map so we can snapshot it for Cancel. */
function cloneQuestions(
  q: Record<string, AssessmentSessionQuestion>,
): Record<string, AssessmentSessionQuestion> {
  const out: Record<string, AssessmentSessionQuestion> = {};
  for (const [id, val] of Object.entries(q)) {
    out[id] = {
      ...val,
      user_selection: [...(val.user_selection ?? [])],
      match_selection: val.match_selection ? val.match_selection.map((m) => ({ ...m })) : [],
    };
  }
  return out;
}

export function useAssessmentEngine({
  publishId,
  coursePublishId,
  courseId,
  curriculumId,
  memberId,
  acadYearId,
  chapterId,
  classId,
}: UseAssessmentEngineArgs) {
  const { data: sessionDetails, isLoading: detailsLoading, error: detailsError } =
    useGetAssessmentSessionDetailsQuery({ publishId });

  const [phase, setPhase] = useState<AssessmentEnginePhase>('idle');
  const [studentAssessmentId, setStudentAssessmentId] = useState(0);
  const [testQuestions, setTestQuestions] = useState<Record<string, AssessmentSessionQuestion>>({});
  const [testAnswers, setTestAnswers] = useState<Record<string, AssessmentAnswer>>({});
  const [questionSection, setQuestionSection] = useState<AssessmentSection[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [summary, setSummary] = useState<QuestionSummary[]>([]);
  const [createStub, { isLoading: stubLoading }] = useCreateUpdateAssessmentStubMutation();
  const [recordPoints] = useRecordAssessmentPointsMutation();
  const startTimeRef = useRef<Date>(new Date());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);
  const actionInFlightRef = useRef(false);
  const saveSeqRef = useRef(0);

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
      logAssessment('session:loading', {
        publishId,
        phase,
        actionInFlight: actionInFlightRef.current,
        saveSeq: saveSeqRef.current,
      });
      setPhase('loading');
      return;
    }
    if (!sessionDetails) {
      logAssessmentWarn('session:no-details', { publishId, detailsError: String(detailsError ?? '') });
      setPhase('idle');
      return;
    }

    const isActive =
      sessionDetails.testStateName === 'Yet to Start' ||
      sessionDetails.testStateName === 'In Progress';

    logAssessment('session:resolved', {
      publishId,
      phase,
      testStateName: sessionDetails.testStateName,
      isActive,
      latestAssessmentId: sessionDetails.latestAssessmentId,
      summary_viewable: sessionDetails.summary_viewable,
      testId: sessionDetails.testId,
      actionInFlight: actionInFlightRef.current,
      saveSeq: saveSeqRef.current,
    });

    if (!isActive) {
      if (actionInFlightRef.current) {
        logAssessment('save:session-refetch-blocked', {
          phase,
          testStateName: sessionDetails.testStateName,
          isActive,
          summary_viewable: sessionDetails.summary_viewable,
          saveSeq: saveSeqRef.current,
        });
        return;
      }
      const next = sessionDetails.summary_viewable ? 'summary' : 'submitted';
      logAssessment(`phase→${next} (inactive session)`, {
        fromPhase: phase,
        testStateName: sessionDetails.testStateName,
        latestAssessmentId: sessionDetails.latestAssessmentId,
        summary_viewable: sessionDetails.summary_viewable,
        saveSeq: saveSeqRef.current,
      });
      setPhase(next);
      if (sessionDetails.latestAssessmentId) {
        setStudentAssessmentId(sessionDetails.latestAssessmentId);
      }
      return;
    }

    logAssessment('phase→landing (active session)', {
      fromPhase: phase,
      actionInFlight: actionInFlightRef.current,
      saveSeq: saveSeqRef.current,
    });
    setPhase((current) => {
      if (actionInFlightRef.current) {
        logAssessment('session:active-guarded', { fromPhase: current, saveSeq: saveSeqRef.current });
        return current;
      }
      if (current === 'answering' || current === 'summary' || current === 'submitted') {
        return current;
      }
      return 'landing';
    });
  }, [detailsError, detailsLoading, phase, publishId, sessionDetails]);

  useEffect(() => {
    if (!shouldLoadQuestions) {
      logAssessment('questions:skip (no studentAssessmentId)', { studentAssessmentId });
      return;
    }
    if (sections.length === 0) {
      logAssessment('questions:waiting (empty sections)', {
        studentAssessmentId,
        questionsLoading,
        answerRowCount: answerRows.length,
      });
      return;
    }
    const maps = buildQuestionMaps(sections);
    logAssessment('phase→answering', {
      studentAssessmentId,
      sectionCount: sections.length,
      questionCount: maps.questionIds.length,
      answerRowCount: answerRows.length,
      answerKeyCount: Object.keys(groupAnswerRows(answerRows, maps.testQuestions)).length,
    });
    setTestQuestions(maps.testQuestions);
    setQuestionIds(maps.questionIds);
    setQuestionSection(maps.questionSection);
    setTestAnswers(groupAnswerRows(answerRows, maps.testQuestions));
    setSelectedItem((prev) => prev ?? maps.questionIds[0] ?? null);
    actionInFlightRef.current = false;
    setPhase('answering');
    startTimeRef.current = new Date();
  }, [answerRows, questionsLoading, sections, shouldLoadQuestions, studentAssessmentId]);

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
    const resumeId =
      sessionDetails?.testStateName === 'In Progress' && sessionDetails.latestAssessmentId
        ? sessionDetails.latestAssessmentId
        : studentAssessmentId;
    const stubArgs = {
      ...buildStubArgs(0),
      studentAssessmentId: resumeId,
    };
    logAssessment('startAssessment:begin', {
      publishId,
      studentAssessmentId: stubArgs.studentAssessmentId,
      latestAssessmentId: sessionDetails?.latestAssessmentId,
      testStateName: sessionDetails?.testStateName,
      questionCount: Object.keys(stubArgs.testQuestions ?? {}).length,
    });
    actionInFlightRef.current = true;
    setPhase('loading');
    startTimeRef.current = new Date();
    try {
      const rsp = await createStub(stubArgs).unwrap();
      const id = rsp.testassessmentid ?? resumeId ?? 0;
      logAssessment('startAssessment:stub-ok', {
        testassessmentid: id,
        StatusValue: rsp.StatusValue,
        StatusText: rsp.StatusText,
      });
      if (id <= 0) {
        throw new Error('Stub response missing testassessmentid');
      }
      setStudentAssessmentId(id);
    } catch (err) {
      actionInFlightRef.current = false;
      logAssessmentError('startAssessment:stub-failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setPhase('landing');
    }
  }, [
    buildStubArgs,
    createStub,
    publishId,
    sessionDetails?.latestAssessmentId,
    sessionDetails?.testStateName,
    studentAssessmentId,
  ]);

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
    const saveSeq = ++saveSeqRef.current;
    const stubArgs = buildStubArgs(1);
    logAssessment('save:begin', {
      saveSeq,
      phase,
      studentAssessmentId,
      testStateName: sessionDetails?.testStateName,
      status: stubArgs.status,
      questionCount: Object.keys(stubArgs.testQuestions ?? {}).length,
      answerKeyCount: Object.keys(stubArgs.testAnswers ?? {}).length,
      actionInFlight: actionInFlightRef.current,
    });
    actionInFlightRef.current = true;
    try {
      const rsp = await createStub(stubArgs).unwrap();
      logAssessment('save:stub-ok', {
        saveSeq,
        phase,
        studentAssessmentId,
        testassessmentid: rsp.testassessmentid,
        StatusValue: rsp.StatusValue,
        StatusText: rsp.StatusText,
      });
    } catch (err) {
      logAssessmentError('save:stub-failed', {
        saveSeq,
        phase,
        studentAssessmentId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      logAssessment('save:guard-cleared', {
        saveSeq,
        phase,
        note: 'actionInFlightRef cleared; session refetch may still be pending',
      });
      actionInFlightRef.current = false;
    }
  }, [
    buildStubArgs,
    createStub,
    phase,
    sessionDetails?.testStateName,
    studentAssessmentId,
  ]);

  const submit = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    actionInFlightRef.current = true;
    setPhase('loading');
    try {
      const rsp = await createStub(buildStubArgs(3)).unwrap();
      const id = rsp.testassessmentid ?? studentAssessmentId;
      setStudentAssessmentId(id);
      actionInFlightRef.current = false;
      if (sessionDetails?.summary_viewable) {
        setPhase('summary');
      } else {
        setPhase('submitted');
      }
    } catch (err) {
      autoSubmittedRef.current = false;
      actionInFlightRef.current = false;
      logAssessmentError('submit:stub-failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setPhase('answering');
      throw err;
    }
  }, [
    buildStubArgs,
    courseId,
    coursePublishId,
    createStub,
    curriculumId,
    memberId,
    acadYearId,
    chapterId,
    classId,
    publishId,
    recordPoints,
    sessionDetails,
    studentAssessmentId,
  ]);

  const exit = useCallback(async () => {
    actionInFlightRef.current = true;
    try {
      await createStub(buildStubArgs(5)).unwrap();
      setPhase('landing');
    } finally {
      actionInFlightRef.current = false;
    }
  }, [buildStubArgs, createStub]);

  const flag = useCallback((questionId: string) => {
    setTestQuestions((prev) => {
      const q = prev[questionId];
      if (!q) return prev;
      const nextFlagged = q.flagged !== 1;
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
            const questions_attempted = questions.filter((item) => item.attempted === 1).length;
            return { ...section, questions, questions_attempted };
          }),
        );
        return next;
      });
      // Mark unsaved after any answer change
      setHasUnsavedChanges(true);
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

  useEffect(() => {
    logAssessment('phase:changed', {
      phase,
      studentAssessmentId,
      detailsLoading,
      questionsLoading,
      stubLoading,
      sectionCount: questionSection.length,
      questionIds: questionIds.length,
      actionInFlight: actionInFlightRef.current,
      saveSeq: saveSeqRef.current,
      testStateName: sessionDetails?.testStateName,
    });
  }, [
    detailsLoading,
    phase,
    questionIds.length,
    questionSection.length,
    questionsLoading,
    sessionDetails?.testStateName,
    studentAssessmentId,
    stubLoading,
  ]);

  const viewSummary = useCallback(() => {
    logAssessment('phase→summary (viewSummary)');
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
    hasUnsavedChanges,
    startAssessment,
    updateElapsedTime,
    save,
    cancel,
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
