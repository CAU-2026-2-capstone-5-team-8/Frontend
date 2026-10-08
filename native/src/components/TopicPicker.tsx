import React, { useRef, useState } from "react";
import { router } from "expo-router";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useLearning } from "../state/LearningContext";
import { topicChoices, topicPath } from "../lib/topicNavigation";
import { colors, design } from "../theme/tokens";
import { FocusPressable } from "./FocusPressable";
import { Icon } from "./Icon";

export function TopicPicker() {
  const { topics, topic, selectTopic } = useLearning();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const input = useRef<TextInput>(null);
  const { height } = useWindowDimensions();
  const choices = topics.filter((item) => item.parentId !== null);
  const searching = query.trim().length > 0;
  const parent = topics.find((item) => item.id === parentId);
  const matching = topicChoices(topics, parentId, query);
  const browseAll = () => {
    setQuery("");
    setParentId(null);
  };
  const close = () => setOpen(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>살펴볼 분야</Text>
      <FocusPressable
        accessibilityRole="button"
        accessibilityLabel={`분야 선택, ${topic?.name || "선택 안 됨"}`}
        accessibilityHint="검색할 수 있는 분야 목록을 엽니다"
        accessibilityState={{ expanded: open, disabled: choices.length === 0 }}
        disabled={choices.length === 0}
        onPress={() => {
          browseAll();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.selectedName}>
          {topic?.name || "분야 선택"}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </FocusPressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={close}
        onShow={() => {
          if (Platform.OS === "web") input.current?.focus();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <View
            accessibilityViewIsModal
            accessibilityLabel="분야 선택"
            style={[styles.dialog, { maxHeight: height * 0.85 }]}
          >
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                분야 선택
              </Text>
              <FocusPressable
                accessibilityRole="button"
                accessibilityLabel="분야 선택 닫기"
                onPress={close}
                style={styles.close}
              >
                <Text style={styles.closeText}>닫기</Text>
              </FocusPressable>
            </View>
            <TextInput
              ref={input}
              accessibilityLabel="분야 검색"
              placeholder="전체 분야 검색"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.search}
            />
            <View style={styles.navigation}>
              {parentId !== null || searching ? (
                <FocusPressable
                  accessibilityRole="button"
                  onPress={browseAll}
                  style={styles.back}
                >
                  <Text style={styles.backText}>전체 분류로</Text>
                </FocusPressable>
              ) : null}
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {searching
                  ? "검색 결과"
                  : parent?.name || "큰 분류부터 살펴보세요"}
              </Text>
            </View>
            <FlatList
              key={searching ? "search" : String(parentId)}
              data={matching}
              extraData={topic?.id}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text accessibilityRole="alert" style={styles.emptyTitle}>
                    {searching
                      ? "일치하는 분야가 없어요."
                      : "아직 등록된 분야가 없어요."}
                  </Text>
                  <Text style={styles.description}>
                    {searching
                      ? "더 짧은 분야 이름으로 검색하거나 전체 분류에서 찾아보세요."
                      : "전체 분류에서 다른 분야를 살펴보세요."}
                  </Text>
                  <FocusPressable
                    accessibilityRole="button"
                    onPress={browseAll}
                    style={styles.browseButton}
                  >
                    <Text style={styles.backText}>분류 둘러보기</Text>
                  </FocusPressable>
                </View>
              }
              renderItem={({ item }) => {
                const selected = item.id === topic?.id;
                const children = topics.filter(
                  (child) => child.parentId === item.id,
                );
                const isCategory =
                  children.length > 0 || item.parentId === null;
                const path = topicPath(item, topics);
                const status = item.conceptAssessmentReady
                  ? "진단 가능"
                  : "진단 준비 중";
                return (
                  <FocusPressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isCategory
                        ? `${item.name}, 하위 분야 보기`
                        : `${path ? `${path}, ` : ""}${item.name}, ${status}`
                    }
                    accessibilityState={isCategory ? undefined : { selected }}
                    onPress={() => {
                      if (isCategory) {
                        setQuery("");
                        setParentId(item.id);
                        return;
                      }
                      selectTopic(item);
                      close();
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      !isCategory && selected && styles.selectedOption,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionBody}>
                      <Text
                        style={[
                          styles.optionName,
                          !isCategory && selected && styles.selectedText,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.description}>
                        {isCategory
                          ? children.map((child) => child.name).join(" · ") ||
                            "등록된 분야가 없어요"
                          : `${searching && path ? `${path} · ` : ""}${status}`}
                      </Text>
                    </View>
                    {isCategory ? (
                      <Icon name="arrow" size={19} color={colors.muted} />
                    ) : (
                      selected && (
                        <Icon name="check" size={19} color={colors.green} />
                      )
                    )}
                  </FocusPressable>
                );
              }}
            />
            <FocusPressable
              accessibilityRole="button"
              accessibilityLabel="새 분야 요청"
              onPress={() => {
                close();
                router.push({
                  pathname: "/topic-request",
                  params: {
                    name: query.trim(),
                  },
                });
              }}
              style={styles.requestButton}
            >
              <Text style={styles.backText}>
                찾는 분야가 없나요? 새 분야 요청
              </Text>
            </FocusPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 10, width: "100%", maxWidth: 360 },
  label: { fontSize: 11, fontWeight: "600", color: colors.muted },
  trigger: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: design.radius.control,
    backgroundColor: colors.paper,
  },
  selectedName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink },
  pressed: { opacity: 0.7 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(25,32,42,0.35)",
  },
  dialog: {
    width: "100%",
    maxWidth: 480,
    flexShrink: 1,
    backgroundColor: colors.paper,
    borderRadius: design.radius.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 21, fontWeight: "600" },
  close: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 13, color: colors.muted },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: design.radius.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { padding: 4 },
  navigation: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  back: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  backText: { fontSize: 13, color: colors.green, fontWeight: "600" },
  sectionTitle: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  option: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: design.radius.control,
  },
  optionBody: { flex: 1, gap: 5 },
  optionName: { fontSize: 14, lineHeight: 21, color: colors.ink },
  description: { fontSize: 12, lineHeight: 20, color: colors.muted },
  selectedOption: { backgroundColor: colors.soft },
  selectedText: { color: colors.green, fontWeight: "600" },
  empty: { paddingVertical: 18, gap: 10 },
  requestButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: { fontSize: 14, lineHeight: 23, color: colors.ink },
  browseButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 4,
  },
});
