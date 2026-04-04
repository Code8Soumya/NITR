Remove-Item -Recurse -Force .expo, .expo-shared, node_modules, package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Temp\metro-cache", "$env:LOCALAPPDATA\Temp\haste-map-*", "$env:TEMP\metro-cache", "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npx expo start --clear