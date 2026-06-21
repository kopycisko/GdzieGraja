# 🎷 GdzieGrają Wrocław (CGK)

**GdzieGrają** (Co Gdzie Kiedy) to minimalistyczna, w pełni zautomatyzowana aplikacja webowa będąca kompletnym, miejskim agregatorem koncertów jazzowych, bluesowych i muzyki improwizowanej we Wrocławiu. 

Projekt powstał z potrzeby stworzenia jednego, przejrzystego miejsca w sieci, które bez zbędnego szumu i reklam odpowiada na proste pytanie: *Kto, gdzie i kiedy dzisiaj gra?*

---

## 🚀 Jak to działa? (Architektura Serverless / Server-side-less)

Strona działa jako **w 100% statyczna aplikacja** hostowana za darmo na **GitHub Pages**. Cała dynamika i świeżość danych opiera się na cyklicznym potoku automatyzacji (CI/CD) uruchamianym w chmurze bez dedykowanego serwera i bez płatnych baz danych SQL.

1. **Crawl & Clean (Crawl4AI):** Codziennie o 4:00 rano bot uruchamia wirtualną przeglądarkę (Headless Chromium sterowane przez Playwright) i pobiera zawartość wrocławskich klubów (np. Vertigo, Rura) oraz instytucji kultury (NFM), radząc sobie z dynamicznym JavaScriptem i paginacją URL.
2. **AI Extraction (Gemini 1.5 Flash):** Pobrany, surowy kod stron jest agregowany i czyszczony do formatu Markdown, a następnie wysyłany w jednym zapytaniu do darmowego API w Google AI Studio. Sztuczna inteligencja na podstawie ścisłego schematu wyjściowego (Structured Outputs / Pydantic) ekstrahuje czysty obiekt JSON zawierający daty, godziny, tytuły i wykonawców.
3. **Inteligentny Matcher (Ochrona przed szumem):** Skrypt w Pythonie filtruje i klasyfikuje koncerty na podstawie autorskiej bazy znanych artystów (`artists.ts`), wykorzystując zaawansowane dopasowywanie rozmyte (odległość Levenshteina + word overlap). Nieznani artyści są odrzucani, a raport o nich trafia bezpośrednio do autora.
4. **Auto-Deploy (Vite + React):** Jeśli bot wykryje nowe koncerty, automatycznie aktualizuje pliki TypeScript bazy danych (`concerts_upcoming.ts`), robi `git commit` i uruchamia proces budowania frontendu w Vite, który w ciągu kilkudziesięciu sekund odświeża produkcyjną wersję strony w sieci.

---

## 🛠️ Stos Technologiczny

* **Frontend:** React, Vite, TypeScript (minimalistyczny, ultra-szybki, nowoczesny UI)
* **Automatyzacja:** GitHub Actions (Cron Job raz na dobę o 04:00 UTC)
* **Silnik Scrapujący:** Python 3.10+, Crawl4AI, Playwright (Headless Chromium)
* **Sztuczna Inteligencja:** Google Gemini 1.5 Flash SDK (Darmowy pakiet deweloperski)
* **Hosting:** GitHub Pages (0 zł za utrzymanie)

---

## 📂 Struktura Projektu

```text
├── .github/workflows/
│   └── scraper.yml         # Definicja 2-etapowego pipeline'u GitHub Actions
├── crawler/
│   ├── run.py              # Główny skrypt sterujący procesem w Pythonie
│   └── .env.example        # Szablon zmiennych środowiskowych (lokalny test)
├── src/
│   ├── data/
│   │   ├── artists.ts           # Słownik znanych artystów i zespołów (Baza Filtra)
│   │   ├── concerts_upcoming.ts # [AUTO] Aktualne, nadchodzące wydarzenia
│   │   └── concerts_archive.ts  # [AUTO] Archiwalne, minione wydarzenia
│   ├── components/              # Komponenty React (Sortowanie, Filtry, UI)
│   └── App.tsx                  # Główny interfejs aplikacji
└── package.json
```

---

## 💻 Uruchomienie Lokalne (Development)

* Klonowanie i Frontend (Node.js)
Bash
git clone [https://github.com/twoj-username/gdzie-graja.git](https://github.com/twoj-username/gdzie-graja.git)
cd gdzie-graja
npm install
npm run dev
* Konfiguracja i uruchomienie crawlera (Python)
Wejdź do katalogu i przygotuj wirtualne środowisko w systemie Ubuntu/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt # (lub zainstaluj ręcznie: crawl4ai, google-genai, pydantic, python-dotenv)
playwright install chromium
```
* Skopiuj plik .env.example jako .env i uzupełnij swój token deweloperski z Google AI Studio:

```text
GEMINI_API_KEY="TwojKluczAPI"
```
* Uruchomienie skryptu lokalnie (w trybie rzeczywistym z API lub domyślnym mock-mode przy braku klucza):

```Bash
python3 crawler/run.py
```

---

## 🔒 Bezpieczeństwo i Limity

Projekt działa w 100% w darmowych limitach (Free Tier). Skrypt agreguje dane w jeden prompt, wykonując zaledwie jedno zapytanie dziennie do Gemini, drastycznie oszczędzając tokeny i unikając błędów HTTP 429 (Rate Limit).

Klucze autoryzacyjne API nigdy nie są upubliczniane w repozytorium – GitHub Actions przekazuje je bezpiecznie za pomocą mechanizmu GitHub Secrets.

---

## 📄 Licencja
Projekt udostępniany jest na warunkach Licencji MIT. Szczegóły znajdują się w pliku LICENSE.
