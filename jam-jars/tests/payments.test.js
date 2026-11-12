import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPaymentProcessor, createPaymentsServer, signPayments } from '../server/payments.js';
import shop from '../src/data/shop.json';

const secret = 'test-secret';
let dir;
let processPayment;

function signed(params) {
  const data = { app_id: '123', user_id: '456', ...params };
  return { ...data, sig: signPayments(data, secret) };
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jam-payments-'));
  processPayment = createPaymentProcessor({ secret, appId: '123', dbPath: path.join(dir, 'orders.json') });
});

afterEach(async () => fs.rm(dir, { recursive: true, force: true }));

describe('платёжные уведомления VK', () => {
  it('отдаёт товар по его идентификатору и отклоняет неверную подпись', async () => {
    const item = shop.find((x) => x.id === 'undo_10');
    const result = await processPayment(signed({ notification_type: 'get_item_test', item: item.id }));
    expect(result.response).toEqual({ item_id: item.id, title: item.title, price: item.price });
    expect((await processPayment({ notification_type: 'get_item', item: item.id, sig: '00' })).error.error_code).toBe(10);
    expect((await processPayment(signed({ notification_type: 'get_item', item: 'unknown' }))).error.error_code).toBe(20);
  });

  it('начисляет заказ ровно один раз и повторяет тот же ответ', async () => {
    const item = shop.find((x) => x.id === 'coins_150');
    const order = signed({
      notification_type: 'order_status_change_test', order_id: '9001', status: 'chargeable',
      item: item.id, item_id: item.id, item_price: String(item.price),
    });
    const first = await processPayment(order);
    const second = await processPayment(order);
    expect(first).toEqual(second);
    expect(first.response.order_id).toBe(9001);
    const stored = JSON.parse(await fs.readFile(path.join(dir, 'orders.json'), 'utf8'));
    expect(Object.keys(stored.orders)).toHaveLength(1);
  });

  it('разделяет тестовые и боевые заказы с одинаковым номером', async () => {
    const item = shop[1];
    const base = { order_id: '77', status: 'chargeable', item: item.id, item_id: item.id, item_price: String(item.price) };
    const test = await processPayment(signed({ ...base, notification_type: 'order_status_change_test' }));
    const live = await processPayment(signed({ ...base, notification_type: 'order_status_change' }));
    expect(test.response.order_id).toBe(live.response.order_id);
    expect(test.response.app_order_id).not.toBe(live.response.app_order_id);
  });

  it('не принимает подменённую цену или другой app_id', async () => {
    const item = shop[0];
    const base = { notification_type: 'order_status_change', order_id: '78', status: 'chargeable', item: item.id, item_id: item.id };
    expect((await processPayment(signed({ ...base, item_price: item.price + 1 }))).error.error_code).toBe(20);
    const wrongApp = { ...base, item_price: String(item.price), app_id: '999' };
    const withWrongSignature = { ...wrongApp, sig: signPayments(wrongApp, secret) };
    expect((await processPayment(withWrongSignature)).error.error_code).toBe(11);
  });

  it('обрабатывает настоящий HTTP POST и проверку состояния сервера', async () => {
    const server = createPaymentsServer({ secret, appId: '123', dbPath: path.join(dir, 'http-orders.json') });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const port = server.address().port;
      const item = shop[1];
      const params = signed({ notification_type: 'get_item_test', item: item.id });
      const response = await fetch(`http://127.0.0.1:${port}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      });
      expect(response.status).toBe(200);
      expect((await response.json()).response.price).toBe(item.price);
      expect((await (await fetch(`http://127.0.0.1:${port}/health`)).json()).ok).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
