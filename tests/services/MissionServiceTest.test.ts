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
      new Country('BRASIL', null, null),
      new Country('URUGUAY', null, null),
      new Country('ARGENTINA', null, null),
      new Country('PERU', null, null),
      new Country('GOBI', null, null),
      new Country('CHINA', null, null),
      new Country('MONGOLIA', null, null),
      new Country('ISRAEL', null, null),
      new Country('ARABIA', null, null),
      new Country('TURKEY', null, null),
    ];

    const neighbourGroups = MissionService.commonNeighbours(countries, 3);

    expect(neighbourGroups).toHaveLength(4);
  });

  it('can get empty array if not enough countries', async () => {
    expect.hasAssertions();

    const countries = [
      new Country('BRASIL', null, null),
      new Country('URUGUAY', null, null),
    ];

    const neighbourGroups = MissionService.commonNeighbours(countries, 3);

    expect(neighbourGroups).toHaveLength(0);
  });

  it('can check if continents mission is completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      new Country('ZAIRE', null, null),
      new Country('SAHARA', null, null),
      new Country('ETHIOPIA', null, null),
      new Country('SOUTH_AFRICA', null, null),
      new Country('MADAGASCAR', null, null),
      new Country('EGYPT', null, null),
      new Country('CALIFORNIA', null, null),
      new Country('OREGON', null, null),
      new Country('ALASKA', null, null),
      new Country('TERRANOVA', null, null),
      new Country('LABRADOR', null, null),
      new Country('YUKON', null, null),
      new Country('SPAIN', null, null),
      new Country('FRANCE', null, null),
      new Country('ITALY', null, null),
      new Country('GERMANY', null, null),
      new Country('POLAND', null, null),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      new Country('BRASIL', null, null),
      new Country('ARGENTINA', null, null),
      new Country('PERU', null, null),
      new Country('CHILE', null, null),
      new Country('URUGUAY', null, null),
      new Country('COLOMBIA', null, null),
      new Country('POLAND', null, null),
      new Country('GERMANY', null, null),
      new Country('ITALY', null, null),
      new Country('RUSIA', null, null),
      new Country('SWEDEN', null, null),
      new Country('UK', null, null),
      new Country('SPAIN', null, null),
      new Country('FRANCE', null, null),
      new Country('TAIMIR', null, null),
      new Country('TARTARIA', null, null),
      new Country('SIBERIA', null, null),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is completed with european countries', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      new Country('BRASIL', null, null),
      new Country('ARGENTINA', null, null),
      new Country('PERU', null, null),
      new Country('CHILE', null, null),
      new Country('URUGUAY', null, null),
      new Country('COLOMBIA', null, null),
      new Country('POLAND', null, null),
      new Country('GERMANY', null, null),
      new Country('ITALY', null, null),
      new Country('RUSIA', null, null),
      new Country('SWEDEN', null, null),
      new Country('UK', null, null),
      new Country('SPAIN', null, null),
      new Country('FRANCE', null, null),
      new Country('TURKEY', null, null),
      new Country('ICELAND', null, null),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(true);
  });

  it('can check if neighbours mission is not completed with european and south american countries only', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3;

    const countries = [
      new Country('BRASIL', null, null),
      new Country('ARGENTINA', null, null),
      new Country('PERU', null, null),
      new Country('CHILE', null, null),
      new Country('URUGUAY', null, null),
      new Country('COLOMBIA', null, null),
      new Country('POLAND', null, null),
      new Country('GERMANY', null, null),
      new Country('ITALY', null, null),
      new Country('RUSIA', null, null),
      new Country('SWEDEN', null, null),
      new Country('UK', null, null),
      new Country('SPAIN', null, null),
      new Country('FRANCE', null, null),
      new Country('ICELAND', null, null),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(false);
  });

  it('can check if mission is not completed', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      new Country('ZAIRE', null, null),
      new Country('SAHARA', null, null),
      new Country('ETHIOPIA', null, null),
      new Country('SOUTH_AFRICA', null, null),
      new Country('MADAGASCAR', null, null),
      new Country('EGYPT', null, null),
      new Country('CALIFORNIA', null, null),
      new Country('OREGON', null, null),
      new Country('ALASKA', null, null),
      new Country('TERRANOVA', null, null),
      new Country('LABRADOR', null, null),
      new Country('YUKON', null, null),
      new Country('SPAIN', null, null),
      new Country('FRANCE', null, null),
      new Country('ITALY', null, null),
    ];

    const missionCompleted = MissionService.missionCompleted(mission, countries);

    expect(missionCompleted).toBe(false);
  });

  it('can check mission is completed when player has more than 30 countries', async () => {
    expect.hasAssertions();

    const missions = MissionService.getAllMissions();
    const mission = missions.AFRICA_NORTH_AMERICA_5_EUROPE_4;

    const countries = [
      new Country('ZAIRE', null, null),
      new Country('SAHARA', null, null),
      new Country('ETHIOPIA', null, null),
      new Country('SOUTH_AFRICA', null, null),
      new Country('MADAGASCAR', null, null),
      new Country('GOBI', null, null),
      new Country('CALIFORNIA', null, null),
      new Country('OREGON', null, null),
      new Country('ALASKA', null, null),
      new Country('TERRANOVA', null, null),
      new Country('LABRADOR', null, null),
      new Country('YUKON', null, null),
      new Country('SPAIN', null, null),
      new Country('FRANCE', null, null),
      new Country('ITALY', null, null),
      new Country('ARGENTINA', null, null),
      new Country('BRASIL', null, null),
      new Country('COLOMBIA', null, null),
      new Country('PERU', null, null),
      new Country('URUGUAY', null, null),
      new Country('MEXICO', null, null),
      new Country('ARAL', null, null),
      new Country('TARTARIA', null, null),
      new Country('AUSTRALIA', null, null),
      new Country('BORNEO', null, null),
      new Country('JAVA', null, null),
      new Country('MALASIA', null, null),
      new Country('TAIMIR', null, null),
      new Country('KAMCHATKA', null, null),
      new Country('JAPON', null, null),
      new Country('RUSIA', null, null),
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
      new Country('ZAIRE', null, null),
      new Country('SAHARA', null, null),
    ];

    const missions = MissionService.getAllMissions();
    const mission = missions.DESTROY_PINK;
    const response = MissionService.missionCompleted(mission, countries);

    expect(response).toBe(false);
  });
});
