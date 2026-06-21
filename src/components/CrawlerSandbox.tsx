import React, { useState } from "react";
import { Artist, Concert } from "../types";
import { matchScrapedEventMultipleDetails } from "../utils/matcher";
import { Play, Terminal, CheckCircle, AlertTriangle, Plus, Info } from "lucide-react";

interface CrawlerSandboxProps {
  artists: Artist[];
  onAddConcert: (concert: Concert) => void;
}

export default function CrawlerSandbox({ artists, onAddConcert }: CrawlerSandboxProps) {
  const [rawTitleInput, setRawTitleInput] = useState("V Vertigo zagra trio Wasilewskiego wspaniały koncert");
  const [venueInput, setVenueInput] = useState("Vertigo Jazz Club & Restaurant");
  const [dateInput, setDateInput] = useState("2026-07-22");
  const [timeInput, setTimeInput] = useState("20:00");
  const [priceInput, setPriceInput] = useState("50 PLN");
  const [ticketUrlInput, setTicketUrlInput] = useState("https://vertigojazz.pl/pl/events/rezerwcja-wasilewski");

  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);
  const [matchResultState, setMatchResultState] = useState<any[] | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Zapisywarka do głównej listy koncertów
  const [concertAddedMessage, setConcertAddedMessage] = useState(false);

  const handleSimulateClassification = () => {
    setSimulatedLogs([]);
    setConcertAddedMessage(false);
    
    const logs: string[] = [];
    logs.push(`[SYSTEM] Rozpoczęcie symulacji scrapowania z adresu sourceUrl...`);
    logs.push(`[CRAWLER] Pobrany nagłówek/rodzaj: "${rawTitleInput}"`);
    logs.push(`[CRAWLER] Miejsce wydarzenia: "${venueInput}"`);
    logs.push(`[CRAWLER] Skanowanie bazy artystów (obecnie wpisów: ${artists.length})...`);

    // Uruchomienie właściwej logiki dopasowywania
    const matches = matchScrapedEventMultipleDetails(rawTitleInput, rawTitleInput, artists);

    logs.push(`[MATCH-ENGINE] KROK 1: Analiza dopasowań z całą bazą artystów...`);
    if (matches.length > 0) {
      logs.push(`[MATCH-ENGINE] Znaleziono ${matches.length} dopasowanych wykonawców:`);
      matches.forEach((m) => {
        logs.push(`  ↳ Artysta: "${m.artist.name}" | Metoda: ${m.matchType} | Kryterium: "${m.matchedCriteria}" | Podobieństwo: ${m.score}%`);
      });
      setIsSuccess(true);
    } else {
      logs.push(`[MATCH-ENGINE] FAILED: Brak jakichkolwiek dopasowań powyżej progu tolerancji (< 45%).`);
      setIsSuccess(false);
    }

    if (matches.length > 0) {
      logs.push(`[SYSTEM] KLASYFIKACJA UDANA: Koncert zostanie podpięty pod ID artystów: ${matches.map(m => `"${m.artist.id}"`).join(", ")}`);
      setIsSuccess(true);
    } else {
      logs.push(`[SYSTEM] OSTRZEŻENIE: Brak znanych artystów ze słownika w tekście. Zgodnie z regułą "NIE ZNAMY ARTYSTY - NIE DODAJEMY ARTYSTY", to wydarzenie nie zostanie dodane.`);
      setIsSuccess(false);
    }

    setSimulatedLogs(logs);
    setMatchResultState(matches);
  };

  const handleAddToMainList = () => {
    if (!matchResultState || matchResultState.length === 0) return;

    const newConcert: Concert = {
      id: `simulated-${Date.now()}`,
      artistIds: matchResultState.map((m: any) => m.artist.id),
      rawArtistName: rawTitleInput,
      title: "Koncert zautomatyzowany",
      venue: venueInput,
      date: dateInput,
      time: timeInput,
      price: priceInput,
      ticketUrl: ticketUrlInput,
      sourceUrl: "https://scraped-source-website.com/jazz",
      scrapedAt: new Date().toISOString()
    };

    onAddConcert(newConcert);
    setConcertAddedMessage(true);
  };

  const loadExample = (text: string, venue: string, ticketUrl: string) => {
    setRawTitleInput(text);
    setVenueInput(venue);
    setTicketUrlInput(ticketUrl);
    setConcertAddedMessage(false);
    setMatchResultState(null);
    setSimulatedLogs([]);
  };

  return (
    <div id="crawler-sandbox" className="space-y-8">
      {/* Informacje wprowadzające */}
      <div className="border-b border-zinc-200 pb-8 space-y-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
          <Terminal className="w-4 h-4 text-brand-accent Parser" />
          <span>Piaskownica Algorytmów</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-brand-ink uppercase">
          Symulator Integratora & Klasyfikatora
        </h2>
        <p className="text-xs text-brand-dim mt-1.5 leading-relaxed font-light max-w-4xl">
          Zrozum, jak crawler w Pythonie lub skrypt JavaScript przetwarza nieuporządkowane dane tekstowe pochodzące bezpośrednio ze stron www i dopasowuje je do bazy słownikowej artystów na podstawie parametrów i aliasów.
        </p>

        {/* Gotowe szablony testowe dla wygody */}
        <div className="pt-2">
          <span className="text-[10px] text-zinc-400 uppercase block mb-1.5 font-bold">Wpisy testowe do symulacji algorytmu:</span>
          <div className="flex flex-wrap gap-2">
            <button
              id="btn-load-ex1"
              type="button"
              onClick={() => loadExample("Leszek Mozdzer w Narodowym Forum Muzyki", "Narodowe Forum Muzyki", "https://nfm.wroclaw.pl")}
              className="text-[10px] bg-zinc-50 hover:bg-zinc-100 text-[#111111] border border-zinc-200 px-3.5 py-2 font-medium transition cursor-pointer"
            >
              Leszek Możdżer (brak polskich znaków)
            </button>
            <button
              id="btn-load-ex2"
              type="button"
              onClick={() => loadExample("Wyjątkowe trio Wasilewskiego na jazzowej scenie we Wrocławiu", "Vertigo Jazz Club & Restaurant", "https://vertigojazz.pl")}
              className="text-[10px] bg-zinc-50 hover:bg-zinc-100 text-[#111111] border border-zinc-200 px-3.5 py-2 font-medium transition cursor-pointer"
            >
              Trio Wasilewskiego (alias)
            </button>
            <button
              id="btn-load-ex3"
              type="button"
              onClick={() => loadExample("Kazimierz Jonkisz gra ze świetnymi muzykami", "Klub Rura", "https://rurajazz.pl")}
              className="text-[10px] bg-zinc-50 hover:bg-zinc-100 text-[#111111] border border-zinc-200 px-3.5 py-2 font-medium transition cursor-pointer"
            >
              Jonkisz (podpięcie po członku zespołu)
            </button>
            <button
              id="btn-load-ex4"
              type="button"
              onClick={() => loadExample("Kortez w Vertigo - piosenka autorska", "Vertigo Jazz Club & Restaurant", "https://vertigojazz.pl")}
              className="text-[10px] bg-zinc-50 hover:bg-zinc-100 text-brand-accent border border-zinc-200 px-3.5 py-2 font-medium transition cursor-pointer"
            >
              Kortez (surowy, brak powiązania z jazzem)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lewy panel - formularz wejściowy scrapowania */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#111111] border-b border-zinc-150 pb-2">
            Dane wejściowe ze scrapingu stron
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                Surowy Tytuł Pobranego Wydarzenia (raw_title) *
              </label>
              <textarea
                id="sandbox-title-input"
                rows={2}
                required
                value={rawTitleInput}
                onChange={(e) => setRawTitleInput(e.target.value)}
                placeholder="np. Sławomir Kurkiewicz gościem pecjalnym wieczoru jazzu"
                className="w-full bg-white border border-zinc-200 pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-400 focus:outline-none focus:border-brand-accent resize-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                  Miejsce Wydarzenia (venue)
                </label>
                <input
                  id="sandbox-venue-input"
                  type="text"
                  value={venueInput}
                  onChange={(e) => setVenueInput(e.target.value)}
                  placeholder="np. Klub Rura"
                  className="w-full bg-white border border-zinc-200 pl-3 pr-3 py-2 text-xs text-brand-ink focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                  Data Wydarzenia (YYYY-MM-DD)
                </label>
                <input
                  id="sandbox-date-input"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-white border border-zinc-200 pl-3 pr-3 py-2 text-xs text-brand-ink focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                  Czas / Godzina
                </label>
                <input
                  id="sandbox-time-input"
                  type="text"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="w-full bg-white border border-zinc-200 pl-3 pr-3 py-2 text-xs text-brand-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                  Bilet wstępu
                </label>
                <input
                  id="sandbox-price-input"
                  type="text"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full bg-white border border-zinc-200 pl-3 pr-3 py-2 text-xs text-brand-ink focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  id="btn-run-sandbox"
                  type="button"
                  onClick={handleSimulateClassification}
                  className="w-full bg-[#D91A2A] hover:bg-black text-white font-semibold text-xs uppercase py-3.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Rozpocznij Analizę</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Prawy panel - Terminal z logami i wynikiem analizy */}
        <div className="bg-neutral-900 text-white p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
              <span className="text-xs font-mono font-medium uppercase flex items-center gap-1.5 text-zinc-350">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping"></span>
                Terminal klasyfikatora
              </span>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase font-bold">Symulacja</span>
            </div>

            {simulatedLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                <Info className="w-8 h-8 text-neutral-700 mb-2 font-black" />
                <p className="text-xs font-mono">Naciśnij "Rozpocznij Analizę", aby przetworzyć surowy ciąg znaków.</p>
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px] max-h-[220px] overflow-y-auto mb-4 scrollbar-thin">
                {simulatedLogs.map((log, idx) => {
                  let color = "text-zinc-400";
                  if (log.includes("[SYSTEM]")) color = "text-emerald-400 font-medium";
                  if (log.includes("[MATCH-ENGINE]")) color = "text-amber-400 font-medium";
                  if (log.includes("KROK")) color = "text-orange-400 font-extrabold";
                  if (log.includes("FAILED")) color = "text-red-400 font-medium";
                  if (log.includes("OSTRZEŻENIE")) color = "text-amber-300 font-medium";
                  
                  return (
                    <div key={idx} className={`${color} leading-relaxed break-words`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ocenianie dopasowania i zapis do bazy koncertów */}
          {matchResultState && (
            <div className="border-t border-neutral-800 pt-4 mt-auto">
              <div className="bg-neutral-950 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">Kategoryzacja:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-mono font-semibold uppercase text-white">
                          Powiązano: <span className="text-brand-accent underline">{matchResultState.map((m: any) => m.artist.name).join(", ")}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-[#D91A2A]" />
                        <span className="text-xs font-mono font-semibold uppercase text-zinc-400">
                          Ignorowany (Brak znanych artystów)
                        </span>
                      </>
                    )}
                  </div>
                  {isSuccess && (
                    <span className="text-[9px] font-mono text-zinc-500 block mt-1">
                      Weryfikacja podobieństwa: <strong className="text-emerald-400">{matchResultState.map((m: any) => `${m.score}% (${m.matchType})`).join(", ")}</strong>
                    </span>
                  )}
                </div>

                {isSuccess && (
                  !concertAddedMessage ? (
                    <button
                      id="btn-add-simulated-concert"
                      onClick={handleAddToMainList}
                      className="flex items-center justify-center gap-1.5 bg-brand-accent hover:bg-white hover:text-black text-white font-mono text-xs uppercase px-4 py-2 cursor-pointer rounded-none transition-all duration-150"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Zatwierdź</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-mono font-semibold uppercase">
                      ✓ Zapisany!
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
