import Round from '../../src/models/Round';

describe('round', () => {
  it('can create a new round', async () => {
    expect.hasAssertions();

    const round = new Round();

    expect(round !== null).toBe(true);
  });
});
