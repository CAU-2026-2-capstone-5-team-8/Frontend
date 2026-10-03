import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { FocusPressable as Pressable } from "../components/FocusPressable";
import { QuestionContent } from "../components/QuestionContent";
import { questionContentLabel } from "../lib/questionContent";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  s,
  colors,
} from "../components/ui";
import { api } from "../lib/api";
import { abilityLabels } from "../lib/learning";
import type { QuestionPreview } from "../lib/types";

export default function QuestionReview() {
  const [bank, setBank] = useState<QuestionPreview | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api
      .questionPreview()
      .then(setBank)
      .catch((e) => setError(e.message));
  }, []);
  const question = bank?.questions[index];
  function move(next: number) {
    setIndex(next);
    setChoice(null);
    setReveal(false);
  }
  return (
    <Page
      key={index}
      eyebrow="문항 검토"
      title="새 개념 진단 문제"
      description="질문과 오답 보기가 측정 목표에 맞는지 확인해 주세요."
    >
      <Notice>
        검토 중인 후보 문항입니다. 여기서 선택한 답은 사용자 지도와 추천에
        반영되지 않아요. 영어 원문을 기준으로 검토합니다.
      </Notice>
      {error && <ErrorNotice message={error} />}
      {!bank && !error && <Loading />}
      {question && (
        <>
          <View style={s.row}>
            <Text style={s.badge}>
              {index + 1} / {bank!.questions.length}
            </Text>
            <Text style={s.sub}>
              {question.conceptId} · {abilityLabels[question.ability]}
            </Text>
          </View>
          <Card>
            <QuestionContent source={question.prompt} variant="title" />
            {question.choices.map((text, i) => (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityLabel={`${i + 1}. ${questionContentLabel(text)}`}
                accessibilityState={{ checked: choice === i }}
                aria-checked={choice === i}
                onPress={() => setChoice(i)}
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
            ))}
            <Button
              label={reveal ? "정답과 해설 접기" : "정답과 해설 보기"}
              secondary
              onPress={() => setReveal(!reveal)}
            />
            {reveal && (
              <>
                <Text style={s.cardTitle}>
                  정답 {question.correctChoiceIndex + 1}번
                </Text>
                <QuestionContent source={question.explanation} />
              </>
            )}
          </Card>
          <Card>
            <Text style={s.cardTitle}>측정하려는 내용</Text>
            <QuestionContent source={question.objective} />
            <Text style={s.sub}>
              설명이나 규칙을 제공하지 않고 기존 개념 지식을 확인합니다.
            </Text>
          </Card>
          <View style={s.row}>
            <Button
              label="이전 문제"
              secondary
              disabled={!index}
              onPress={() => move(index - 1)}
            />
            <Button
              label="다음 문제"
              disabled={index + 1 >= bank!.questions.length}
              onPress={() => move(index + 1)}
            />
          </View>
        </>
      )}
    </Page>
  );
}
