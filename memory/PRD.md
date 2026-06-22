# TraderDirectory — PRD

## Goal
Mobile app that finds traders/local businesses for a given product in a chosen area, lists them in a clean brutalist UI, and exports the result set to Excel for offline use.

## Stack
- Frontend: Expo (React Native) + expo-router
- Backend: FastAPI + MongoDB (Motor)
- Search provider: SerpAPI (engine=google_maps)
- Excel: openpyxl on backend → base64 → expo-file-system → expo-sharing / expo-mail-composer

## Features
1. Home screen with product input, location input, GPS auto-fill (expo-location), and large SEARCH button
2. Search history (last 50) stored in MongoDB, tap to revisit
3. Results screen showing trader cards: name, category/industry, phone (tap to call), address, website (tap to open), rating
4. Sticky bottom export bar: EMAIL (expo-mail-composer) + EXPORT TO EXCEL (share .xlsx)

## API
- `POST /api/search` — body `{product, location, latitude?, longitude?}` → traders + saves history
- `POST /api/export-excel` — body `{product, location, traders[]}` → `{filename, base64, mime_type}`
- `GET /api/history` — last 50 searches
- `GET /api/history/{id}` — full search w/ traders
- `DELETE /api/history/{id}`

## Design
Brutalist mobile: zero radius, 1.5pt borders, mono metadata, brand orange #FF5500 for primary actions, square initials avatars.

## Env
- `SERPAPI_KEY` in `/app/backend/.env` (provided)
- `EXPO_PUBLIC_BACKEND_URL` in `/app/frontend/.env`
