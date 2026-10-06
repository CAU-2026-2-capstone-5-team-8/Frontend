import type { Question } from './types.ts';

export function assessmentDisplay(question: Question, original = false) {
  const translation = question.translation;
  if (!original && translation?.language === 'ko' &&
      translation.choices.length === question.choices.length) {
    return { passage: translation.passage, prompt: translation.prompt,
      choices: translation.choices, translated: true };
  }
  return { passage: question.passage, prompt: question.prompt,
    choices: question.choices, translated: false };
}
