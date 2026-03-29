---
description: "Use when writing React Native code, Expo configurations (app.json), or UI components to enforce Android-first development and optimizations. Prevents generating pure web code."
applyTo: "**/*.{ts,tsx,js,jsx,json}"
---

# Android-First Development Guardrails

This project primarily targets **Android** using React Native and Expo. When generating code, formatting UI, or setting up configurations, you MUST adhere to the following constraints:

1. **Native Primitives over Web Elements**: 
   - NEVER use HTML DOM elements like `<div>`, `<span>`, `<input>`, or `<button>`. 
   - Always use React Native core components: `<View>`, `<Text>`, `<TextInput>`, `<Pressable>`, `<TouchableOpacity>`.

2. **Web API Restrictions**: 
   - Do NOT use `window`, `document`, or `localStorage`.
   - Rely on Expo alternatives (e.g., `expo-secure-store` for storage or `Dimensions.get('window')` / `useWindowDimensions()` from `react-native`).

3. **Android Styling & UI/UX**: 
   - Using NativeWind/Tailwind is required, but be mindful of Android rendering quirks.
   - For shadows on Android, use the `elevation` property alongside shadow colors.
   - Consider Android's safe areas and status bar heights natively using `react-native-safe-area-context`.

4. **Expo Configuration**:
   - For configuration files (e.g., `app.json`), always prioritize the `android` block (e.g., `package`, `adaptiveIcon`, `permissions`).

5. **Platform Specific Code**: 
   - If a feature behaves fundamentally differently across platforms, default to treating `Platform.OS === 'android'` as the primary logical branch.