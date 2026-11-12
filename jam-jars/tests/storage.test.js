import { describe, it, expect, vi } from 'vitest';
import { createStorage } from '../src/common/storage.js';
import { defaultSave, migrate, pickNewest } from '../src/game/progress.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

function fakePlatform(initial = null) {
  let value = initial;
  return { save: vi.fn(async (k, v) => { value = v; }), load: vi.fn(async () => value), get: () => value };
}

const make = (local, platform) =>
  createStorage({ key: 'k', defaults: defaultSave, migrate, pickNewest, platform, local });

describe('хранилище', () => {
  it('пусто везде — новая запись', async () => {
    const st = make(memoryStorage(), fakePlatform());
    expect(await st.load()).toEqual(defaultSave());
  });

  it('пишет в оба места, rev растёт; повторная загрузка возвращает то же', async () => {
    vi.useFakeTimers();
    const local = memoryStorage();
    const platform = fakePlatform();
    const st = make(local, platform);
    let s = await st.load();
    s = st.save({ ...s, level: 4, coins: 30 });
    s = st.save({ ...s, coins: 40 });
    expect(s.rev).toBe(2);
    expect(JSON.parse(local.getItem('k')).coins).toBe(40);
    await vi.runAllTimersAsync();
    expect(platform.save).toHaveBeenCalledTimes(1); // две быстрые записи — одна отправка
    expect(JSON.parse(platform.get()).coins).toBe(40);
    const again = await make(local, platform).load();
    expect([again.level, again.coins, again.rev]).toEqual([4, 40, 2]);
    vi.useRealTimers();
  });

  it('берёт более свежую запись: платформа новее устройства (другой телефон)', async () => {
    const local = memoryStorage();
    local.setItem('k', JSON.stringify({ ...defaultSave(), rev: 3, level: 5 }));
    const platform = fakePlatform(JSON.stringify({ ...defaultSave(), rev: 9, level: 12 }));
    expect((await make(local, platform).load()).level).toBe(12);
  });

  it('повреждённая запись на устройстве — берётся запись платформы', async () => {
    const local = memoryStorage();
    local.setItem('k', '{"schemaVersion":1,"lev');
    const platform = fakePlatform(JSON.stringify({ ...defaultSave(), rev: 2, level: 7 }));
    expect((await make(local, platform).load()).level).toBe(7);
  });

  it('платформа недоступна — работает на устройстве', async () => {
    const local = memoryStorage();
    local.setItem('k', JSON.stringify({ ...defaultSave(), rev: 1, level: 3 }));
    const platform = { save: async () => { throw new Error('нет сети'); }, load: async () => { throw new Error('нет сети'); } };
    const st = make(local, platform);
    expect((await st.load()).level).toBe(3);
    st.save({ ...st.get(), level: 4 });
    await st.flush(); // ошибка не пробрасывается
    expect(JSON.parse(local.getItem('k')).level).toBe(4);
  });
});
