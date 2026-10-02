import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Pattern,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { abilityLabels, graphLayout, observed, stateOf } from "../lib/learning";
import type { Ability, ConceptProfile, Graph } from "../lib/types";
import { Icon } from "./Icon";
import { FocusPressable as Pressable } from "./FocusPressable";
import { Card, colors, s, SegmentedControl } from "./ui";

const options = (Object.keys(abilityLabels) as Ability[]).map((value) => ({
  value,
  label: abilityLabels[value],
}));
const status = {
  correct: { label: "정답 확인", color: colors.green, fill: "#E0F2E8" },
  partial: { label: "보완 필요", color: colors.amber, fill: "#FFF0DB" },
  unknown: { label: "미평가", color: colors.muted, fill: "url(#conceptGlass)" },
};

export function ConceptMap({
  graph,
  profile,
}: {
  graph: Graph;
  profile?: ConceptProfile;
}) {
  const [ability, setAbility] = useState<Ability>("application");
  const [selected, setSelected] = useState<string | null>(null);
  const [width, setWidth] = useState(600);
  const layout = graphLayout(graph, width);
  const covered = new Set(graph.book?.coveredConcepts || []);
  const concept = graph.nodes.find((n) => n.id === selected);
  const counts = graph.nodes.reduce(
    (result, node) => {
      result[stateOf(profile, node.id, ability)]++;
      return result;
    },
    { correct: 0, partial: 0, unknown: 0 },
  );

  return (
    <View style={{ gap: 20 }}>
      <Card>
        <View style={s.row}>
          <View style={styles.heading}>
            <Icon name="map" color={colors.green} />
            <Text style={s.cardTitle}>개념의 연결</Text>
          </View>
          <Text style={s.sub}>{graph.nodes.length}개 개념</Text>
        </View>
        <SegmentedControl
          options={options}
          value={ability}
          onChange={setAbility}
        />
        <View style={styles.stats}>
          {(Object.keys(status) as (keyof typeof status)[]).map((key) => (
            <View key={key} style={styles.stat}>
              <View style={styles.statLabel}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        key === "unknown" ? "transparent" : status[key].color,
                      borderColor: status[key].color,
                    },
                  ]}
                />
                <Text style={s.sub}>{status[key].label}</Text>
              </View>
              <Text style={styles.statValue}>
                {counts[key]}
                <Text style={styles.statUnit}> 개</Text>
              </Text>
            </View>
          ))}
        </View>
        <View
          style={styles.canvas}
          onLayout={(event) =>
            setWidth(Math.max(240, event.nativeEvent.layout.width - 2))
          }
        >
          <View style={styles.canvasHeader}>
            <Text style={s.sub}>검토된 선수관계</Text>
            <Text style={s.sub}>좌우로 이동해 살펴보세요</Text>
          </View>
          <ScrollView
            horizontal
            accessibilityLabel="공통 개념 지도. 가로로 이동해 개념을 확인할 수 있습니다."
          >
            <Svg
              width={layout.canvasWidth}
              height={layout.height}
              accessibilityLabel={`${graph.nodes.length}개 개념의 ${abilityLabels[ability]} 평가 상태`}
            >
              <Defs>
                <Pattern
                  id="conceptDots"
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <Circle cx={1} cy={1} r={0.7} fill="#CBD7DE" />
                </Pattern>
                <LinearGradient id="conceptGlass" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="1" stopColor="#F2F7FA" />
                </LinearGradient>
              </Defs>
              <Rect
                width={layout.canvasWidth}
                height={layout.height}
                fill="url(#conceptDots)"
              />
              {graph.edges.map((edge) => {
                const from = layout.positions.get(edge.source),
                  to = layout.positions.get(edge.target);
                if (!from || !to) return null;
                const startX = from.x + layout.nodeWidth,
                  endX = to.x;
                const startY = from.y + 39,
                  endY = to.y + 39;
                const bend = Math.max(18, (endX - startX) / 2);
                return (
                  <G key={`${edge.source}:${edge.target}`}>
                    <Path
                      d={`M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="#AABDC7"
                      strokeWidth={1.5}
                    />
                    <Polygon
                      points={`${endX},${endY} ${endX - 5},${endY - 3} ${endX - 5},${endY + 3}`}
                      fill="#8DA5B2"
                    />
                  </G>
                );
              })}
              {graph.nodes.map((node) => {
                const position = layout.positions.get(node.id)!;
                const state = stateOf(profile, node.id, ability),
                  observation = observed(profile, node.id, ability);
                const bookConcept = covered.has(node.id),
                  active = node.id === selected;
                return (
                  <G
                    key={node.id}
                    x={position.x}
                    y={position.y}
                    onPress={() => setSelected(node.id)}
                    accessibilityLabel={`${node.label}: ${observation ? `정답 ${observation.correctCount}/${observation.responseCount}` : "미평가"}`}
                  >
                    <Rect
                      x={0}
                      y={3}
                      width={layout.nodeWidth}
                      height={78}
                      rx={18}
                      fill="#DCE5EA"
                      opacity={0.35}
                    />
                    <Rect
                      width={layout.nodeWidth}
                      height={78}
                      rx={18}
                      fill={status[state].fill}
                      stroke={
                        active
                          ? colors.green
                          : bookConcept
                            ? "#315C78"
                            : "#D3DFE5"
                      }
                      strokeWidth={bookConcept || active ? 2 : 1}
                    />
                    {bookConcept && (
                      <Circle
                        cx={layout.nodeWidth - 12}
                        cy={12}
                        r={3}
                        fill="#315C78"
                      />
                    )}
                    <SvgText
                      x={layout.nodeWidth / 2}
                      y={29}
                      textAnchor="middle"
                      fontSize={node.label.length > 10 ? 11 : 12}
                      fontFamily={
                        Platform.OS === "ios" ? "System" : "sans-serif"
                      }
                      fontWeight="600"
                      fill={colors.ink}
                    >
                      {node.label}
                    </SvgText>
                    <Circle
                      cx={25}
                      cy={56}
                      r={3.4}
                      fill={state === "unknown" ? "none" : status[state].color}
                      stroke={status[state].color}
                    />
                    <SvgText
                      x={36}
                      y={60}
                      fontSize={11}
                      fontFamily={
                        Platform.OS === "ios" ? "System" : "sans-serif"
                      }
                      fill={colors.muted}
                    >
                      {observation
                        ? `정답 ${observation.correctCount}/${observation.responseCount}`
                        : "아직 미평가"}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </ScrollView>
        </View>
        {graph.book && (
          <View style={styles.heading}>
            <View style={styles.bookLegend} />
            <Text style={s.sub}>
              푸른 테두리 · 수집 근거에서 이 책과 연결된 개념
            </Text>
          </View>
        )}
        <Text style={s.fieldLabel}>개념을 선택해 자세히 확인하세요</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          accessibilityLabel="개념 상세 선택"
        >
          {graph.nodes.map((node) => (
            <Pressable
              key={node.id}
              accessibilityRole="button"
              accessibilityLabel={`${node.label} 상세 보기`}
              accessibilityState={{ selected: node.id === selected }}
              aria-selected={node.id === selected}
              onPress={() => setSelected(node.id)}
              style={[s.chip, selected === node.id && s.activeChip]}
            >
              <Text
                style={[
                  s.chipText,
                  selected === node.id && { color: colors.green },
                ]}
              >
                {node.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>
      {concept && (
        <Card>
          <View style={s.row}>
            <Text style={s.cardTitle}>{concept.label}</Text>
            <Text style={s.badge}>개념별 평가 기록</Text>
          </View>
          {options.map(({ value, label }) => {
            const observation = observed(profile, concept.id, value);
            return (
              <View key={value} style={s.row}>
                <Text style={s.body}>{label}</Text>
                <Text style={s.sub}>
                  {observation
                    ? `정답 ${observation.correctCount}/${observation.responseCount} · 평가 ${observation.responseCount}문항`
                    : "아직 평가하지 않았어요"}
                </Text>
              </View>
            );
          })}
          {profile?.selfReports.some(
            (report) => report.conceptId === concept.id,
          ) && (
            <Text style={s.sub}>
              자기평가 응답이 있어요. 문제로 확인한 능력과는 별도로 기록합니다.
            </Text>
          )}
        </Card>
      )}
      <Text style={s.sub}>
        공통 개념 목록의 일부 영역을 평가한 결과예요. 미평가는 모른다는 뜻이
        아닙니다. 연결선은 검토된 선수관계이며 목차 순서와 다릅니다.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 10 },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E0E8EC",
    backgroundColor: "rgba(255,255,255,0.66)",
  },
  statLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  dot: { width: 6, height: 6, borderRadius: 4, borderWidth: 1 },
  statValue: {
    fontSize: 27,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -1,
  },
  statUnit: { fontSize: 12, color: colors.muted },
  canvas: {
    borderWidth: 1,
    borderColor: "#DFE8ED",
    backgroundColor: "rgba(242,247,250,0.72)",
    borderRadius: 20,
    overflow: "hidden",
  },
  canvasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 4,
  },
  bookLegend: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#315C78",
  },
});
