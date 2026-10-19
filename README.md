# NFlix Mobile (Standalone React Native & Expo)

NFlix is a standalone Netflix-style streaming mobile application built with React Native and Expo. It runs **100% independently** on mobile devices without requiring any local backend server to be running.

---

## 🚀 Features

- **100% Standalone**: Direct TMDB API integration for trending movies, TV shows, genres, search, and metadata.
- **Failover Cloud Streaming**: 8 built-in cloud streaming servers with instant server switching (2Embed, VidLink Pro, MultiEmbed Hindi, Embed.su, SmashyStream, AutoEmbed, VidSrc, VidSrc.me).
- **Ad & Popup Interceptor**: Built-in script injection suppresses popups, blank tabs, and unwanted redirects.
- **TV Shows & Episodes**: Full episode browser with season selector and quick Next Episode navigation.
- **Offline Storage**: On-device Watchlist ("My List") and Continue Watching powered by `@react-native-async-storage/async-storage`.
- **Netflix Dark Aesthetic**: Sleek dark UI with backdrop gradients, poster carousels, and bottom-sheet details.

---

## 📲 How to Test on Your Phone (Instant)

1. Open a terminal in this folder:
   ```bash
   cd c:\Users\admin\Documents\GitHub\nflix-mobile
   ```
2. Start the Expo development server:
   ```bash
   npm start
   ```
3. Install the **Expo Go** app from the Google Play Store on your Android phone.
4. Scan the QR code displayed in the terminal with the Expo Go app. The app will open and run immediately!

---

## 📦 How to Generate Standalone Android APK

Since EAS Build runs in the cloud, you **do not need Android Studio or Java installed** on your computer.

1. In the `nflix-mobile` folder, run:
   ```bash
   npx eas-cli login
   ```
   *(Create a free account on [expo.dev](https://expo.dev) if you don't have one)*

2. Build the APK:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
3. When the cloud build finishes (usually 3–5 minutes), EAS will print a direct link to download your standalone `.apk` file!
4. Transfer that `.apk` to any Android phone and install it directly!
