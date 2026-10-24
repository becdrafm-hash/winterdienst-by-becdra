# Gartenpflege: Aufgaben, Tagesübersicht und Geräte

Die Gartenpflege zeigt zuerst die heutigen Besuche in Uhrzeit-Reihenfolge und die dafür benötigten Geräte. Pflegeaufgaben haben getrennte Rhythmen und werden bestehenden Besuchen zugeordnet. Eine Aufgabe erzeugt keinen zusätzlichen Termin.

## Umsetzung

- Besuchsrhythmus in Wochen oder Kalendermonaten; Aufgaben bei jedem Besuch, in eigenem Abstand mit Spielraum, in jährlichen Monatsfenstern oder nach Bedarf.
- Automatische Vorschläge im Termin mit manueller Arbeitsauswahl. Wiederkehrende Sonderarbeiten werden pro Zeitfenster dem frühesten geeigneten Besuch zugeordnet. Zeitbedarf, fehlende Zuordnungen und zu späte Besuche bleiben sichtbar.
- Eigene Geräteliste; Zuordnung zu Aufgaben und gemeinsame Tagesübersicht ohne doppelte Geräte oder Abhaken.
- Besuchsabschluss verknüpft die tatsächlichen Erledigungen mit stabilen Aufgaben-IDs. Unerledigte Arbeiten und separate Zusatzfreigaben werden nicht als erledigt behandelt.
- Grüne, beim Bearbeiten erreichbare Speicherknöpfe mit tatsächlicher Rückmeldung. Kalenderzellen und Terminlisten werden chronologisch sortiert.
- Bisherige Checklisten bleiben ohne automatische Schreibmigration verwendbar. Geräte, Rhythmen und Zuordnungen werden in den vollständigen Gartenpflege-Export aufgenommen. Originalfotos und Winterdienstlogik bleiben erhalten.

## Nachgewiesene Prüfung

- `npm run build`: TypeScript und Produktionsbuild erfolgreich.
- `npm run lint`: erfolgreich.
- `npm run test:logic`: 28 Tests erfolgreich; inklusive Monatsenden/Schaltjahr, ISO-Wochen, mehrfach jährlicher Aufgaben, Bündelung, Saison und alten Sicherungen sowie bestehender Winterdienstprüfungen.
- Chromium mit deutschem Gebietsschema und Europe/Berlin: Übersichtsreihenfolge, Geräte ohne Abhaken, Kalenderzellen 09:00 vor 13:00, manuelle Terminaufgaben, Geräte ergänzen, Pflegeplan bearbeiten, speichern und nachladen, offene Beobachtung speichern, Besuch mit unerledigter Hecke abschließen.
- Vollständiger Export mit unveränderten Originalfotobytes und Prüfsumme; Wiederherstellung in einem frischen Browserprofil mit erhaltenen fremden Winterdienstdaten.
- Keine Browserfehler; keine horizontale Überbreite bei 320/390 Pixeln oder Desktop mit 1280 Pixeln.

## Grenzen

Die App speichert weiterhin im Browser des jeweiligen Geräts. Ein vorbereiteter Download ist keine bestätigte externe Sicherung. Google Drive und Google Kalender sind noch nicht automatisch verbunden. Pflanzenabhängige Schnittfreigaben, Wetter, Fahrzeiten und tatsächliche Fahrzeugbeladung werden nicht automatisch geprüft. Zeitfenster und Gerätezuordnungen pflegt der Nutzer; ein längerer Besuch wird nach einem Hinweis bewusst verschoben oder verlängert. Wiederkehrende Intervalle werden nach dokumentierter Erledigung neu berechnet.
