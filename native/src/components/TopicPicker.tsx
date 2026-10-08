import React, { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useLearning } from "../state/LearningContext";
import { topicSections } from "../lib/topicNavigation";
import { colors, design } from "../theme/tokens";
import { FocusPressable } from "./FocusPressable";
import { Icon } from "./Icon";

type Anchor = { x: number; y: number; width: number; height: number };

export function TopicPicker() {
  const { topics, topic, selectTopic } = useLearning();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [query, setQuery] = useState("");
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const trigger = useRef<View>(null);
  const input = useRef<TextInput>(null);
  const { height, width } = useWindowDimensions();
  useEffect(() => {
    if (Platform.OS === "web") return;
    const shown = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
      (event) => setKeyboardTop(event.endCoordinates.screenY),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardTop(null),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  const sections = topicSections(topics, query);
  const hasChoices = topics.some((item) => item.parentId !== null);
  const open = anchor !== null;
  const close = () => setAnchor(null);
  const measure = useCallback(() => {
    trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
    });
  }, []);
  useEffect(() => {
    if (open) measure();
  }, [open, height, width, measure]);
  // Keep the menu attached to its field, including fields near the screen bottom.
  const visibleBottom = Math.min(height, keyboardTop ?? height);
  const aboveEdge = Math.min(anchor?.y || 0, visibleBottom);
  const below = anchor ? visibleBottom - anchor.y - anchor.height - 18 : 0;
  const above = Math.max(0, aboveEdge - 18);
  const upwards = below < 220 && above > below;
  const menuHeight = Math.min(440, Math.max(160, upwards ? above : below));
  const menuWidth = Math.min(anchor?.width || 360, width - 24);
  const left = Math.max(12, Math.min(anchor?.x || 12, width - menuWidth - 12));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>살펴볼 분야</Text>
      <View
        ref={trigger}
        collapsable={false}
        onLayout={() => open && measure()}
      >
        <FocusPressable
          accessibilityRole="button"
          accessibilityLabel={`분야 선택, ${topic?.name || "선택 안 됨"}`}
          accessibilityHint="큰 분류별로 묶인 분야 목록을 엽니다"
          accessibilityState={{ expanded: open, disabled: !hasChoices }}
          disabled={!hasChoices}
          onPress={() => {
            setQuery("");
            measure();
          }}
          style={({ pressed }) => [
            styles.trigger,
            open && styles.openTrigger,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.selectedName}>
            {topic?.name || "분야 선택"}
          </Text>
          <View style={open && { transform: [{ rotate: "180deg" }] }}>
            <Icon name="chevron-down" size={18} color={colors.muted} />
          </View>
        </FocusPressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={close}
        onShow={() => {
          if (Platform.OS === "web") input.current?.focus();
        }}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          tabIndex={-1}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel="분야 선택"
          style={[
            styles.dropdown,
            {
              left,
              width: menuWidth,
              maxHeight: menuHeight,
              ...(upwards
                ? { bottom: height - aboveEdge + 6 }
                : { top: (anchor?.y || 0) + (anchor?.height || 0) + 6 }),
            },
          ]}
        >
          <View style={styles.searchRow}>
            <TextInput
              ref={input}
              accessibilityLabel="분야 검색"
              placeholder="분야 검색"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.search}
            />
            <FocusPressable
              accessibilityRole="button"
              accessibilityLabel="분야 선택 닫기"
              onPress={close}
              style={styles.close}
            >
              <Text style={styles.closeText}>닫기</Text>
            </FocusPressable>
          </View>
          <SectionList
            sections={sections}
            extraData={topic?.id}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderSectionHeader={({ section }) => (
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {section.title}
              </Text>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text accessibilityRole="alert" style={styles.emptyTitle}>
                  일치하는 분야가 없어요.
                </Text>
                <FocusPressable
                  accessibilityRole="button"
                  onPress={() => setQuery("")}
                  style={styles.browseButton}
                >
                  <Text style={styles.linkText}>전체 분야 보기</Text>
                </FocusPressable>
              </View>
            }
            renderItem={({ item, section }) => {
              const selected = item.id === topic?.id;
              const status = item.conceptAssessmentReady
                ? "진단 가능"
                : "진단 준비 중";
              return (
                <FocusPressable
                  accessibilityRole="button"
                  accessibilityLabel={`${section.title}, ${item.name}, ${status}`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    selectTopic(item);
                    close();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.optionName, selected && styles.selectedText]}
                  >
                    {item.name}
                  </Text>
                  {!item.conceptAssessmentReady && (
                    <Text style={styles.status}>{status}</Text>
                  )}
                  {selected && (
                    <Icon name="check" size={17} color={colors.green} />
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
                params: { name: query.trim() },
              });
            }}
            style={styles.requestButton}
          >
            <Text style={styles.linkText}>
              찾는 분야가 없나요? 새 분야 요청
            </Text>
          </FocusPressable>
        </View>
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
  openTrigger: { borderColor: colors.green },
  selectedName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink },
  pressed: { opacity: 0.7 },
  dropdown: {
    position: "absolute",
    backgroundColor: colors.paper,
    borderRadius: design.radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  search: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    borderRadius: design.radius.control,
    backgroundColor: colors.soft,
  },
  close: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 12, color: colors.muted },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingHorizontal: 6, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 5,
  },
  option: {
    minHeight: 44,
    paddingVertical: 10,
    paddingLeft: 24,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: design.radius.control,
  },
  optionName: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink },
  status: { fontSize: 10, color: colors.muted },
  selectedOption: { backgroundColor: colors.soft },
  selectedText: { color: colors.green, fontWeight: "600" },
  empty: { paddingHorizontal: 12, paddingTop: 16 },
  emptyTitle: { fontSize: 13, lineHeight: 21, color: colors.ink },
  browseButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: { fontSize: 12, color: colors.green, fontWeight: "600" },
  requestButton: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderTopWidth: 1,
    borderColor: colors.line,
  },
});
