import assert from "node:assert/strict";
import { test } from "node:test";
import { renderQuestionContent } from "../src/lib/questionContent.ts";

test("renders inline math, Markdown and a display matrix without losing rows", () => {
  const result =
    renderQuestionContent(String.raw`**Basis** in \(\mathbb{R}^2\): \(b_1=(1,1)\).

\[
A=\begin{bmatrix}1&2\\0&1\end{bmatrix}
\]

- First item
- Second item`);
  assert.deepEqual(result.mathErrors, []);
  assert.match(result.html, /<strong>Basis<\/strong>/);
  assert.equal((result.html.match(/class="katex"/g) || []).length, 3);
  assert.match(result.html, /<msup>/);
  assert.match(result.html, /<msub>/);
  assert.match(result.html, /<mtable/);
  assert.match(result.html, /<ul>/);
});

test("supports standard dollar delimiters and fractions", () => {
  const result = renderQuestionContent(String.raw`Compute $\frac{1}{2}$.

$$x^2+1$$`);
  assert.deepEqual(result.mathErrors, []);
  assert.match(result.html, /<mfrac>/);
  assert.match(result.html, /question-math-block/);
  assert.doesNotMatch(
    renderQuestionContent("Price: \\$5. Plain R^2.").html,
    /class="katex"/,
  );
});

test("keeps malformed math visible and reports it instead of crashing", () => {
  const result = renderQuestionContent(
    String.raw`Answer \(\frac{1}\) and \(\unknownCommand\).`,
  );
  assert.equal(result.mathErrors.length, 2);
  assert.match(result.html, /question-math-error/);
  assert.match(result.html, /frac/);
  for (const source of [
    String.raw`Incomplete \(x^2`,
    String.raw`Incomplete \[x^2`,
  ]) {
    const incomplete = renderQuestionContent(source);
    assert.equal(incomplete.mathErrors.length, 1);
    assert.match(incomplete.html, /question-math-error/);
  }
});

test("generated HTML and math cannot inject scripts, links or remote images", () => {
  const result = renderQuestionContent(String.raw`<script>alert(1)</script>
![track](https://example.invalid/pixel)
[link](javascript:alert(1))
\(\href{https://example.invalid}{x}\)`);
  assert.doesNotMatch(result.html, /<script|<img|<a\b|href=/i);
  assert.match(result.html, /&lt;script&gt;/);
});

test("math-like inline code stays literal and legacy text stays readable", () => {
  assert.doesNotMatch(
    renderQuestionContent("Use `\\(x^2\\)`.").html,
    /class="katex"/,
  );
  assert.match(
    renderQuestionContent("An ordered basis of R^2 is b1=(1,1).").html,
    /R\^2/,
  );
});
