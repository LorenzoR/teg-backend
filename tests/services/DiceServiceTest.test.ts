// eslint-disable-next-line import/extensions
import DiceService from '../../src/services/DiceService';

const diceService = new DiceService();

describe('dice service', () => {
  it('can throw one dice', async () => {
    expect.hasAssertions();

    const dice = diceService.throwDices(1);

    expect(dice).toHaveLength(1);
    expect(dice[0]).toBeGreaterThanOrEqual(1);
    expect(dice[0]).toBeLessThanOrEqual(6);
  });

  it('can throw two dices', async () => {
    expect.hasAssertions();

    const dice = diceService.throwDices(2);

    expect(dice).toHaveLength(2);
    expect(dice[0]).toBeGreaterThanOrEqual(1);
    expect(dice[0]).toBeLessThanOrEqual(6);
    expect(dice[1]).toBeGreaterThanOrEqual(1);
    expect(dice[1]).toBeLessThanOrEqual(6);
  });

  it('can throw three dices', async () => {
    expect.hasAssertions();

    const dice = diceService.throwDices(3);

    expect(dice).toHaveLength(3);
    expect(dice[0]).toBeGreaterThanOrEqual(1);
    expect(dice[0]).toBeLessThanOrEqual(6);
    expect(dice[1]).toBeGreaterThanOrEqual(1);
    expect(dice[1]).toBeLessThanOrEqual(6);
    expect(dice[2]).toBeGreaterThanOrEqual(1);
    expect(dice[2]).toBeLessThanOrEqual(6);
  });
});
