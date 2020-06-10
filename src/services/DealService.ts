import _ from 'lodash';

import { Player } from '../models/Player';

import CountryService from './CountryService';
import MissionService from './MissionService';
import CountryCard from '../models/CountryCard';

class DealService {
  public static dealCountriesAndMissions(playersParam: Player[]): { countries: any; players: any} {
    const players = _.shuffle([...playersParam]); // Shuffle players order
    const numberOfPlayers = players.length;
    const countryKeys = CountryService.getAllCountries();
    const randomCountryKeys = _.shuffle(Object.keys(countryKeys));
    const countries = { };
    let counter = 0;

    randomCountryKeys.forEach((countryKey) => {
      const country = {
        countryKey,
        name: countryKeys[countryKey], // CountriesList[continentKey].countries[countryKey],
        // continent: CountryService.getContinent(countryKey),
        state: {
          player: players[counter % numberOfPlayers],
          troops: 1,
          newTroops: 0, // To keep track of troops added during ADD_TROOPS round
        },
      };

      countries[countryKey] = country;

      counter += 1;
    });

    // Deal missions
    const missions = MissionService.getRandomMissions(players.length);

    missions.forEach((mission, index) => {
      players[index].mission = mission;
    });

    // Game started
    // const activity = [
    //  {
    //    type: 'green',
    //    time: moment().format('HH:mm:ss'),
    //    text: 'Game started',
    //  },
    // ];

    // this.setState({ countries, players, activity });
    return {
      countries,
      players,
    };
  }

  public static dealCountryCards(): [] {
    return _.shuffle(CountryCard.getAllCards());
  }
}

export default DealService;
