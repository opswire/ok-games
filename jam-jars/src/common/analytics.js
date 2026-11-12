// Аналитика: события пишутся в консоль и в очередь. Отправка подключится позже —
// достаточно задать sender через setSender().

const QUEUE_KEY = 'analytics-queue';
const MAX_QUEUE = 200;
let sender = null;
let queue = loadQueue();

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* хранилище недоступно — события останутся только в памяти */
  }
}

export function track(name, params = {}) {
  const event = { name, params, ts: Date.now() };
  console.info('[analytics]', name, params);
  queue.push(event);
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persist();
  if (sender) flush();
}

export function setSender(fn) {
  sender = fn;
  flush();
}

async function flush() {
  if (!sender || !queue.length) return;
  const batch = queue;
  queue = [];
  persist();
  try {
    await sender(batch);
  } catch {
    queue = batch.concat(queue).slice(-MAX_QUEUE);
    persist();
  }
}

export const analytics = { track, setSender };
