import Country from '../../src/models/Country';

const players = [
  { id: '1', name: 'player1', color: 'red' },
  { id: '2', name: 'player2', color: 'black' },
];

describe('country', () => {
  it('can get continent', async () => {
    expect.hasAssertions();

    const country = Object.assign(new Country(), { countryKey: 'ARGENTINA' });
    const continent = country.getContinent();

    expect(continent).toBe('SOUTH_AMERICA');
  });

  it('can get null continent with invalid country', async () => {
    expect.hasAssertions();

    const country = Object.assign(new Country(), { countryKey: 'INVALID_COUNTRY' });
    const continent = country.getContinent();

    expect(continent).toBeNull();
  });

  it('can get null continent with invalid country with static method', async () => {
    expect.hasAssertions();

    const continent = Country.getContinentByCountryKey('INVALID_COUNTRY');

    expect(continent).toBeNull();
  });

  it('can check if two countries are neighbours', async () => {
    expect.hasAssertions();

    const country = Object.assign(new Country(), { countryKey: 'BRASIL' });
    const target = Object.assign(new Country(), { countryKey: 'ARGENTINA' });
    const areNeighbours = country.areNeighbours(target);

    expect(areNeighbours).toBe(true);
  });

  it('can check if a country can attack another', async () => {
    expect.hasAssertions();

    const attacker = Object.assign(new Country(), {
      countryKey: 'BRASIL',
      state: { player: players[0], troops: 2, newTroops: 0 },
    });

    const defender = Object.assign(new Country(), {
      countryKey: 'ARGENTINA',
      state: { player: players[1], troops: 2, newTroops: 0 },
    });

    const canAttak = attacker.canAttack(defender);

    expect(canAttak).toBe(true);
  });

  it('can check a country can not attack another if they belong to the same player', async () => {
    expect.hasAssertions();

    const attacker = Object.assign(new Country(), {
      countryKey: 'BRASIL',
      state: { player: players[0], troops: 2, newTroops: 0 },
    });

    const defender = Object.assign(new Country(), {
      countryKey: 'ARGENTINA',
      state: { player: players[0], troops: 2, newTroops: 0 },
    });

    const canAttak = attacker.canAttack(defender);

    expect(canAttak).toBe(false);
  });

  it('can check a country can not attack another if they are not neighbours', async () => {
    expect.hasAssertions();

    const attacker = Object.assign(new Country(), {
      countryKey: 'BRASIL',
      state: { player: players[0], troops: 2, newTroops: 0 },
    });

    const defender = Object.assign(new Country(), {
      countryKey: 'OREGON',
      state: { player: players[1], troops: 2, newTroops: 0 },
    });

    const canAttak = attacker.canAttack(defender);

    expect(canAttak).toBe(false);
  });

  it('can check a country can not attack with less than 2 troops', async () => {
    expect.hasAssertions();

    const attacker = Object.assign(new Country(), {
      countryKey: 'BRASIL',
      state: { player: players[0], troops: 1, newTroops: 0 },
    });

    const defender = Object.assign(new Country(), {
      countryKey: 'ARGENTINA',
      state: { player: players[1], troops: 2, newTroops: 0 },
    });

    const canAttak = attacker.canAttack(defender);

    expect(canAttak).toBe(false);
  });
});
