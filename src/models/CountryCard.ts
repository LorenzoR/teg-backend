const CountriesRaw = {
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

const CardType = {
  SHIP: 'ship',
  CANNON: 'cannon',
  BALLOON: 'balloon',
  WILDCARD: 'wildcard',
};

const COUNTRY_CARDS = [
  // Ships
  { country: CountriesRaw.MADAGASCAR, type: CardType.SHIP }, // 0
  { country: CountriesRaw.BORNEO, type: CardType.SHIP },
  { country: CountriesRaw.ISRAEL, type: CardType.SHIP },
  { country: CountriesRaw.PERU, type: CardType.SHIP },
  { country: CountriesRaw.ZAIRE, type: CardType.SHIP },
  { country: CountriesRaw.ICELAND, type: CardType.SHIP },
  { country: CountriesRaw.ALASKA, type: CardType.SHIP },
  { country: CountriesRaw.BRASIL, type: CardType.SHIP },
  { country: CountriesRaw.SIBERIA, type: CardType.SHIP },
  { country: CountriesRaw.GERMANY, type: CardType.SHIP },
  { country: CountriesRaw.TURKEY, type: CardType.SHIP },
  { country: CountriesRaw.UK, type: CardType.SHIP },
  { country: CountriesRaw.MONGOLIA, type: CardType.SHIP },
  { country: CountriesRaw.CHINA, type: CardType.SHIP },
  { country: CountriesRaw.SWEDEN, type: CardType.SHIP },
  { country: CountriesRaw.NEW_YORK, type: CardType.SHIP },
  // Cannons
  { country: CountriesRaw.ARABIA, type: CardType.CANNON }, // 16
  { country: CountriesRaw.MEXICO, type: CardType.CANNON },
  { country: CountriesRaw.CALIFORNIA, type: CardType.CANNON },
  { country: CountriesRaw.CANADA, type: CardType.CANNON },
  { country: CountriesRaw.ARAL, type: CardType.CANNON },
  { country: CountriesRaw.JAPAN, type: CardType.CANNON },
  { country: CountriesRaw.TERRANOVA, type: CardType.CANNON },
  { country: CountriesRaw.SOUTH_AFRICA, type: CardType.CANNON },
  { country: CountriesRaw.SAHARA, type: CardType.CANNON },
  { country: CountriesRaw.OREGON, type: CardType.CANNON },
  { country: CountriesRaw.AUSTRALIA, type: CardType.CANNON },
  { country: CountriesRaw.LABRADOR, type: CardType.CANNON },
  { country: CountriesRaw.MALASIA, type: CardType.CANNON },
  { country: CountriesRaw.POLAND, type: CardType.CANNON },
  { country: CountriesRaw.TARTARIA, type: CardType.CANNON },
  { country: CountriesRaw.JAVA, type: CardType.CANNON },
  // Balloons
  { country: CountriesRaw.SPAIN, type: CardType.BALLOON }, // 32
  { country: CountriesRaw.GREENLAND, type: CardType.BALLOON },
  { country: CountriesRaw.INDIA, type: CardType.BALLOON },
  { country: CountriesRaw.RUSIA, type: CardType.BALLOON },
  { country: CountriesRaw.YUKON, type: CardType.BALLOON },
  { country: CountriesRaw.EGYPT, type: CardType.BALLOON },
  { country: CountriesRaw.KAMCHATKA, type: CardType.BALLOON },
  { country: CountriesRaw.ETHIOPIA, type: CardType.BALLOON },
  { country: CountriesRaw.IRAN, type: CardType.BALLOON },
  { country: CountriesRaw.URUGUAY, type: CardType.BALLOON },
  { country: CountriesRaw.ITALY, type: CardType.BALLOON },
  { country: CountriesRaw.CHILE, type: CardType.BALLOON },
  { country: CountriesRaw.GOBI, type: CardType.BALLOON },
  { country: CountriesRaw.FRANCE, type: CardType.BALLOON },
  { country: CountriesRaw.SUMATRA, type: CardType.BALLOON },
  { country: CountriesRaw.COLOMBIA, type: CardType.BALLOON },
  // Wildcards
  { country: CountriesRaw.ARGENTINA, type: CardType.WILDCARD }, // 48
  { country: CountriesRaw.TAIMIR, type: CardType.WILDCARD },
];

export interface CountryCardType {
  country: string;
  type: string;
  exchanged?: boolean;
}

const CardsForExchange = {
  MIN: 3,
  MAX: 5,
};

class CountryCard {
  public static getAllCards(): CountryCardType [] {
    return COUNTRY_CARDS;
  }

  public static playerCanExchangeCards(cards: CountryCardType[]): boolean {
    if (!cards || cards.length < CardsForExchange.MIN) {
      return false;
    }

    /*
    if (cards.length === CardsForExchange.MAX) {
      return true;
    }
    */

    const qtyPerType = [0, 0, 0, 0];

    cards.forEach((card) => {
      if (card.type === CardType.BALLOON) {
        qtyPerType[0] += 1;
      } else if (card.type === CardType.CANNON) {
        qtyPerType[1] += 1;
      } else if (card.type === CardType.SHIP) {
        qtyPerType[2] += 1;
      } else {
        // Wildcard
        qtyPerType[3] += 1;
      }
    });

    let sum = 0;

    qtyPerType.forEach((elem, index) => {
      if (elem >= 3) {
        sum = elem;
      } else if (elem > 0 && index < 3) {
        sum += 1;
      } else if (index === 3 && elem) {
        // Wildcards
        sum += 3;
      }
    });

    // Count if there are 3 with same type or 3 with one type each
    return sum >= 3;
  }
}

export default CountryCard;
