import assert from 'node:assert/strict';
import test from 'node:test';
import { assessmentDisplay, mergeSessionTranslations } from '../src/lib/assessmentTranslation.ts';

test('display switches language without altering selected choice or source question', () => {
  const q = { prompt: 'What is GDP?', passage: null, choices: ['790','830','850','890'],
    selectedChoiceIndex: 2, translation: { language: 'ko', prompt: '국내총생산은 얼마인가요?',
      passage: null, choices: ['790','830','850','890'] } };
  const before = structuredClone(q);
  assert.equal(assessmentDisplay(q).prompt, '국내총생산은 얼마인가요?');
  assert.equal(assessmentDisplay(q, true).prompt, 'What is GDP?');
  assert.deepEqual(assessmentDisplay(q).choices, assessmentDisplay(q, true).choices);
  assert.deepEqual(q, before);
});

test('missing or structurally incomplete translation uses intact original', () => {
  const q = { prompt: 'Original', passage: null, choices: ['a','b','c','d'] };
  assert.equal(assessmentDisplay(q).translated, false);
  assert.equal(assessmentDisplay({ ...q, translation: { language: 'ko', choices: [] } }).prompt, 'Original');
});


test('translation polling keeps state identity and locally submitted answers', () => {
  const question = { id: 1, prompt: 'Original', choices: ['a','b','c','d'], selectedChoiceIndex: 2 };
  const current = { id: 10, questions: [question] };
  assert.equal(mergeSessionTranslations(current, structuredClone(current)), current);
  assert.equal(mergeSessionTranslations(current, { id: 11, questions: [] }), current);
  const translation = { language: 'ko', passage: null, prompt: '번역', choices: ['가','나','다','라'] };
  const next = mergeSessionTranslations(current, { id: 10, questions: [{ ...question, selectedChoiceIndex: null, translation }] });
  assert.equal(next.questions[0].selectedChoiceIndex, 2);
  assert.equal(next.questions[0].translation, translation);
  assert.equal(mergeSessionTranslations(next, structuredClone(next)), next);
});
