import _ from 'lodash';
import DealService from '../DealService';

describe('deal service', () => {
    it('can deal countries and missions to 2 players', async () => {
        expect.hasAssertions();

        const players = [
            { id: '1', name: 'player 1', color: 'black' },
            { id: '2', name: 'player 2', color: 'blue' },
        ];

        const countriesAndMissions = DealService.dealCountriesAndMissions(players);

        const country = _.find(countriesAndMissions.countries, { countryKey: 'INDIA' });

        expect(country.state.troops).toBe(1);
    // expect(countriesAndMissions.missions).toHaveLength(players.length);
    });
});
