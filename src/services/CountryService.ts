import { ContinentTypes } from '../models/Continent';

const CountryType = {
    // North America
    CANADA: 'CANADA',
    YUKON: 'YUKON',
    OREGON: 'OREGON',
    NEW_YORK: 'NEW_YORK',
    ALASKA: 'ALASKA',
    MEXICO: 'MEXICO',
    CALIFORNIA: 'CALIFORNIA',
    GREENLAND: 'GREENLAND',
    TERRANOVA: 'TERRANOVA',
    LABRADOR: 'LABRADOR',
    // South America
    COLOMBIA: 'COLOMBIA',
    PERU: 'PERU',
    BRASIL: 'BRASIL',
    ARGENTINA: 'ARGENTINA',
    CHILE: 'CHILE',
    URUGUAY: 'URUGUAY',
    // Oceania
    AUSTRALIA: 'AUSTRALIA',
    JAVA: 'JAVA',
    SUMATRA: 'SUMATRA',
    BORNEO: 'BORNEO',
    // Africa
    SAHARA: 'SAHARA',
    SOUTH_AFRICA: 'SOUTH_AFRICA',
    MADAGASCAR: 'MADAGASCAR',
    ZAIRE: 'ZAIRE',
    ETHIOPIA: 'ETHIOPIA',
    EGYPT: 'EGYPT',
    // Europe
    ICELAND: 'ICELAND',
    UK: 'UK',
    SPAIN: 'SPAIN',
    ITALY: 'ITALY',
    FRANCE: 'FRANCE',
    GERMANY: 'GERMANY',
    POLAND: 'POLAND',
    RUSIA: 'RUSIA',
    SWEDEN: 'SWEDEN',
    // Asia
    ARAL: 'ARAL',
    TARTARIA: 'TARTARIA',
    TAIMIR: 'TAIMIR',
    SIBERIA: 'SIBERIA',
    KAMCHATKA: 'KAMCHATKA',
    JAPAN: 'JAPAN',
    MONGOLIA: 'MONGOLIA',
    IRAN: 'IRAN',
    GOBI: 'GOBI',
    CHINA: 'CHINA',
    MALASIA: 'MALASIA',
    INDIA: 'INDIA',
    TURKEY: 'TURKEY',
    ISRAEL: 'ISRAEL',
    ARABIA: 'ARABIA',
};

