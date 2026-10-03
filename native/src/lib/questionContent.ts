import katex from "katex";
import MarkdownIt from "markdown-it";

type RenderContext = { mathErrors: string[] };
const md = new MarkdownIt("default", {
  html: false,
  linkify: false,
  breaks: true,
});
md.disable(["image", "link", "autolink", "table", "html_block", "html_inline"]);
const escape = md.utils.escapeHtml;

function endDelimiter(source: string, delimiter: string, start: number) {
  for (
    let i = source.indexOf(delimiter, start);
    i >= 0;
    i = source.indexOf(delimiter, i + 1)
  ) {
    let slashes = 0;
    for (let j = i - 1; j >= 0 && source[j] === "\\"; j--) slashes++;
    if (slashes % 2 === 0) return i;
  }
  return -1;
}

md.inline.ruler.before("escape", "question_math", (state, silent) => {
  const rest = state.src.slice(state.pos);
  function invalidMath() {
    const nextLine = state.src.indexOf("\n", state.pos);
    const stop = nextLine < 0 ? state.posMax : nextLine;
    if (!silent)
      state.push("question_math_invalid", "", 0).content = state.src.slice(
        state.pos,
        stop,
      );
    state.pos = stop;
    return true;
  }
  // Display delimiters reaching the inline parser did not form a complete display block.
  if (rest.startsWith("\\[")) return invalidMath();
  const open = rest.startsWith("\\(")
    ? "\\("
    : rest.startsWith("$") && !rest.startsWith("$$")
      ? "$"
      : null;
  if (!open) return false;
  // Dollars next to whitespace remain ordinary text; escaped currency uses Markdown's escape rule.
  if (open === "$" && /\s/.test(rest[1] || " ")) return false;
  const close = open === "$" ? "$" : "\\)";
  const end = endDelimiter(state.src, close, state.pos + open.length);
  if (end < 0) return open === "\\(" ? invalidMath() : false;
  const content = state.src.slice(state.pos + open.length, end);
  if (
    !content.trim() ||
    content.includes("\n") ||
    (open === "$" && /\s$/.test(content))
  )
    return false;
  if (!silent) state.push("question_math", "", 0).content = content;
  state.pos = end + close.length;
  return true;
});

md.block.ruler.before(
  "fence",
  "question_math_block",
  (state, start, end, silent) => {
    const pos = state.bMarks[start] + state.tShift[start];
    const first = state.src.slice(pos, state.eMarks[start]);
    const open = first.startsWith("\\[")
      ? "\\["
      : first.startsWith("$$")
        ? "$$"
        : null;
    if (!open || state.sCount[start] - state.blkIndent >= 4) return false;
    const close = open === "$$" ? "$$" : "\\]";
    const finish = endDelimiter(state.src, close, pos + open.length);
    if (finish < 0 || finish >= (state.bMarks[end] ?? state.src.length))
      return false;
    let last = start;
    while (last + 1 < end && state.bMarks[last + 1] <= finish) last++;
    if (state.src.slice(finish + close.length, state.eMarks[last]).trim())
      return false;
    if (silent) return true;
    const token = state.push("question_math_block", "", 0);
    token.block = true;
    token.content = state.src.slice(pos + open.length, finish).trim();
    token.map = [start, last + 1];
    state.line = last + 1;
    return true;
  },
  { alt: ["paragraph", "reference", "blockquote", "list"] },
);

function mathHtml(source: string, displayMode: boolean, env: RenderContext) {
  try {
    const html = katex.renderToString(source, {
      displayMode,
      output: "htmlAndMathml",
      throwOnError: true,
      trust: false,
      strict: "error",
      maxExpand: 200,
      maxSize: 20,
    });
    return `<${displayMode ? "div" : "span"} class="question-math${displayMode ? " question-math-block" : ""}">${html}</${displayMode ? "div" : "span"}>`;
  } catch {
    env.mathErrors.push(source);
    return `<code class="question-math-error" title="수식 표기를 확인해 주세요">${escape(source)}</code>`;
  }
}
md.renderer.rules.question_math = (tokens, i, _options, env) =>
  mathHtml(tokens[i].content, false, env as RenderContext);
md.renderer.rules.question_math_block = (tokens, i, _options, env) =>
  mathHtml(tokens[i].content, true, env as RenderContext);
md.renderer.rules.question_math_invalid = (tokens, i, _options, env) => {
  (env as RenderContext).mathErrors.push(tokens[i].content);
  return `<code class="question-math-error">${escape(tokens[i].content)}</code>`;
};

/** Safe, bounded Markdown + LaTeX for question fields; plain legacy text also works. */
export function renderQuestionContent(source: string) {
  const env: RenderContext = { mathErrors: [] };
  if (source.length > 64_000)
    return {
      html: `<p>${escape(source)}</p>`,
      mathErrors: ["content too long"],
    };
  return { html: md.render(source, env), mathErrors: env.mathErrors };
}

export function questionContentLabel(source: string) {
  return source.replace(/\\[()[\]]|\$\$?/g, "").replace(/\*\*|__/g, "");
}
