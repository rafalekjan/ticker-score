# ticker-score

Aplikacja do selekcji `Swing Options` zbudowana na Twoim procesie (Blueprint) z:
- TradingView UDF (realne endpointy),
- backendem API,
- zapisem setupow do PostgreSQL,
- uruchamianiem przez `docker compose`.

## Co pobiera z TradingView (UDF)

Backend podpina realne endpointy UDF:
- `GET /config`
- `GET /search`
- `GET /symbols`
- `GET /symbol_info`
- `GET /quotes`
- `GET /history`
- `GET /time`
- `GET /marks`
- `GET /timescale_marks`

W aplikacji sa endpointy proxy:
- `GET /api/tv/config`
- `GET /api/tv/search`
- `GET /api/tv/symbol`
- `GET /api/tv/symbol-info`
- `GET /api/tv/quote`
- `GET /api/tv/history`
- `GET /api/tv/time`
- `GET /api/tv/marks`
- `GET /api/tv/timescale-marks`
- `GET /api/tv/ticker-bundle` (agregat: config + quote + history + time)

## Setupy w bazie

Tabela `setups` (PostgreSQL) zapisuje:
- ticker i TV symbol,
- parametry selekcji kontraktu,
- chain opcji,
- decyzje silnika (`status`, `reasonCodes`, `selectedContract`, alternatywy),
- notatki i timestampy.

Endpointy:
- `POST /api/setups` - licz decyzje i zapisz setup
- `GET /api/setups` - lista setupow
- `GET /api/setups/:id` - szczegoly
- `PATCH /api/setups/:id` - aktualizacja

## Docker Compose

```bash
docker compose up --build
```

Serwisy:
- `app` -> `http://localhost:3000`
- `db` (PostgreSQL) -> dostepne wewnatrz docker network jako host `db:5432`

Strony UI:
- `/` - dashboard i nawigacja
- `/spy.html` - osobna strona SPY Gate
- `/stocks.html` - osobna strona danych stocka z TV
- `/setups.html` - osobna strona selekcji i zapisu Swing Setup

Domyslne dane DB:
- db: `ticker_score`
- user: `postgres`
- pass: `postgres`

Migracja tabeli wykonywana jest automatycznie przez `db/init.sql`.

## Lokalnie bez Dockera

Wymagane: Node.js 20+ i PostgreSQL.

```bash
npm install
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/ticker_score
npm start
```

## Wazne ograniczenie TradingView UDF

UDF nie udostepnia pelnego chaina opcji jako gotowego endpointu opcyjnego.
Dlatego chain opcji w MVP podajesz do silnika (`optionsChain`) z zewnetrznego zrodla (broker / data vendor / manual import).

Dokumentacja UDF:
- https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF/

