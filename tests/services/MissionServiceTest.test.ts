import MissionService from '../../src/services/MissionService';
import Country from '../../src/models/Country';

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
      Object.assign(new Country(), { countryKey: 'BRASIL' }),
      Object.assign(new Country(), { countryKey: 'URUGUAY' }),
      Object.assign(new Country(), { countryKey: 'ARGENTINA' }),
      Object.assign(new Country(), { countryKey: 'PERU' }),
      Object.assign(new Country(), { countryKey: 'GOBI' }),
      Object.assign(new Country(), { countryKey: 'CHINA' }),
      Object.assign(new Country(), { countryKey: 'MONGOLIA' }),
      Object.assign(new Country(), { countryKey: 'ISRAEL' }),
      Object.assign(new Country(), { countryKey: 'ARABIA' }),
      Object.assign(new Country(), { countryKey: 'TURKEY' }),
    ];

    const neighbourGroups = MissionService.commonNeighbours(countries, 3);

    expect(neighbourGroups).toHaveLength(4);
  });

  it('can get empty array if not enough countries', async () => {
    expect.hasAssertions();

    const countries = [
      Object.assign(new Country(), { countryKey: 'BRASIL' }),
      Object.assign(new Country(), { countryKey: 'URUGUAY' }),
    ];

    const neighbourGroups = MissionService.commonNeighbours(countries, 3);

    expect(neighbourGroups).toHaveLength(0);
  });

  it('can check if continents mission is completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      Object.assign(new Country(), { countryKey: 'ZAIRE' }),
      Object.assign(new Country(), { countryKey: 'SAHARA' }),
      Object.assign(new Country(), { countryKey: 'ETHIOPIA' }),
      Object.assign(new Country(), { countryKey: 'SOUTH_AFRICA' }),
      Object.assign(new Country(), { countryKey: 'MADAGASCAR' }),
      Object.assign(new Country(), { countryKey: 'EGYPT' }),
      Object.assign(new Country(), { countryKey: 'CALIFORNIA' }),
      Object.assign(new Country(), { countryKey: 'OREGON' }),
      Object.assign(new Country(), { countryKey: 'TERRANOVA' }),
      Object.assign(new Country(), { countryKey: 'ALASKA' }),
      Object.assign(new Country(), { countryKey: 'LABRADOR' }),
      Object.assign(new Country(), { countryKey: 'YUKON' }),
      Object.assign(new Country(), { countryKey: 'SPAIN' }),
      Object.assign(new Country(), { countryKey: 'FRANCE' }),
      Object.assign(new Country(), { countryKey: 'ITALY' }),
      Object.assign(new Country(), { countryKey: 'GERMANY' }),
      Object.assign(new Country(), { countryKey: 'POLAND' }),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      Object.assign(new Country(), { countryKey: 'BRASIL' }),
      Object.assign(new Country(), { countryKey: 'ARGENTINA' }),
      Object.assign(new Country(), { countryKey: 'PERU' }),
      Object.assign(new Country(), { countryKey: 'CHILE' }),
      Object.assign(new Country(), { countryKey: 'URUGUAY' }),
      Object.assign(new Country(), { countryKey: 'COLOMBIA' }),
      Object.assign(new Country(), { countryKey: 'POLAND' }),
      Object.assign(new Country(), { countryKey: 'GERMANY' }),
      Object.assign(new Country(), { countryKey: 'ITALY' }),
      Object.assign(new Country(), { countryKey: 'RUSIA' }),
      Object.assign(new Country(), { countryKey: 'SWEDEN' }),
      Object.assign(new Country(), { countryKey: 'UK' }),
      Object.assign(new Country(), { countryKey: 'SPAIN' }),
      Object.assign(new Country(), { countryKey: 'FRANCE' }),
      Object.assign(new Country(), { countryKey: 'TAIMIR' }),
      Object.assign(new Country(), { countryKey: 'TARTARIA' }),
      Object.assign(new Country(), { countryKey: 'SIBERIA' }),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is completed with european countries', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      Object.assign(new Country(), { countryKey: 'BRASIL' }),
      Object.assign(new Country(), { countryKey: 'ARGENTINA' }),
      Object.assign(new Country(), { countryKey: 'PERU' }),
      Object.assign(new Country(), { countryKey: 'CHILE' }),
      Object.assign(new Country(), { countryKey: 'URUGUAY' }),
      Object.assign(new Country(), { countryKey: 'COLOMBIA' }),
      Object.assign(new Country(), { countryKey: 'POLAND' }),
      Object.assign(new Country(), { countryKey: 'GERMANY' }),
      Object.assign(new Country(), { countryKey: 'ITALY' }),
      Object.assign(new Country(), { countryKey: 'RUSIA' }),
      Object.assign(new Country(), { countryKey: 'SWEDEN' }),
      Object.assign(new Country(), { countryKey: 'UK' }),
      Object.assign(new Country(), { countryKey: 'SPAIN' }),
      Object.assign(new Country(), { countryKey: 'ICELAND' }),
      Object.assign(new Country(), { countryKey: 'FRANCE' }),
      Object.assign(new Country(), { countryKey: 'TURKEY' }),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is not completed with european and south american countries only', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      Object.assign(new Country(), { countryKey: 'BRASIL' }),
      Object.assign(new Country(), { countryKey: 'ARGENTINA' }),
      Object.assign(new Country(), { countryKey: 'PERU' }),
      Object.assign(new Country(), { countryKey: 'CHILE' }),
      Object.assign(new Country(), { countryKey: 'URUGUAY' }),
      Object.assign(new Country(), { countryKey: 'COLOMBIA' }),
      Object.assign(new Country(), { countryKey: 'POLAND' }),
      Object.assign(new Country(), { countryKey: 'GERMANY' }),
      Object.assign(new Country(), { countryKey: 'ITALY' }),
      Object.assign(new Country(), { countryKey: 'RUSIA' }),
      Object.assign(new Country(), { countryKey: 'SWEDEN' }),
      Object.assign(new Country(), { countryKey: 'UK' }),
      Object.assign(new Country(), { countryKey: 'SPAIN' }),
      Object.assign(new Country(), { countryKey: 'ICELAND' }),
      Object.assign(new Country(), { countryKey: 'FRANCE' }),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(false);
  });

  it('can check if mission is not completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      Object.assign(new Country(), { countryKey: 'ZAIRE' }),
      Object.assign(new Country(), { countryKey: 'SAHARA' }),
      Object.assign(new Country(), { countryKey: 'ETHIOPIA' }),
      Object.assign(new Country(), { countryKey: 'SOUTH_AFRICA' }),
      Object.assign(new Country(), { countryKey: 'MADAGASCAR' }),
      Object.assign(new Country(), { countryKey: 'EGYPT' }),
      Object.assign(new Country(), { countryKey: 'CALIFORNIA' }),
      Object.assign(new Country(), { countryKey: 'OREGON' }),
      Object.assign(new Country(), { countryKey: 'ALASKA' }),
      Object.assign(new Country(), { countryKey: 'TERRANOVA' }),
      Object.assign(new Country(), { countryKey: 'LABRADOR' }),
      Object.assign(new Country(), { countryKey: 'YUKON' }),
      Object.assign(new Country(), { countryKey: 'SPAIN' }),
      Object.assign(new Country(), { countryKey: 'FRANCE' }),
      Object.assign(new Country(), { countryKey: 'ITALY' }),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(false);
  });

  it('can check mission is completed when player has more than 30 countries', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      Object.assign(new Country(), { countryKey: 'ZAIRE' }),
      Object.assign(new Country(), { countryKey: 'SAHARA' }),
      Object.assign(new Country(), { countryKey: 'ETHIOPIA' }),
      Object.assign(new Country(), { countryKey: 'SOUTH_AFRICA' }),
      Object.assign(new Country(), { countryKey: 'MADAGASCAR' }),
      Object.assign(new Country(), { countryKey: 'GOBI' }),
      Object.assign(new Country(), { countryKey: 'CALIFORNIA' }),
      Object.assign(new Country(), { countryKey: 'OREGON' }),
      Object.assign(new Country(), { countryKey: 'ALASKA' }),
      Object.assign(new Country(), { countryKey: 'TERRANOVA' }),
      Object.assign(new Country(), { countryKey: 'LABRADOR' }),
      Object.assign(new Country(), { countryKey: 'YUKON' }),
      Object.assign(new Country(), { countryKey: 'SPAIN' }),
      Object.assign(new Country(), { countryKey: 'FRANCE' }),
      Object.assign(new Country(), { countryKey: 'ITALY' }),
      Object.assign(new Country(), { countryKey: 'ARGENTINA' }),
      Object.assign(new Country(), { countryKey: 'BRASIL' }),
      Object.assign(new Country(), { countryKey: 'COLOMBIA' }),
      Object.assign(new Country(), { countryKey: 'PERU' }),
      Object.assign(new Country(), { countryKey: 'URUGUAY' }),
      Object.assign(new Country(), { countryKey: 'MEXICO' }),
      Object.assign(new Country(), { countryKey: 'ARAL' }),
      Object.assign(new Country(), { countryKey: 'TARTARIA' }),
      Object.assign(new Country(), { countryKey: 'AUSTRALIA' }),
      Object.assign(new Country(), { countryKey: 'BORNEO' }),
      Object.assign(new Country(), { countryKey: 'JAVA' }),
      Object.assign(new Country(), { countryKey: 'MALASIA' }),
      Object.assign(new Country(), { countryKey: 'TAIMIR' }),
      Object.assign(new Country(), { countryKey: 'KAMCHATKA' }),
      Object.assign(new Country(), { countryKey: 'JAPON' }),
      Object.assign(new Country(), { countryKey: 'RUSIA' }),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can return false if no countries', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;
    const response = MissionService.missionCompleted(mission, null);

    expect(response).toBe(false);
  });

  it('can return false if mission is to destroy another player', async () => {
    expect.hasAssertions();

    const countries = [
      Object.assign(new Country(), { countryKey: 'ZAIRE' }),
      Object.assign(new Country(), { countryKey: 'SAHARA' }),
    ];

    const missions = MissionService.getAllMissions();
    const mission = missions.DESTROY_PINK;
    const response = MissionService.missionCompleted(mission, countries);

    expect(response).toBe(false);
  });
});
