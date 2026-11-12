// Экран победы: банки уровня закатываются и встают на полку, начисляются монеты.
import { el, t } from '../common/ui.js';
import { play as sound } from '../common/audio.js';
import { coinPill, setCoinPill, COIN_SVG, miniJar } from './widgets.js';

export function mountWinScreen(root, { levelNumber, flavors, reward, coinsBefore, unlocks, questsDone = [], adReady, onDouble, onNext, onPantry }) {
  const screen = el('div', 'screen win-screen');
  const top = el('header', 'topbar');
  const pill = coinPill(coinsBefore);
  top.append(pill);
  const title = el('h1', 'win-title', t('winLevel', { n: levelNumber }));
  const sub = el('p', 'win-sub', t('winJars'));
  const shelf = el('div', 'win-shelf');
  const rewardBox = el('div', 'win-reward', `${COIN_SVG}<span>+${reward}</span>`);
  const banners = el('div', 'win-banners');
  for (const u of unlocks) {
    const text = u.type === 'room' ? t('newRoom', { name: u.name }) : u.type === 'shelf' ? t('newShelf') : t('newDecor', { name: u.name });
    banners.appendChild(el('div', 'unlock-banner', text));
  }
  for (const text of questsDone) banners.appendChild(el('div', 'unlock-banner quest-banner', t('questDone', { text })));
  const double = el('button', 'btn btn-reward', t('adLoading'));
  double.type = 'button';
  double.dataset.act = 'double';
  const next = el('button', 'btn btn-primary btn-play', t('next'));
  next.type = 'button';
  const pantry = el('button', 'btn', t('toPantry'));
  pantry.type = 'button';
  const buttons = el('div', 'win-buttons');
  if (reward) buttons.appendChild(double);
  buttons.append(next, pantry);
  screen.append(top, title, sub, shelf, rewardBox, banners, buttons);
  root.appendChild(screen);

  let destroyed = false;
  let busy = false;
  let doubled = false;
  let navigating = false;
  let ready = false;

  function updateDouble() {
    double.disabled = !ready || busy || doubled || navigating;
    double.textContent = doubled ? t('rewardDoubled') : busy ? t('adShowing') : ready ? t('doubleForAd') : t('adLoading');
  }

  async function refreshAd() {
    ready = await adReady();
    if (!destroyed) updateDouble();
  }

  double.addEventListener('click', async () => {
    if (busy || doubled || !ready) return;
    busy = true;
    updateDouble();
    const ok = await onDouble();
    busy = false;
    if (ok) {
      doubled = true;
      rewardBox.querySelector('span').textContent = `+${reward * 2}`;
      setCoinPill(pill, coinsBefore + reward * 2);
      sound('coin');
    }
    updateDouble();
    refreshAd();
  });

  next.addEventListener('click', async () => {
    if (navigating || busy) return;
    navigating = true;
    next.disabled = true;
    pantry.disabled = true;
    updateDouble();
    await onNext();
  });
  pantry.addEventListener('click', () => {
    if (!navigating && !busy) onPantry();
  });

  sound('win');
  const timers = [];
  flavors.forEach((f, i) => {
    const jar = miniJar(f, 'm');
    jar.style.opacity = '0';
    shelf.appendChild(jar);
    timers.push(
      setTimeout(() => {
        jar.style.opacity = '';
        jar.animate(
          [
            { transform: 'translateY(-60px) rotate(-8deg)', opacity: 0 },
            { transform: 'translateY(4px) rotate(0)', opacity: 1, offset: 0.7 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          { duration: 380, easing: 'ease-out' },
        );
        sound('lid');
      }, 500 + i * 140),
    );
  });
  const startCoins = 600 + flavors.length * 140;
  timers.push(
    setTimeout(() => {
      sound('coin');
      rewardBox.animate([{ transform: 'scale(.6)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], {
        duration: 360,
        easing: 'ease-out',
      });
      const steps = 12;
      for (let k = 1; k <= steps; k++) {
        timers.push(setTimeout(() => setCoinPill(pill, coinsBefore + Math.round((reward * k) / steps) + (doubled ? reward : 0)), k * 40));
      }
    }, startCoins),
  );

  updateDouble();
  refreshAd();
  return {
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      screen.remove();
    },
  };
}
