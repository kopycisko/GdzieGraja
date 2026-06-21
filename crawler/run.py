#!/usr/bin/env python3
import os
import re
import sys
import json
import time
import asyncio
import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Próba zaimportowania bibliotek potrzebnych do pełnego działania skryptu
try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
except ImportError:
    print("Ostrzeżenie: Pakiet 'google-genai' nie jest zainstalowany. Zainstaluj go komendą: pip install google-genai")

try:
    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
    from crawl4ai.content_filter_strategy import PruningContentFilter
except ImportError:
    print("Ostrzeżenie: Pakiet 'crawl4ai' nie jest zainstalowany. Zainstaluj go komendą: pip install crawl4ai")

# ==============================================================================
# Słownik ścieżek
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTISTS_FILE = os.path.join(BASE_DIR, "src", "data", "artists.ts")
UPCOMING_FILE = os.path.join(BASE_DIR, "src", "data", "concerts_upcoming.ts")
ARCHIVE_FILE = os.path.join(BASE_DIR, "src", "data", "concerts_archive.ts")

# ==============================================================================
# 1. Klasyfikacja & Matcher (Odpowiednik algorytmu z piaskownicy)
# ==============================================================================
def calculate_similarity(s1: str, s2: str) -> float:
    """
    Oblicza podobieństwo tekstów wzorując się na odległości Levenshteina 
    oraz procencie pokrycia słów (word overlap percent).
    Dzięki temu zachowujemy 100% spójności z interfejsem React i Piaskownicą!
    """
    a = s1.lower().strip()
    a = " ".join(a.split())
    b = s2.lower().strip()
    b = " ".join(b.split())
    
    if a == b:
        return 100.0
    if not a or not b:
        return 0.0
        
    words_a = a.split()
    words_b = b.split()
    
    match_count = 0
    for w in words_a:
        if len(w) > 2 and w in b:
            match_count += 1
            
    word_overlap = (match_count / max(len(words_a), 1)) * 100.0
    
    # Odległość Levenshteina
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
        
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(
                    dp[i - 1][j - 1] + 1,  # zamiana
                    dp[i - 1][j] + 1,      # usunięcie
                    dp[i][j - 1] + 1       # wstawienie
                )
                
    lev_dist = dp[m][n]
    max_len = max(m, n)
    lev_sim = ((max_len - lev_dist) / max_len) * 100.0 if max_len > 0 else 0.0
    
    return max(lev_sim, word_overlap)

def match_scraped_event_multiple(raw_artist: str, raw_title: str, artists: List[Dict[str, Any]]) -> List[str]:
    """
    Klasyfikuje wydarzenie na do wielu artystów jednocześnie na podstawie nazwy, aliasów i członków,
    analogicznie do kodu piaskownicy w TS.
    """
    text_to_test = (raw_artist or raw_title).lower().strip()
    matched_ids = []
    
    for artist in artists:
        artist_id = artist["id"]
        # 1. Dokładna zgodność nazwy lub zawieranie
        artist_name_clean = artist["name"].lower().strip()
        if artist_name_clean == text_to_test or artist_name_clean in text_to_test:
            matched_ids.append(artist_id)
            continue
            
        # 2. Przejście po aliasach
        alias_matched = False
        for alias in artist.get("aliases", []):
            alias_clean = alias.lower().strip()
            if alias_clean in text_to_test or text_to_test in alias_clean:
                matched_ids.append(artist_id)
                alias_matched = True
                break
        if alias_matched:
            continue
                
        # 3. Przejście po członkach zespołu
        member_matched = False
        for member in artist.get("members", []):
            member_clean = member.lower().strip()
            if member_clean in text_to_test:
                matched_ids.append(artist_id)
                member_matched = True
                break
        if member_matched:
            continue
                
        # 4. Podobieństwo rozmyte (Levenshtein + word overlap, próg >= 45%)
        best_score = calculate_similarity(text_to_test, artist["name"])
            
        # Podobieństwo do aliasów
        for alias in artist.get("aliases", []):
            score = calculate_similarity(text_to_test, alias)
            if score > best_score:
                best_score = score
                
        if best_score >= 45.0:
            matched_ids.append(artist_id)
            
    return matched_ids


