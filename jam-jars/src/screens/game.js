// Игровой экран: раскладка банок, ввод, очередь анимаций переливания, кнопки, обучение.
//
// Правило: модель (session) меняется сразу при нажатии, экран проигрывает события
// из очереди. Отмена, «Заново» и «Ещё банка» прерывают очередь и рисуют поле с модели.

import { createSession, undo, addJar, restart, isStuck, isHopeless, hintMove, canUndo, canAddJar } from '../game/session.js';
import { createInput, tap } from '../game/input.js';
import { boardKey, completedCount } from '../game/board.js';
import { chooseLayout } from '../game/layout.js';
import flavors from '../data/flavors.json';
import { createSlot, renderJar } from './jarView.js';
import { jarSvg } from './jarArt.js';
import { createPourFx } from './pourFx.js';
import { HAND_SVG } from '../assets/flavorIcons.js';
import { el, t, toast, modal } from '../common/ui.js';
import { play as sound } from '../common/audio.js';
import { track as trackEvent } from '../common/analytics.js';
import { coinPill, setCoinPill, COIN_SVG } from './widgets.js';
import { ECONOMY } from '../game/progress.js';

const POUR_MS = 450; // переливание целиком (по ТЗ 350–450 мс)
const POUR_FAST_MS = 280;
// ?slowmo=8 — замедлить переливание (только для проверки анимации на скриншотах)
const SLOWMO = Math.max(1, Number(new URLSearchParams(location.search).get('slowmo')) || 1); // когда в очереди ещё есть ходы

const ICON_UNDO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';
const ICON_JAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h8M8 4v3c-2 1-3 2-3 4v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8c0-2-1-3-3-4V4"/><path d="M19 1v6M16 4h6"/></svg>';
const ICON_RESTART =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>';
const ICON_HINT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
const ICON_BACK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';
const ICON_VIDEO = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4v16l13-8z"/></svg>';

/**
 * @param {HTMLElement} root
 * econ — доступ к запасам игрока (их хранит и сохраняет main.js):
 *   { undo(), jars(), coins(), spendUndo(), spendJar(), spendCoins(n), offerUndos(): Promise<boolean> }
 * @param {{ level, econ, onWin: (info) => void, onExit: () => void }} opts
 */
