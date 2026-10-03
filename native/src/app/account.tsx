import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AccountField } from "../components/AccountField";
import { FocusPressable } from "../components/FocusPressable";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Page,
  SegmentedControl,
  s,
  colors,
} from "../components/ui";
import { api } from "../lib/api";
import type {
  AccountProfile,
  AvatarKey,
  ReadinessOverview,
  ReadinessHistory,
  ReadinessSnapshot,
} from "../lib/accountTypes";
import { useAuth } from "../state/AuthContext";
import { useLearning } from "../state/LearningContext";

export default function Account() {
  const { session, error } = useAuth();
  return (
    <Page
      eyebrow="내 계정"
      title={session ? "나의 독서 공간" : "책길에 오신 것을 환영해요"}
      description={
        session
          ? "내 정보를 관리하고, 진단에서 확인한 내용을 돌아봐요."
          : "로그인하면 진단과 추천을 내 계정에 이어서 저장할 수 있어요."
      }
    >
      {error && <ErrorNotice message={error} />}
      {session ? <AccountDetails /> : <SignIn />}
    </Page>
  );
}
function SignIn() {
  const { signIn, busy } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    if (
      !email.trim() ||
      !password ||
      (mode === "register" && (!name.trim() || password.length < 12))
    ) {
      setError(
        mode === "register"
          ? "이메일, 표시 이름과 12자 이상의 비밀번호를 입력해 주세요."
          : "이메일과 비밀번호를 입력해 주세요.",
      );
      return;
    }
    try {
      await signIn(email, password, mode === "register" ? name : undefined);
      router.replace("/account");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Card style={{ maxWidth: 560, width: "100%" }}>
      <SegmentedControl
        options={[
          { value: "login", label: "로그인" },
          { value: "register", label: "회원가입" },
        ]}
        value={mode}
        disabled={busy}
        onChange={(value) => {
          setMode(value);
          setError(null);
          setPassword("");
        }}
      />
      {mode === "register" && (
        <AccountField
          label="표시 이름"
          value={name}
          onChangeText={setName}
          maxLength={120}
          editable={!busy}
          autoComplete="name"
        />
      )}
      <AccountField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={254}
        editable={!busy}
      />
      <AccountField
        label={mode === "register" ? "비밀번호 · 12자 이상" : "비밀번호"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        maxLength={128}
        editable={!busy}
        returnKeyType="go"
        onSubmitEditing={() => {
          if (!busy) void submit();
        }}
      />
      {error && <ErrorNotice message={error} />}
      <Button
        label={
          busy
            ? "확인하고 있어요…"
            : mode === "register"
              ? "계정 만들기"
              : "로그인하기"
        }
        disabled={busy}
        onPress={() => void submit()}
      />
      <Text style={s.sub}>계정 없이도 책 목록을 둘러볼 수 있어요.</Text>
      <Button
        label="책 둘러보기"
        secondary
        onPress={() => router.replace("/")}
      />
    </Card>
  );
}
const avatars: { value: AvatarKey; label: string }[] = [
  { value: "BOOK", label: "책" },
  { value: "LEAF", label: "잎" },
  { value: "MOON", label: "달" },
  { value: "SUN", label: "해" },
];
function AccountDetails() {
  const { session, signOut, busy } = useAuth();
  const { topics, selectTopic } = useLearning();
  const [me, setMe] = useState<AccountProfile | null>(null),
    [readiness, setReadiness] = useState<ReadinessOverview | null>(null);
  const [name, setName] = useState(""),
    [bio, setBio] = useState(""),
    [avatar, setAvatar] = useState<AvatarKey>("BOOK");
  const [interests, setInterests] = useState<number[]>([]),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [readinessError, setReadinessError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{
    topicId: number;
    data: ReadinessHistory;
  } | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false),
    [historyError, setHistoryError] = useState<string | null>(null);
  const loadReadiness = useCallback(async () => {
    try {
      setReadiness(await api.readiness());
      setReadinessError(null);
    } catch (e) {
      setReadinessError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void api
      .me()
      .then((value) => {
        if (!active || value.userId !== session?.userId) return;
        setMe(value);
        setName(value.displayName);
        setBio(value.bio);
        setAvatar(value.avatarKey);
        setInterests(value.interests.map((i) => i.id));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    void Promise.resolve().then(loadReadiness);
    return () => {
      active = false;
    };
  }, [session?.userId, loadReadiness]);
  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await api.updateMe({
        displayName: name.trim(),
        bio,
        avatarKey: avatar,
        interestTopicIds: interests,
      });
      setMe(next);
      setName(next.displayName);
      setSaved(true);
      await loadReadiness();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function loadHistory(topicId: number, page = 0) {
    setHistoryBusy(true);
    setHistoryError(null);
    try {
      setHistory({ topicId, data: await api.history(topicId, page) });
    } catch (e) {
      setHistoryError((e as Error).message);
    } finally {
      setHistoryBusy(false);
    }
  }
  return (
    <>
      {error && <ErrorNotice message={error} />}
      {!me && !error && <Loading />}
      {me && (
        <Card>
          <Text style={s.cardTitle}>계정 프로필</Text>
          <Text style={s.sub}>{me.email}</Text>
          <AccountField
            label="표시 이름"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setSaved(false);
            }}
            maxLength={120}
            editable={!saving}
          />
          <AccountField
            label="소개"
            value={bio}
            onChangeText={(value) => {
              setBio(value);
              setSaved(false);
            }}
            maxLength={500}
            multiline
            editable={!saving}
          />
          <Text style={s.fieldLabel}>기본 아바타</Text>
          <SegmentedControl
            options={avatars}
            value={avatar}
            disabled={saving}
            onChange={(value) => {
              setAvatar(value);
              setSaved(false);
            }}
          />
          <Text style={s.fieldLabel}>관심 분야</Text>
          <View style={s.row}>
            {topics
              .filter((t) => t.parentId !== null)
              .map((t) => {
                const selected = interests.includes(t.id);
                return (
                  <FocusPressable
                    key={t.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t.name}
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    disabled={saving}
                    onPress={() => {
                      setSaved(false);
                      setInterests((current) =>
                        selected
                          ? current.filter((id) => id !== t.id)
                          : [...current, t.id],
                      );
                    }}
                    style={[
                      s.chip,
                      selected && {
                        backgroundColor: colors.soft,
                        borderColor: colors.green,
                      },
                    ]}
                  >
                    <Text style={s.body}>{t.name}</Text>
                  </FocusPressable>
                );
              })}
          </View>
          <Button
            label={saving ? "저장하고 있어요…" : "프로필 저장"}
            disabled={saving || !name.trim()}
            onPress={() => void save()}
          />
          {saved && <Notice>프로필을 저장했어요.</Notice>}
        </Card>
      )}
      <Card>
        <Text style={s.cardTitle}>나의 진단 기록</Text>
        {readinessError && (
          <ErrorNotice
            message={readinessError}
            retry={() => void loadReadiness()}
          />
        )}
        {!readiness && !readinessError && <Loading />}
        {readiness && (
          <>
            <Text style={s.body}>
              완료한 진단 {readiness.completedAssessmentCount}회
            </Text>
            {readiness.latestProfiles.length === 0 && (
              <Notice>
                아직 완료한 진단이 없어요. 진단 전인 분야는 점수로 표시하지
                않습니다.
              </Notice>
            )}
            {readiness.latestProfiles.map((p) => (
              <View key={p.profileId} style={{ gap: 10 }}>
                <Snapshot value={p} />
                <View style={s.row}>
                  <Button
                    label={`${p.topicName} 진단 이력`}
                    secondary
                    disabled={historyBusy}
                    onPress={() => void loadHistory(p.topicId)}
                  />
                  <Button
                    label={`${p.topicName} 개념 지도`}
                    secondary
                    onPress={() => {
                      const topic = topics.find((t) => t.id === p.topicId);
                      if (topic) {
                        selectTopic(topic);
                        router.push("/map");
                      }
                    }}
                  />
                </View>
              </View>
            ))}
            {readiness.unassessedInterests.length > 0 && (
              <Notice>
                아직 진단하지 않은 관심 분야:{" "}
                {readiness.unassessedInterests.map((t) => t.name).join(", ")}
              </Notice>
            )}
            <Text style={s.sub}>
              문항에 답한 기록이며 전체 숙련도나 백분위가 아닙니다. 서로 다른
              문항·계산 기준의 결과를 성장 수치로 비교하지 않아요.
            </Text>
          </>
        )}
        {historyError && <ErrorNotice message={historyError} />}
        {historyBusy && <Loading />}
        {history && (
          <View style={{ gap: 16 }}>
            <Text style={s.cardTitle}>
              이전 진단 · {history.data.totalElements}회
            </Text>
            {history.data.content.map((p) => (
              <Snapshot key={p.profileId} value={p} />
            ))}
            <View style={s.row}>
              <Button
                label="이전 기록 페이지"
                secondary
                disabled={historyBusy || history.data.page === 0}
                onPress={() =>
                  void loadHistory(history.topicId, history.data.page - 1)
                }
              />
              <Button
                label="다음 기록 페이지"
                secondary
                disabled={
                  historyBusy ||
                  history.data.page + 1 >= history.data.totalPages
                }
                onPress={() =>
                  void loadHistory(history.topicId, history.data.page + 1)
                }
              />
            </View>
          </View>
        )}
      </Card>
      <Button
        label={busy ? "로그아웃하고 있어요…" : "로그아웃"}
        secondary
        disabled={busy || saving}
        onPress={() => void signOut()}
      />
    </>
  );
}
function Snapshot({ value }: { value: ReadinessSnapshot }) {
  const concept = value.evidence.conceptProfile;
  return (
    <View style={{ gap: 5 }}>
      <Text style={s.fieldLabel}>{value.topicName}</Text>
      <Text style={s.sub}>
        {new Date(value.completedAt).toLocaleString("ko-KR")}
      </Text>
      <Text style={s.body}>
        객관식 {value.multipleChoiceCount}개 · 자기평가 {value.selfReportCount}
        개
      </Text>
      {concept?.version === "concept-abilities-v2" ? (
        <Text style={s.body}>
          사전 지식으로 확인한 개념·능력 {concept.abilities.length}개
        </Text>
      ) : (
        <Text style={s.sub}>
          이전 기준의 기록입니다. 새 진단으로 현재 개념 지도를 확인해 주세요.
        </Text>
      )}
      {value.demoCalculation && <Text style={s.sub}>데모 계산 결과</Text>}
    </View>
  );
}
