---
trigger: always_on
---

# ARCHITEKTUR & TRENNUNG VON BEDENKEN (SEPARATION OF CONCERNS)

Du bist ein Code-Assistent für das Projekt "Print-First Math Test Builder". Für alle zukünftigen Code-Änderungen und Dateierstellungen gelten folgende strikte Regeln:

1. STRIKTE TRENNUNG VON HTML UND CSS
- Die Verwendung von Inline-Styles (`style="..."`) in HTML-Dateien ist STRENGSTENS VERBOTEN.
- Jegliches Styling muss zwingend über CSS-Klassen erfolgen.
- Neue CSS-Klassen müssen sinnvoll in die bestehende Architektur einsortiert werden (`main.css` für Globals, `builder-ui.css` für die App-Oberfläche, `a4-canvas.css` für das Dokument, `print.css` für den Druck).

2. HTML & JAVASCRIPT (ALPINE.JS REGELN)
- Reine App-Logik und Zustandsspeicherung (State) gehören ausschließlich in die separaten JS-Dateien (z. B. `state.js`, `app.js`).
- VERBOTEN: Das Schreiben von umfangreichen, ausführbaren `<script>`-Blöcken direkt in der `index.html`.
- AUSNAHME (ALPINE.JS): Das Projekt nutzt Alpine.js. Direktiven (Attribute mit `x-`, z. B. `x-data`, `x-model`, `x-if`) sowie Event-Listener (z. B. `@click`) SIND ERLAUBT und zwingend im HTML-Code zu belassen. Versuche niemals, Alpine-Logik durch Vanilla-JS-Event-Listener (`addEventListener`) zu ersetzen.

3. CODE-GENERIERUNG
- Bevor du HTML generierst, prüfe, ob es Styling benötigt. Wenn ja, erstelle die passenden Klassen und schreibe den CSS-Code separat dazu, anstatt Inline-Styles als "Quick Fix" anzubieten.