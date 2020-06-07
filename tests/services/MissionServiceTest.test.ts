// eslint-disable-next-line import/extensions
import MissionService from '../../src/services/MissionService';

describe('mission service', () => {
  it('can get 2 random missions', async () => {
    expect.hasAssertions();

    const missions = MissionService.getRandomMissions(2);

    expect(missions).toHaveLength(2);
    expect(missions[0]).toHaveProperty('text');
  });

  it('can get common neighbours', async () => {
    expect.hasAssertions();

    const countries = [
      { countryKey: 'BRASIL' },
      { countryKey: 'URUGUAY' },
      { countryKey: 'ARGENTINA' },
      { countryKey: 'PERU' },
      { countryKey: 'GOBI' },
      { countryKey: 'CHINA' },
      { countryKey: 'MONGOLIA' },
      { countryKey: 'ISRAEL' },
      { countryKey: 'ARABIA' },
      { countryKey: 'TURKEY' },
    ];

    const neighbourGroups = MissionService.commonNeighbours(countries, 3);

    expect(neighbourGroups).toHaveLength(4);
  });

  it('can check if continents mission is completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      { countryKey: 'ZAIRE' },
      { countryKey: 'SAHARA' },
      { countryKey: 'ETHIOPIA' },
      { countryKey: 'SOUTH_AFRICA' },
      { countryKey: 'MADAGASCAR' },
      { countryKey: 'EGYPT' },
      { countryKey: 'CALIFORNIA' },
      { countryKey: 'OREGON' },
      { countryKey: 'ALASKA' },
      { countryKey: 'TERRANOVA' },
      { countryKey: 'LABRADOR' },
      { countryKey: 'YUKON' },
      { countryKey: 'SPAIN' },
      { countryKey: 'FRANCE' },
      { countryKey: 'ITALY' },
      { countryKey: 'GERMANY' },
      { countryKey: 'POLAND' },
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      { countryKey: 'BRASIL' },
      { countryKey: 'ARGENTINA' },
      { countryKey: 'PERU' },
      { countryKey: 'CHILE' },
      { countryKey: 'URUGUAY' },
      { countryKey: 'COLOMBIA' },
      { countryKey: 'POLAND' },
      { countryKey: 'GERMANY' },
      { countryKey: 'ITALY' },
      { countryKey: 'RUSIA' },
      { countryKey: 'SWEDEN' },
      { countryKey: 'UK' },
      { countryKey: 'SPAIN' },
      { countryKey: 'FRANCE' },
      { countryKey: 'TAIMIR' },
      { countryKey: 'TARTARIA' },
      { countryKey: 'SIBERIA' },
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is completed with european countries', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      { countryKey: 'BRASIL' },
      { countryKey: 'ARGENTINA' },
      { countryKey: 'PERU' },
      { countryKey: 'CHILE' },
      { countryKey: 'URUGUAY' },
      { countryKey: 'COLOMBIA' },
      { countryKey: 'ICELAND' },
      { countryKey: 'POLAND' },
      { countryKey: 'GERMANY' },
      { countryKey: 'ITALY' },
      { countryKey: 'RUSIA' },
      { countryKey: 'SWEDEN' },
      { countryKey: 'UK' },
      { countryKey: 'SPAIN' },
      { countryKey: 'FRANCE' },
      { countryKey: 'TURKEY' },
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if mission is not completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      { countryKey: 'ZAIRE' },
      { countryKey: 'SAHARA' },
      { countryKey: 'ETHIOPIA' },
      { countryKey: 'SOUTH_AFRICA' },
      { countryKey: 'MADAGASCAR' },
      { countryKey: 'EGYPT' },
      { countryKey: 'CALIFORNIA' },
      { countryKey: 'OREGON' },
      { countryKey: 'ALASKA' },
      { countryKey: 'TERRANOVA' },
      { countryKey: 'LABRADOR' },
      { countryKey: 'YUKON' },
      { countryKey: 'SPAIN' },
      { countryKey: 'FRANCE' },
      { countryKey: 'ITALY' },
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(false);
  });
});