export function mountGameScreen(root, { level, econ, onWin, onExit }) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let session = createSession(level);
  let input = createInput();
  let slots = [];
  let layerPx = 20;
  let jarW = 42;
  const stats = { undos: 0, hints: 0 }; // для заданий «без отмен», «без подсказок»
  let moveNo = 0; // номер проигранного хода — для похвалы за собранные подряд банки
  let lastCompleteAt = -10;
  let combo = 0;
  let paidHint = null; // [from, to] — купленная подсказка, действует до следующего хода
  let adReady = false;
  let rewardBusy = false;
  let destroyed = false;

  // ---------- разметка ----------
  const screen = el('div', 'screen game');
  const hud = el('header', 'hud');
  const back = el('button', 'icon-btn', ICON_BACK);
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  const titleBox = el('div', 'hud-title');
  titleBox.appendChild(el('div', 'level-title', t('level', { n: level.number })));
  // плашка уровня — отдельной строкой под шапкой, чтобы не наезжать на кнопки и монеты
  const badgeRow = el('div', 'badge-row');
  if (level.params.hard) badgeRow.appendChild(el('div', 'badge', t('levelHard')));
  if (level.params.secret) badgeRow.appendChild(el('div', 'badge', t('levelSecret')));
  const coins = coinPill(econ.coins());
  // «Заново» — значком наверху: нажимают редко, и оно всё равно спрашивает подтверждение
  const btnRestart = el('button', 'icon-btn', ICON_RESTART);
  btnRestart.type = 'button';
  btnRestart.dataset.act = 'restart';
  btnRestart.setAttribute('aria-label', t('btnRestart'));
  const left = el('div', 'hud-side');
  left.append(back, btnRestart);
  hud.append(left, titleBox, coins);
  if (badgeRow.childElementCount) hud.appendChild(badgeRow);
  back.addEventListener('click', () => onExit());
  const board = el('main', 'board');
  const fx = el('div', 'fx');
  const actions = el('footer', 'actions');
  const btnUndo = actionButton('undo', ICON_UNDO, t('btnUndo'));
  const btnJar = actionButton('jar', ICON_JAR, t('btnAddJar'));
  const btnHint = actionButton('hint', ICON_HINT, t('btnHint'));
  actions.append(btnUndo, btnJar, btnHint);
  screen.append(hud, board, actions, fx);
  const pourFx = createPourFx(fx);
  root.appendChild(screen);

  function actionButton(name, icon, text) {
    const b = el('button', 'act', `${icon}<span>${text}</span><span class="count"></span>`);
    b.type = 'button';
    b.dataset.act = name;
    return b;
  }

  // ---------- раскладка: 1 ряд до 5 банок, иначе 2 ряда ----------
  let currentRows = '';

  function buildBoard() {
    board.textContent = '';
    const plan = layout();
    currentRows = plan.rows.join(',');
    slots = [];
    let i = 0;
    for (const count of plan.rows) {
      const row = el('div', 'row');
      for (let k = 0; k < count; k++, i++) {
        const slot = createSlot(i);
        slots.push(slot);
        row.appendChild(slot);
      }
      board.appendChild(row);
    }
    renderAll();
  }

  /** Посчитать размеры банок под текущий экран (1–3 ряда, см. game/layout.js). */
  function layout() {
    const plan = chooseLayout(session.board.jars.length, board.clientWidth - 16, board.clientHeight);
    layerPx = plan.layerPx;
    jarW = plan.jarW;
    screen.style.setProperty('--slot-w', `${plan.slotW}px`);
    screen.style.setProperty('--jar-w', `${plan.jarW}px`);
    screen.style.setProperty('--layer-h', `${layerPx}px`);
    screen.style.setProperty('--lift', `${Math.round(layerPx * 1.1)}px`);
    return plan;
  }

  function renderAll() {
    const b = session.board;
    slots.forEach((slot, i) => renderJar(slot, b.jars[i], b.hidden[i], b.capacity, { layerPx, jarW, ...jarProps(b, i) }));
    updateSelection();
    updateButtons();
  }

  /** Механики банки i для отрисовки. */
  function jarProps(b, i) {
    const need = b.locks?.[i] ?? 0;
    return {
      cap: b.caps?.[i] ?? b.capacity,
      lockLeft: need > 0 ? Math.max(1, need - completedCount(b)) : 0,
      only: b.only?.[i] ?? -1,
    };
  }

  function updateSelection() {
    slots.forEach((slot, i) => slot.classList.toggle('selected', i === input.selected));
  }

  function setCount(btn, value, video) {
    const c = btn.querySelector('.count');
    c.classList.toggle('video', !!video);
    c.innerHTML = video ? ICON_VIDEO : String(value);
    c.style.display = value === null ? 'none' : '';
  }

  function updateButtons() {
    const jarNeedsAd = econ.jars() <= 0;
    const jarDisabled = rewardBusy || !canAddJar(session) || (jarNeedsAd && !adReady);
    setCount(btnUndo, econ.undo(), econ.undo() <= 0);
    setCount(btnJar, econ.jars(), jarNeedsAd);
    setCoinPill(coins, econ.coins());
    const hc = btnHint.querySelector('.count');
    hc.className = 'count coin';
    hc.innerHTML = `${COIN_SVG}${ECONOMY.hintCost}`;
    btnHint.classList.toggle('disabled', rewardBusy || session.won || econ.coins() < ECONOMY.hintCost);
    btnUndo.classList.toggle('disabled', rewardBusy || !canUndo(session));
    btnJar.classList.toggle('disabled', jarDisabled);
    btnRestart.classList.toggle('disabled', rewardBusy || session.moves === 0);
    btnJar.querySelector('span').textContent = jarNeedsAd && !adReady ? t('adLoading') : t('btnAddJar');
    btnUndo.disabled = rewardBusy;
    btnJar.disabled = jarDisabled;
    btnHint.disabled = rewardBusy;
    btnRestart.disabled = rewardBusy;
    back.disabled = rewardBusy;
  }

  async function refreshAds() {
    const ready = await econ.adReady();
    if (destroyed) return;
    adReady = ready;
    updateButtons();
  }

  // ---------- очередь анимаций ----------
  const queue = [];
  let generation = 0; // растёт при прерывании очереди
  let runningGen = -1;
  const running = new Set(); // активные анимации — чтобы прервать

  function track(anims) {
    for (const a of anims) {
      running.add(a);
      a.finished.then(() => running.delete(a), () => running.delete(a));
    }
    return anims;
  }

  function enqueue(item) {
    queue.push(item);
    hideHand();
    if (runningGen !== generation) play();
  }

  async function play() {
    const gen = generation;
    runningGen = gen;
    while (queue.length && gen === generation) {
      const item = queue.shift();
      try {
        await animatePour(item, queue.length > 0);
      } catch {
        // анимацию прервали — поле перерисуется с модели
      }
    }
    if (runningGen === gen) runningGen = -1;
    if (gen === generation) onIdle();
  }

  /** Прервать все анимации и нарисовать поле с модели. */
  function interrupt() {
    generation++;
    queue.length = 0;
    for (const a of running) a.cancel();
    running.clear();
    pourFx.cancel();
    slots.forEach((s) => {
      s.classList.remove('pouring');
      s.querySelector('.jar').style.visibility = '';
    });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Где на экране точка (0,0) геометрии банки — без учёта подъёма выбранной банки. */
  function jarOrigin(slot) {
    const box = slot.querySelector('.jar');
    const r = slot.getBoundingClientRect();
    return { x: r.left + box.offsetLeft + jarW * 0.12, y: r.top + box.offsetTop + layerPx * 0.55 };
  }

  function currentLift(slot) {
    const m = getComputedStyle(slot.querySelector('.jar')).transform;
    if (!m || m === 'none') return 0;
    const v = m.match(/-?[\d.]+/g);
    return v ? -Number(v[5] ?? 0) : 0;
  }

  const liquidOf = (jar, hidden) => jar.map((sort, i) => ({ sort, hidden: i < hidden }));

  async function animatePour({ event, board: after, before }, fast) {
    const { from, to, count, sort, revealed } = event;
    const duration = (reduceMotion ? 220 : fast ? POUR_FAST_MS : POUR_MS) * SLOWMO;
    const src = slots[from];
    const dst = slots[to];
    const gen = generation;
    const so = jarOrigin(src);
    const dO = jarOrigin(dst);
    const lift = currentLift(src);

    src.classList.add('pouring');
    src.querySelector('.jar').style.visibility = 'hidden';
    dst.querySelector('.jar').style.visibility = 'hidden';
    const done = await pourFx.pour({
      src: { ...so, W: jarW, L: layerPx, cap: jarProps(before, from).cap, liquid: liquidOf(before.jars[from], before.hidden[from]) },
      dst: { ...dO, W: jarW, L: layerPx, cap: jarProps(before, to).cap, liquid: liquidOf(before.jars[to], before.hidden[to]) },
      count,
      sort,
      duration,
      lift,
      onStream: () => sound('pour', { count }),
    });
    src.classList.remove('pouring');
    src.querySelector('.jar').style.visibility = '';
    dst.querySelector('.jar').style.visibility = '';
    if (!done || gen !== generation) throw new Error('interrupted');

    // итог: открывшийся «секретный» слой и крышка на собранной банке
    track(renderJar(src, after.jars[from], after.hidden[from], after.capacity, { reveal: revealed, layerPx, jarW, ...jarProps(after, from) }));
    track(renderJar(dst, after.jars[to], after.hidden[to], after.capacity, { lid: true, layerPx, jarW, ...jarProps(after, to) }));
    // замки: счётчик уменьшается, открывшийся замок слетает
    after.locks.forEach((need, i) => {
      if (need > 0 || event.unlocked?.includes(i)) renderJar(slots[i], after.jars[i], after.hidden[i], after.capacity, { layerPx, jarW, ...jarProps(after, i) });
    });
    if (event.unlocked?.length) {
      sound('coin');
      toast(t('unlocked'));
      for (const i of event.unlocked) {
        const r = slots[i].querySelector('.glass').getBoundingClientRect();
        pourFx.burst(r.left + r.width / 2, r.top + r.height / 2, layerPx);
      }
    }
    if (revealed >= 0) sound('reveal');
    moveNo++;
    if (dst.classList.contains('complete')) {
      combo = moveNo - lastCompleteAt <= 2 ? combo + 1 : 1;
      lastCompleteAt = moveNo;
      if (combo >= 2) praise(dst, combo);
      sound('lid');
      const r = dst.querySelector('.glass').getBoundingClientRect();
      pourFx.burst(r.left + r.width / 2, r.top + r.height * 0.15, layerPx);
    }
    updateSelection();
  }

  /** Похвала за банки, собранные одна за другой: надпись всплывает над банкой. */
  function praise(slot, n) {
    const words = [t('praise1'), t('praise2'), t('praise3'), t('praise4')];
    const word = words[Math.min(words.length - 1, n - 2)];
    const r = slot.getBoundingClientRect();
    const host = screen.getBoundingClientRect();
    const tag = el('div', 'praise', word);
    tag.style.left = `${r.left + r.width / 2 - host.left}px`;
    tag.style.top = `${r.top - host.top}px`;
    fx.appendChild(tag);
    sound('praise', { n });
    const a = tag.animate(
      [
        { transform: 'translate(-50%, 10px) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%, -14px) scale(1.12)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -30px) scale(1)', opacity: 1, offset: 0.75 },
        { transform: 'translate(-50%, -46px) scale(.95)', opacity: 0 },
      ],
      { duration: 1100, easing: 'ease-out' },
    );
    a.finished.then(() => tag.remove(), () => tag.remove());
  }

  function shake(index, strong = true) {
    const jar = slots[index]?.querySelector('.jar');
    if (!jar || slots[index].classList.contains('pouring')) return;
    const a = strong ? 7 : 3;
    jar.animate(
      [
        { transform: 'translateX(0) rotate(0)' },
        { transform: `translateX(${-a}px) rotate(-4deg)` },
        { transform: `translateX(${a}px) rotate(4deg)` },
        { transform: `translateX(${-a / 2}px) rotate(-2deg)` },
        { transform: 'translateX(0) rotate(0)' },
      ],
      { duration: 320, easing: 'ease-out' },
    );
  }

  /** Объяснить, почему ход не прошёл (замок, банка для одного сорта). */
  function explain(reason, index) {
    const b = session.board;
    if (reason === 'locked') {
      const lockedIdx = b.locks.findIndex((x) => x > 0);
      const n = lockedIdx >= 0 ? jarProps(b, lockedIdx).lockLeft : 0;
      if (n > 0) toast(t('lockedHint', { n, jars: n === 1 ? 'банку' : 'банки' }));
    } else if (reason === 'only') {
      const sort = b.only[index];
      if (sort >= 0) toast(t('onlyHint', { name: flavors[sort].name.toLowerCase() }));
    }
  }

  /** Знакомство с новой механикой: картинка банки и одна фраза. */
  async function showIntro() {
    const key = level.params.intro;
    if (!key) return;
    const demo = {
      secret: { jar: [3, 1, 0], hidden: 2 },
      small: { jar: [], cap: 3 },
      lock: { jar: [0, 2, 1, 0], lockLeft: 2 },
      only: { jar: [], only: 1 },
    }[key];
    const pic = el('div', 'intro-pic', jarSvg({ W: 70, L: 24, ...demo }));
    const Key = key[0].toUpperCase() + key.slice(1);
    await modal({
      title: t(`intro${Key}Title`),
      text: t(`intro${Key}Text`),
      content: pic,
      buttons: [{ text: t('introOk'), value: true, primary: true }],
      dismissValue: true,
    });
  }

  // ---------- ввод ----------
  function onPointerDown(e) {
    if (rewardBusy) return;
    const slot = e.target.closest('.slot');
    if (!slot || !board.contains(slot)) return;
    e.preventDefault();
    const index = Number(slot.dataset.i);
    const res = tap(session, input, index);
    session = res.session;
    input = res.input;
    const { action } = res;
    if (action.type === 'pour') {
      paidHint = null;
      enqueue(action);
    } else if (action.type === 'select') sound('select');
    else if (action.type === 'invalid') {
      shake(action.from);
      sound('invalid');
      explain(action.reason, action.reason === 'only' ? action.to : action.from);
    } else if (action.type === 'ignore') {
      shake(index, false);
      if (action.reason === 'locked') explain('locked', index);
    }
    updateSelection();
    updateButtons();
    if (queue.length === 0 && runningGen === -1) showHand();
  }
  board.addEventListener('pointerdown', onPointerDown);

  btnUndo.addEventListener('click', doUndo);
  btnJar.addEventListener('click', doAddJar);
  btnRestart.addEventListener('click', doRestart);
  btnHint.addEventListener('click', doHint);

  /** Подсказка за монеты: рука показывает следующий верный ход. */
  function doHint() {
    if (rewardBusy || session.won) return;
    if (paidHint) return showHand();
    if (econ.coins() < ECONOMY.hintCost) return toast(t('hintNoCoins', { cost: ECONOMY.hintCost }));
    const move = hintMove(session, { limit: 60000 });
    if (!move) return toast(t('hintNoWay'), 3000);
    econ.spendCoins(ECONOMY.hintCost);
    stats.hints++;
    trackEvent('hint_used', { type: 'hint', level: level.number, cost: ECONOMY.hintCost });
    sound('coin');
    paidHint = move;
    updateButtons();
    if (queue.length === 0 && runningGen === -1) showHand();
  }

  async function doUndo() {
    if (rewardBusy) return;
    if (!canUndo(session)) return toast(t('noUndoMoves'));
    if (econ.undo() <= 0) {
      rewardBusy = true;
      updateButtons();
      const got = await econ.offerUndos();
      rewardBusy = false;
      await refreshAds();
      if (!got || !canUndo(session)) return updateButtons();
    }
    interrupt();
    session = undo(session);
    paidHint = null;
    input = createInput();
    econ.spendUndo();
    stats.undos++;
    trackEvent('hint_used', { type: 'undo', level: level.number });
    renderAll();
    onIdle();
  }

  async function doAddJar() {
    if (rewardBusy) return;
    if (!canAddJar(session)) return toast(t('maxJars'));
    if (econ.jars() > 0) econ.spendJar();
    else {
      if (!adReady) return toast(t('adLoading'));
      rewardBusy = true;
      updateButtons();
      const shown = await econ.showReward('jar');
      rewardBusy = false;
      await refreshAds();
      if (!shown) {
        toast(t('adNotShown'));
        return updateButtons();
      }
    }
    trackEvent('hint_used', { type: 'jar', level: level.number });
    interrupt();
    session = addJar(session);
    paidHint = null;
    input = createInput();
    buildBoard();
    toast(t('jarAdded'));
    onIdle();
  }

  async function doRestart() {
    if (session.moves === 0) return;
    const ok = await modal({
      title: t('restartTitle'),
      buttons: [
        { text: t('yes'), value: true, primary: true },
        { text: t('no'), value: false },
      ],
    });
    if (!ok) return;
    trackEvent('level_fail', { level: level.number, reason: 'restart', moves: session.moves });
    interrupt();
    session = restart(session);
    paidHint = null;
    input = createInput();
    renderAll();
    onIdle();
  }

  // ---------- после хода: победа, тупик, обучение ----------
  let lastDeadEndKey = '';
  let stuckShownFor = '';

  async function onIdle() {
    updateButtons();
    updateSelection();
    if (session.won) return celebrate();

    const key = boardKey(session.board);
    if (isStuck(session)) {
      if (stuckShownFor === key) return;
      stuckShownFor = key;
      trackEvent('level_fail', { level: level.number, reason: 'stuck', moves: session.moves });
      const choice = await modal({
        title: t('stuckTitle'),
        text: t('stuckText'),
        buttons: [
          { text: t('btnUndo'), value: 'undo', primary: true },
          { text: t('btnAddJar'), value: 'jar' },
          { text: t('btnRestart'), value: 'restart' },
        ],
        dismissValue: null,
      });
      if (choice === 'undo') doUndo();
      else if (choice === 'jar') doAddJar();
      else if (choice === 'restart') {
        interrupt();
        session = restart(session);
    paidHint = null;
        input = createInput();
        renderAll();
        onIdle();
      }
      return;
    }

    showHand();
    // мягкое предупреждение о тупике: решатель не находит выхода
    setTimeout(() => {
      if (boardKey(session.board) !== key || key === lastDeadEndKey) return;
      if (isHopeless(session, { limit: 6000 })) {
        lastDeadEndKey = key;
        toast(t('deadEnd'), 3000);
      }
    }, 300);
  }

  async function celebrate() {
    hideHand();
    sound('lid');
    // закрытые банки по очереди подпрыгивают
    slots.forEach((slot, i) => {
      if (!slot.classList.contains('complete')) return;
      slot.querySelector('.jar').animate(
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(-14px) scale(1.06)' },
          { transform: 'translateY(0) scale(1)' },
        ],
        { duration: 420, delay: 300 + i * 70, easing: 'cubic-bezier(.34,1.56,.64,1)' },
      );
    });
    await wait(700 + slots.length * 70);
    onWin({ moves: session.moves, ...stats });
  }

  // ---------- рука-указатель: обучение (уровни 1–2) и купленная подсказка ----------
  let hand = null;

  function hideHand() {
    if (hand) hand.style.display = 'none';
  }

  function showHand() {
    if (session.won || (!paidHint && !level.params.tutorial)) return hideHand();
    const move = paidHint ?? hintMove(session);
    if (!move) return hideHand();
    let target = move[0];
    if (input.selected === move[0]) target = move[1];
    else if (input.selected !== -1) target = input.selected; // выбрана не та банка — снять выбор
    if (!hand) {
      hand = el('div', 'hand', HAND_SVG);
      fx.appendChild(hand);
    }
    const rootRect = screen.getBoundingClientRect();
    const glass = slots[target].querySelector('.glass').getBoundingClientRect();
    // кончик пальца (≈ 40% ширины, 10% высоты картинки) — на середину банки
    hand.style.left = `${glass.left + glass.width / 2 - rootRect.left - 24}px`;
    hand.style.top = `${glass.top + glass.height * 0.45 - rootRect.top - 6}px`;
    hand.style.display = 'block';
  }

  // ---------- размер экрана ----------
  const onResize = () => {
    interrupt();
    const plan = layout();
    if (plan.rows.join(',') !== currentRows) buildBoard();
    else renderAll();
    showHand();
  };
  window.addEventListener('resize', onResize);

  buildBoard();
  refreshAds();
  requestAnimationFrame(async () => {
    buildBoard();
    await showIntro();
    if (!destroyed) onIdle();
  });

  return {
    destroy() {
      destroyed = true;
      interrupt();
      window.removeEventListener('resize', onResize);
      screen.remove();
    },
  };
}
