import { describe, it, expect } from 'vitest';
import { makeQuest, fillQuests, onLevelWin, claimQuest, questText, plural, claimableCount } from '../src/game/quests.js';
import flavors from '../src/data/flavors.json';

describe('задания', () => {
  it('склонение', () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => plural(n, ['банку', 'банки', 'банок']))).toEqual([
      'банку', 'банки', 'банок', 'банок', 'банку', 'банки', 'банок',
    ]);
  });

  it('три активных задания, без повторов, детерминированно', () => {
    const a = fillQuests({ active: [], seq: 0 }, 50);
    const b = fillQuests({ active: [], seq: 0 }, 50);
    expect(a).toEqual(b);
    expect(a.active.length).toBe(3);
    const keys = a.active.map((q) => `${q.type}:${q.flavor ?? ''}`);
    expect(new Set(keys).size).toBe(3);
  });

  it('у каждого задания понятный текст, цель и награда', () => {
    for (let seq = 0; seq < 300; seq++) {
      const q = makeQuest(seq, 1 + (seq * 7) % 400);
      expect(q.target).toBeGreaterThan(0);
      expect(q.reward).toBeGreaterThanOrEqual(25);
      expect(q.reward % 5).toBe(0);
      const text = questText(q, flavors);
      expect(text.length).toBeGreaterThan(8);
      expect(text).not.toMatch(/undefined|NaN/);
    }
  });

  it('«Закатай N банок малины» считает только уровни с малиной', () => {
    const q = { id: 1, type: 'flavor', flavor: 1, target: 2, progress: 0, reward: 40 };
    let quests = { active: [q], seq: 2 };
    let r = onLevelWin(quests, { flavors: [0, 2], undos: 0, hints: 0, hard: false });
    expect(r.quests.active[0].progress).toBe(0);
    r = onLevelWin(r.quests, { flavors: [1, 2], undos: 0, hints: 0, hard: false });
    expect(r.quests.active[0].progress).toBe(1);
    r = onLevelWin(r.quests, { flavors: [1], undos: 3, hints: 0, hard: false });
    expect(r.completed.length).toBe(1);
    expect(questText(q, flavors)).toBe('Закатай 2 банки малины');
  });

  it('«без отмен» не засчитывает уровни с отменой', () => {
    const q = { id: 1, type: 'noUndo', target: 3, progress: 0, reward: 60 };
    let r = onLevelWin({ active: [q], seq: 2 }, { flavors: [1], undos: 1, hints: 0, hard: false });
    expect(r.quests.active[0].progress).toBe(0);
    r = onLevelWin(r.quests, { flavors: [1], undos: 0, hints: 2, hard: false });
    expect(r.quests.active[0].progress).toBe(1);
    expect(questText(q, flavors)).toBe('Пройди 3 уровня без отмен');
  });

  it('выполненное задание забирается один раз и заменяется новым', () => {
    let quests = fillQuests({ active: [], seq: 0 }, 30);
    const first = quests.active[0];
    expect(claimQuest(quests, first.id, 30)).toBeNull(); // ещё не выполнено
    quests = { ...quests, active: quests.active.map((q, i) => (i === 0 ? { ...q, progress: q.target } : q)) };
    expect(claimableCount(quests)).toBe(1);
    const res = claimQuest(quests, first.id, 30);
    expect(res.reward).toBe(first.reward);
    expect(res.quests.active.length).toBe(3);
    expect(res.quests.active.some((q) => q.id === first.id)).toBe(false);
    expect(claimQuest(res.quests, first.id, 30)).toBeNull();
  });
});
