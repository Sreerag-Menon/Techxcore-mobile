import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CourseModule,
  ICQAnswerData,
  ICQAnswerResponse,
  InCourseQuestion,
} from '../types/course.types';

export type ICQEngineModule = CourseModule & {
  testQuestions: InCourseQuestion[];
  nextTestQuestionId: string | null;
  lastAnsweredTestQuestionId: string | null;
  contentLengthSeconds?: number;
};

export type UseICQEngineArgs = {
  module: ICQEngineModule;
  savedAnswers?: Record<string, ICQAnswerData>;
  lastViewedPos?: number;
  maxViewedPos?: number;
};

function findSectionMaxPos(module: ICQEngineModule, startPos: number): number {
  let nextQuestionPos: number | null = null;
  for (const q of module.testQuestions) {
    if (nextQuestionPos === null && startPos < q.pos) {
      nextQuestionPos = q.pos;
    }
  }
  return nextQuestionPos ?? module.contentLengthSeconds ?? Number.MAX_SAFE_INTEGER;
}

function buildActiveQueue(
  module: ICQEngineModule,
  lastViewedPos: number,
): InCourseQuestion[] {
  const queue: InCourseQuestion[] = [];
  if (module.nextTestQuestionId == null) return queue;

  let i = 0;
  const n = module.testQuestions.length;
  while (i < n && module.testQuestions[i]!.id !== module.nextTestQuestionId) {
    i++;
  }
  while (i < n && module.testQuestions[i]!.pos === lastViewedPos) {
    queue.push(module.testQuestions[i]!);
    i++;
  }
  return queue;
}

function computeInitialState(module: ICQEngineModule, lastViewedPos: number, maxViewedPos: number) {
  const activeQueue = buildActiveQueue(module, lastViewedPos);
  let minPos: number;
  let maxPos: number;
  let sectionDone: boolean;

  if (activeQueue.length > 0) {
    minPos = activeQueue[0]!.pos;
    maxPos = minPos;
    sectionDone = false;
  } else {
    minPos = 0;
    maxPos = findSectionMaxPos(module, lastViewedPos);
    sectionDone = maxPos <= maxViewedPos;
  }

  return { activeQueue, minPos, maxPos, sectionDone, lastViewedPos, maxViewedPos };
}

