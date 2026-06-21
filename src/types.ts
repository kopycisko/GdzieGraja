/**
 * Typy danych dla aplikacji GdzieGrają - Jazz Wrocław
 */

export interface Artist {
  id: string; // unikalny identyfikator (np. "marcin-wasilewski-trio")
  name: string; // standardowa nazwa zespołu/artysty
  genres: string[]; // tablica gatunków (np. ["Modern Jazz", "Jazz Fusion"])
  aliases: string[]; // inne nazwy służące do dopasowania (np. ["Wasilewski Trio"])
  members: string[]; // członkowie zespołu do weryfikacji i dopasowania personalnego
  description: string; // krótka biografia
  website?: string; // link do oficjalnej strony
  spotify?: string; // link do Spotify
}

export interface Concert {
  id: string; // unikalny ID wydarzenia (np. "2026-06-25-vertigo-marcin-wasilewski")
  artistIds: string[]; // tablica kluczy obcych do bazy artystów. Nie dodajemy koncertów, których nie znamy (pusta tablica oznacza brak dodania).
  rawArtistName: string; // nazwa wyciągnięta ze strony (np. "Trio Marcina Wasilewskiego (live)")
  title?: string; // opcjonalny własny tytuł koncertu
  venue: string; // miejsce (np. "Vertigo Jazz Club", "Narodowe Forum Muzyki", "Mleczarnia")
  date: string; // format YYYY-MM-DD
  time: string; // format HH:MM
  price: string; // cena biletów (np. "50 PLN", "Wstęp wolny")
  ticketUrl: string; // link do biletów / wydarzenia pyszne
  sourceUrl: string; // skąd pobrano informację
  scrapedAt: string; // data i godzina scrapowania
}

export interface ScrapedEventRaw {
  rawTitle: string; // cały oryginalny tytuł
  rawDate: string; // np. "20 czerwca 2026" lub "20-06-2026"
  rawVenue: string; // np. "Vertigo" lub "ul. Oławska 13"
  sourceUrl: string;
}
