# CampusVerse Mobile

Expo/React Native TypeScript milestone application using the existing CampusVerse Express API. It does not create or use a separate backend/database.

## API URL

The app defaults to the deployed production backend (`https://campusverse-s56y.onrender.com/api`), so it works on any network out of the box.

For local development, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to `http://10.0.2.2:5000/api` (Android Emulator's address for the development machine's localhost) or your machine's LAN IPv4 address for a physical device, e.g. `http://192.168.1.25:5000/api`. Ensure the local server is running and both devices are on the same network.

`EXPO_PUBLIC_API_BASE_URL` must include `/api`. `.env` is gitignored — do not place credentials/secrets in it regardless.

## Run

```sh
cd mobile
npm install
npx expo start
```

Press `a` to launch a configured Android emulator, or scan the Expo QR code with Expo Go on an Android device. For a physical phone, configure the LAN URL first. The app uses existing `POST /api/auth/login`, `GET /api/public/events/upcoming`, and student `GET /api/student/stats` endpoints.