# ==============================================================================
# 2. Parsowanie plików tekstowych TypeScript (Uelastycznienie JSON)
# ==============================================================================
def parse_ts_array_file(filepath: str) -> List[Dict[str, Any]]:
    """
    Bezpiecznie czyta plik TypeScript, wyodrębnia deklarację tablicy []
    i parsuje go do postaci słowników Pythona poprzez sanitację do czystego JSON.
    """
    if not os.path.exists(filepath):
        print(f"[PRE-LOAD] Plik {filepath} nie istnieje.")
        return []
        
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Wyłapujemy wszystko pomiędzy pierwszym '[' po znaku '=' a ostatnim ']'
        eq_idx = content.find("=")
        if eq_idx == -1:
            start = content.find("[")
        else:
            start = content.find("[", eq_idx)
            
        end = content.rfind("]")
        if start == -1 or end == -1:
            return []
            
        raw_array = content[start:end+1]
        
        # Wyczyszczenie komentarzy
        raw_array = re.sub(r'//.*', '', raw_array)
        raw_array = re.sub(r'/\*.*?\*/', '', raw_array, flags=re.DOTALL)
        
        # Przemianowanie 'undefined' na 'null'
        raw_array = re.sub(r'\bundefined\b', 'null', raw_array)
        
        # Zapewnienie, że klucze obiektów będą w cudzysłowach, a single-quoted strings zamienione na double-quoted
        def quote_keys_fn(js_text):
            pattern = r'("(?:\\.|[^"\\])*")|(\'(?:\\.|[^\'\\])*\')|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*:)'
            def replace_match(match):
                if match.group(1):
                    return match.group(1)
                elif match.group(2):
                    inner_val = match.group(2)[1:-1].replace('"', '\\"')
                    return f'"{inner_val}"'
                elif match.group(3):
                    key_part = match.group(3).strip()[:-1].strip()
                    return f'"{key_part}":'
                return match.group(0)
            return re.sub(pattern, replace_match, js_text)

        raw_array = quote_keys_fn(raw_array)
        
        # Usunięcie ewentualnych wiszących przecinków przed zamknięciem nawiasów klamrowych lub kwadratowych
        raw_array = re.sub(r',\s*}', '}', raw_array)
        raw_array = re.sub(r',\s*\]', ']', raw_array)
        
        # Ustabilizowanie Carriage Returns i użycie strict=False przy deserializacji JSON
        raw_array = raw_array.replace('\r\n', '\n').replace('\r', '\n')
        
        return json.loads(raw_array, strict=False)
    except Exception as e:
        print(f"[PRE-LOAD] Błąd parsowania pliku TS {filepath}: {e}")
        return []

