import React from "react";
import { Concert, Artist } from "../types";
import { MapPin, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";

interface ConcertCardProps {
  key?: any;
  concert: Concert;
  artists: Artist[];
  onSelectArtist: (artistId: string) => void;
  isArchived?: boolean;
}

export default function ConcertCard({ concert, artists, onSelectArtist, isArchived = false }: ConcertCardProps) {
  const isClassified = artists.length > 0;

  // Sformatowanie daty na czytelne części do minimalistycznego sformatowania szwajcarskiego
  const getPartsOfDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return { day: dateStr, month: "", weekday: "" };
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const day = parts[2]; // np. "25"
      const month = date.toLocaleDateString("pl-PL", { month: "long" }); // np. "czerwca"
      const weekday = date.toLocaleDateString("pl-PL", { weekday: "long" }); // np. "czwartek"
      return { day, month, weekday };
    } catch {
      return { day: dateStr, month: "", weekday: "" };
    }
  };

  const { day, month, weekday } = getPartsOfDate(concert.date);

  return (
    <div
      id={`concert-row-${concert.id}`}
      className="flex flex-col md:flex-row items-start md:items-center justify-between py-8 gap-6 group hover:bg-neutral-50/50 px-4 -mx-4 transition-all duration-150 border-b border-zinc-200"
    >
      {/* Kolumna 1 (Data i godzina): wysoka ekspresja typograficzna */}
      <div className="flex flex-row md:flex-col items-baseline md:items-start select-none w-full md:w-36 shrink-0 gap-x-2">
        <span className="text-4xl md:text-5xl font-light tracking-tight text-brand-ink leading-none font-sans group-hover:text-brand-accent transition-colors">
          {day}
        </span>
        <div className="flex md:flex-col items-baseline md:items-start gap-x-1.5 md:gap-x-0 md:mt-1.5 text-[11px] tracking-widest text-brand-dim uppercase font-semibold">
          <span className="font-bold text-brand-ink">{month}</span>
          <span className="md:hidden text-zinc-300">•</span>
          <span>{weekday}</span>
          <span className="font-light mx-1 hidden md:inline-block">•</span>
          <span className="font-mono text-zinc-400 font-medium">{concert.time}</span>
        </div>
      </div>

      {/* Kolumna 2 (Nazwa i wykonawcy) */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-brand-ink leading-tight group-hover:text-brand-accent transition-colors duration-200">
            {concert.title || (isClassified ? artists.map(a => a.name).join(" & ") : concert.rawArtistName)}
          </h3>
          
          {/* Subtelny marker kategoryzacji */}
          {isClassified ? (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5" title={`Dopasowano do oficjalnych profili: ${artists.map(a => a.name).join(", ")}`}>
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Zweryfikowany jazz ({artists.length})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5" title="Brak bezpośredniego powiązania w słowniku wykonawców">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Surowy pobrany wpis</span>
            </span>
          )}

          {isClassified && Array.from(new Set(artists.flatMap(a => a.genres || []))).map(genre => (
            <span key={genre} className="inline-block text-[9px] uppercase tracking-widest font-semibold text-brand-accent border border-brand-accent/20 px-1.5 py-0.5">
              {genre}
            </span>
          ))}
        </div>

        {/* Podgląd wykonawców i klub */}
        <div className="text-sm text-brand-dim leading-relaxed font-light">
          {concert.title && (
            <div className="text-xs text-brand-dim mb-1 font-medium">
              <span>Wykonawcy: </span>
              {isClassified ? (
                <span className="font-semibold text-brand-ink">
                  {artists.map(a => a.name).join(", ")}
                </span>
              ) : (
                <span className="font-semibold text-brand-ink">{concert.rawArtistName}</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
            <span className="flex items-center gap-1 text-brand-ink font-medium">
              <MapPin className="w-3.5 h-3.5 text-brand-accent" /> {concert.venue}
            </span>
            <span className="text-zinc-300">•</span>
            <span className="font-semibold text-brand-accent">
              Wstęp: {concert.price}
            </span>
          </div>
        </div>
      </div>

      {/* Kolumna 3 (Akcje i odnośniki) */}
      <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto mt-2 md:mt-0 shrink-0">
        {isClassified && (
          <div className="flex flex-row md:flex-col md:items-end gap-x-3 gap-y-1.5 flex-wrap">
            {artists.map(artist => (
              <button
                key={artist.id}
                id={`btn-view-artist-${artist.id}`}
                onClick={() => onSelectArtist(artist.id)}
                className="text-[10px] text-zinc-500 hover:text-brand-accent hover:underline uppercase tracking-wider font-bold cursor-pointer transition-colors"
              >
                Profil: {artist.name}
              </button>
            ))}
          </div>
        )}
        
        {isArchived ? (
          <span className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 text-zinc-400 font-bold text-[10px] tracking-widest uppercase px-5 py-3 select-none w-full md:w-auto">
            Wydarzenie minione
          </span>
        ) : (
          <a
            id={`btn-ticket-${concert.id}`}
            href={concert.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-brand-accent text-white hover:bg-brand-ink font-semibold text-xs tracking-wider uppercase px-5 py-3 transition-all duration-150 text-center w-full md:w-auto"
          >
            <span>Więcej szczegółów</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
