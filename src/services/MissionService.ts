import _ from 'lodash';

import Mission from '../models/Mission';
import { PlayerTypes } from '../models/Player';
import { ContinentTypes } from '../models/Continent';
import Country from '../models/Country';

// List of missions
const Missions = {
  AFRICA_NORTH_AMERICA_5_EUROPE_4: {
    text: 'Ocupar África, 5 países de América del Norte y 4 países de Europa.',
    continents: [
      { id: ContinentTypes.AFRICA, countries: 6 },
      { id: ContinentTypes.NORTH_AMERICA, countries: 5 },
      { id: ContinentTypes.EUROPE, countries: 4 },
    ],
  },
  SOUTH_AMERICA_EUROPE_7_NEIGHBOURS_3: {
    text:
      'Ocupar América del Sur, 7 países de Europa y 3 países limítrofes entre sí en cualquier lugar del mapa.',
    neighbours: 3,
    continents: [
      { id: ContinentTypes.SOUTH_AMERICA, countries: 6 },
      { id: ContinentTypes.EUROPE, countries: 7 },
    ],
  },
  ASIA_SOUTH_AMERICA_2: {
    text: 'Ocupar Asia y 2 países de América del Sur.',
    continents: [
      { id: ContinentTypes.ASIA, countries: 15 },
      { id: ContinentTypes.SOUTH_AMERICA, countries: 2 },
    ],
  },
  EUROPE_ASIA_4_SOUTH_AMERICA_2: {
    text: 'Ocupar Europa, 4 países de Asia y 2 países de América del Sur.',
    continents: [
      { id: ContinentTypes.EUROPE, countries: 9 },
      { id: ContinentTypes.ASIA, countries: 4 },
      { id: ContinentTypes.SOUTH_AMERICA, countries: 2 },
    ],
  },
  NORTH_AMERICA_OCEANIA_2_ASIA_4: {
    text: 'Ocupar América del Norte, 2 países de Oceanía y 4 de Asia.',
    continents: [
      { id: ContinentTypes.NORTH_AMERICA, countries: 10 },
      { id: ContinentTypes.OCEANIA, countries: 2 },
      { id: ContinentTypes.ASIA, countries: 4 },
    ],
  },
  OCEANIA_2_AFRICA_2_SOUTH_AMERICA_2_EUROPE_3_NORTH_AMERICA_4_ASIA_3: {
    text:
      'Ocupar 2 países de Oceanía, 2 países de África, 2 países de América del Sur, 3 países de Europa, 4 de América del Norte y 3 de Asia.',
    continents: [
      { id: ContinentTypes.OCEANIA, countries: 2 },
      { id: ContinentTypes.AFRICA, countries: 2 },
      { id: ContinentTypes.SOUTH_AMERICA, countries: 2 },
      { id: ContinentTypes.EUROPE, countries: 3 },
      { id: ContinentTypes.NORTH_AMERICA, countries: 4 },
      { id: ContinentTypes.ASIA, countries: 3 },
    ],
  },
  OCEANIA_NORTH_AMERICA_EUROPE_2: {
    text: 'Ocupar Oceanía, América del Norte y 2 países de Europa.',
    continents: [
      { id: ContinentTypes.NORTH_AMERICA, countries: 10 },
      { id: ContinentTypes.OCEANIA, countries: 4 },
      { id: ContinentTypes.EUROPE, countries: 2 },
    ],
  },
  SOUTH_AMERICA_AFRICA_ASIA_4: {
    text: 'Ocupar América del Sur, África y 4 países de Asia.',
    continents: [
      { id: ContinentTypes.SOUTH_AMERICA, countries: 6 },
      { id: ContinentTypes.AFRICA, countries: 6 },
      { id: ContinentTypes.ASIA, countries: 4 },
    ],
  },
  OCEANIA_AFRICA_NORTH_AMERICA_5: {
    text: 'Ocupar Oceanía, África y 5 países de América del Norte.',
    continents: [
      { id: ContinentTypes.NORTH_AMERICA, countries: 5 },
      { id: ContinentTypes.OCEANIA, countries: 4 },
      { id: ContinentTypes.AFRICA, countries: 6 },
    ],
  },
  DESTROY_BLUE: {
    text:
      'Destruir el ejército azul, de ser imposible al jugador de la derecha.',
    destroy: PlayerTypes.BLUE,
  },
  DESTROY_RED: {
    text:
      'Destruir al ejército rojo, de ser imposible al jugador de la derecha.',
    destroy: PlayerTypes.RED,
  },
  DESTROY_BLACK: {
    text:
      'Destruir al ejército negro, de ser imposible al jugador de la derecha.',
    destroy: PlayerTypes.BLACK,
  },
  DESTROY_YELLOW: {
    text:
      'Destruir al ejército amarillo, de ser imposible al jugador de la derecha.',
    destroy: PlayerTypes.YELLOW,
  },
  DESTROY_GREEN: {
    text:
      'Destruir al ejército verde, de ser imposible al jugador de la derecha.',
    destroy: PlayerTypes.GREEN,
  },
  DESTROY_PINK: {
    text:
      'Destruir al ejército magenta, de ser imposible al jugador de la derecha.',
    destroy: PlayerTypes.PINK,
  },
};

const CONQUERED_COUNTRIES_TO_WIN = 30;

class MissionService {
  public static getAllMissions(): {[key: string]: Mission} {
    return Missions;
  }

