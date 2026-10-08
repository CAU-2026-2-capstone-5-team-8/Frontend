import type { Question, Session } from './types.ts';

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

export function mergeSessionTranslations(current: Session | null, next: Session) {
  if (!current || current.id !== next.id) return current;
  let changed = false;
  const questions = current.questions.map((question) => {
    const translation = next.questions.find((item) => item.id === question.id)?.translation;
    if (!translation || JSON.stringify(translation) === JSON.stringify(question.translation)) return question;
    changed = true;
    return { ...question, translation };
  });
  return changed ? { ...current, questions } : current;
}
