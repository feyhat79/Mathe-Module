# AufgabenBuilder – Microsoft Word Add-in Anleitung

Diese Anleitung beschreibt, wie du den AufgabenBuilder direkt in Microsoft Word (Desktop unter Windows oder Word für das Web) als Seitenleiste (Taskpane) einbindest.

---

## 1. Den lokalen Add-in-Server starten

Öffne ein Terminal im Ordner `AufgabenBuilder - Original` und starte den Server:

```bash
npm run dev:word
```

Der Server läuft nun auf Port 3000 (`http://localhost:3000` bzw. `https://localhost:3000`).  
Die Seitenleiste ist direkt erreichbar unter: `http://localhost:3000/taskpane.html`.

---

## 2. Das Add-in in Microsoft Word registrieren (Sideloading)

Für die lokale Entwicklung musst du Microsoft Word einmalig mitteilen, wo die `manifest.xml` liegt:

### Schritt A: Ordner-Freigabe einrichten
1. Erstelle einen lokalen Ordner oder nutze direkt diesen Projektordner:  
   `w:\home\Feyhat\Projekte\AufgabenBuilder - Original`
2. Stelle sicher, dass die Datei `manifest.xml` in diesem Ordner liegt.
3. Klicke mit der rechten Maustaste auf den Ordner → **Eigenschaften** → Reiter **Freigabe** → Klicke auf **Erweiterte Freigabe...** → Hake **Diesen Ordner freigeben** an → **OK**.
4. Kopiere den Netzwerkpfad (z. B. `\\DEIN-PC\AufgabenBuilder - Original`).

### Schritt B: Pfad in Microsoft Word hinterlegen
1. Öffne **Microsoft Word**.
2. Klicke oben links auf **Datei** → **Optionen** (ganz unten).
3. Wähle links **Trust Center** → Klicke auf den Button **Einstellungen für das Trust Center...**.
4. Wähle links **Vertrauenswürdige Add-In-Kataloge**.
5. Füge bei **Katalog-URL** deinen Ordner-Netzwerkpfad ein (z. B. `\\DEIN-PC\AufgabenBuilder - Original`).
6. Klicke auf **Katalog hinzufügen** und setze das Häkchen bei **Im Menü anzeigen**.
7. Klicke auf **OK** und starte Microsoft Word einmal neu.

---

## 3. Das Add-in in Word verwenden

1. Öffne ein beliebiges Word-Dokument.
2. Gehe im oberen Menüband auf **Einfügen** → **Meine Add-Ins** (bzw. **Add-Ins abrufen**).
3. Klicke auf den Reiter **FREIGEGEBENER ORDNER**.
4. Wähle **AufgabenBuilder Mathe** aus und klicke auf **Hinzufügen**.
5. Rechts in Word öffnet sich deine Seitenleiste!
6. **Workflow:**
   - Klicke im Word-Text an die Stelle, an der das Modul erscheinen soll.
   - Wähle rechts dein Modul (z. B. *Baumdiagramm* oder *Urne*).
   - Passe die Parameter an (Stufen, Lücken, Wahrscheinlichkeiten etc.).
   - Klicke auf **„An Cursorposition einfügen ✨“**.
   - Das Diagramm wird als gestochen scharfe Vektorgrafik (SVG) direkt in dein Word-Dokument eingefügt!
