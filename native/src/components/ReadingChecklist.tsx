import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ReadingChecklist as Checklist } from "../lib/types";
import { nextChecks } from "../lib/learningRecommendations";
import { colors } from "../theme/tokens";
import { s, SegmentedControl } from "./ui";

const states = {
  correct: "정답으로 확인한 내용",
  "needs-practice": "복습할 내용",
  unmeasured: "아직 확인하지 않은 내용",
};

export function ReadingChecklist({
  checklist,
  labels = {},
}: {
  checklist: Checklist;
  labels?: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"next" | "all">("next");
  const rows =
    filter === "all" ? checklist.concepts : nextChecks(checklist.concepts);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={s.cardTitle}>
        읽기 전에 살펴볼 내용
      </Text>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: "next", label: "더 살펴보기" },
          { value: "all", label: "전체 보기" },
        ]}
      />
      {!rows.length && (
        <Text style={s.body}>
          이제 책을 펼쳐보세요. 전체 보기에서 확인한 내용을 다시 살펴볼 수
          있어요.
        </Text>
      )}
      <View>
        {rows.map((row) => (
          <View key={row.conceptId} style={styles.row}>
            <View style={styles.content}>
              <Text style={styles.name}>
                {labels[row.conceptId] || row.conceptId}
              </Text>
              {row.dependsOn.length > 0 && (
                <Text style={s.sub}>
                  먼저 살펴보기:{" "}
                  {row.dependsOn.map((id) => labels[id] || id).join(", ")}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.state,
                {
                  color:
                    row.state === "needs-practice"
                      ? colors.amber
                      : row.state === "correct"
                        ? colors.green
                        : colors.muted,
                },
              ]}
            >
              {states[row.state]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 22 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 19,
    borderBottomWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  content: { flexGrow: 1, flexShrink: 1, flexBasis: 220, gap: 6 },
  name: { color: colors.ink, fontSize: 17, lineHeight: 26, fontWeight: "600" },
  state: { fontSize: 12, lineHeight: 20 },
});
