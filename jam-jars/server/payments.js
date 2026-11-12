import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const products = JSON.parse(await fs.readFile(new URL('../src/data/shop.json', import.meta.url), 'utf8'));
const productMap = new Map(products.map((item) => [item.id, item]));

export function signPayments(params, secret) {
  const source = Object.keys(params)
    .filter((key) => key !== 'sig')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('');
  return crypto.createHash('md5').update(source + secret, 'utf8').digest('hex');
}

function validSignature(params, secret) {
  const expected = Buffer.from(signPayments(params, secret), 'hex');
  const received = Buffer.from(String(params.sig ?? ''), 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function paymentError(error_code, error_msg, critical = true) {
  return { error: { error_code, error_msg, critical } };
}

export function createPaymentProcessor({ secret, appId = '', dbPath }) {
  if (!secret) throw new Error('Задайте VK_APP_SECRET');
  let queue = Promise.resolve();

  async function process(params) {
    if (!validSignature(params, secret)) return paymentError(10, 'Неверная подпись');
    if (appId && String(params.app_id) !== String(appId)) return paymentError(11, 'Неверный app_id');
    const type = params.notification_type;
    const item = productMap.get(params.item);
    if (!item) return paymentError(20, 'Товар не существует');

    if (type === 'get_item' || type === 'get_item_test') {
      return { response: { item_id: item.id, title: item.title, price: item.price } };
    }
    if (type !== 'order_status_change' && type !== 'order_status_change_test') {
      return paymentError(11, 'Неизвестный тип уведомления');
    }
    if (params.status !== 'chargeable') return paymentError(100, 'Ожидался статус chargeable');
    if (!/^\d+$/.test(String(params.order_id ?? ''))) return paymentError(11, 'Неверный order_id');
    if (params.item_id && String(params.item_id) !== item.id) return paymentError(20, 'Неверный item_id');
    if (Number(params.item_price) !== item.price) return paymentError(20, 'Цена товара не совпадает');

    const test = type.endsWith('_test');
    const key = `${test ? 'test' : 'live'}:${params.order_id}`;
    const db = await readDb(dbPath);
    const previous = db.orders[key];
    if (previous) return previous.response;

    const response = { response: { order_id: Number(params.order_id), app_order_id: db.nextAppOrderId } };
    db.orders[key] = {
      response,
      user_id: String(params.user_id ?? ''),
      item: item.id,
      processed_at: new Date().toISOString(),
    };
    db.nextAppOrderId += 1;
    await writeDb(dbPath, db);
    return response;
  }

  return (params) => {
    const result = queue.then(() => process(params), () => process(params));
    queue = result.catch(() => {});
    return result;
  };
}

async function readDb(dbPath) {
  try {
    const data = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    return { nextAppOrderId: data.nextAppOrderId || 1, orders: data.orders || {} };
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return { nextAppOrderId: 1, orders: {} };
  }
}

async function writeDb(dbPath, data) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const temporary = `${dbPath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  await fs.rename(temporary, dbPath);
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 32768) throw new Error('Слишком большой запрос');
  }
  return body;
}

export function createPaymentsServer({ secret = process.env.VK_APP_SECRET, appId = process.env.VK_APP_ID ?? '', dbPath = process.env.PAYMENTS_DB_PATH ?? new URL('./orders.json', import.meta.url).pathname } = {}) {
  const processPayment = createPaymentProcessor({ secret, appId, dbPath });
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end('{"ok":true}');
    }
    if (req.method !== 'POST' || req.url !== '/payments') {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      return res.end('{"error":"not_found"}');
    }
    try {
      const body = await readBody(req);
      const params = Object.fromEntries(new URLSearchParams(body));
      const result = await processPayment(params);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(result));
    } catch (e) {
      console.error('Ошибка платёжного уведомления', e);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(paymentError(2, 'Временная ошибка обработки', false)));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createPaymentsServer();
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`Платёжный обработчик: http://localhost:${port}/payments`));
}