  public static getRandomMissions(missionCount: number): Mission[] {
    const shuffledMissionKeys = _.shuffle(Object.keys(Missions));
    const missions = [];
    let count = missionCount;

    while (count) {
      count -= 1;
      missions.push(Missions[shuffledMissionKeys[count]]);
    }

    return missions;
  }

  public static missionCompleted(mission: Mission, countries: Country[]): boolean {
    if (!mission || !countries || countries.length === 0) {
      return false;
    }

    // If conqueres countries === 30 then mission completed
    if (countries.length >= CONQUERED_COUNTRIES_TO_WIN) {
      return true;
    }

    const countriesPerContinent = MissionService.getConqueredCountriesByContinent(
      countries,
    );

    if (mission.destroy) {
      // Destroy mission
      return false;
    }

    let hasNeighbours;
    let allCountriesConquered = false;
    const penaltyArray = [];

    if (mission.neighbours) {
      // Count neighbours
      const commonNeighbours = MissionService.commonNeighbours(countries, mission.neighbours);

      // This is hard-coded as there is only one 'Neigbours' mission
      // Check that the neigbhours are not in south america or europe
      // commonNeighbours.forEach((neighbours) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const neighbours of commonNeighbours) {
        if (Country.getContinentByCountryKey(neighbours[0]) !== 'SOUTH_AMERICA'
          && Country.getContinentByCountryKey(neighbours[0]) !== 'EUROPE'
          && Country.getContinentByCountryKey(neighbours[1]) !== 'EUROPE'
          && Country.getContinentByCountryKey(neighbours[2]) !== 'EUROPE') {
          // Check we have some group that is not south america or europe
          hasNeighbours = true;
          // Clear array
          penaltyArray.length = 0;
          break;
        } else if (Country.getContinentByCountryKey(neighbours[0]) === 'EUROPE'
          || Country.getContinentByCountryKey(neighbours[1]) === 'EUROPE'
          || Country.getContinentByCountryKey(neighbours[2]) === 'EUROPE') {
          // If we only have europe we need to substract those countries from total
          let penalty = 0;

          if (Country.getContinentByCountryKey(neighbours[0]) === 'EUROPE') {
            penalty += 1;
          }

          if (Country.getContinentByCountryKey(neighbours[1]) === 'EUROPE') {
            penalty += 1;
          }

          if (Country.getContinentByCountryKey(neighbours[2]) === 'EUROPE') {
            penalty += 1;
          }

          hasNeighbours = true;

          penaltyArray.push(penalty);
        }
      }

      // Sort by substract value
      if (penaltyArray.length) {
        _.sortBy(penaltyArray);
      }
    } else {
      // We don't need this so set to true
      hasNeighbours = true;
    }

    if (mission.continents && mission.continents.length > 0) {
      allCountriesConquered = mission.continents.every((continent) => {
        let continentCount = continent.countries;

        if (continent.id === 'EUROPE' && mission.neighbours && penaltyArray.length) {
          continentCount += penaltyArray[0];
        }

        if (countriesPerContinent[continent.id] < continentCount) {
          return false;
        }
        return true;
      });
    }

    return hasNeighbours && allCountriesConquered;
  }

  public static commonNeighbours(countries: Country[], count: number): string[] {
    // Should have at least 'count' countries
    if (countries.length < count) {
      return [];
    }

    const response = [];

    // List of countries
    for (let i = 0; i < countries.length; i += 1) {
      const firstLevelNeighbours = countries[i].getNeighbours();

      // First level neighbours
      for (let j = 0; j < firstLevelNeighbours.length; j += 1) {
        if (_.find(countries, (obj: Country) => obj.countryKey === firstLevelNeighbours[j])) {
        // if (firstLevelNeighbours[j] === countries[1].countryKey) {
          const secondLevelNeighbours = Country.getNeighboursByCountryKey(firstLevelNeighbours[j]);

          // Second level neighbours
          for (let k = 0; k < secondLevelNeighbours.length; k += 1) {
            if (countries[i].countryKey !== secondLevelNeighbours[k]
                  && _.find(countries, (obj) => obj.countryKey === secondLevelNeighbours[k])) {
              const thirdLevelNeighbours = Country.getNeighboursByCountryKey(
                secondLevelNeighbours[k],
              );

              // Third level neighbours
              for (let l = 0; l < thirdLevelNeighbours.length; l += 1) {
                if (firstLevelNeighbours[j] !== thirdLevelNeighbours[l]
                    && thirdLevelNeighbours[l] === countries[i].countryKey) {
                  // Add to response array
                  response.push(_.sortBy([
                    firstLevelNeighbours[j],
                    secondLevelNeighbours[k],
                    thirdLevelNeighbours[l],
                  ]));
                }
              }
            }
          }
        }
      }
    }

    // Return unique values only
    return _.uniqWith(response, _.isEqual);
  }

  public static getConqueredCountriesByContinent(countries: Country[]): { [key: string]: number } {
    const countriesPerContinent: { [key: string]: number } = {};
    const continentKeys = Object.keys(ContinentTypes);

    // Initialize counters
    continentKeys.forEach((key: string) => {
      countriesPerContinent[key] = 0;
    });

    countries.forEach((country) => {
      countriesPerContinent[country.getContinent()] += 1;
    });

    return countriesPerContinent;
  }
}

export default MissionService;