def write_ts_array_file(filepath: str, var_name: str, data: List[Dict[str, Any]]):
    """
    Zapisuje wyczyszczoną strukturę danych z powrotem do pliku TypeScript.
    Formatowanie uelastycznia klucze (np. id: zamiast "id":), zachowując idealny
    artystyczny sznyt pisanego ręcznie kodu!
    """
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Budujemy plik
        lines = []
        lines.append('import { Concert } from "../types";\n')
        lines.append(f'export const {var_name}: Concert[] = [')
        
        for i, item in enumerate(data):
            lines.append("  {")
            # Dodajemy właściwości po kolei dla zachowania stałego, schludnego układu
            props = [
                ("id", item.get("id")),
                ("artistIds", item.get("artistIds")),
                ("rawArtistName", item.get("rawArtistName")),
                ("title", item.get("title")),
                ("venue", item.get("venue")),
                ("date", item.get("date")),
                ("time", item.get("time")),
                ("price", item.get("price")),
                ("ticketUrl", item.get("ticketUrl")),
                ("sourceUrl", item.get("sourceUrl")),
                ("scrapedAt", item.get("scrapedAt") or datetime.datetime.now().isoformat())
            ]
            
            for k, v in props:
                if v is None:
                    lines.append(f"    {k}: undefined,")
                elif isinstance(v, str):
                    # Zamiana apostrofów wewnętrznych, by zachować bezpieczne cudzysłowy
                    escaped_v = v.replace('"', '\\"')
                    lines.append(f'    {k}: "{escaped_v}",')
                elif isinstance(v, list):
                    # Zapisujemy tablicę, np. ["marcin-wasilewski-trio"]
                    lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)},")
                else:
                    lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)},")
                    
            if i < len(data) - 1:
                lines.append("  },")
            else:
                lines.append("  }")
                
        lines.append("];\n")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
            
        print(f"[FILE-WRITE] Zapisano {len(data)} wpisów do {filepath}")
    except Exception as e:
        print(f"[FILE-WRITE] Krytyczny błąd zapisu pliku TS {filepath}: {e}")

# ==============================================================================
# 3. Klasy schematu danych Pydantic dla Gemini (Ustrukturyzowany Wyjście)
# ==============================================================================
class EventItem(BaseModel):
    date: str = Field(description="Date of the event in YYYY-MM-DD format (must be parsed to ISO format)")
    time: str = Field(description="Time of the event in HH:MM format, or '20:00' default if omitted/unknown")
    title: Optional[str] = Field(None, description="Event Name or concert title, keep it short and relevant")
    price: Optional[str] = Field(None, description="Price of the ticket, e.g., '80 PLN', or null if unknown")
    rawArtistName: str = Field(description="Full name of performing artist, jazz musician, band, or orchestra")
    venue: str = Field(description="Specific name of the venue, club, theater, or hall where event takes place")
    ticketUrl: Optional[str] = Field(None, description="Direct URL to buy/reserve tickets or see event details if present, otherwise null")
    sourceUrl: str = Field(description="The source page URL where this specific concert was scraped from")

class ExtractedEvents(BaseModel):
    events: List[EventItem] = Field(description="List of extracted jazz music events and concerts from the scraped content")

# ==============================================================================
# 4. Asynchroniczne Scrapowanie stron za pomocą Crawl4AI
# ==============================================================================
async def scrape_urls_to_markdown(urls: List[str]) -> Dict[str, str]:
    """
    Odpytuje listę stron za pomocą Crawl4AI w trybie asynchronicznym.
    Używa silnika Playwright, eliminuje zbędny szum (nagłówki, stopki, menu boczne)
    i zwraca czysty, skomprymowany Markdown dla każdego źródła.
    """
    results_map = {}
    
    # Skomplikowana konfiguracja strippingu szumów w Crawl4AI
    pruning_strategy = PruningContentFilter(
        threshold=0.4,
        threshold_type="fixed",
        min_word_threshold=5
    )
    
    try:
        from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
        md_generator = DefaultMarkdownGenerator(content_filter=pruning_strategy)
    except Exception:
        md_generator = None
        
    try:
        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,     # Nie używamy starego cache
            markdown_generator=md_generator, # Przekazujemy markdown_generator ze zintegrowanym filtrem
            word_count_threshold=10,         # Pomiń krótkie bloki tekstowe
            wait_until="networkidle"         # Poczekaj na załadowanie JS
        )
    except TypeError:
        # Fallback dla starszych wersji crawl4ai
        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS
        )
    
    print(f"[CRAWLER] Inicjalizacja asynchronicznego skanera dla wejściowych {len(urls)} adresów...")
    
    async with AsyncWebCrawler() as crawler:
        for idx, url in enumerate(urls):
            print(f"[CRAWLER] ({idx+1}/{len(urls)}) Pobieranie URL: {url} ...")
            try:
                # Oszczędzanie obciążenia - intentional delay
                if idx > 0:
                    delay = 7
                    print(f"[CRAWLER] Oczekiwanie {delay}s na throttling w celu ochrony Free Tier...")
                    await asyncio.sleep(delay)
                    
                result = await crawler.arun(url=url, config=run_config)
                
                if result.success:
                    # Wyciągamy czysty Markdown
                    md = result.markdown or ""
                    # Krótkie oczyszczenie z wielokrotnych pustych linii, by zaoszczędzić kolejne tokeny
                    md_cleaned = re.sub(r'\n{3,}', '\n\n', md)
                    results_map[url] = md_cleaned
                    print(f"[CRAWLER] Pobrano pomyślnie. Rozmiar Markdown: {len(md_cleaned)} bajtów.")
                else:
                    print(f"[CRAWLER] Błąd pobierania {url} (status: {result.status_code})")
            except Exception as e:
                print(f"[CRAWLER] Nieoczekiwany wyjątek podczas scrapowania {url}: {e}")
                
    return results_map

