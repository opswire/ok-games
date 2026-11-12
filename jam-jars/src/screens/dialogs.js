// Окна: ежедневный подарок, настройки, покупка отмен за монеты.
import { el, t, modal } from '../common/ui.js';
import { COIN_SVG } from './widgets.js';
import dailyRewards from '../data/daily.json';
import { ECONOMY } from '../game/progress.js';
import { questText } from '../game/quests.js';
import flavors from '../data/flavors.json';

export function rewardText(r) {
  const parts = [];
  if (r.coins) parts.push(t('rewardCoins', { n: r.coins }));
  if (r.undo) parts.push(t(r.undo < 5 ? 'rewardUndo1' : 'rewardUndo', { n: r.undo }));
  if (r.jars) parts.push(t('rewardJars', { n: r.jars }));
  return parts.join(' + ');
}

/** Окно подарка. status = { available, dayIndex }. Возвращает true, если игрок забрал подарок. */
export function dailyDialog(status) {
  const grid = el('div', 'daily-grid');
  dailyRewards.forEach((r, i) => {
    const cls = ['daily-cell'];
    if (i < status.dayIndex || (!status.available && i === status.dayIndex)) cls.push('taken');
    if (i === status.dayIndex) cls.push('today');
    if (i === dailyRewards.length - 1) cls.push('big');
    const cell = el('div', cls.join(' '));
    cell.appendChild(el('div', 'daily-day', t('dailyDay', { n: i + 1 })));
    cell.appendChild(el('div', 'daily-reward', (r.coins ? COIN_SVG : '') + `<span>${rewardText(r)}</span>`));
    grid.appendChild(cell);
  });
  return modal({
    title: t('dailyTitle'),
    text: status.available ? t('dailyText') : t('dailyTaken'),
    content: grid,
    className: 'modal-wide',
    buttons: status.available
      ? [{ text: t('dailyClaim'), value: true, primary: true }]
      : [{ text: t('close'), value: false, primary: true }],
    dismissValue: false,
  });
}

export function settingsDialog({ sound, onSound }) {
  let on = sound;
  return modal({
    title: t('settingsTitle'),
    buttons: [
      {
        text: on ? t('soundOn') : t('soundOff'),
        onClick: (btn) => {
          on = !on;
          btn.textContent = on ? t('soundOn') : t('soundOff');
          onSound(on);
        },
      },
      { text: t('close'), value: null, primary: true },
    ],
    dismissValue: null,
  });
}

/** Отмены кончились: предложить видео или набор за монеты. */
export function undoShopDialog({ coins, adReady }) {
  const enough = coins >= ECONOMY.undoPackCost;
  return modal({
    title: t('undoShopTitle'),
    text: t('undoShopText', { coins }),
    buttons: [
      { text: adReady ? t('undoForAd') : t('adLoading'), value: 'ad', primary: true, disabled: !adReady },
      { text: enough ? t('undoShopBuy') : t('undoShopPoor'), value: 'coins', disabled: !enough },
      { text: t('close'), value: false },
    ],
    dismissValue: false,
  });
}

/**
 * Окно заданий. onClaim(id) → награда (число) или 0; окно перерисовывается после получения.
 */
export function questsDialog({ getQuests, onClaim }) {
  const list = el('div', 'quest-list');
  function render() {
    list.textContent = '';
    for (const q of getQuests().active) {
      const done = q.progress >= q.target;
      const row = el('div', `quest ${done ? 'done' : ''}`);
      row.appendChild(el('div', 'quest-text', questText(q, flavors)));
      const bar = el('div', 'quest-bar');
      const fill = el('div', 'quest-fill');
      fill.style.width = `${Math.round((100 * q.progress) / q.target)}%`;
      bar.appendChild(fill);
      bar.appendChild(el('span', 'quest-count', `${q.progress} из ${q.target}`));
      row.appendChild(bar);
      const reward = el('div', 'quest-reward', `${COIN_SVG}<span>${q.reward}</span>`);
      if (done) {
        const btn = el('button', 'btn btn-primary quest-claim', t('questClaim'));
        btn.type = 'button';
        btn.addEventListener('click', () => {
          if (onClaim(q.id)) render();
        });
        reward.appendChild(btn);
      }
      row.appendChild(reward);
      list.appendChild(row);
    }
  }
  render();
  return modal({
    title: t('questsTitle'),
    content: list,
    className: 'modal-wide',
    buttons: [{ text: t('close'), value: null, primary: false }],
    dismissValue: null,
  });
}