const Countries = [
    // North America
    {
        id: CountryType.CANADA,
        name: 'Canada',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.YUKON,
        name: 'Yukon',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.OREGON,
        name: 'Oregon',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.NEW_YORK,
        name: 'Nueva York',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.ALASKA,
        name: 'Alaska',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.MEXICO,
        name: 'Mexico',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.CALIFORNIA,
        name: 'California',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.GREENLAND,
        name: 'Greenland',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.TERRANOVA,
        name: 'Terranova',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    {
        id: CountryType.LABRADOR,
        name: 'Labrador',
        continent: ContinentTypes.NORTH_AMERICA,
    },
    // South America
    {
        id: CountryType.COLOMBIA,
        name: 'Colombia',
        continent: ContinentTypes.SOUTH_AMERICA,
    },
    {
        id: CountryType.PERU,
        name: 'Peru',
        continent: ContinentTypes.SOUTH_AMERICA,
    },
    {
        id: CountryType.BRASIL,
        name: 'Brasil',
        continent: ContinentTypes.SOUTH_AMERICA,
    },
    {
        id: CountryType.ARGENTINA,
        name: 'Argentina',
        continent: ContinentTypes.SOUTH_AMERICA,
    },
    {
        id: CountryType.CHILE,
        name: 'Chile',
        continent: ContinentTypes.SOUTH_AMERICA,
    },
    {
        id: CountryType.URUGUAY,
        name: 'Uruguay',
        continent: ContinentTypes.SOUTH_AMERICA,
    },
    // Oceania
    {
        id: CountryType.AUSTRALIA,
        name: 'Australia',
        continent: ContinentTypes.OCEANIA,
    },
    { id: CountryType.JAVA, name: 'Java', continent: ContinentTypes.OCEANIA },
    {
        id: CountryType.SUMATRA,
        name: 'Sumatra',
        continent: ContinentTypes.OCEANIA,
    },
    {
        id: CountryType.BORNEO,
        name: 'Borneo',
        continent: ContinentTypes.OCEANIA,
    },
    // Africa
    { id: CountryType.SAHARA, name: 'Sahara', continent: ContinentTypes.AFRICA },
    {
        id: CountryType.SOUTH_AFRICA,
        name: 'Sudafrica',
        continent: ContinentTypes.AFRICA,
    },
    {
        id: CountryType.MADAGASCAR,
        name: 'Madagascar',
        continent: ContinentTypes.AFRICA,
    },
    { id: CountryType.ZAIRE, name: 'Zaire', continent: ContinentTypes.AFRICA },
    {
        id: CountryType.ETHIOPIA,
        name: 'Etiopia',
        continent: ContinentTypes.AFRICA,
    },
    { id: CountryType.EGYPT, name: 'Egipto', continent: ContinentTypes.AFRICA },
    // Europe
    {
        id: CountryType.ICELAND,
        name: 'Islandia',
        continent: ContinentTypes.EUROPE,
    },
    {
        id: CountryType.UK,
        name: 'Gran Bretania',
        continent: ContinentTypes.EUROPE,
    },
    { id: CountryType.SPAIN, name: 'Espania', continent: ContinentTypes.EUROPE },
    { id: CountryType.ITALY, name: 'Italia', continent: ContinentTypes.EUROPE },
    {
        id: CountryType.FRANCE,
        name: 'Francia',
        continent: ContinentTypes.EUROPE,
    },
    {
        id: CountryType.GERMANY,
        name: 'Alemania',
        continent: ContinentTypes.EUROPE,
    },
    {
        id: CountryType.POLAND,
        name: 'Polonia',
        continent: ContinentTypes.EUROPE,
    },
    { id: CountryType.RUSIA, name: 'Rusia', continent: ContinentTypes.EUROPE },
    { id: CountryType.SWEDEN, name: 'Suecia', continent: ContinentTypes.EUROPE },
    // Asia
    { id: CountryType.ARAL, name: 'Aral', continent: ContinentTypes.ASIA },
    {
        id: CountryType.TARTARIA,
        name: 'Tartaria',
        continent: ContinentTypes.ASIA,
    },
    { id: CountryType.TAIMIR, name: 'Taimir', continent: ContinentTypes.ASIA },
    { id: CountryType.SIBERIA, name: 'Siberia', continent: ContinentTypes.ASIA },
    {
        id: CountryType.KAMCHATKA,
        name: 'Kamchatka',
        continent: ContinentTypes.ASIA,
    },
    { id: CountryType.JAPAN, name: 'Japon', continent: ContinentTypes.ASIA },
    {
        id: CountryType.MONGOLIA,
        name: 'Mongolia',
        continent: ContinentTypes.ASIA,
    },
    { id: CountryType.IRAN, name: 'Iran', continent: ContinentTypes.ASIA },
    { id: CountryType.GOBI, name: 'Gobi', continent: ContinentTypes.ASIA },
    { id: CountryType.CHINA, name: 'China', continent: ContinentTypes.ASIA },
    { id: CountryType.MALASIA, name: 'Malasia', continent: ContinentTypes.ASIA },
    { id: CountryType.INDIA, name: 'India', continent: ContinentTypes.ASIA },
    { id: CountryType.TURKEY, name: 'Turquia', continent: ContinentTypes.ASIA },
    { id: CountryType.ISRAEL, name: 'Israel', continent: ContinentTypes.ASIA },
    { id: CountryType.ARABIA, name: 'Arabia', continent: ContinentTypes.ASIA },
];

class CountryService {
    public static getAllCountries(): {[key: string]: string} {
        return CountryType;
    }

    public static getAllCountriesData(): { id: string; name: string; continent: string; }[] {
        return Countries;
    }
}

export default CountryService;
