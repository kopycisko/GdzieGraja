import { Artist } from "../types";

export const initialArtists: Artist[] = [
  {
    id: "marcin-wasilewski-trio",
    name: "Marcin Wasilewski Trio",
    genres: ["Modern Jazz", "Acoustic Jazz"],
    aliases: ["Wasilewski Trio", "Simple Acoustic Trio"],
    members: ["Marcin Wasilewski", "Sławomir Kurkiewicz", "Michał Miśkiewicz"],
    description: "Jeden z najwybitniejszych europejskich zespołów jazzowych swojego pokolenia, od lat nagrywający dla prestiżowej wytwórni ECM Records. Łączą niesamowitą tradycję jazzową z nowoczesnym, niezwykle lirycznym brzmieniem.",
    website: "https://www.marcinwasilewskitrio.com",
    spotify: "https://open.spotify.com/artist/2K1zAtjYp1g5311QOnD6bS"
  },
  {
    id: "leszek-mozdzer",
    name: "Leszek Możdżer",
    genres: ["Improvised Piano", "Contemporary Jazz", "Classical Crossover"],
    aliases: ["Mozdzer", "Leszek Mozdzer"],
    members: ["Leszek Możdżer"],
    description: "Wybitny polski pianista jazzowy, kompozytor i producent muzyczny. Jeden z najpopularniejszych i najbardziej cenionych muzyków jazzowych w Polsce, znany z unikalnego stylu i interpretacji muzyki klasycznej (w tym Chopina) w duchu jazzowej improwizacji.",
    website: "https://mozdzer.com",
    spotify: "https://open.spotify.com/artist/5X8XG5LgR31nAn99S7P8vW"
  },
  {
    id: "piotr-wojtasik",
    name: "Piotr Wojtasik",
    genres: ["Hard-bop", "Modal Jazz"],
    aliases: ["Wojtasik", "Piotr Wojtasik Quintet"],
    members: ["Piotr Wojtasik", "Marcin Kaletka", "Michał Barański", "Kazimierz Jonkisz"],
    description: "Znakomity polski trębacz i kompozytor, jedna z najważniejszych postaci polskiej sceny jazzowej. Wykładowca akademicki, lider licznych projektów, który od lat zachwyca głębokim, tradycyjnym brzmieniem trąbki zakorzenionym w duchu hard-bopu i modalnego jazzu.",
    website: "http://www.piotrwojtasik.com",
    spotify: "https://open.spotify.com/artist/7rQ6hF40y01zK8H0S691B6"
  },
  {
    id: "rura-jazz-collective",
    name: "Rura Jazz Collective",
    genres: ["Fusion", "Club Jazz", "Nu-Jazz"],
    aliases: ["Rura Collective", "Młodzieżowa Scena Rury"],
    members: ["Tomasz Pruchnicki", "Kajetan Galas", "Jakub Miarczyński"],
    description: "Wrocławski kolektyw jazzowy powiązany z legendarnym klubem Rura. Ich muzyka to energetyczna mieszanka fusion, nu-jazzu oraz tradycyjnej klubowej improwizacji, stanowiąca wizytówkę nowej fali wrocławskiego jazzu.",
    website: "https://rurajazz.pl",
    spotify: undefined
  }
];
