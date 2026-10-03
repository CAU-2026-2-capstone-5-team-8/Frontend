import type { Ability, ConceptProfile, Graph, Question } from "./types";
export const abilityLabels: Record<Ability, string> = {
  meaning: "뜻·성질",
  application: "계산·적용",
  reasoning: "설명·추론",
};
export function observed(
  profile: ConceptProfile | undefined,
  id: string,
  ability: Ability,
) {
  if (profile?.version !== "concept-abilities-v2") return undefined;
  return profile.abilities.find(
    (a) => a.conceptId === id && a.ability === ability,
  );
}
export function stateOf(
  profile: ConceptProfile | undefined,
  id: string,
  ability: Ability,
): "correct" | "partial" | "unknown" {
  const result = observed(profile, id, ability);
  if (!result || !result.responseCount) return "unknown";
  return result.correctCount === result.responseCount ? "correct" : "partial";
}
export function answered(question: Question) {
  return question.answerMode === "SELF_REPORT"
    ? typeof question.knowsConcept === "boolean"
    : Number.isInteger(question.selectedChoiceIndex);
}
export function graphLayout(graph: Graph, width: number) {
  const depths = new Map(graph.nodes.map((n) => [n.id, 0]));
  // The server owns an acyclic reviewed graph. Bound the relaxation for malformed input.
  for (let i = 0; i < graph.nodes.length; i++) {
    let changed = false;
    for (const edge of graph.edges) {
      if (!depths.has(edge.source) || !depths.has(edge.target)) continue;
      const depth = Math.min(graph.nodes.length, depths.get(edge.source)! + 1);
      if (depth > depths.get(edge.target)!) {
        depths.set(edge.target, depth);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const byDepth = new Map<number, Graph["nodes"]>();
  graph.nodes.forEach((node) => {
    const depth = depths.get(node.id) || 0;
    const group = byDepth.get(depth) || [];
    group.push(node);
    byDepth.set(depth, group);
  });
  // Split wide root layers into short columns so a sparse graph stays readable.
  const groups: Graph["nodes"][] = [];
  [...byDepth.keys()]
    .sort((a, b) => a - b)
    .forEach((depth) => {
      const layer = byDepth.get(depth)!;
      for (let i = 0; i < layer.length; i += 5)
        groups.push(layer.slice(i, i + 5));
    });
  const cols = Math.max(1, groups.length);
  const nodeWidth = 150;
  const canvasWidth = Math.max(width, cols * 184 + 28);
  const maxRows = Math.max(1, ...groups.map((g) => g.length));
  const height = Math.max(260, maxRows * 96 + 28);
  const positions = new Map<string, { x: number; y: number }>();
  groups.forEach((group, col) =>
    group.forEach((node, row) =>
      positions.set(node.id, {
        x: 16 + (col * (canvasWidth - 32)) / cols,
        y: 16 + row * 96,
      }),
    ),
  );
  return { positions, height, canvasWidth, nodeWidth };
}
