import { describe, it, expect } from 'vitest';
import {
  createBoard,
  pour,
  pourAmount,
  isWon,
  hasUsefulMoves,
  isLayerVisible,
  topRunLength,
  whyInvalid,
  addEmptyJar,
} from '../src/game/board.js';

describe('правила переливания', () => {
  it('в пустую банку можно', () => {
    const b = createBoard([[0, 1], []]);
    expect(pourAmount(b, 0, 1)).toBe(1);
  });

  it('на тот же сорт можно, на другой — нельзя', () => {
    const b = createBoard([[1, 0], [2, 0], [0, 1]]);
    expect(pourAmount(b, 0, 1)).toBe(1);
    expect(pourAmount(b, 0, 2)).toBe(0);
  });

  it('в полную банку нельзя, из пустой нельзя, сама в себя нельзя', () => {
    const b = createBoard([[0], [1, 2, 3, 0], []]);
    expect(pourAmount(b, 0, 1)).toBe(0);
    expect(pourAmount(b, 2, 0)).toBe(0);
    expect(pourAmount(b, 0, 0)).toBe(0);
  });

  it('переливаются все одинаковые верхние слои, сколько поместится', () => {
    const b = createBoard([[1, 0, 0, 0], [2, 3, 0], []]);
    expect(pourAmount(b, 0, 1)).toBe(1); // место только на 1
    expect(pourAmount(b, 0, 2)).toBe(3); // в пустую — все три
    const res = pour(b, 0, 2);
    expect(res.board.jars).toEqual([[1], [2, 3, 0], [0, 0, 0]]);
    expect(res.event).toMatchObject({ from: 0, to: 2, sort: 0, count: 3 });
  });

  it('недопустимый ход не меняет поле', () => {
    const b = createBoard([[0, 1], [1, 0]]);
    expect(pour(b, 0, 1)).toBeNull();
    expect(b.jars).toEqual([[0, 1], [1, 0]]);
  });

  it('pour не меняет исходное поле', () => {
    const b = createBoard([[0, 1], []]);
    pour(b, 0, 1);
    expect(b.jars).toEqual([[0, 1], []]);
  });

  it('topRunLength', () => {
    expect(topRunLength([])).toBe(0);
    expect(topRunLength([1, 0, 0])).toBe(2);
    expect(topRunLength([0, 0, 0, 0])).toBe(4);
  });
});

describe('победа и тупики', () => {
  it('победа: банки пусты или полны одним сортом', () => {
    expect(isWon(createBoard([[0, 0, 0, 0], [], [1, 1, 1, 1]]))).toBe(true);
    expect(isWon(createBoard([[0, 0, 0], [0], [1, 1, 1, 1]]))).toBe(false);
    expect(isWon(createBoard([[0, 0, 0, 1], [1, 1, 1, 0]]))).toBe(false);
  });

  it('нет полезных ходов', () => {
    expect(hasUsefulMoves(createBoard([[0, 1, 0, 1], [1, 0, 1, 0]]))).toBe(false);
    // единственный формальный ход — перелить однородную банку в пустую: бессмысленно
    expect(hasUsefulMoves(createBoard([[0, 0, 0, 0], [1, 1], []]))).toBe(false);
    expect(hasUsefulMoves(createBoard([[0, 1], []]))).toBe(true);
  });
});

describe('секретные слои', () => {
  it('открывается слой, который оказался сверху', () => {
    const b = createBoard([[2, 1, 0, 0], []], { hidden: [3, 0] });
    expect(isLayerVisible(b, 0, 3)).toBe(true);
    expect(isLayerVisible(b, 0, 2)).toBe(false);
    const res = pour(b, 0, 1); // уходят два слоя «0», включая закрытый
    expect(res.board.jars[0]).toEqual([2, 1]);
    expect(res.board.hidden[0]).toBe(1);
    expect(res.event.revealed).toBe(1);
    expect(isLayerVisible(res.board, 0, 1)).toBe(true);
    expect(isLayerVisible(res.board, 0, 0)).toBe(false);
  });

  it('собранная банка не прячет слои под крышкой', () => {
    // в банке-получателе нижний слой закрыт «?», но на деле это тот же сорт
    const b = createBoard([[1, 0], [0, 0, 0]], { hidden: [1, 2] });
    const res = pour(b, 0, 1);
    expect(res.board.jars[1]).toEqual([0, 0, 0, 0]);
    expect(res.board.hidden[1]).toBe(0);
  });

  it('несобранная банка-получатель свои закрытые слои сохраняет', () => {
    const b = createBoard([[1, 0], [2, 0]], { hidden: [1, 1] });
    const res = pour(b, 0, 1);
    expect(res.board.jars[1]).toEqual([2, 0, 0]);
    expect(res.board.hidden[1]).toBe(1);
  });

  it('если сверху уже открытый слой — ничего не открывается', () => {
    const b = createBoard([[2, 1, 0, 0], [0]], { hidden: [1, 0] });
    const res = pour(b, 0, 1);
    expect(res.event.revealed).toBe(-1);
    expect(res.board.hidden[0]).toBe(1);
  });
});

describe('механики поля', () => {
  it('маленькая банка вмещает 3 слоя и никогда не считается собранной', () => {
    const b = createBoard([[0, 0, 0, 0], [1, 1, 1], []], { caps: [4, 3, 4] });
    expect(pourAmount(b, 0, 1)).toBe(0); // другой сорт
    const c = createBoard([[1, 0, 0, 0], [], [0]], { caps: [4, 3, 4] });
    expect(pourAmount(c, 0, 1)).toBe(3);
    const r = pour(c, 0, 1);
    expect(r.board.jars[1]).toEqual([0, 0, 0]);
    expect(r.event.completed).toBe(false);
    expect(pourAmount(r.board, 2, 1)).toBe(0); // маленькая полна
  });

  it('банка под замком закрыта, пока не собрано 2 банки, потом открыта насовсем', () => {
    const b = createBoard(
      [[1, 1, 1], [1], [2, 2, 2], [2], [0, 3, 0, 3], []],
      { locks: [0, 0, 0, 0, 2, 0] },
    );
    expect(pourAmount(b, 4, 5)).toBe(0);
    expect(pourAmount(b, 1, 4)).toBe(0);
    let r = pour(b, 1, 0);
    expect(r.event.completed).toBe(true);
    expect(r.board.locks[4]).toBe(2);
    r = pour(r.board, 3, 2);
    expect(r.event.unlocked).toEqual([4]);
    expect(r.board.locks[4]).toBe(0);
    expect(pourAmount(r.board, 4, 5)).toBe(1);
  });

  it('в банку «только для сорта» — только этот сорт', () => {
    const b = createBoard([[1, 2], [2, 1], []], { only: [-1, -1, 1] });
    expect(pourAmount(b, 0, 2)).toBe(0);
    expect(whyInvalid(b, 0, 2)).toBe('only');
    expect(pourAmount(b, 1, 2)).toBe(1);
  });

  it('добавленная банка — обычная', () => {
    const b = addEmptyJar(createBoard([[0]], { caps: [3], only: [0] }));
    expect([b.caps[1], b.locks[1], b.only[1]]).toEqual([4, 0, -1]);
  });
});
