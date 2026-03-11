import { questions, Question } from '@/data/questions';

export function generateBattleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function selectBattleQuestions(count = 10): number[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(q => q.id);
}

export function getQuestionById(id: number): Question | undefined {
  return questions.find(q => q.id === id);
}
