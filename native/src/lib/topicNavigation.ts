import type { Topic } from "./types";

const normalize = (value: string) =>
  value
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, "");

export function topicPath(topic: Topic, topics: Topic[]): string {
  const names: string[] = [];
  const visited = new Set<number>([topic.id]);
  let parentId = topic.parentId;
  while (parentId !== null) {
    const parent = topics.find((item) => item.id === parentId);
    if (!parent || visited.has(parent.id)) break;
    names.unshift(parent.name);
    visited.add(parent.id);
    parentId = parent.parentId;
  }
  return names.join(" / ");
}

export function topicChoices(
  topics: Topic[],
  parentId: number | null,
  query: string,
) {
  const search = normalize(query);
  const parents = new Set(topics.map((item) => item.parentId));
  if (!search) return topics.filter((item) => item.parentId === parentId);
  // Search the whole catalog even while browsing a different category.
  // Category matches return their learning fields, not a broad diagnostic topic.
  return topics.filter(
    (item) =>
      item.parentId !== null &&
      !parents.has(item.id) &&
      (normalize(`${topicPath(item, topics)} ${item.name}`).includes(search) ||
        normalize(item.code) === search ||
        normalize(item.mlTopicId || "").includes(search)),
  );
}

export function topicSections(topics: Topic[], query: string) {
  const parents = new Set(topics.map((item) => item.parentId));
  const matching = query.trim()
    ? topicChoices(topics, null, query)
    : topics.filter((item) => item.parentId !== null && !parents.has(item.id));
  const sections = new Map<
    number,
    { key: string; title: string; data: Topic[] }
  >();
  for (const item of matching) {
    const parentId = item.parentId!;
    if (!sections.has(parentId)) {
      sections.set(parentId, {
        key: String(parentId),
        title: topicPath(item, topics) || "그 밖의 분야",
        data: [],
      });
    }
    sections.get(parentId)!.data.push(item);
  }
  return [...sections.values()];
}
