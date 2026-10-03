import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { renderQuestionContent } from "../src/lib/questionContent.ts";

const directory = process.argv[2];
if (!directory) throw new Error("Pass a generated candidate directory");
let questions = 0,
  fields = 0;
for (const file of (await readdir(directory)).filter((f) =>
  /^q_[0-9a-f]{20}\.json$/.test(f),
)) {
  const question = JSON.parse(await readFile(resolve(directory, file), "utf8"));
  for (const [name, value] of Object.entries({
    stem: question.stem,
    explanation: question.explanation,
    ...Object.fromEntries(
      question.choices.map((c, i) => [`choice ${i + 1}`, c]),
    ),
  })) {
    const result = renderQuestionContent(value);
    if (result.mathErrors.length)
      throw new Error(`${file}, ${name}: invalid LaTeX`);
    fields++;
  }
  questions++;
}
if (!questions) throw new Error("No candidate files found");
console.log(JSON.stringify({ questions, fields, invalidMath: 0 }));
