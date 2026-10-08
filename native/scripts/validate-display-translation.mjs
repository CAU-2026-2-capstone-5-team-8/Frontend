import { renderQuestionContent } from '../src/lib/questionContent.ts';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const text = JSON.parse(input);
if (typeof text.prompt !== 'string' || !Array.isArray(text.choices) || text.choices.length !== 4)
  throw new Error('Invalid display translation');
const fields = [text.prompt, ...text.choices, ...(text.passage === null ? [] : [text.passage])];
for (const field of fields) {
  if (typeof field !== 'string' || !field.trim() || renderQuestionContent(field).mathErrors.length)
    throw new Error('Unrenderable translation');
}
console.log(JSON.stringify({fields: fields.length, invalidMath: 0}));
