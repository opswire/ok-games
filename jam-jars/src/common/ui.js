// Общие элементы интерфейса: тексты, тосты, окна. Переиспользуется во всех играх.
import strings from '../data/strings.json';

/** Текст по ключу из data/strings.json с подстановкой {параметров}. */
export function t(key, params = {}) {
  const s = strings[key];
  if (s === undefined) {
    console.warn(`Нет строки: ${key}`);
    return key;
  }
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
}

export function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

let toastTimer = 0;
/** Короткое сообщение внизу экрана. */
export function toast(text, ms = 2200) {
  let box = document.querySelector('.toast');
  if (!box) {
    box = el('div', 'toast');
    box.setAttribute('role', 'status');
    document.querySelector('#app').appendChild(box);
  }
  box.textContent = text;
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), ms);
}

/**
 * Модальное окно. buttons: [{ text, value, primary }]. Возвращает Promise со значением нажатой кнопки.
 * Пока окно открыто, игра под ним не получает нажатий.
 */
let modalId = 0;

export function modal({ title, text = '', content = null, buttons, dismissValue = null, className = '' }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const overlay = el('div', 'modal-overlay');
    const box = el('div', `modal ${className}`);
    const titleId = `modal-title-${++modalId}`;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', titleId);
    const heading = el('h2', 'modal-title', title);
    heading.id = titleId;
    box.appendChild(heading);
    if (text) box.appendChild(el('p', 'modal-text', text));
    if (content) box.appendChild(content);
    const row = el('div', 'modal-buttons');
    let closed = false;
    const close = (value) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.add('closing');
      overlay.inert = true;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      setTimeout(() => overlay.remove(), 180);
      resolve(value);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && dismissValue !== undefined) return close(dismissValue);
      if (e.key !== 'Tab') return;
      const focusable = [...box.querySelectorAll('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]')];
      if (!focusable.length) return e.preventDefault();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    for (const b of buttons) {
      const btn = el('button', `btn ${b.primary ? 'btn-primary' : ''}`, b.text);
      btn.type = 'button';
      if (b.disabled) btn.disabled = true;
      btn.addEventListener('click', () => {
        if (b.onClick) return b.onClick(btn, close);
        close(b.value);
      });
      row.appendChild(btn);
    }
    box.appendChild(row);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && dismissValue !== undefined) close(dismissValue);
    });
    document.querySelector('#app').appendChild(overlay);
    document.addEventListener('keydown', onKeyDown);
    (row.querySelector('.btn-primary:not([disabled]), .btn:not([disabled])') ?? box).focus();
  });
}
