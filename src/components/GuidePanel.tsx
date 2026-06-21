import React, { useState } from "react";
import { BookOpen, FileCode, Server, Code, Copy, Check, MessageSquare } from "lucide-react";

export default function GuidePanel() {
  const [activeSubTab, setActiveSubTab] = useState<"plan" | "schema" | "python" | "github" | "workflow">("plan");
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 3000);
  };

  const codePython = `import re
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# 1. Załaduj bazę artystów ze słownika (Modyfikowana ręcznie struktura w TS)
# Python może odczytać profil wejściowy bezpośrednio parsując część JSON-ową z pliku TS
def load_artists_db():
    try:
        with open("src/data/artists.ts", "r", encoding="utf-8") as f:
            content = f.read()
            # Sprytny parser wyciągający czysty JSON ze stałej TypeScript
            json_str = content[content.find("["):content.rfind("]")+1]
            # Ponieważ TS dopuszcza brak cudzysłowów i komentarze, crawler może też użyć szablonu re
            # lub uproszczonego parsera. Dla pełnego bezpieczeństwa zaleca się zachowanie formatu JSON wewnątrz tablicy.
            return json.loads(json_str)
    except Exception as e:
        print(f"Błąd ładowania słownika artystów: {e}")
        return []

# 2. Główna funkcja klasyfikacyjna (Algorytm dopasowywania)
def classify_concert(raw_title, artists_db):
    title_lower = raw_title.lower()
    
    for artist in artists_db:
        # Sprawdzanie głównej nazwy
        if artist["name"].lower() in title_lower:
            return artist["id"]
            
        # Sprawdzanie aliasów
        for alias in artist.get("aliases", []):
            if alias.lower() in title_lower:
                return artist["id"]
                
        # Sprawdzanie członków zespołu
        for member in artist.get("members", []):
            if member.lower() in title_lower:
                return artist["id"]
                
    return "unclassified"

# 3. Przykładowy crawler na żywo
def crawl_vertigo():
    url = "https://vertigojazz.pl/pl/events"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return []
        
    soup = BeautifulSoup(response.text, "html.parser")
    new_concerts = []
    artists_db = load_artists_db()
    
    # Selektory zostaną zmodyfikowane pod konkretną strukturę wrocławskich scen
    event_cards = soup.select(".event-card-selector")
    
    for card in event_cards:
        try:
            title = card.select_one(".event-title").text.strip()
            date_raw = card.select_one(".event-date").text.strip() # "22.06.2026"
            time_raw = card.select_one(".event-time").text.strip() # "20:00"
            price = card.select_one(".event-price").text.strip() if card.select_one(".event-price") else "TBA"
            link = card.select_one("a.event-link")["href"]
            
            date_parsed = datetime.strptime(date_raw, "%d.%m.%Y").strftime("%Y-%m-%d")
            artist_id = classify_concert(title, artists_db)
            event_id = f"{date_parsed}-vertigo-{artist_id}"
            
            new_concerts.append({
                "id": event_id,
                "artistId": artist_id,
                "rawArtistName": title,
                "title": title,
                "venue": "Vertigo Jazz Club & Restaurant",
                "date": date_parsed,
                "time": time_raw,
                "price": price,
                "ticketUrl": link,
                "sourceUrl": url,
                "scrapedAt": datetime.now().isoformat()
            })
        except:
            pass
            
    return new_concerts

# 4. Sprytne nadpisywanie plików TypeScript (Wyluzowany JSON)
# Skrypt rozdziela wydarzenia na bieżące (upcoming) oraz stare (archive)
def distribute_and_save(new_concerts):
    today_str = datetime.now().strftime("%Y-%m-%d") # "2026-06-20"
    
    # KROK A: Filtrujemy nadchodzące i archiwalne
    upcoming = []
    archive_new = []
    
    for c in new_concerts:
        if c["date"] >= today_str:
            upcoming.append(c)
        else:
            archive_new.append(c)
            
    # KROK B: Zapisz nadchodzące do src/data/concerts_upcoming.ts jako kod TypeScript
    with open("src/data/concerts_upcoming.ts", "w", encoding="utf-8") as f:
        f.write("import { Concert } from '../types';\n\n")
        f.write("export const initialUpcomingConcerts: Concert[] = ")
        f.write(json.dumps(upcoming, indent=2, ensure_ascii=False))
        f.write(";\n")
        print(f"Zapisano {len(upcoming)} nadchodzących koncertów.")

    # KROK C: Doklej nowe archiwalne do src/data/concerts_archive.ts
    # (W prawdziwym skrypcie odczytujemy stare archiwum, dodajemy unikalne nowe i zapisujemy z powrotem)
    # Poniżej prosty zapis bazy zarchiwizowanych danych:
    with open("src/data/concerts_archive.ts", "w", encoding="utf-8") as f:
        f.write("import { Concert } from '../types';\n\n")
        f.write("export const initialArchiveConcerts: Concert[] = ")
        f.write(json.dumps(archive_new, indent=2, ensure_ascii=False))
        f.write(";\n")
        print(f"Zapisano {len(archive_new)} archiwalnych koncertów.")

if __name__ == "__main__":
    found = crawl_vertigo()
    distribute_and_save(found)
`;

  const codeGithubWorkflow = `# .github/workflows/scrape-and-update.yml
name: Scrape Jazz Concerts and Update site

on:
  schedule:
    # Uruchamiaj crawler codziennie o 04:00 UTC
    - cron: '0 4 * * *'
  workflow_dispatch: # Umożliwia ręczne uruchomienie w panelu GitHub

permissions:
  contents: write # Wymagane, aby dodać git commit ze zmianami

jobs:
  build-and-scrape:
    runs-on: ubuntu-latest

    steps:
    - name: Sprawdź repozytorium
      uses: actions/checkout@v3

    - name: Skonfiguruj Pythona
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'

    - name: Zainstaluj biblioteki scrapujące
      run: |
        python -m pip install --upgrade pip
        pip install requests beautifulsoup4

    - name: Uruchom skrypt crawler (podzieli na nadchodzące i archiwalne w TS)
      run: |
        python crawler/run.py

    - name: Zatwierdź i wepchnij zmiany w plikach TypeScript
      run: |
        git config --global user.name "GdzieGraja-Scraper-Bot"
        git config --global user.email "bot@gdziegraja.com"
        git add src/data/concerts_upcoming.ts src/data/concerts_archive.ts
        git diff-index --quiet HEAD || git commit -m "Automatyczna aktualizacja bazy koncertów"
        git push
`;

  return (
    <div id="guide-panel" className="border-t border-zinc-200">
      {/* Podzakładki przewodnika */}
      <div className="flex flex-wrap border-b border-zinc-200 text-[10px] uppercase tracking-wider font-bold">
        <button
          id="btn-subtab-plan"
          onClick={() => setActiveSubTab("plan")}
          className={`cursor-pointer transition-all px-5 py-4 border-b-2 ${
            activeSubTab === "plan" ? "border-brand-accent text-[#111111]" : "border-transparent text-zinc-400 hover:text-[#111111]"
          }`}
        >
          Plan Architektury (3 pliki)
        </button>

        <button
          id="btn-subtab-schema"
          onClick={() => setActiveSubTab("schema")}
          className={`cursor-pointer transition-all px-5 py-4 border-b-2 ${
            activeSubTab === "schema" ? "border-brand-accent text-[#111111]" : "border-transparent text-zinc-400 hover:text-[#111111]"
          }`}
        >
          Konfiguracja Plików TS
        </button>

        <button
          id="btn-subtab-python"
          onClick={() => setActiveSubTab("python")}
          className={`cursor-pointer transition-all px-5 py-4 border-b-2 ${
            activeSubTab === "python" ? "border-brand-accent text-[#111111]" : "border-transparent text-zinc-400 hover:text-[#111111]"
          }`}
        >
          Crawler (Wyluzowany JSON)
        </button>

        <button
          id="btn-subtab-github"
          onClick={() => setActiveSubTab("github")}
          className={`cursor-pointer transition-all px-5 py-4 border-b-2 ${
            activeSubTab === "github" ? "border-brand-accent text-[#111111]" : "border-transparent text-zinc-400 hover:text-[#111111]"
          }`}
        >
          Automatyzacja GitHub
        </button>

        <button
          id="btn-subtab-workflow"
          onClick={() => setActiveSubTab("workflow")}
          className={`cursor-pointer transition-all px-5 py-4 border-b-2 ${
            activeSubTab === "workflow" ? "border-brand-accent text-[#111111]" : "border-transparent text-zinc-400 hover:text-[#111111]"
          }`}
        >
          Kolejne kroki (Prompty)
        </button>
      </div>

      {/* Panele treści */}
      <div className="py-6">
        {/* PANEL: PLAN KROK PO KROKU */}
        {activeSubTab === "plan" && (
          <div className="space-y-8 text-xs leading-relaxed font-light">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#111111] uppercase tracking-tight">
                Model 3 Plików TypeScript: Bezpieczeństwo i Ciągłość
              </h3>
              <p className="text-zinc-500 font-light">
                Dlaczego podział na oddzielne pliki uwalnia Cię od ryzyka i ułatwia sprawne wgrywanie danych.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="space-y-2 border-b border-zinc-100 pb-4 md:border-none md:pb-0">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#D91A2A]">Plik 1: Słownik</div>
                <h4 className="text-sm font-bold text-[#111111] uppercase">artists.ts (Słownik)</h4>
                <p className="text-zinc-500 font-light">
                  Przechowywana w <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[11px] text-[#111111]">src/data/artists.ts</code>. Zawiera listę artystów, ich aliasów i składów. **Aktualizujesz go wyłącznie ręcznie** – dzięki temu crawler nigdy przypadkowo nie zmodyfikuje Twoich pietystycznie przygotowanych opisów ani linków do Spotify.
                </p>
              </div>

              <div className="space-y-2 border-b border-zinc-100 pb-4 md:border-none md:pb-0">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#D91A2A]">Plik 2: Nadchodzące</div>
                <h4 className="text-sm font-bold text-[#111111] uppercase">concerts_upcoming.ts</h4>
                <p className="text-zinc-500 font-light">
                  Ścieżka: <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[11px] text-[#111111]">src/data/concerts_upcoming.ts</code>. Trzyma wyłącznie koncerty, których data jest **dzisiejsza lub w przyszłości**. To jest główny cel pracy crawlera: szybko pobrać dane, ujednolicić, nadpisać plik i wyświetlić bez obciążenia na stronie głównej.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#D91A2A]">Plik 3: Archiwum</div>
                <h4 className="text-sm font-bold text-[#111111] uppercase">concerts_archive.ts</h4>
                <p className="text-zinc-500 font-light">
                  Ścieżka: <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[11px] text-[#111111]">src/data/concerts_archive.ts</code>. Podczas codziennego uruchamiania o 4:00 rano, crawler wykrywa koncerty z wczoraj (które już się odbyły), wycina je z pliku nadchodzących i dokleja do bazy archiwalnej. Dzięki temu archiwum rośnie bezpiecznie w tle, a Twoja baza nadchodzących wydarzeń jest lekka i szybka.
                </p>
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border border-zinc-200 mt-6 font-light">
              <span className="font-mono font-bold text-[9px] uppercase tracking-widest text-[#D91A2A] block mb-1">Dlaczego TypeScript to "Wyluzowany JSON"?</span>
              <p className="text-zinc-500 text-justify">
                W standardowym pliku JSON każdy klucz musi być w cudzysłowie, nie można dodawać komentarzy objaśniających, a błędny przecinek na końcu psuje cały plik. **TypeScript jest o wiele bardziej kompromisowy**: możesz używać standardowych komentarzy, pomijać cudzysłowy w kluczach, stosować wielolinijkowe łańcuchy tekstowe i cieszyć się pełnym wsparciem auto-uzupełniania w edytorze kodu. A crawler bez problemu potrafi wygenerować taki kod jedną linijką zapisu w Pythonie!
              </p>
            </div>
          </div>
        )}

        {/* PANEL: DANE W PLIKACH TS */}
        {activeSubTab === "schema" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider font-sans">Sposób zaimportowania 3 plików w Twoim kodzie</h3>
              <p className="text-xs text-zinc-400 font-light">Struktury są zdeklarowane w folderze <code className="font-mono rounded bg-zinc-100 px-1 pr-1 py-0.5 text-brand-ink">src/data/</code> o jasnych, czytelnych typach.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">artists.ts (Baza Artystów)</span>
                <pre className="bg-neutral-900 p-4 font-mono text-[10px] text-zinc-350 overflow-x-auto whitespace-pre rounded-none">
{`import { Artist } from "../types";

export const initialArtists: Artist[] = [
  {
    id: "marcin-wasilewski-trio",
    name: "Marcin Wasilewski Trio",
    genres: ["Modern Jazz", "Acoustic Jazz"],
    aliases: ["Wasilewski Trio"],
    members: ["Marcin Wasilewski"],
    description: "Wybitny zespół..."
  }
];`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">concerts_upcoming.ts (Przyszłe)</span>
                <pre className="bg-neutral-900 p-4 font-mono text-[10px] text-zinc-350 overflow-x-auto whitespace-pre rounded-none">
{`import { Concert } from "../types";

export const initialUpcomingConcerts: Concert[] = [
  {
    id: "2026-06-25-vertigo-wasilewski",
    artistIds: ["marcin-wasilewski-trio"],
    rawArtistName: "Wasilewski Trio",
    title: "ECM Live Tour",
    venue: "Vertigo Jazz Club",
    date: "2026-06-25",
    time: "20:00",
    price: "85 PLN"
  }
];`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">concerts_archive.ts (Zarchiwizowane)</span>
                <pre className="bg-neutral-900 p-4 font-mono text-[10px] text-zinc-350 overflow-x-auto whitespace-pre rounded-none">
{`import { Concert } from "../types";

export const initialArchiveConcerts: Concert[] = [
  {
    id: "2026-06-12-nfm-mozdzer-past",
    artistIds: ["leszek-mozdzer"],
    rawArtistName: "Leszek Możdżer Solo",
    title: "Gala Jazzowa",
    venue: "Narodowe Forum Muzyki",
    date: "2026-06-12",
    time: "19:00",
    price: "120 PLN"
  }
];`}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 mt-6 text-xs text-zinc-500 font-light">
              <span className="text-[9px] uppercase tracking-widest text-[#D91A2A] font-bold block mb-1">Korzystanie z centralnego punktu: src/data.ts</span>
              <p className="leading-relaxed">
                Aby oszczędzić czas i utrzymać nieskomplikowane importy w aplikacji, Twój plik <code className="font-mono bg-zinc-100 pl-1 pr-1 py-0.5 rounded text-[11px] text-[#111111]">src/data.ts</code> działa jako spoiwo, importując dane z trzech podkatalogów i eksportując je we wspólnych, wielkich stałych stało-kluczowych. Gwarantuje to wsteczną kompatybilność i najwyższy porządek architektoniczny.
              </p>
            </div>
          </div>
        )}

        {/* PANEL: KOD CRAWLERA (PYTHON) */}
        {activeSubTab === "python" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Kod szkicu robota</h3>
                <p className="text-xs text-zinc-400 font-light">Automatyczny podział na zbliżające się oraz archiwalne daty i eksport do plików TypeScript.</p>
              </div>

              <button
                id="btn-copy-python-code"
                onClick={() => handleCopyCode("python", codePython)}
                className="cursor-pointer flex items-center justify-center gap-1.5 bg-zinc-50 border border-zinc-250 hover:bg-neutral-900 hover:text-white px-4 py-2 font-semibold text-xs transition duration-150 rounded-none ml-auto"
              >
                {copiedBlock === "python" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-brand-accent" />
                    <span className="text-brand-accent">Skopiowano kod!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Kopiuj skrypt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-light leading-relaxed">
              Utwórz w folderze projektu katalog <code className="font-mono bg-zinc-100 font-medium px-1.5 py-0.5 rounded text-[11px] text-[#111111]">crawler/run.py</code> i zapisz poniższy szablon parsujący wydarzenia bezpośrednio do struktur TypeScript:
            </p>

            <div className="relative">
              <pre className="bg-neutral-900 p-4 font-mono text-[11px] text-zinc-350 overflow-x-auto max-h-[350px] whitespace-pre scrollbar-thin rounded-none">
                {codePython}
              </pre>
            </div>
          </div>
        )}

        {/* PANEL: GITHUB ACTIONS (GITHUB WORKFLOW) */}
        {activeSubTab === "github" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Scraping w chmurze (GitHub Workflows)</h3>
                <p className="text-xs text-zinc-400 font-light">Harmonogram uruchamiania oraz automatyczny commit zmian w plikach TS.</p>
              </div>

              <button
                id="btn-copy-github-code"
                onClick={() => handleCopyCode("github", codeGithubWorkflow)}
                className="cursor-pointer flex items-center justify-center gap-1.5 bg-zinc-50 border border-zinc-250 hover:bg-neutral-900 hover:text-white px-4 py-2 font-semibold text-xs transition duration-150 rounded-none ml-auto"
              >
                {copiedBlock === "github" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-brand-accent" />
                    <span className="text-brand-accent">Skopiowano!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Kopiuj YAML</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-light font-sans">
              Wklej konfigurację do pliku o ścieżce <code className="font-mono bg-zinc-100 font-semibold px-1 rounded text-[11px] text-[#111111]">.github/workflows/scrape-and-update.yml</code>:
            </p>

            <div className="relative">
              <pre className="bg-neutral-900 p-4 font-mono text-[11px] text-zinc-350 overflow-x-auto max-h-[300px] whitespace-pre scrollbar-thin rounded-none">
                {codeGithubWorkflow}
              </pre>
            </div>
          </div>
        )}

        {/* PANEL: SKUTECZNA WSPÓŁPRACA */}
        {activeSubTab === "workflow" && (
          <div className="space-y-8 font-light text-xs text-zinc-500 leading-relaxed">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Przyszłe etapy wdrożeniowe</h3>
              <p className="text-xs text-zinc-400">Jak modularyzować dalsze etapy, by utrzymać wysoką jakość.</p>
            </div>

            <div className="space-y-5">
              <p>
                Twoja aplikacja łączy **interfejs React (kalendarz)** z **crawlerem Python**. Pracując nad kodem, warto oddzielić te obszary, by nie gubić czystości programowania. Oto gotowe szablony zadań:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="p-5 border border-zinc-200 space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-[#D91A2A] font-bold block">Temat 1</span>
                  <h4 className="text-xs font-bold uppercase text-[#111111]">Parsery dla Vertigo i NFM</h4>
                  <p className="text-zinc-500">
                    Gdy zbierzesz próbki kodu HTML stron Vertigo, wspólnie zaprogramujemy precyzyjne ścieżki (BeautifulSoup) i napiszemy translator dat językowych do obiektywnego czasu YYYY-MM-DD.
                  </p>
                </div>

                <div className="p-5 border border-zinc-200 space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-[#D91A2A] font-bold block">Temat 2</span>
                  <h4 className="text-xs font-bold uppercase text-[#111111]">Filtrowane Mapy Google</h4>
                  <p className="text-zinc-500">
                    Front-end możemy zasilić dedykowaną wrocławską instancją Google Maps lub prostym systemem pinezek z geolokalizacją klubów kulturalnych z naszej bazy.
                  </p>
                </div>

                <div className="p-5 border border-zinc-200 space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-[#D91A2A] font-bold block">Temat 3</span>
                  <h4 className="text-xs font-bold uppercase text-[#111111]">Dopasowania AI</h4>
                  <p className="text-zinc-500">
                    Możemy uzupełnić scraper o mały krok AI z użyciem darmowego pakietu Gemini, aby poprawnie kategoryzować koncerty opisywane zawiłymi, nietypowymi zdaniami marketingu.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-zinc-50 border border-zinc-200 mt-6 text-xs text-zinc-500">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#D91A2A] font-bold block mb-1">Nazewnictwo: GdzieGrają Wrocław</span>
                <p className="leading-relaxed font-light font-sans">
                  Zaproponowany przez Ciebie szyld **GdzieGrają** jest rewelacyjną nazwą dla tej platformy. Brzmi naturalnie, natychmiast tłumaczy przeznaczenie, łatwo go zapamiętać i błyskawicznie pozycjonuje się w wyszukiwarkach w relacji do lokalnego tętna Wrocławia. Stworzyłem ten prototyp nawiązując bezpośrednio do **GdzieGrają**!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