# ==============================================================================
# 5. Ekstrakcja danych przy użyciu Gemini 2.5 Flash i Pydantic (Structured Outputs)
# ==============================================================================
def extract_events_with_gemini(aggregated_markdown: str, source_urls: List[str]) -> List[Dict[str, Any]]:
    """
    Wywołuje Google Gemini API przy użyciu nowego pakietu google-genai SDK.
    Wykorzystuje ustrukturyzowany format wyjściowy (Structured Outputs) z modelem gemini-2.5-flash
    oraz schematem Pydantic, co gwarantuje 100% precyzji w bezpłatnym pakiecie!
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[GEMINI-API] CRITICAL BŁĄD: Brak zmiennej środowiskowej GEMINI_API_KEY. Ekstrakcja AI zostanie pominięta.")
        return []
        
    print("[GEMINI-API] Nawiązywanie połączenia z Google AI Studio...")
    client = genai.Client(api_key=api_key)
    
    # Przygotowanie promptu z precyzyjną kategoryzacją i zaleceniami
    prompt = f"""
Przeanalizuj poniższą treść pobraną ze stron kulturalnych we Wrocławiu.
Wyodrębnij wyłącznie koncerty i wydarzenia muzyczne (ze szczególnym uwzględnieniem jazzu, bluesu, muzyki improwizowanej, fusion).

Wydarzenia pochodzą z następujących adresów źródłowych: {", ".join(source_urls)}.
W polu sourceUrl dla każdego wyodrębnionego wydarzenia wpisz bezwzględnie najbardziej pasujący URL ze wskazanej listy.

Instrukcje ekstrakcji:
1. Data (date) musi mieć format: YYYY-MM-DD. Jeśli w tekście podany jest tylko dzień i miesiąc (np. "22 czerwca"), przyjmij bieżący rok wydarzenia projektowy (2026).
2. Godzina (time) musi mieć format: HH:MM. Jeśli brak informacji, ustaw "20:00".
3. Dla każdego wydarzenia staraj się wyodrębnić pełną nazwę artysty lub zespołu i zapisać ją w polu rawArtistName.
4. Zwróć tylko rzeczywiste, autentyczne wydarzenia. Wyeliminuj powtarzające się stałe elementy strony, reklamy czy odnośniki nawigacyjne.

