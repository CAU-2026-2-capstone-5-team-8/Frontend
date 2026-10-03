import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import {
  difficultyOptions,
  readingOptions,
  type Difficulty,
  type ShelfEntry,
} from "../lib/libraryApi";
import { AccountField } from "./AccountField";
import { Button, Card, ErrorNotice, Notice, SegmentedControl, s } from "./ui";

export function ShelfEditor({
  entry,
  onChanged,
  onClose,
}: {
  entry: ShelfEntry;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(entry);
  const [status, setStatus] = useState(entry.status),
    [note, setNote] = useState(entry.note);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    entry.review?.difficulty || "APPROPRIATE",
  );
  const [text, setText] = useState(entry.review?.text || "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"shelf" | "review" | "close" | null>(
    null,
  );
  const operation = useRef(false);
  const dirty =
    status !== saved.status ||
    note !== saved.note ||
    text !== (saved.review?.text || "") ||
    (text.length > 0 &&
      difficulty !== (saved.review?.difficulty || "APPROPRIATE"));
  async function mutate(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setConfirm(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={s.badge}>독서 기록 편집</Text>
      <Text accessibilityRole="header" style={s.cardTitle}>
        {entry.title}
      </Text>
      {error && <ErrorNotice message={error} />}
      {message && <Notice>{message}</Notice>}
      <Text style={s.fieldLabel}>읽기 상태</Text>
      <SegmentedControl
        options={readingOptions}
        value={status}
        disabled={busy}
        onChange={setStatus}
      />
      <AccountField
        label="나만 보는 메모"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
        editable={!busy}
      />
      <Text style={s.sub}>
        {note.length} / 1,000자 · 메모는 공개되지 않아요.
      </Text>
      <Button
        label="독서 기록 저장"
        disabled={busy || (status === saved.status && note === saved.note)}
        onPress={() =>
          void mutate(async () => {
            const result = await api.saveShelf(entry.bookId, status, note);
            setSaved(result);
            setMessage("독서 기록을 저장했어요.");
          })
        }
      />
      <View style={s.divider} />
      <Text style={s.cardTitle}>공개 한줄평</Text>
      <Text style={s.sub}>
        저장하면 독자 번호와 함께 누구나 볼 수 있어요. 나만의 메모와 별도로
        저장합니다.
      </Text>
      <SegmentedControl
        options={difficultyOptions}
        value={difficulty}
        onChange={setDifficulty}
        disabled={busy}
      />
      <AccountField
        label="공개 한줄평"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={300}
        editable={!busy}
      />
      <Text style={s.sub}>{text.length} / 300자</Text>
      <Button
        label="한줄평 공개 저장"
        disabled={
          busy ||
          !text.trim() ||
          (text === saved.review?.text &&
            difficulty === saved.review?.difficulty)
        }
        onPress={() =>
          void mutate(async () => {
            const review = await api.saveReview(entry.bookId, {
              difficulty,
              text,
            });
            setSaved((old) => ({ ...old, review }));
            setText(review.text);
            setMessage("한줄평을 공개했어요.");
          })
        }
      />
      {saved.review && (
        <Button
          label="한줄평 삭제"
          secondary
          disabled={busy}
          onPress={() => setConfirm("review")}
        />
      )}
      <View style={s.divider} />
      {confirm ? (
        <>
          <Notice>
            {confirm === "shelf"
              ? "서재에서 제외하면 이 책의 개인 메모도 삭제돼요. 공개 한줄평은 남습니다."
              : confirm === "review"
                ? "공개 한줄평을 삭제할까요? 독서 기록과 메모는 그대로 남아요."
                : "저장하지 않은 입력을 버리고 닫을까요?"}
          </Notice>
          <Button
            label={confirm === "close" ? "입력 버리고 닫기" : "삭제 확인"}
            disabled={busy}
            onPress={() => {
              if (confirm === "close") {
                onClose();
                return;
              }
              void mutate(async () => {
                if (confirm === "shelf") {
                  await api.removeFromShelf(entry.bookId);
                  onClose();
                } else {
                  await api.removeReview(entry.bookId);
                  setSaved((old) => ({ ...old, review: null }));
                  setText("");
                  setDifficulty("APPROPRIATE");
                  setMessage("한줄평을 삭제했어요.");
                }
              });
            }}
          />
          <Button
            label="취소"
            secondary
            disabled={busy}
            onPress={() => setConfirm(null)}
          />
        </>
      ) : (
        <>
          <Button
            label="서재에서 제외"
            secondary
            disabled={busy}
            onPress={() => setConfirm("shelf")}
          />
          <Button
            label="편집 닫기"
            secondary
            disabled={busy}
            onPress={() => (dirty ? setConfirm("close") : onClose())}
          />
        </>
      )}
    </Card>
  );
}
