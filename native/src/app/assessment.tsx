import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { FocusPressable as Pressable } from "../components/FocusPressable";
import { QuestionContent } from "../components/QuestionContent";
import { questionContentLabel } from "../lib/questionContent";
import {
  Button,
  Card,
  colors,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  s,
} from "../components/ui";
import { api } from "../lib/api";
import { answered } from "../lib/learning";
import { assessmentDisplay, mergeSessionTranslations } from "../lib/assessmentTranslation";
import type { Session } from "../lib/types";
import { useLearning } from "../state/LearningContext";
import { useAuth } from "../state/AuthContext";
export default function Assessment() {
  const { session: login } = useAuth();
  const { topic, saveProfile, storageKey } = useLearning();
  const [session, setSession] = useState<Session | null>(null),
    [index, setIndex] = useState(0),
    [selection, setSelection] = useState<{
      id: number;
      value: number | boolean;
    } | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [resumeId, setResumeId] = useState<number | null>(null);
  useEffect(() => {
    if (topic)
      void AsyncStorage.getItem(storageKey(topic.id, "session")).then((v) =>
        setResumeId(v ? Number(v) : null),
      );
  }, [topic, storageKey]);
  const [previewReady, setPreviewReady] = useState(false);
  useEffect(() => {
    void api
      .questionPreviewSummary()
      .then((bank) =>
        setPreviewReady(
          bank.candidateCount > 0 &&
            bank.topicIds.includes(topic?.mlTopicId || ""),
        ),
      )
      .catch(() => setPreviewReady(false));
  }, [topic]);
  const question = session?.questions[index];
  const [originalId, setOriginalId] = useState<number | null>(null);
  const display = question ? assessmentDisplay(question, originalId === question.id) : null;
  const translationPoll = useRef({ id: null as number | null, attempts: 0 });
  useEffect(() => {
    if (!session || !session.questions.some((q) => q.answerMode === "MULTIPLE_CHOICE" && !q.translation)) return;
    if (translationPoll.current.id !== session.id) translationPoll.current = { id: session.id, attempts: 0 };
    if (translationPoll.current.attempts >= 12) return;
    let active = true;
    let inFlight = false;
    const timer = setInterval(() => {
      if (inFlight) return;
      if (translationPoll.current.attempts >= 12) { clearInterval(timer); return; }
      translationPoll.current.attempts += 1;
      inFlight = true;
      void api.session(session.id).then((next) => {
        if (active) setSession((current) => mergeSessionTranslations(current, next));
      }).catch(() => {}).finally(() => { inFlight = false; });
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [session]);
  const choice =
    selection?.id === question?.id
      ? (selection?.value ?? null)
      : question?.answerMode === "SELF_REPORT"
        ? (question.knowsConcept ?? null)
        : (question?.selectedChoiceIndex ?? null);
  const setChoice = (value: number | boolean) => {
    if (question) setSelection({ id: question.id, value });
  };
  async function start(resume = false) {
    if (!topic) return;
    setPending(true);
    setError(null);
    try {
      const next =
        resume && resumeId
          ? await api.session(resumeId)
          : await api.createSession(topic.id);
      if (next.userId !== login?.userId || next.topicId !== topic.id)
        throw Error("이 분야의 진단을 다시 시작해 주세요.");
      setSession(next);
      const first = next.questions.findIndex((q) => !answered(q));
      setIndex(first < 0 ? Math.max(0, next.questions.length - 1) : first);
      await AsyncStorage.setItem(
        storageKey(topic.id, "session"),
        String(next.id),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function save() {
    if (!session || !question || choice === null) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.answer(
        session.id,
        question.id,
        question.answerMode === "SELF_REPORT"
          ? { knowsConcept: choice as boolean }
          : { selectedChoiceIndex: choice as number },
      );
      setSession({
        ...session,
        questions: session.questions.map((q) =>
          q.id === result.id ? result : q,
        ),
      });
      setIndex(Math.min(index + 1, session.questions.length - 1));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function complete() {
    if (!session) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.complete(session.id);
      saveProfile(result.profile);
      await AsyncStorage.removeItem(storageKey(session.topicId, "session"));
      router.replace("/map");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  const allAnswered = session?.questions.every(answered);
  return (
    <Page
      eyebrow="개념 진단"
      title={topic ? `${topic.name} 개념 진단` : "분야를 먼저 선택해 주세요"}
      description="모르는 내용을 찾아도 괜찮아요. 다음에 배울 내용을 정하는 과정입니다."
    >
      {error && <ErrorNotice message={error} />}{" "}
      {!session ? (
        <Card>
          <Text style={s.cardTitle}>어떤 개념을 활용할 수 있나요?</Text>
          <Text style={s.body}>
            문제는 뜻·적용·추론을 구분해 기록합니다. 자기평가 응답은 문제 채점과
            분리해서 보여드려요.
          </Text>
          {previewReady && (
            <Button
              label="새 문제 검토하기"
              secondary
              onPress={() => router.push("/question-review")}
            />
          )}
          <Button
            label="진단 시작"
            disabled={pending || !topic?.conceptAssessmentReady}
            onPress={() => void start()}
          />
          {resumeId && (
            <Button
              label="이전 진단 이어하기"
              disabled={pending}
              secondary
              onPress={() => void start(true)}
            />
          )}
        </Card>
      ) : (
        question && (
          <>
            <View style={s.row}>
              <Text style={s.badge}>
                {index + 1} / {session.questions.length} 문항
              </Text>
              <Text style={s.sub}>
                저장 완료 {session.questions.filter(answered).length}개
              </Text>
            </View>
            {question.measurementContext === "provided-information" && (
              <Notice>
                설명을 읽은 뒤 적용하는 문제입니다. 이 결과는 기존에 알고 있던
                지식과 따로 기록해요.
              </Notice>
            )}
            <Card>
              <View style={s.row}>
              <Text style={s.sub}>
                {question.answerMode === "SELF_REPORT"
                  ? "자기평가 · 문제 채점과 별도 기록"
                  : question.cognitiveOperation
                    ? `문제 평가 · ${question.cognitiveOperation === "apply" ? "계산·적용" : question.cognitiveOperation === "recognize" || question.cognitiveOperation === "recall" ? "뜻·성질" : "설명·추론"}`
                    : "문제 평가 · 수행 능력 분류 확인 중"}
              </Text>
              {question.translation && (
                <Button
                  label={display?.translated ? "원문 보기" : "한국어 보기"}
                  secondary
                  onPress={() => setOriginalId(display?.translated ? question.id : null)}
                />
              )}
              </View>
              {display?.passage && (
                <View
                  style={{
                    backgroundColor: colors.paper,
                    padding: 18,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <QuestionContent source={display.passage} />
                </View>
              )}
              <QuestionContent source={display?.prompt ?? question.prompt} variant="title" />
              {question.answerMode === "MULTIPLE_CHOICE" ? (
                (display?.choices ?? question.choices).map((text, i) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`${i + 1}. ${questionContentLabel(text)}`}
                    accessibilityState={{ checked: choice === i }}
                    aria-checked={choice === i}
                    key={i}
                    onPress={() => setChoice(i)}
                    disabled={
                      pending ||
                      !["CREATED", "IN_PROGRESS"].includes(session.status)
                    }
                    style={[
                      s.chip,
                      { borderRadius: 16, alignItems: "flex-start" },
                      choice === i && {
                        backgroundColor: colors.soft,
                        borderColor: colors.green,
                      },
                    ]}
                  >
                    <Text style={s.body}>{i + 1}.</Text>
                    <QuestionContent source={text} interactive={false} />
                  </Pressable>
                ))
              ) : (
                <View style={s.row}>
                  {[true, false].map((v) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: choice === v }}
                      aria-checked={choice === v}
                      key={String(v)}
                      onPress={() => setChoice(v)}
                      disabled={
                        pending ||
                        !["CREATED", "IN_PROGRESS"].includes(session.status)
                      }
                      style={[
                        s.chip,
                        choice === v && {
                          backgroundColor: colors.soft,
                          borderColor: colors.green,
                        },
                      ]}
                    >
                      <Text style={s.body}>
                        {v ? "알고 있어요" : "아직 어려워요"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Button
                label={pending ? "저장하고 있어요…" : "답변 저장하고 계속"}
                disabled={
                  pending ||
                  choice === null ||
                  !["CREATED", "IN_PROGRESS"].includes(session.status)
                }
                onPress={() => void save()}
              />
              <Button
                label="이전 문항"
                secondary
                disabled={!index || pending}
                onPress={() => setIndex((i) => i - 1)}
              />
            </Card>
            {allAnswered && (
              <Button
                label={
                  pending ? "결과를 정리하고 있어요…" : "나의 개념 지도 보기"
                }
                disabled={pending}
                onPress={() => void complete()}
              />
            )}
          </>
        )
      )}
      {pending && !session && <Loading />}
      <Button
        label="책 목록으로"
        secondary
        onPress={() => router.replace("/")}
      />
    </Page>
  );
}
