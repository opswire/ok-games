// Сохранения. Запись идёт в два места: localStorage (сразу) и хранилище платформы
// (с короткой задержкой, чтобы не упереться в лимиты частоты). При загрузке берётся
// запись с большим номером rev. Формат и миграции задаёт игра (migrate, defaults).
//
// Переиспользуется во всех играх: storage ничего не знает о содержимом сохранения,
// кроме полей schemaVersion и rev.

const PLATFORM_DELAY_MS = 800;
const VK_VALUE_LIMIT = 4096;

/**
 * @param {{ key: string, defaults: () => object, migrate: (raw) => object|null,
 *           pickNewest: (a, b) => object, platform: { save, load }, local?: Storage }} opts
 */
export function createStorage({ key, defaults, migrate, pickNewest, platform, local = globalThis.localStorage }) {
  let current = null;
  let timer = 0;
  let pending = null;

  function parse(text) {
    if (!text) return null;
    try {
      return migrate(JSON.parse(text));
    } catch (e) {
      console.warn('Сохранение повреждено, пропускаю', e);
      return null;
    }
  }

  async function load() {
    const fromLocal = parse(safeGet(local, key));
    let fromPlatform = null;
    try {
      fromPlatform = parse(await platform.load(key));
    } catch (e) {
      console.warn('Хранилище платформы недоступно', e);
    }
    current = pickNewest(fromLocal, fromPlatform) ?? defaults();
    return current;
  }

  /** Сохранить новое состояние. Возвращает записанный объект (с увеличенным rev). */
  function save(data) {
    current = { ...data, rev: (data.rev ?? 0) + 1 };
    const text = JSON.stringify(current);
    if (text.length > VK_VALUE_LIMIT) console.error(`Сохранение ${text.length} байт — больше лимита VK ${VK_VALUE_LIMIT}`);
    safeSet(local, key, text);
    pending = text;
    clearTimeout(timer);
    timer = setTimeout(flush, PLATFORM_DELAY_MS);
    return current;
  }

  /** Немедленно отправить отложенную запись на платформу (при сворачивании вкладки). */
  async function flush() {
    clearTimeout(timer);
    if (pending === null) return;
    const text = pending;
    pending = null;
    try {
      await platform.save(key, text);
    } catch (e) {
      console.warn('Не удалось сохранить на платформе, повторю позже', e);
      if (pending === null) pending = text;
      timer = setTimeout(flush, PLATFORM_DELAY_MS * 5);
    }
  }

  return { load, save, flush, get: () => current };
}

function safeGet(local, key) {
  try {
    return local?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(local, key, value) {
  try {
    local?.setItem(key, value);
  } catch (e) {
    console.warn('localStorage недоступен', e);
  }
}
