// eslint-disable-next-line import/extensions
import MissionService from '../../src/services/MissionService';

describe('mission service', () => {
  it('can get 2 random missions', async () => {
    expect.hasAssertions();

    const missions = MissionService.getRandomMissions(2);

    expect(missions).toHaveLength(2);
    expect(missions[0]).toHaveProperty('text');
  });
});
