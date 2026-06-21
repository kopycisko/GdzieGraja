import React, { useState } from "react";
import { Artist } from "../types";
import { Search, UserPlus, Users, Link2, Copy, Check, Info, Trash2 } from "lucide-react";

interface ArtistsPanelProps {
  artists: Artist[];
  onAddArtist: (newArtist: Artist) => void;
  onDeleteArtist: (id: string) => void;
}

export default function ArtistsPanel({ artists, onAddArtist, onDeleteArtist }: ArtistsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Stan formularza nowego artysty
  const [showAddForm, setShowAddForm] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const [newArtistGenres, setNewArtistGenres] = useState("Jazz");
  const [newArtistAliases, setNewArtistAliases] = useState("");
  const [newArtistMembers, setNewArtistMembers] = useState("");
  const [newArtistDescription, setNewArtistDescription] = useState("");
  const [newArtistWebsite, setNewArtistWebsite] = useState("");
  const [newArtistSpotify, setNewArtistSpotify] = useState("");

  const [formError, setFormError] = useState("");

  const handleCopyJson = (type: "artists" | "schema") => {
    let dataToCopy = "";
    if (type === "artists") {
      dataToCopy = JSON.stringify(artists, null, 2);
    } else {
      dataToCopy = `{
  "id": "unikalny-id-artysty",
  "name": "Nazwa Zespołu",
  "genres": ["Gatunek muzyczny 1", "Gatunek muzyczny 2"],
  "aliases": ["Alternatywna Nazwa 1", "Alternatywna Nazwa 2"],
  "members": ["Imię Nazwisko 1", "Imię Nazwisko 2"],
  "description": "Krótki opis biograficzny zespołu.",
  "website": "https://strona-artysty.pl",
  "spotify": "https://open.spotify.com/artist/..."
}`;
    }

    navigator.clipboard.writeText(dataToCopy);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newArtistName.trim()) {
      setFormError("Nazwa wykonawcy jest wymagana.");
      return;
    }

    // Wygeneruj ładny slug-id
    const generatedId = newArtistName
      .toLowerCase()
      .replace(/ł/g, "l")
      .replace(/ą/g, "a")
      .replace(/ę/g, "e")
      .replace(/ó/g, "o")
      .replace(/ś/g, "s")
      .replace(/ć/g, "c")
      .replace(/ź/g, "z")
      .replace(/ż/g, "z")
      .replace(/ń/g, "n")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // Sprawdź czy już istnieje
    if (artists.some(a => a.id === generatedId)) {
      setFormError("Artysta o takiej nazwie lub podobnym ID już istnieje w bazie.");
      return;
    }

    const cleanAliases = newArtistAliases
      .split(",")
      .map(alias => alias.trim())
      .filter(alias => alias.length > 0);

    const cleanMembers = newArtistMembers
      .split(",")
      .map(member => member.trim())
      .filter(member => member.length > 0);

    const cleanGenres = newArtistGenres
      .split(",")
      .map(genre => genre.trim())
      .filter(genre => genre.length > 0);

    const createdArtist: Artist = {
      id: generatedId,
      name: newArtistName.trim(),
      genres: cleanGenres.length > 0 ? cleanGenres : ["Jazz"],
      aliases: cleanAliases,
      members: cleanMembers,
      description: newArtistDescription.trim() || "Brak opisu bibliotecznego.",
      website: newArtistWebsite.trim() || undefined,
      spotify: newArtistSpotify.trim() || undefined
    };

    onAddArtist(createdArtist);

    // Reset formularza
    setNewArtistName("");
    setNewArtistGenres("Jazz");
    setNewArtistAliases("");
    setNewArtistMembers("");
    setNewArtistDescription("");
    setNewArtistWebsite("");
    setNewArtistSpotify("");
    setShowAddForm(false);
  };

  const filteredArtists = artists.filter(artist => {
    const query = searchQuery.toLowerCase();
    return (
      artist.name.toLowerCase().includes(query) ||
      (artist.genres || []).some(g => g.toLowerCase().includes(query)) ||
      artist.aliases.some(alias => alias.toLowerCase().includes(query)) ||
      artist.members.some(member => member.toLowerCase().includes(query))
    );
  });

  return (
    <div id="artists-panel" className="space-y-8">
      {/* Opis sekcji i narzędzia bazy */}
      <div className="border-b border-zinc-200 pb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
            <Users className="w-4 h-4 text-brand-accent inline" />
            <span>Słownik Systemowy</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-ink uppercase">
            Baza Zdefiniowanych Wykonawców
          </h2>
          <p className="text-xs text-brand-dim leading-relaxed font-light">
            Nasz model kategoryzacji dopasowuje surowy tekst pobierany ze stron klubów w oparciu o ten słownik. Wykrycie nazwy, aliasów lub nazwisk kluczowych muzyków automatycznie kategoryzuje koncert, dokleja gatunek oraz podłącza kompletny biogram informacyjny.
          </p>
        </div>

        {/* Akcje bazy */}
        <div className="flex flex-wrap gap-3 shrink-0 py-1">
          <button
            id="btn-copy-artists-json"
            onClick={() => handleCopyJson("artists")}
            className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 hover:border-brand-accent hover:bg-white text-brand-ink font-mono text-xs px-4 py-2 transition-all cursor-pointer font-medium"
          >
            {copiedText === "artists" ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-accent" />
                <span className="text-brand-accent">Skopiowano!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-brand-accent" />
                <span>Klucze JSON</span>
              </>
            )}
          </button>
          
          <button
            id="btn-copy-schema-json"
            onClick={() => handleCopyJson("schema")}
            className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 hover:border-brand-accent hover:bg-white text-zinc-500 hover:text-brand-ink font-mono text-xs px-4 py-2 transition-all cursor-pointer font-medium"
          >
            {copiedText === "schema" ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-accent" />
                <span className="text-brand-accent">Skopiowano!</span>
              </>
            ) : (
              <>
                <Info className="w-3.5 h-3.5 text-zinc-400" />
                <span>Schemat struktury</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Górna wyszukiwarka i toggle formularza */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            id="artist-search"
            type="text"
            placeholder="Filtruj słownik po zespole, muzykach, gatunku..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-200 focus:border-brand-accent pl-6 pr-4 py-2 text-xs text-brand-ink placeholder-zinc-400 focus:outline-none transition-all font-light"
          />
        </div>

        <button
          id="btn-toggle-add-artist"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-black text-white text-xs font-semibold uppercase px-5 py-2.5 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? "Zamknij" : "Dodaj Wykonawcę"}</span>
        </button>
      </div>

      {/* Formularz dodawania nowego artysty */}
      {showAddForm && (
        <form
          id="add-artist-form"
          onSubmit={handleSubmit}
          className="bg-zinc-50 border border-zinc-200 p-6 space-y-4"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#111111] border-b border-zinc-200 pb-2">
            Dodawanie nowego profilu do słownika
          </h3>

          {formError && (
            <div className="bg-brand-accent/5 border border-brand-accent text-brand-accent text-xs p-3 font-mono">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                Nazwa Zespołu / Artysty *
              </label>
              <input
                id="form-artist-name"
                type="text"
                required
                placeholder="np. Piotr Wojtasik Quintet"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                Gatunki Muzyczne (rozdzielaj przecinkami)
              </label>
              <input
                id="form-artist-genres"
                type="text"
                placeholder="np. Modern Jazz, Hard-bop, Fusion"
                value={newArtistGenres}
                onChange={(e) => setNewArtistGenres(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase text-brand-dim font-bold">
                  Aliasy i Alternatywne Nazwy
                </label>
                <span className="text-[9px] text-zinc-400">Rozdzielaj przecinkami</span>
              </div>
              <input
                id="form-artist-aliases"
                type="text"
                placeholder="np. Wojtasik Quintet, Piotr Wojtasik"
                value={newArtistAliases}
                onChange={(e) => setNewArtistAliases(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase text-brand-dim font-bold">
                  Członkowie / Instrumentaliści
                </label>
                <span className="text-[9px] text-zinc-400">Rozdzielaj przecinkami</span>
              </div>
              <input
                id="form-artist-members"
                type="text"
                placeholder="np. Piotr Wojtasik, Kazimierz Jonkisz, Marcin Kaletka"
                value={newArtistMembers}
                onChange={(e) => setNewArtistMembers(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
              Krótka notka biograficzna
            </label>
            <textarea
              id="form-artist-desc"
              rows={3}
              placeholder="Napisz krótki biogram..."
              value={newArtistDescription}
              onChange={(e) => setNewArtistDescription(e.target.value)}
              className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                Oficjalna strona internetowa URL
              </label>
              <input
                id="form-artist-website"
                type="url"
                placeholder="https://mojastrona.pl"
                value={newArtistWebsite}
                onChange={(e) => setNewArtistWebsite(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-brand-dim mb-1 font-bold">
                Link do Spotify Artist URL
              </label>
              <input
                id="form-artist-spotify"
                type="url"
                placeholder="https://open.spotify.com/artist/..."
                value={newArtistSpotify}
                onChange={(e) => setNewArtistSpotify(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-brand-accent pl-3 pr-3 py-2 text-xs text-brand-ink placeholder-zinc-350 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="btn-cancel-artist"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold uppercase text-zinc-400 hover:text-brand-ink transition-all cursor-pointer"
            >
              Anuluj
            </button>
            <button
              id="btn-submit-artist"
              type="submit"
              className="bg-brand-accent hover:bg-black text-white text-xs font-semibold uppercase px-5 py-2.5 transition-all cursor-pointer"
            >
              Zapisz Wykonawcę
            </button>
          </div>
        </form>
      )}

      {/* Grid z katalogiem artystów */}
      {filteredArtists.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-zinc-400 font-light text-sm">Brak wykonawców spełniających kryteria wyszukiwania.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-100 pt-8">
          {filteredArtists.map((artist) => (
            <div
              id={`artist-item-${artist.id}`}
              key={artist.id}
              className="flex flex-col justify-between py-2 border-b border-zinc-100 pb-6 group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-baseline gap-2">
                  <h4 className="text-xl font-bold tracking-tight text-[#111111] group-hover:text-brand-accent transition-colors">
                    {artist.name}
                  </h4>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brand-accent shrink-0 text-right">
                    {(artist.genres || []).join(", ")}
                  </span>
                </div>

                <p className="text-xs text-brand-dim leading-relaxed font-light line-clamp-3">
                  {artist.description}
                </p>

                {/* Sekcja logiczna dopasowań: aliasy i muzycy */}
                <div className="space-y-3 pt-4 border-t border-zinc-100 text-[10px]">
                  {artist.aliases.length > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-zinc-400 uppercase font-bold tracking-wider shrink-0 w-20">Aliasy:</span>
                      <span className="text-brand-ink font-light font-mono truncate">
                        {artist.aliases.join(", ")}
                      </span>
                    </div>
                  )}

                  {artist.members.length > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-zinc-400 uppercase font-bold tracking-wider shrink-0 w-20">Skład:</span>
                      <span className="text-brand-ink font-light font-mono truncate">
                        {artist.members.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linki i przycisk usuwania */}
              <div className="mt-6 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  {artist.website && (
                    <a
                      id={`link-artist-web-${artist.id}`}
                      href={artist.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-zinc-500 hover:text-brand-accent transition"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>WWW</span>
                    </a>
                  )}

                  {artist.spotify && (
                    <a
                      id={`link-artist-spotify-${artist.id}`}
                      href={artist.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#111111] hover:text-brand-accent transition"
                    >
                      <span>Spotify profil</span>
                    </a>
                  )}
                </div>

                {/* Usuwanie z bazy */}
                {artist.id !== "marcin-wasilewski-trio" && (
                  <button
                    id={`btn-delete-artist-${artist.id}`}
                    onClick={() => onDeleteArtist(artist.id)}
                    className="text-zinc-300 hover:text-brand-accent transition p-1 cursor-pointer"
                    title="Usuń ze słownika"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
