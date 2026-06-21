import { Artist } from "../types";

/**
 * Prosty i skuteczny algorytm podobieństwa tekstów do celów demonstracyjnych i dopasowywania.
 * Oblicza odległość Levenshteina i zwraca współczynnik podobieństwa w % (0-100).
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();

  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;

  // Prosty test zawierania wyrazów dla lepszych rezultatów w dopasowaniu nazwisk
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  
  let matchCount = 0;
  wordsA.forEach(w => {
    if (w.length > 2 && b.includes(w)) matchCount++;
  });
  
  const wordOverlapPercent = (matchCount / Math.max(wordsA.length, 1)) * 100;

  // Obliczanie standardowej odległości Levenshteina
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // zamiana
          matrix[i][j - 1] + 1,     // wstawienie
          matrix[i - 1][j] + 1      // usunięcie
        );
      }
    }
  }

  const levDistance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  const levSimilarity = ((maxLen - levDistance) / maxLen) * 100;

  // Zwróć wyższą wartość ze sprytnych ułatwień wyrazowych lub odległości edycyjnej
  return Math.round(Math.max(levSimilarity, wordOverlapPercent));
}

export interface MatchResult {
  matchedArtist: Artist | null;
  score: number;
  matchType: "exact_name" | "alias" | "member_match" | "fuzzy" | "none";
  matchedCriteria: string;
}

export interface MatchDetails {
  artist: Artist;
  score: number;
  matchType: "exact_name" | "alias" | "member_match" | "fuzzy";
  matchedCriteria: string;
}

/**
 * Automatyczny dopasowywacz obsługujący wielu wykonawców jednocześnie.
 * Sprawdza każdego artystę w słowniku i wyciąga wszystkich sparowanych.
 */
export function matchScrapedEventMultipleDetails(rawTitle: string, rawArtist: string, artists: Artist[]): MatchDetails[] {
  const textToTest = (rawArtist || rawTitle).toLowerCase().trim();
  const results: MatchDetails[] = [];

  for (const artist of artists) {
    // 1. Sprawdź dokładną zgodność nazwy lub zawieranie
    if (textToTest === artist.name.toLowerCase().trim() || textToTest.includes(artist.name.toLowerCase().trim())) {
      results.push({
        artist,
        score: 100,
        matchType: "exact_name",
        matchedCriteria: artist.name
      });
      continue;
    }

    // 2. Sprawdź aliasy artysty
    let aliasMatched = false;
    for (const alias of artist.aliases) {
      const aliasClean = alias.toLowerCase().trim();
      if (textToTest.includes(aliasClean) || aliasClean.includes(textToTest)) {
        results.push({
          artist,
          score: 95,
          matchType: "alias",
          matchedCriteria: alias
        });
        aliasMatched = true;
        break;
      }
    }
    if (aliasMatched) continue;

    // 3. Sprawdź członków zespołu
    let memberMatched = false;
    for (const member of artist.members) {
      const memberClean = member.toLowerCase().trim();
      if (textToTest.includes(memberClean)) {
        results.push({
          artist,
          score: 85,
          matchType: "member_match",
          matchedCriteria: member
        });
        memberMatched = true;
        break;
      }
    }
    if (memberMatched) continue;

    // 4. Dopasowanie rozmyte
    let bestScore = 0;
    let bestCriteria = "";
    
    const nameScore = calculateSimilarity(textToTest, artist.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestCriteria = artist.name;
    }

    for (const alias of artist.aliases) {
      const aliasScore = calculateSimilarity(textToTest, alias);
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestCriteria = alias;
      }
    }

    if (bestScore >= 45) {
      results.push({
        artist,
        score: bestScore,
        matchType: "fuzzy",
        matchedCriteria: bestCriteria
      });
    }
  }

  return results;
}

/**
 * Zgodny wstecznie jednopunktowy dopasowywacz zwracający najlepsze trafienie.
 */
export function matchScrapedEvent(rawTitle: string, rawArtist: string, artists: Artist[]): MatchResult {
  const multiple = matchScrapedEventMultipleDetails(rawTitle, rawArtist, artists);
  if (multiple.length > 0) {
    const best = [...multiple].sort((a, b) => b.score - a.score)[0];
    return {
      matchedArtist: best.artist,
      score: best.score,
      matchType: best.matchType,
      matchedCriteria: best.matchedCriteria
    };
  }

  return {
    matchedArtist: null,
    score: 0,
    matchType: "none",
    matchedCriteria: ""
  };
}
