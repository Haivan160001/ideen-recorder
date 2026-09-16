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
| `index.html` | Die komplette App — Oberfläche, Spracherkennung, Speicher, Export |
| `manifest.webmanifest` | Macht sie auf dem Homescreen installierbar |
| `sw.js` | Service Worker, hält die App-Hülle offline bereit |
| `icon-192.png`, `icon-512.png` | App-Icons, erzeugt per Skript |

## Bekannte Eigenheit von Chrome auf Android

Chrome markiert dort **Teil**ergebnisse fälschlich als `isFinal` und schickt den
wachsenden Satz jedes Mal vollständig erneut. Wer die Fragmente aneinanderhängt,
bekommt `"ich ich ich benötige ich benötige einen …"`. Deshalb baut
`onresult` den Text bei jedem Ereignis komplett aus `results` neu auf, statt ihn
fortzuschreiben.

Zusätzlich beendet Android die Erkennung nach kurzen Sprechpausen von selbst.
`onend` startet darum eine neue Teilsitzung und hängt deren Text an, solange der
Nutzer nicht auf Stoppen getippt hat.
