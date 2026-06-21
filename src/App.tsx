/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { INITIAL_ARTISTS, INITIAL_CONCERTS, INITIAL_CONCERTS_ARCHIVE } from "./data";
import { Artist, Concert } from "./types";
import ConcertCard from "./components/ConcertCard";
import ArtistsPanel from "./components/ArtistsPanel";
import CrawlerSandbox from "./components/CrawlerSandbox";
import GuidePanel from "./components/GuidePanel";
import { 
  Music, 
  Calendar, 
  MapPin, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Users, 
  Terminal, 
  BookOpen, 
  Sparkles, 
  Compass, 
  Search,
  X,
  Info
} from "lucide-react";

export default function App() {
  const [artists, setArtists] = useState<Artist[]>(INITIAL_ARTISTS);
  const [concerts, setConcerts] = useState<Concert[]>(INITIAL_CONCERTS);
  const [archiveConcerts, setArchiveConcerts] = useState<Concert[]>(INITIAL_CONCERTS_ARCHIVE);
  
  // Zakładka główna
  const [activeTab, setActiveTab] = useState<"concerts" | "archive" | "artists" | "sandbox" | "guides">("concerts");

  // Filtry / Wyszukiwanie dla koncertów
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<"all" | "today" | "this-week" | "june" | "july">("all");
  const [sortBy, setSortBy] = useState<"date-asc" | "date-desc" | "artist-name">("date-asc");

  // Podgląd wybranego artysty (profil modalny / szczegółowy)
  const [selectedArtistProfile, setSelectedArtistProfile] = useState<Artist | null>(null);

  // Handlery modyfikujące stan (używane przez pod-komponenty)
  const handleAddArtist = (newArtist: Artist) => {
    setArtists((prev) => [newArtist, ...prev]);
  };

  const handleDeleteArtist = (id: string) => {
    setArtists((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddConcert = (newConcert: Concert) => {
    if (newConcert.date < "2026-06-20") {
      setArchiveConcerts((prev) => [newConcert, ...prev]);
    } else {
      setConcerts((prev) => [newConcert, ...prev]);
    }
  };

  const handleSelectArtistFromCard = (artistId: string) => {
    const artist = artists.find((a) => a.id === artistId);
    if (artist) {
      setSelectedArtistProfile(artist);
    }
  };

  // Wyliczanie listy unikalnych klubów z koncertów do filtrów
  const venuesList = useMemo(() => {
    const venues = new Set<string>();
    concerts.forEach((c) => venues.add(c.venue));
    archiveConcerts.forEach((c) => venues.add(c.venue));
    return Array.from(venues);
  }, [concerts, archiveConcerts]);

  // Filtrowanie koncertów w czasie rzeczywistym
  const filteredConcerts = useMemo(() => {
    let result = [...concerts];

    // 1. Wyszukiwanie po tekście (Nazwa artysty, tytuł koncertu lub miejsce)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter((concert) => {
        const matchedArtists = artists.filter((a) => concert.artistIds?.includes(a.id));
        
        const artistMatch = matchedArtists.some((artist) => 
          artist.name.toLowerCase().includes(query) || (artist.genres || []).some((g) => g.toLowerCase().includes(query))
        );

        const rawNameMatch = concert.rawArtistName.toLowerCase().includes(query);
        const titleMatch = concert.title ? concert.title.toLowerCase().includes(query) : false;
        const venueMatch = concert.venue.toLowerCase().includes(query);

        return artistMatch || rawNameMatch || titleMatch || venueMatch;
      });
    }

    // 2. Filtrowanie po klubie/miejscu
    if (selectedVenue !== "all") {
      result = result.filter((c) => c.venue === selectedVenue);
    }

    // 3. Filtrowanie po datach (bazowane na dacie dzisiejszej w symulatorze: 2026-06-20)
    if (selectedDateFilter === "today") {
      result = result.filter((c) => c.date === "2026-06-20");
    } else if (selectedDateFilter === "this-week") {
      // 2026-06-20 do 2026-06-27
      result = result.filter((c) => c.date >= "2026-06-20" && c.date <= "2026-06-27");
    } else if (selectedDateFilter === "june") {
      result = result.filter((c) => c.date.startsWith("2026-06"));
    } else if (selectedDateFilter === "july") {
      result = result.filter((c) => c.date.startsWith("2026-07"));
    }

    // 4. Sortowanie
    result.sort((a, b) => {
      if (sortBy === "date-asc") {
        return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
      }
      if (sortBy === "date-desc") {
        return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
      }
      if (sortBy === "artist-name") {
        const artistA = artists.filter((art) => a.artistIds?.includes(art.id)).map(a => a.name).join(" & ") || a.rawArtistName;
        const artistB = artists.filter((art) => b.artistIds?.includes(art.id)).map(a => a.name).join(" & ") || b.rawArtistName;
        return artistA.localeCompare(artistB);
      }
      return 0;
    });

    return result;
  }, [concerts, searchQuery, selectedVenue, selectedDateFilter, sortBy, artists]);

  // Filtrowanie koncertów archiwalnych
  const filteredArchiveConcerts = useMemo(() => {
    let result = [...archiveConcerts];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter((concert) => {
        const matchedArtists = artists.filter((a) => concert.artistIds?.includes(a.id));
        
        const artistMatch = matchedArtists.some((artist) => 
          artist.name.toLowerCase().includes(query) || (artist.genres || []).some((g) => g.toLowerCase().includes(query))
        );

        const rawNameMatch = concert.rawArtistName.toLowerCase().includes(query);
        const titleMatch = concert.title ? concert.title.toLowerCase().includes(query) : false;
        const venueMatch = concert.venue.toLowerCase().includes(query);

        return artistMatch || rawNameMatch || titleMatch || venueMatch;
      });
    }

    if (selectedVenue !== "all") {
      result = result.filter((c) => c.venue === selectedVenue);
    }

    // Archiwum jest sortowane malejąco (najmłodsze - czyli wczorajsze - najpierw)
    result.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

    return result;
  }, [archiveConcerts, searchQuery, selectedVenue, artists]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink font-sans antialiased flex flex-col justify-between">
      {/* GÓRNY PASEK & BRANDING */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex flex-col md:flex-row items-center justify-between py-2 gap-4">
          {/* Logo i Nazwa (Szwajcarska geometria) */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setActiveTab("concerts"); setSelectedArtistProfile(null); }}
              className="font-sans font-black text-2xl tracking-widest text-brand-ink select-none flex items-center gap-1 cursor-pointer"
            >
              GDZIE<span className="text-brand-accent">GRAJĄ</span>
            </button>
            <span className="hidden sm:inline-block text-[10px] tracking-widest uppercase text-brand-dim font-bold border-l border-zinc-300 pl-3">
              JAZZ WROCŁAW
            </span>
          </div>

          {/* Szybkie Menu Główne - Tekst i biała przestrzeń */}
          <nav className="flex items-center gap-6 md:gap-10">
            <button
              id="tab-btn-concerts"
              onClick={() => { setActiveTab("concerts"); setSelectedArtistProfile(null); }}
              className={`text-xs uppercase tracking-widest font-bold transition-all relative py-2.5 cursor-pointer ${
                activeTab === "concerts" 
                  ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent" 
                  : "text-brand-dim hover:text-brand-ink"
              }`}
            >
              Koncerty
            </button>

            <button
              id="tab-btn-archive"
              onClick={() => { setActiveTab("archive"); setSelectedArtistProfile(null); }}
              className={`text-xs uppercase tracking-widest font-bold transition-all relative py-2.5 cursor-pointer ${
                activeTab === "archive" 
                  ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent" 
                  : "text-brand-dim hover:text-brand-ink"
              }`}
            >
              Archiwum
            </button>

            <button
              id="tab-btn-artists"
              onClick={() => { setActiveTab("artists"); setSelectedArtistProfile(null); }}
              className={`text-xs uppercase tracking-widest font-bold transition-all relative py-2.5 cursor-pointer ${
                activeTab === "artists" 
                  ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent" 
                  : "text-brand-dim hover:text-brand-ink"
              }`}
            >
              Słownik Artystów
            </button>

            <button
              id="tab-btn-sandbox"
              onClick={() => { setActiveTab("sandbox"); setSelectedArtistProfile(null); }}
              className={`text-xs uppercase tracking-widest font-bold transition-all relative py-2.5 cursor-pointer ${
                activeTab === "sandbox" 
                  ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent" 
                  : "text-brand-dim hover:text-brand-ink"
              }`}
            >
              Piaskownica
            </button>

            <button
              id="tab-btn-guides"
              onClick={() => { setActiveTab("guides"); setSelectedArtistProfile(null); }}
              className={`text-xs uppercase tracking-widest font-bold transition-all relative py-2.5 cursor-pointer ${
                activeTab === "guides" 
                  ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent" 
                  : "text-brand-dim hover:text-brand-ink"
              }`}
            >
              Przewodnik
            </button>
          </nav>
        </div>
      </header>

      {/* GŁÓWNY KONTENER TREŚCI */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative">
        
        {/* NAGŁÓWEK / POWITANIE W STYLU SZWAJCARSKIM */}
        <section className="mb-12 border-b border-zinc-200 pb-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                <span>Wrocław Jazz Cafe</span>
                <span>•</span>
                <span>Baza Koncertowa</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-brand-ink uppercase leading-none">
                Gdzie gra <span className="font-extrabold text-brand-accent">jazz</span> we Wrocławiu?
              </h1>
              <p className="text-sm text-brand-dim leading-relaxed font-light">
                Odkryj niezależny, zautomatyzowany informator o nadchodzących koncertach jazzowych we Wrocławiu. Nasz crawler w tle stale pobiera dane z klubów i serwisów biletowych (Vertigo, Rura, NFM i innych), ujednolicając i wiążąc je z profilami słownikowymi artystów – bez kosztownych baz SQL, z hostingiem bezpośrednio na darmowym GitHub Pages.
              </p>
            </div>

            {/* Szybkie statystyki bazy */}
            <div className="flex sm:flex-row gap-8 shrink-0 py-2 w-full md:w-auto">
              <div className="border-l border-zinc-300 pl-4">
                <span className="text-4xl font-extrabold tracking-tight text-brand-ink leading-none block">{concerts.length}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mt-1.5 font-bold">Nadchodzące</span>
              </div>
              <div className="border-l border-zinc-300 pl-4">
                <span className="text-4xl font-extrabold tracking-tight text-brand-ink leading-none block">{archiveConcerts.length}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mt-1.5 font-bold">Archiwalne</span>
              </div>
              <div className="border-l border-zinc-300 pl-4">
                <span className="text-4xl font-extrabold tracking-tight text-brand-ink leading-none block">{artists.length}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mt-1.5 font-bold">Słownik</span>
              </div>
              <div className="border-l border-[#D91A2A] pl-4">
                <span className="text-xs font-mono font-medium text-brand-accent block">Dzisiejsza data</span>
                <span className="text-xs font-mono font-black text-brand-ink block mt-1.5 font-semibold">20.06.2026</span>
              </div>
            </div>
          </div>
        </section>

        {/* PODGLĄD WYBRANEGO ARTYSTY (DODATKOWY PROFIL PODRĘCZNY) */}
        {selectedArtistProfile && (
          <div className="mb-10 bg-zinc-50 border border-zinc-200 p-6 flex items-start justify-between relative transition-all duration-150">
            <div className="space-y-3 pr-8">
              <div className="flex items-center gap-3 flex-wrap">
                {(selectedArtistProfile.genres || []).map((genre) => (
                  <span key={genre} className="text-[10px] uppercase tracking-widest bg-brand-accent text-white px-2 py-0.5 font-bold">
                    {genre}
                  </span>
                ))}
                <span className="text-zinc-400 text-xs font-mono font-medium">Słownik ID: <code className="text-brand-ink">{selectedArtistProfile.id}</code></span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-brand-ink uppercase">
                Profil Artysty: {selectedArtistProfile.name}
              </h3>
              <p className="text-xs text-brand-dim max-w-4xl leading-relaxed font-light">
                {selectedArtistProfile.description}
              </p>
              
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs pt-2 font-mono">
                {selectedArtistProfile.aliases.length > 0 && (
                  <span className="text-zinc-400 font-medium">
                    Aliasy dopasowania: <strong className="text-brand-ink font-semibold">{selectedArtistProfile.aliases.join(", ")}</strong>
                  </span>
                )}
                {selectedArtistProfile.members.length > 0 && (
                  <span className="text-zinc-400 font-medium">
                    Skład zespołu: <strong className="text-brand-ink font-semibold">{selectedArtistProfile.members.join(", ")}</strong>
                  </span>
                )}
              </div>
            </div>

            <button
              id="btn-close-artist-profile"
              onClick={() => setSelectedArtistProfile(null)}
              className="text-zinc-400 hover:text-brand-accent p-1 transition absolute top-5 right-5 cursor-pointer"
              title="Zamknij podgląd profilu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* GŁÓWNY PRZEŁĄCZNIK WIDOKÓW */}
        <div className="transition-all duration-300">
          
          {/* TAB 1: LISTING KONCERTÓW */}
          {activeTab === "concerts" && (
            <div className="space-y-8">
              
              {/* FILTRY W STYLU SZWAJCARSKIM */}
              <div className="border-b border-zinc-200 pb-8 mb-4 space-y-6">
                {/* Minimalistyczny poziomy selektor dat (scroller) */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-zinc-100 pb-4 text-xs uppercase tracking-widest font-bold">
                  <span className="text-zinc-400 font-normal">Kiedy:</span>
                  <button
                    onClick={() => setSelectedDateFilter("all")}
                    className={`cursor-pointer transition-all pb-1.5 relative ${
                      selectedDateFilter === "all" ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent font-extrabold" : "text-brand-dim hover:text-brand-ink"
                    }`}
                  >
                    Wszystkie
                  </button>
                  <button
                    onClick={() => setSelectedDateFilter("today")}
                    className={`cursor-pointer transition-all pb-1.5 relative ${
                      selectedDateFilter === "today" ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent font-extrabold" : "text-brand-dim hover:text-brand-ink"
                    }`}
                  >
                    Dzisiaj (19.06)
                  </button>
                  <button
                    onClick={() => setSelectedDateFilter("this-week")}
                    className={`cursor-pointer transition-all pb-1.5 relative ${
                      selectedDateFilter === "this-week" ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent font-extrabold" : "text-brand-dim hover:text-brand-ink"
                    }`}
                  >
                    Najbliższe 7 dni
                  </button>
                  <button
                    onClick={() => setSelectedDateFilter("june")}
                    className={`cursor-pointer transition-all pb-1.5 relative ${
                      selectedDateFilter === "june" ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent font-extrabold" : "text-brand-dim hover:text-brand-ink"
                    }`}
                  >
                    Czerwiec 2026
                  </button>
                  <button
                    onClick={() => setSelectedDateFilter("july")}
                    className={`cursor-pointer transition-all pb-1.5 relative ${
                      selectedDateFilter === "july" ? "text-brand-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-accent font-extrabold" : "text-brand-dim hover:text-brand-ink"
                    }`}
                  >
                    Lipiec 2026
                  </button>
                </div>

                {/* Dropdowns & Wyszukiwarka tekstowa */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-3 items-center flex-1">
                    {/* Wyszukiwanie tekstowe */}
                    <div className="relative w-full md:max-w-xs">
                      <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        id="concert-text-search"
                        type="text"
                        placeholder="Szukaj wykonawcy, klubu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-200 focus:border-brand-accent pl-6 pr-2 py-2 text-xs text-brand-ink placeholder-zinc-400 focus:outline-none transition-all font-light"
                      />
                    </div>

                    {/* dropdown Miejsca */}
                    <div className="relative">
                      <select
                        id="venue-filter-select"
                        value={selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        className="bg-transparent border-b border-zinc-200 focus:border-brand-accent pr-6 pl-1 py-2 text-xs text-brand-ink font-light focus:outline-none cursor-pointer"
                      >
                        <option value="all">Wszystkie kluby / lokalizacje</option>
                        {venuesList.map((venue, idx) => (
                          <option key={idx} value={venue}>
                            {venue}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* dropdown Sortowanie */}
                    <div className="relative">
                      <select
                        id="sort-filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent border-b border-zinc-200 focus:border-brand-accent pr-6 pl-1 py-2 text-xs text-brand-ink font-light focus:outline-none cursor-pointer"
                      >
                        <option value="date-asc">Chronologicznie (najbliższe najpierw)</option>
                        <option value="date-desc">Chronologicznie (odległe najpierw)</option>
                        <option value="artist-name">Alfabetycznie (wykonawcy)</option>
                      </select>
                    </div>
                  </div>

                  {/* Reset filtrów */}
                  {(searchQuery || selectedVenue !== "all" || selectedDateFilter !== "all") && (
                    <button
                      id="btn-clear-filters"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedVenue("all");
                        setSelectedDateFilter("all");
                      }}
                      className="text-xs text-zinc-400 hover:text-brand-accent transition-all cursor-pointer font-bold underline decoration-dotted"
                    >
                      Resetuj filtry
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA WYDARZEŃ W POSTACI PŁASKICH WIERSZY (DIVIDER-BASED) */}
              {filteredConcerts.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <p className="text-brand-ink font-bold text-sm uppercase tracking-wide">Brak koncertów spełniających wybrane kryteria.</p>
                  <p className="text-xs text-brand-dim max-w-md mx-auto font-light">
                    Spróbuj zresetować aktywne filtry wyszukiwania lub przejdź do Piaskownicy, aby dodać nowe koncerty bezpośrednio z kodu.
                  </p>
                  <button
                    id="btn-retry-filters"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedVenue("all");
                      setSelectedDateFilter("all");
                    }}
                    className="bg-brand-accent hover:bg-black text-white text-xs font-semibold uppercase px-6 py-2.5 transition-all cursor-pointer"
                  >
                    Resetuj filtry
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 border-t border-zinc-200">
                  {filteredConcerts.map((concert) => {
                    const matchedArtists = artists.filter((a) => concert.artistIds?.includes(a.id));
                    return (
                      <ConcertCard
                        key={concert.id}
                        concert={concert}
                        artists={matchedArtists}
                        onSelectArtist={handleSelectArtistFromCard}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 1.5: ARCHIVE OF PAST CONCERTS */}
          {activeTab === "archive" && (
            <div className="space-y-8">
              {/* FILTRY DLA ARCHIWUM */}
              <div className="border-b border-zinc-200 pb-8 mb-4 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-3 items-center flex-1">
                    {/* Wyszukiwanie tekstowe */}
                    <div className="relative w-full md:max-w-xs">
                      <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        id="archive-text-search"
                        type="text"
                        placeholder="Szukaj w archiwum..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-200 focus:border-brand-accent pl-6 pr-2 py-2 text-xs text-brand-ink placeholder-zinc-400 focus:outline-none transition-all font-light"
                      />
                    </div>

                    {/* dropdown Miejsca */}
                    <div className="relative">
                      <select
                        id="archive-venue-filter-select"
                        value={selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        className="bg-transparent border-b border-zinc-200 focus:border-brand-accent pr-6 pl-1 py-2 text-xs text-brand-ink font-light focus:outline-none cursor-pointer"
                      >
                        <option value="all">Wszystkie kluby / lokalizacje</option>
                        {venuesList.map((venue, idx) => (
                          <option key={idx} value={venue}>
                            {venue}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reset filtrów */}
                  {(searchQuery || selectedVenue !== "all") && (
                    <button
                      id="btn-archive-clear-filters"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedVenue("all");
                      }}
                      className="text-xs text-zinc-400 hover:text-brand-accent transition-all cursor-pointer font-bold underline decoration-dotted"
                    >
                      Resetuj filtry
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA WYDARZEŃ ARCHIWALNYCH */}
              {filteredArchiveConcerts.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <p className="text-brand-ink font-bold text-sm uppercase tracking-wide">Brak archiwalnych koncertów spełniających wybrane kryteria.</p>
                  <p className="text-xs text-brand-dim max-w-md mx-auto font-light">
                    Archiwum zawiera wydarzenia, które odbyły się przed datą dzisiejszą (20.06.2026).
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 border-t border-zinc-200">
                  {filteredArchiveConcerts.map((concert) => {
                    const matchedArtists = artists.filter((a) => concert.artistIds?.includes(a.id));
                    return (
                      <ConcertCard
                        key={concert.id}
                        concert={concert}
                        artists={matchedArtists}
                        onSelectArtist={handleSelectArtistFromCard}
                        isArchived={true}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARTISTS PANEL */}
          {activeTab === "artists" && (
            <ArtistsPanel
              artists={artists}
              onAddArtist={handleAddArtist}
              onDeleteArtist={handleDeleteArtist}
            />
          )}

          {/* TAB 3: CRAWLER SANDBOX */}
          {activeTab === "sandbox" && (
            <CrawlerSandbox
              artists={artists}
              onAddConcert={handleAddConcert}
            />
          )}

          {/* TAB 4: PRZEWODNIK / GUIDE */}
          {activeTab === "guides" && (
            <GuidePanel />
          )}

        </div>
      </main>

      {/* STOPKA INFORMACYJNA */}
      <footer className="border-t-2 border-brand-ink py-8 px-4 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left text-xs text-brand-dim font-mono">
          <div>
            <span className="font-extrabold text-brand-ink uppercase">GdzieGrają • Jazz Wrocław</span>
            <p className="mt-1">Inspiracja darmowego wrocławskiego portalu muzycznego opartego o pliki JSON.</p>
          </div>
          <div>
            <span className="font-bold text-brand-ink">Wykonał: Asystent Google AI Studio dla rafszt@gmail.com</span>
            <p className="mt-1 text-[10px] text-brand-accent font-black uppercase">
              Udało się dopiąć spójny model danych i kompletną stronę!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
