// Ежедневный подарок: лента из N дней. Каждый следующий день подряд — следующая награда,
// после последнего дня лента начинается заново, пропуск дня сбрасывает ленту на первый день.
// Чистые функции; день — номер календарного дня по местному времени устройства.

/** Номер дня по местной дате (одинаков весь день, меняется в полночь). */
export function dayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

/**
 * Состояние подарка. daily = { streak, lastDay }.
 * @returns {{ available: boolean, dayIndex: number }} dayIndex — какой день ленты (0..length-1)
 *   будет выдан сегодня (или выдан сегодня, если уже забран).
 */
export function dailyStatus(daily, today, length) {
  const { streak = 0, lastDay = null } = daily ?? {};
  if (lastDay === today) return { available: false, dayIndex: (streak - 1 + length) % length };
  // перевод часов назад: не даём забрать подарок «в прошлом» повторно
  if (lastDay !== null && today < lastDay) return { available: false, dayIndex: (streak - 1 + length) % length };
  const continues = lastDay !== null && today - lastDay === 1;
  const nextStreak = continues ? streak + 1 : 1;
  return { available: true, dayIndex: (nextStreak - 1) % length };
}

/** Забрать подарок. Возвращает { daily, dayIndex } или null, если сегодня уже забран. */
export function claimDaily(daily, today, length) {
  const st = dailyStatus(daily, today, length);
  if (!st.available) return null;
  const continues = daily?.lastDay !== null && daily?.lastDay !== undefined && today - daily.lastDay === 1;
  const streak = continues ? daily.streak + 1 : 1;
  return { daily: { streak, lastDay: today }, dayIndex: st.dayIndex };
}