export function useICQEngine({
  module,
  savedAnswers = {},
  lastViewedPos: lastViewedPosProp,
  maxViewedPos: maxViewedPosProp,
}: UseICQEngineArgs) {
  const lastViewedPos = lastViewedPosProp ?? module.summary?.lastPositionSeconds ?? 0;
  const maxViewedPos = maxViewedPosProp ?? module.summary?.totalTimeSeconds ?? lastViewedPos;

  const initial = useMemo(
    () => computeInitialState(module, lastViewedPos, maxViewedPos),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on module switch only
    [module.contentId],
  );

  const [activeQueue, setActiveQueue] = useState<InCourseQuestion[]>(initial.activeQueue);
  const [minPos, setMinPos] = useState(initial.minPos);
  const [maxPos, setMaxPos] = useState(initial.maxPos);
  const [sectionDone, setSectionDone] = useState(initial.sectionDone);
  const [lastAnsweredTestQuestionId, setLastAnsweredTestQuestionId] = useState<string | null>(
    module.lastAnsweredTestQuestionId,
  );
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const next = computeInitialState(module, lastViewedPos, maxViewedPos);
    setActiveQueue(next.activeQueue);
    setMinPos(next.minPos);
    setMaxPos(next.maxPos);
    setSectionDone(next.sectionDone);
    setLastAnsweredTestQuestionId(module.lastAnsweredTestQuestionId);
    setReviewing(false);
  }, [module.contentId, lastViewedPos, maxViewedPos, module]);

  const overlay = activeQueue.length > 0 ? activeQueue[0]! : null;
  const adjustedMaxPos = activeQueue.length > 0 ? activeQueue[0]!.pos : maxPos;
  const hasICQ = module.testQuestions.length > 0;

  const getAnswerData = useCallback(
    (questionId: string): ICQAnswerData =>
      savedAnswers[questionId] ?? {
        choices: [],
        answers: [],
        comments: [],
        reviewStarts: [],
        reviewEnds: [],
      },
    [savedAnswers],
  );

  const handleContinue = useCallback(
    (continueToNext = false) => {
      if (reviewing) {
        const reviewPos = activeQueue[0]?.pos ?? maxPos;
        setMinPos(reviewPos);
        setMaxPos(reviewPos);
        setReviewing(false);
        setSectionDone(true);
        return;
      }

      if (activeQueue.length > 1) {
        setActiveQueue((prev) => prev.slice(1));
        setSectionDone(false);
        return;
      }

      if (activeQueue.length === 1) {
        const contentLength = module.contentLengthSeconds ?? maxPos;
        if (maxPos < contentLength) {
          const nextMax = findSectionMaxPos(module, maxPos);
          setActiveQueue([]);
          setMaxPos(nextMax);
          setMinPos(0);
          setSectionDone(nextMax <= maxViewedPos);
        } else {
          setActiveQueue([]);
          setSectionDone(false);
        }
        return;
      }

      const atMaxPos: InCourseQuestion[] = [];
      for (const q of module.testQuestions) {
        if (q.pos === maxPos) atMaxPos.push(q);
      }

      if (atMaxPos.length > 0) {
        const pos = atMaxPos[0]!.pos;
        setActiveQueue(atMaxPos);
        setMinPos(pos);
        setSectionDone(false);
      } else if (continueToNext) {
        setSectionDone(true);
      }
    },
    [activeQueue, maxPos, maxViewedPos, module, reviewing],
  );

  const handleQuestionAnswered = useCallback(
    (response: ICQAnswerResponse, continueToNext = false) => {
      const q = activeQueue[0];
      if (!q) return;
      setLastAnsweredTestQuestionId(q.id);
      if (continueToNext) {
        handleContinue(true);
      } else {
        setSectionDone(true);
      }
    },
    [activeQueue, handleContinue],
  );

  const handleReview = useCallback((reviewMin: number, reviewMax: number) => {
    setMinPos(reviewMin);
    setMaxPos(reviewMax);
    setReviewing(true);
    setSectionDone(true);
  }, []);

  const handleReachedMaxPos = useCallback(() => {
    if (activeQueue.length > 0) return;
    const atMaxPos: InCourseQuestion[] = [];
    for (const q of module.testQuestions) {
      if (q.pos === maxPos) atMaxPos.push(q);
    }
    if (atMaxPos.length > 0) {
      setActiveQueue(atMaxPos);
      setMinPos(atMaxPos[0]!.pos);
      setSectionDone(false);
    }
  }, [activeQueue.length, maxPos, module.testQuestions]);

  const progressPatch = useMemo(() => {
    const patch: {
      lastViewedPos?: number;
      maxViewedPos?: number;
      nextTestQuestionId?: string;
      lastAnsweredTestQuestionId?: string;
    } = {};

    if (activeQueue.length > 0) {
      patch.lastViewedPos = activeQueue[0]!.pos;
      if (!reviewing && !sectionDone) {
        patch.nextTestQuestionId = activeQueue[0]!.id;
      } else if (activeQueue.length > 1) {
        patch.nextTestQuestionId = activeQueue[1]!.id;
      }
    }
    if (lastAnsweredTestQuestionId) {
      patch.lastAnsweredTestQuestionId = lastAnsweredTestQuestionId;
    }
    return patch;
  }, [activeQueue, lastAnsweredTestQuestionId, reviewing, sectionDone]);

  return {
    hasICQ,
    overlay,
    activeQueue,
    minPos,
    maxPos,
    adjustedMaxPos,
    sectionDone,
    reviewing,
    lastAnsweredTestQuestionId,
    getAnswerData,
    handleContinue,
    handleQuestionAnswered,
    handleReview,
    handleReachedMaxPos,
    progressPatch,
  };
}
