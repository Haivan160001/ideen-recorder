# Ideen-Recorder

Kleine Web-App (PWA), um unterwegs Aufgaben und Ideen **per Sprache** zu erfassen.
Ein Antippen = eine Aufnahme = ein Eintrag. Die Einträge lassen sich als JSON
exportieren und am PC weiterverarbeiten.

## Bedienung

| Aktion | Was passiert |
|---|---|
| **Aufnahme starten** | Diktat läuft (Deutsch). Sprechpausen sind unkritisch — die App setzt die Erkennung selbsttätig fort. |
| **Stoppen & speichern** | Der erkannte Text wird als ein Eintrag mit Zeitstempel gespeichert. |
| **bearbeiten** | Erkennungsfehler direkt im Eintrag korrigieren. |
| **Export für PC** | Legt `ideen-JJJJ-MM-TT-hhmm.json` im Download-Ordner des Handys ab. |

## Wo die Daten liegen

Ausschließlich im `localStorage` des Browsers auf dem Handy. Es gibt keinen
Server und kein Konto — nichts wird hochgeladen. Der Export ist der einzige Weg,
die Einträge herauszubekommen.

> Die Spracherkennung selbst läuft über Googles Dienst und braucht deshalb eine
> Internetverbindung. Die App-Hülle funktioniert dank Service Worker auch offline,
> das Diktieren nicht.

## Übergabe an den PC

1. Auf dem Handy **Export für PC** antippen.
2. Handy per USB anstöpseln (USB-Debugging aktiv).
3. Am PC die Datei abholen:

```bash
adb shell ls /sdcard/Download/ideen-*.json
adb pull /sdcard/Download/ideen-2026-09-16-0930.json ./eingang/
```

## Exportformat

```jsonc
{
  "app": "ideen-recorder",
  "version": 1,
  "exportedAt": "2026-09-16T09:30:00.000Z",
  "device": "Mozilla/5.0 (Linux; Android 10; K) …",
  "count": 2,
  "entries": [
    {
      "id": "m1a2b3c-x7k9qp",   // stabil, eignet sich zum Entdoppeln
      "text": "Angebot für Müller bis Freitag rausschicken",
      "ts": 1789543800000,      // Unix-Millisekunden der Aufnahme
      "source": "voice",
      "edited": 1789543905000   // nur vorhanden, wenn nachträglich korrigiert
    }
  ]
}
```

Exportiert wird **immer der komplette Bestand**, nicht nur das Neue. Die
PC-Seite entdoppelt über `id` — so geht nichts verloren, wenn ein Export mal
übersprungen wird.

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html` | Oberfläche, Aufnahmesteuerung, Speicher, Export |
| `assemble.js` | Setzt die Teilergebnisse der Erkennung zum gesprochenen Text zusammen |
| `test-assemble.js` | Testfälle dazu, inklusive echter Bruchstücke vom Gerät |
| `manifest.webmanifest` | Macht die App auf dem Homescreen installierbar |
| `sw.js` | Service Worker, hält die App-Hülle offline bereit |
| `icon-192.png`, `icon-512.png` | App-Icons, per Skript erzeugt |

Tests laufen ohne Node im Windows Script Host:

```
cscript //nologo //E:JScript test-assemble.js
```

## Warum `assemble.js` existiert

Chrome auf Android hält sich nicht an die Web-Speech-Semantik. Statt ein
Ergebnis fortzuschreiben, legt es **jede Zwischenfassung als eigenen Eintrag**
in `results` ab und markiert sie obendrein als endgültig:

```js
["der", "der Terminkalender", "der Terminkalender soll", "nicht", "nicht jetzt"]
```

Beide naheliegenden Auswertungen gehen schief: neue Endergebnisse anhängen
ergibt `"der der Terminkalender der Terminkalender soll …"`, und das Array
zusammenzufügen ebenfalls. Richtig ist, aufeinander aufbauende Fassungen
einander **ersetzen** zu lassen und nur bei einem echten Bruch einen neuen
Abschnitt zu beginnen.

Drei Fälle treten dabei real auf — alle drei sind in `test-assemble.js` mit
Aufnahmen vom Gerät belegt:

| Fall | Beispiel | Behandlung |
|---|---|---|
| Verlängerung | `"der Termin"` → `"der Termin soll"` | ersetzt die vorige Fassung |
| Selbstkorrektur | `"…E-Mails und mein"` → `"…E-Mail von mein"` | gleicher Anfang → gleiche Fassung, die längere gewinnt |
| Neuer Abschnitt | `"…und die"` + `"die Termine"` | angehängt, Wortüberlappung am Rand wird entfernt |

Zusätzlich beendet Android die Erkennung nach kurzen Sprechpausen von selbst.
`onend` startet darum eine neue Teilsitzung, solange nicht auf Stoppen getippt
wurde; die Bruchstücke aller Teilsitzungen werden gesammelt und erst am Ende
zusammengesetzt.
