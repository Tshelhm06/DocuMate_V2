# DocuMate - Project I features, rebuilt for Android + iOS (React Native / Expo)

This is the starting point for Project II: exactly the features of the Project I Android app, now in one
React Native (Expo) codebase that runs on both Android and iOS. The new Project II features are added on top later.

## What is included (Project I features)
- Welcome screen, Sign up, Login, Logout (Firebase Authentication) and "Continue offline"
- Home dashboard: document count, category tiles, recent files
- Documents: add, view, edit, delete PDF / image files (copied into app storage), category chips, search
- Document details with Share / View
- Reminders tab: add a reminder with a date, "next reminder" card, upcoming list
- Profile, Edit profile, About

## Not included yet (Project II work)
Forgot password by email, expiry notifications, biometric / PIN app lock, cloud backup and restore,
optional scanning, sort/filter and dark mode.

## Run it
Needs Node 22.13+ and the Expo Go app.

```
npm install
copy .env.example .env      (then fill in the Firebase values)
npx expo start -c
```
Scan the QR code with Expo Go. Every time you edit `.env`, stop the server (Ctrl+C) and run `npx expo start -c` again.
Without Firebase keys the app still opens and "Continue offline" works.

## Firebase (login only)
1. Firebase console > your project > Project settings > Your apps > add a **Web app** and copy its `firebaseConfig` values into `.env`.
2. Authentication > Sign-in method > enable **Email/Password**.

## Tests
`npm test` runs the logic checks (dates, file types, validation).

## Notes
The SQLite tables already contain a few columns (cloud id, backed-up time) that Project II will use for backup;
they are unused in this version.
