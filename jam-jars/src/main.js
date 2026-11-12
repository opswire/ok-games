// Точка входа: загрузка сохранения и переходы между экранами.
import './styles.css';
import * as platform from './common/platform.js';
import { createStorage } from './common/storage.js';
import { register as registerSounds, setEnabled as setSound, play as sound } from './common/audio.js';
import { track } from './common/analytics.js';
import { toast, t } from './common/ui.js';
import { dayNumber, dailyStatus, claimDaily } from './common/daily.js';
import { shouldShowInterstitial } from './common/adPolicy.js';
import { SOUNDS } from './assets/sounds.js';
import { generateLevel } from './game/generator.js';
import {
  defaultSave,
  migrate,
  pickNewest,
  applyWin,
  addCoins,
  buyUndoPack,
  grant,
  applyPurchase,
  pantryUnlocksAt,
  buyCosmetic,
  selectCosmetic,
  SCHEMA_VERSION,
  ECONOMY,
} from './game/progress.js';
import { onLevelWin as questsOnWin, claimQuest, claimableCount, questText } from './game/quests.js';
import flavors from './data/flavors.json';
import { setJarStyle } from './screens/jarArt.js';
import { kitchenSvg } from './screens/kitchenArt.js';
import { mountDecorShop } from './screens/decorShop.js';
import { el } from './common/ui.js';
import dailyRewards from './data/daily.json';
import pantryData from './data/pantry.json';
import shopItems from './data/shop.json';
import { mountMainScreen } from './screens/main.js';
import { mountGameScreen } from './screens/game.js';
import { mountWinScreen } from './screens/win.js';
import { mountPantryScreen } from './screens/pantry.js';
import { mountShopScreen } from './screens/shop.js';
import { dailyDialog, settingsDialog, undoShopDialog, rewardText, questsDialog } from './screens/dialogs.js';

const SAVE_KEY = 'jam-jars-save';
const OLD_DEV_KEY = 'jam.dev.level';

const app = document.getElementById('app');
const storage = createStorage({ key: SAVE_KEY, defaults: defaultSave, migrate, pickNewest, platform });
let save = null;
let screen = null;
let dailyShownThisSession = false;
let lastInterstitialAt = 0;

function commit(next) {
  save = storage.save(next);
  setJarStyle(save.cosmetics);
  return save;
}

function show(mount) {
  screen?.destroy();
  screen = mount();
}

async function showReward(placement) {
  const shown = await platform.showRewarded();
  if (shown) track('ad_rewarded_shown', { placement });
  return shown;
}

function showMain() {
  const status = dailyStatus(save.daily, dayNumber(), dailyRewards.length);
  show(() =>
    mountMainScreen(app, {
      save,
      dailyAvailable: status.available,
      questsReady: claimableCount(save.quests),
      hero: el('div', 'kitchen-box', kitchenSvg()),
      onPlay: () => startLevel(save.level),
      onDaily: () => openDaily(),
      onPantry: () => showPantry(),
      onSettings: () => openSettings(),
      onQuests: () => openQuests(),
      onDecor: () => showDecor(),
      onShop: () => showShop(),
    }),
  );
  if (status.available && !dailyShownThisSession) {
    dailyShownThisSession = true;
    setTimeout(openDaily, 350);
  }
}

function startLevel(n) {
  const level = generateLevel(n);
  track('level_start', { level: n, sorts: level.params.sorts, hard: level.params.hard, secret: level.params.secret });
  const econ = {
    undo: () => save.inventory.undo,
    jars: () => save.inventory.jars,
    coins: () => save.coins,
    adReady: () => platform.isRewardedReady(),
    showReward,
    spendUndo: () => commit({ ...save, inventory: { ...save.inventory, undo: Math.max(0, save.inventory.undo - 1) } }),
    spendCoins: (n) => commit(addCoins(save, -n)),
    spendJar: () => commit({ ...save, inventory: { ...save.inventory, jars: Math.max(0, save.inventory.jars - 1) } }),
    async offerUndos() {
      const choice = await undoShopDialog({ coins: save.coins, adReady: await platform.isRewardedReady() });
      if (choice === 'ad') {
        if (!(await showReward('undo'))) {
          toast(t('adNotShown'));
          return false;
        }
        commit(grant(save, { undo: ECONOMY.undoPackSize }));
      } else if (choice === 'coins') {
        const next = buyUndoPack(save);
        if (!next) return false;
        commit(next);
      } else return false;
      sound('coin');
      toast(t('undoBought'));
      return true;
    },
  };
  show(() =>
    mountGameScreen(app, {
      level,
      econ,
      onExit: () => showMain(),
      onWin: (stats) => onLevelWin(level, stats),
    }),
  );
}

async function continueAfterWin(completedLevel) {
  if (shouldShowInterstitial({ completedLevel, lastShownAt: lastInterstitialAt, noAds: save.noAds })) {
    if (await platform.showInterstitial()) {
      lastInterstitialAt = Date.now();
      track('ad_interstitial_shown', { level: completedLevel });
    }
  }
  startLevel(save.level);
}

