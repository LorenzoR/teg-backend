// eslint-disable-next-line import/extensions
import CountryCard from '../../src/models/CountryCard';

const allCards = CountryCard.getAllCards();

describe('country cards', () => {
  it('can exchange 3 different cards', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[16],
      allCards[35],
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(true);
  });

  it('can exchange 3 same type cards', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[1],
      allCards[2],
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(true);
  });

  it('can exchange 2 cards and wildcard', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[20],
      allCards[49], // Wildcard
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(true);
  });

  it('can not exchange 2 cards', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[49], // Wildcard
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(false);
  });

  it('can not exchange 3 cards if they are not all same type or all different', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[1],
      allCards[40],
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(false);
  });

  it('can not exchange 4 cards if they are not all same type or all different', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[1],
      allCards[39],
      allCards[40],
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(false);
  });

  it('can exchange 5 cards', async () => {
    expect.hasAssertions();

    // One of each type
    const playerCards = [
      allCards[0],
      allCards[1],
      allCards[20],
      allCards[39],
      allCards[40],
    ];

    const canExchange = CountryCard.playerCanExchangeCards(playerCards);

    expect(canExchange).toBe(true);
  });
});
