import assert from 'node:assert/strict';
import test from 'node:test';
import { assessmentDisplay } from '../src/lib/assessmentTranslation.ts';

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