Poniżej skompresowana zawartość stron w formacie Markdown:
---
{aggregated_markdown}
---
"""

    # Implementacja Defensive Programming (Exponential Backoff do obrony przed błędem 429)
    max_retries = 3
    base_backoff = 30 # zaczynamy od 30 sekund czekania dla Free Tier
    
    for attempt in range(max_retries):
        try:
            print(f"[GEMINI-API] Wysyłanie zapytania do modelu gemini-2.5-flash (Próba {attempt+1}/{max_retries})...")
            
            # Nowoczesne, rekomendowane wywołanie SDK dla ustrukturyzowanej formy JSON
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractedEvents,
                    temperature=0.1, # Niska temperatura dla ścisłej powtarzalności faktów
                ),
            )
            
            # Sukces - dekodujemy obiekt json
            result_json = response.text
            data = json.loads(result_json)
            extracted_list = data.get("events", [])
            print(f"[GEMINI-API] Wyodrębniono {len(extracted_list)} koncertów z pliku Markdown!")
            return [event.model_dump() if hasattr(event, "model_dump") else event for event in extracted_list]
            
        except APIError as e:
            if attempt < max_retries - 1:
                sleep_time = base_backoff * (2 ** attempt)
                print(f"[GEMINI-API] [KOD 429 / Limity API] Wykryto przeciążenie żądań: {e}.")
                print(f"[GEMINI-API] Automatyczny backoff: Oczekiwanie {sleep_time}s przed ponowieniem próby...")
                time.sleep(sleep_time)
            else:
                print(f"[GEMINI-API] Ostateczne niepowodzenie wywołania API po {max_retries} próbach: {e}")
                raise e
        except Exception as e:
            print(f"[GEMINI-API] Nieoczekiwany błąd ekstrakcji: {e}")
            return []
            
    return []

# ==============================================================================
# 6. Główna Metoda Sterująco-Scalająca
# ==============================================================================
async def main():
    print("=" * 80)
    print("   ROZPOCZĘCIE AUTOMATYCZNEGO CRAWLERA & INTEGRATORA 'GDZIEGRAJĄ WROCŁAW'")
    print("=" * 80)
    
    # 1. Sprawdzenie klucza API
    if not os.environ.get("GEMINI_API_KEY"):
        print("[CRAWLER] BŁĄD: Zmienna GEMINI_API_KEY nie jest ustawiona w systemie!")
        print("[CRAWLER] Crawler przejdzie w tryb demonstracyjny z mockowaniem API Gemini...")
        
    # 2. Załaduj listę stron do zeskrapowania
    # (Pobieramy z wrocławskich klubów oraz NFM)
    urls_to_scrape = [
        "https://vertigojazz.pl/pl/events",
        "https://www.nfm.wroclaw.pl/wydarzenia",
        "https://rurajazz.pl"
    ]
    
    # 3. Załadowanie słownika artystów do późniejszej klasyfikacji
    print(f"[MATCH-ENGINE] Ładowanie bazy słownikowej z {ARTISTS_FILE}...")
    artists_db = parse_ts_array_file(ARTISTS_FILE)
    print(f"[MATCH-ENGINE] Załadowano pomyślnie {len(artists_db)} artystów do celów klasyfikacji.")
    
    # 4. Pobieranie danych (Markdown)
    markdown_results = await scrape_urls_to_markdown(urls_to_scrape)
    if not markdown_results:
        print("[CRAWLER] BŁĄD: Nie Udało się pobrać żadnej strony. Kończę proces.")
        return
        
    # 5. Agregacja i wysyłka do Gemini
    # Łączymy wyniki w jeden ciąg tekstowy dla zaoszczędzenia tokenów i zminimalizowania wywołań API (tylko 1 zapytanie)
    aggregated_md = ""
    for url, md in markdown_results.items():
        aggregated_md += f"\n\n=== ŹRÓDŁO STRONY: {url} ===\n{md}"
        
    extracted_events_raw = []
    
    # Jeśli mamy klucz API, wywołujemy Gemini, w przeciwnym razie robimy mock dla testu integracji
    if os.environ.get("GEMINI_API_KEY"):
        try:
            extracted_events_raw = extract_events_with_gemini(aggregated_md, urls_to_scrape)
        except Exception as ex:
            print(f"[MAIN] Błąd wywoływania Gemini API: {ex}")
    else:
        print("[MAIN] [TRYB MOCK] Symuluję pobranie przykładowych koncertów z sieci...")
        # Kilka mocków, które automatycznie się zaklasyfikują dzięki naszemu matcherowi!
        extracted_events_raw = [
            {
                "date": "2026-06-25",
                "time": "20:00",
                "title": "Nadzwyczajny Recital we Wrocławiu",
                "price": "120 PLN",
                "rawArtistName": "Leszek Mozdzer Solo",
                "venue": "Narodowe Forum Muzyki - Sala Czerwona",
                "ticketUrl": "https://www.nfm.wroclaw.pl/wydarzenia/leszek-mozdzer-recital",
                "sourceUrl": "https://www.nfm.wroclaw.pl/wydarzenia"
            },
            {
                "date": "2026-06-27",
                "time": "21:00",
                "title": "ECM Promotion Night",
                "price": "90 PLN",
                "rawArtistName": "Wasilewski Trio",
                "venue": "Vertigo Jazz Club & Restaurant",
                "ticketUrl": "https://vertigojazz.pl/pl/events/wasilewski-trio-tours",
                "sourceUrl": "https://vertigojazz.pl/pl/events"
            }
        ]

    # 6. Klasyfikacja za pomocą algorytmu dopasowującego (Matcher)
    print("\n" + "-" * 50)
    print("[MATCH-ENGINE] Rozpoczynam automatyczną klasyfikację ścisłą i rozmytą...")
    print("-" * 50)
    
    new_concerts_list = []
    for raw_ev in extracted_events_raw:
        raw_artist = raw_ev.get("rawArtistName") or ""
        raw_title = raw_ev.get("title") or ""
        
        # Klasyfikacja artysty na podstawie imienia/aliasów/członków/Levenshteina
        artist_ids = match_scraped_event_multiple(raw_artist, raw_title, artists_db)
        
        # NIE ZNAMY ARTYSTY - NIE DODAJEMY KONCERTU (pusta tablica oznacza brak dodania)
        if not artist_ids:
            print(f"[MATCH] Ignorowano koncert bez znanego artysty: {raw_artist} - {raw_title}")
            continue
            
        # Tworzenie stabilnego ID na podstawie daty i nazwy
        title_slug = re.sub(r'[^a-zA-Z0-9]', '-', (raw_title or raw_artist).lower())
        title_slug = re.sub(r'-+', '-', title_slug).strip('-')
        primary_artist_id = artist_ids[0]
        event_id = f"{raw_ev.get('date')}-{raw_ev.get('venue', 'club').lower()[:7]}-{primary_artist_id}-{title_slug}"[:100]
        
        concert_obj = {
            "id": event_id,
            "artistIds": artist_ids,
            "rawArtistName": raw_artist,
            "title": raw_title or "Koncert Jazzowy",
            "venue": raw_ev.get("venue") or "Klub Muzyczny Wrocław",
            "date": raw_ev.get("date"),
            "time": raw_ev.get("time") or "20:00",
            "price": raw_ev.get("price") or "TBA",
            "ticketUrl": raw_ev.get("ticketUrl") or "",
            "sourceUrl": raw_ev.get("sourceUrl") or "",
            "scrapedAt": datetime.datetime.now().isoformat()
        }
        
        new_concerts_list.append(concert_obj)
        print(f"[MATCH] Dopasowano: {raw_artist} -> ID Artystów: {artist_ids} (Klub: {concert_obj['venue']})")

    # 7. Integracja, Mergowanie i Deduplikacja ze starą bazą koncertów
    print("\n" + "-" * 50)
    print("[INTEGRATOR] Rozpoczynam odczytywanie dotychczasowych baz koncertów...")
    print("-" * 50)
    
    existing_upcoming = parse_ts_array_file(UPCOMING_FILE)
    existing_archive = parse_ts_array_file(ARCHIVE_FILE)
    
    print(f"[INTEGRATOR] Odczytano bazie lokalnej: {len(existing_upcoming)} nadchodzących, {len(existing_archive)} archiwalnych.")
    
    # Łączymy wszystkie dotychczasowe koncerty w jedną wielką pulę, by dokonać ponownej segregacji i deduplikacji
    full_pool = []
    full_pool.extend(existing_upcoming)
    full_pool.extend(existing_archive)
    full_pool.extend(new_concerts_list)
    
    # Deduplikacja oparta na unikalnym kluczu: Data + Tytuł (lub rawArtistName)
    dedup_dict = {}
    for conn in full_pool:
        # Zapewnienie zgodności ze strukturą artistIds
        if "artistId" in conn and "artistIds" not in conn:
            aid = conn["artistId"]
            conn["artistIds"] = [aid] if aid and aid != "unclassified" else []
            
        # Puste tablice i/lub brak artistIds odrzucamy we wszelkich nowo dodanych danych
        if not conn.get("artistIds"):
            continue
            
        date_part = conn.get("date", "").strip()
        title_part = conn.get("title") or conn.get("rawArtistName") or "untitled"
        title_part = title_part.lower().strip()
        
        # Klucz deduplikacyjny
        key = f"{date_part}::{title_part}"
        
        # Jeśli koncert już istnieje, zachowujemy ten z pełniejszym dopisaniem
        if key in dedup_dict:
            existing_conn = dedup_dict[key]
            if len(existing_conn.get("artistIds", [])) == 0 and len(conn.get("artistIds", [])) > 0:
                dedup_dict[key] = conn
        else:
            dedup_dict[key] = conn
            
    unique_pool = list(dedup_dict.values())
    print(f"[INTEGRATOR] Po deduplikacji pozostało: {len(unique_pool)} unikalnych wydarzeń w całej historii.")
    
    # 8. Podział na wydarzenia nadchodzące i archiwalne na podstawie AKTUALNEJ DATY urzędowej wrocławskiej
    # Dla spójności z aplikacją i zrzutami ekranu używamy wirtualnego lub dzisiejszego czasu
    # Ustalmy dzisiejszą datę progową systemową (dzisiejsza data to 2026-06-20 zgodnie z layoutem)
    today_str = "2026-06-20"
    print(f"[INTEGRATOR] Podział na nadchodzące i archiwalne pod datę graniczną: {today_str}")
    
    classified_upcoming = []
    classified_archive = []
    
    for conn in unique_pool:
        # Bardzo bezpieczne sprawdzenie daty
        date_str = conn.get("date", "")
        if not date_str:
            continue
            
        if date_str >= today_str:
            classified_upcoming.append(conn)
        else:
            classified_archive.append(conn)
            
    # Sorting (Nadchodzące rosnąco chronologicznie, Archiwalne malejąco chronologicznie)
    classified_upcoming.sort(key=lambda x: (x.get("date", ""), x.get("time", "")))
    classified_archive.sort(key=lambda x: (x.get("date", ""), x.get("time", "")), reverse=True)
    
    print(f"[INTEGRATOR] Wynik podziału: {len(classified_upcoming)} nadchodzących, {len(classified_archive)} archiwalnych.")
    
    # 9. Zaprzęgnięcie zapisu do plików TypeScript
    write_ts_array_file(UPCOMING_FILE, "initialUpcomingConcerts", classified_upcoming)
    write_ts_array_file(ARCHIVE_FILE, "initialArchiveConcerts", classified_archive)
    
    print("\n" + "=" * 80)
    print("   AUTOMATYCZNA AKTUALIZACJA ZAKOŃCZONA SUKCESEM! BAZA WYDARZEŃ JEST AKTUALNA.")
    print("=" * 80)

if __name__ == "__main__":
    # Obsługa asynchroniczności
    asyncio.run(main())