function onLevelWin(level, { moves, undos = 0, hints = 0 }) {
  const firstTime = level.number === save.level;
  const reward = firstTime ? level.params.reward : 0;
  const coinsBefore = save.coins;
  const unlocks = firstTime ? pantryUnlocksAt(level.number, pantryData) : [];
  let next = applyWin(save, level.number, reward);
  const q = questsOnWin(save.quests, { flavors: level.flavors, undos, hints, hard: level.params.hard });
  next = { ...next, quests: q.quests, stats: { ...next.stats, jars: next.stats.jars + level.flavors.length } };
  commit(next);
  track('level_win', { level: level.number, moves, reward, undos, hints });
  const questsDone = q.completed.map((x) => questText(x, flavors));
  let doubled = false;
  show(() =>
    mountWinScreen(app, {
      levelNumber: level.number,
      flavors: level.flavors,
      reward,
      coinsBefore,
      unlocks,
      questsDone,
      adReady: () => platform.isRewardedReady(),
      onDouble: async () => {
        if (doubled || !reward) return false;
        if (!(await showReward('double_win'))) {
          toast(t('adNotShown'));
          return false;
        }
        doubled = true;
        commit(addCoins(save, reward));
        return true;
      },
      onNext: () => continueAfterWin(level.number),
      onPantry: () => showPantry(),
    }),
  );
}

function showPantry() {
  show(() => mountPantryScreen(app, { levelsDone: save.level - 1, onBack: () => showMain() }));
}

function showDecor() {
  show(() =>
    mountDecorShop(app, {
      getSave: () => save,
      onBuy: (kind, item) => {
        const next = buyCosmetic(save, item);
        if (!next) {
          toast(t('decorPoor'));
          return false;
        }
        commit(next);
        sound('coin');
        toast(t('decorBought'));
        track('cosmetic_buy', { kind, id: item.id, price: item.price });
        return true;
      },
      onSelect: (kind, id) => commit(selectCosmetic(save, kind, id)),
      onBack: () => showMain(),
    }),
  );
}

function showShop() {
  show(() =>
    mountShopScreen(app, {
      items: shopItems,
      isStub: platform.isStub(),
      hasNoAds: save.noAds,
      onBuy: async (item) => {
        const result = await platform.buy(item.id);
        if (!result.success) {
          toast(t('purchaseCancelled'));
          return false;
        }
        commit(applyPurchase(save, item));
        sound('coin');
        toast(t('purchaseDone'));
        track('purchase', { item: item.id, price: item.price, orderId: result.orderId, stub: platform.isStub() });
        return true;
      },
      onBack: () => showMain(),
    }),
  );
}

async function openQuests() {
  await questsDialog({
    getQuests: () => save.quests,
    onClaim: (id) => {
      const res = claimQuest(save.quests, id, save.level);
      if (!res) return 0;
      commit({ ...addCoins(save, res.reward), quests: res.quests });
      sound('coin');
      toast(`+ ${res.reward} монет`);
      track('quest_claim', { id, reward: res.reward });
      screen?.setCoins?.(save.coins);
      return res.reward;
    },
  });
  screen?.setQuestsReady?.(claimableCount(save.quests));
}

async function openDaily() {
  const today = dayNumber();
  const status = dailyStatus(save.daily, today, dailyRewards.length);
  const take = await dailyDialog(status);
  if (!take) return;
  const res = claimDaily(save.daily, today, dailyRewards.length);
  if (!res) return;
  const reward = dailyRewards[res.dayIndex];
  commit({ ...grant(save, reward), daily: res.daily });
  track('daily_bonus', { day: res.dayIndex + 1, ...reward });
  sound('coin');
  toast(`+ ${rewardText(reward)}`);
  if (screen?.setCoins) screen.setCoins(save.coins);
  if (screen?.setDailyAvailable) screen.setDailyAvailable(false);
}

async function openSettings() {
  await settingsDialog({
    sound: save.settings.sound,
    onSound: (on) => {
      commit({ ...save, settings: { ...save.settings, sound: on } });
      setSound(on);
      if (on) sound('tap');
    },
  });
}

async function boot() {
  await platform.init();
  registerSounds(SOUNDS);
  save = await storage.load();
  const old = localStorage.getItem(OLD_DEV_KEY);
  if (old !== null) {
    if (save.rev === 0) save = migrate({ level: Number(old) }) ?? save;
    localStorage.removeItem(OLD_DEV_KEY);
    commit(save);
  }
  setSound(save.settings.sound);
  setJarStyle(save.cosmetics);
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (raw && raw.schemaVersion !== SCHEMA_VERSION) commit(save);
  } catch {
    // Повреждённая запись уже заменена при загрузке.
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) storage.flush();
  });

  const forced = Number(new URLSearchParams(location.search).get('level'));
  if (forced > 0) startLevel(forced);
  else showMain();
}

boot();
