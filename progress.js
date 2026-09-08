export const STORAGE_KEY = 'mahjong-path-progress-v1';

export function cleanProgress(value, lessonIds, scenarioIds) {
  const source = value && typeof value === 'object' ? value : {};
  const completed = Array.isArray(source.completed)
    ? [...new Set(source.completed.filter(id => lessonIds.includes(id)))] : [];
  const answers = {};
  for (const id of scenarioIds) {
    const answer = source.answers?.[id];
    if (answer && typeof answer.pattern === 'boolean' && typeof answer.discard === 'boolean') {
      answers[id] = { pattern: answer.pattern, discard: answer.discard };
    }
  }
  return { completed, answers };
}

export function accuracy(answers) {
  const values = Object.values(answers);
  return values.length
    ? Math.round(values.filter(answer => answer.pattern && answer.discard).length / values.length * 100)
    : 0;
}
