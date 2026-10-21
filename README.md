# Becdra FM – Gartenpflege und Winterdienst

Die erste Gartenpflege-Erweiterung der bestehenden React-/TypeScript-App.

Start: `npm ci` und `npm run dev`.
Build: `npm run build`. Tests: `npm run test:logic`. Codeprüfung: `npm run lint`.

**Vor Nutzung und Update bitte ANLEITUNG.md lesen.** Sie enthält Aktualisierungsschritte, den Funktionsumfang und die noch fehlenden Google-Verbindungen.

Die App speichert lokal im Browser: Winterdienst in localStorage, Gartenpflegedaten und Originalbilder in IndexedDB. Beide Bereiche besitzen derzeit getrennte Sicherungen. `src/garden/` enthält das neue Modul; bestehende Kunden werden gemeinsam verwendet.
