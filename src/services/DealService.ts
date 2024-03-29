import _ from 'lodash';

import Player from '../models/Player';
import Country from '../models/Country';

import CountryService from './CountryService';
import MissionService from './MissionService';
import CountryCard, { CountryCardType } from '../models/CountryCard';

class DealService {
    public static dealCountriesAndMissions(playersParam: Player[]): { countries: Country[]; players: Player[]} {
        const players = _.shuffle([...playersParam]); // Shuffle players order
        const numberOfPlayers = players.length;
        const countryKeys = CountryService.getAllCountries();
        const randomCountryKeys = _.shuffle(Object.keys(countryKeys));
        const countries: Country[] = [];
        let counter = 0;

        randomCountryKeys.forEach((countryKey) => {
            const countryAttributes = {
                countryKey,
                name: countryKeys[countryKey], // CountriesList[continentKey].countries[countryKey],
                // continent: CountryService.getContinent(countryKey),
                state: {
                    player: { color: players[counter % numberOfPlayers].color },
                    troops: 1,
                    newTroops: 0, // To keep track of troops added during ADD_TROOPS round
                },
            };

            const country = Object.assign(new Country(), countryAttributes);

            countries.push(country);

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

    public static dealCountryCards(): CountryCardType[] {
        return _.shuffle(CountryCard.getAllCards());
    }
}

export default DealService;
