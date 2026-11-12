// Ввод: первое нажатие выбирает банку, второе — переливает.
// Ход применяется к партии сразу, в момент нажатия; экран лишь проигрывает события
// по очереди. Поэтому быстрые нажатия во время анимации не теряются и не дублируются:
// модель всегда опережает картинку и проверяет каждый ход по актуальному полю.

import { isJarComplete, isLocked, whyInvalid } from './board.js';
import { makeMove } from './session.js';

export function createInput() {
  return { selected: -1 };
}

/**
 * Обработать нажатие на банку index.
 * @returns {{ session, input, action }}
 *   action.type: 'select' | 'deselect' | 'pour' | 'invalid' | 'ignore'
 */
export function tap(session, input, index) {
  const { board } = session;
  if (session.won || index < 0 || index >= board.jars.length) {
    return { session, input, action: { type: 'ignore', index } };
  }

  if (input.selected === -1) {
    const jar = board.jars[index];
    if (!jar.length || isJarComplete(jar, board.capacity)) {
      return { session, input, action: { type: 'ignore', index } };
    }
    if (isLocked(board, index)) {
      return { session, input, action: { type: 'ignore', index, reason: 'locked' } };
    }
    return { session, input: { selected: index }, action: { type: 'select', index } };
  }

  const from = input.selected;
  if (from === index) {
    return { session, input: createInput(), action: { type: 'deselect', index } };
  }

  const res = makeMove(session, from, index);
  if (res.error) {
    return { session, input: createInput(), action: { type: 'invalid', from, to: index, reason: whyInvalid(board, from, index) } };
  }
  return {
    session: res.session,
    input: createInput(),
    action: { type: 'pour', event: res.event, board: res.session.board, before: board },
  };
}
