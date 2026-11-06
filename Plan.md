# Projektplan: Refactoring & Erweiterung "AufgabenDesigner"

## 1. Projektkontext & Zielsetzung
Das Projekt ist eine Single-Page-Application (SPA) für Lehrkräfte (Klasse 5-13, PC-Nutzung) zum Erstellen von Mathematik-Klausuren im "Print-First"-Ansatz. 
Technologie-Stack: HTML, CSS, Alpine.js, Vite, JSXGraph, KaTeX.

**Aktuelles Problem:** Die Architektur der `index.html` und der Alpine-State sind historisch gewachsen. Module sind fest in den State-Objekten (`subtask`) verdrahtet und werden über hunderte `x-if`-Abfragen gerendert.
**Ziel:** Ein sauberes Refactoring auf eine modulare Architektur (Array-basiert), die Implementierung eines neuen UI-Konzepts für die Modulauswahl (Kategorien-Tabs) und die anschließende Entwicklung neuer Unterrichtsmodule.

---

## 2. Phase 1: Architektur-Refactoring (Priorität 1)
Bevor neue Features gebaut werden, MUSS der State und das Rendering refaktorisiert werden.

### 2.1 State Migration (Vom Objekt zum Array)
Die Struktur einer Teilaufgabe (`subtask`) muss dynamisch werden.
* **ALT:** `subtask: { text: "...", table: { show: false }, geometry: { show: true, elements: [] } }`
* **NEU:** `subtask: { text: "...", modules: [ { id: 'unique-id', type: 'geometry', data: { elements: [] } } ] }`
* **To-Do für den Agenten:** Passe die Haupt-Datenstruktur in Alpine.js an. Schreibe ggf. eine kleine Migrationslogik für bestehende LocalStorage-Daten oder setze den State für diese Entwicklungsphase sauber zurück.

### 2.2 Zentrale Module-Registry
Erstelle eine zentrale Konfiguration (z. B. in einer neuen Datei `src/config/moduleRegistry.js` oder im Haupt-State), in der alle verfügbaren Module registriert sind.
```javascript
export const MODULE_REGISTRY = {
    'geometry': { category: 'geometrie', icon: '📐', name: '2D Geometrie', defaultData: () => ({ elements: [] }) },
    'lgs': { category: 'algebra', icon: '🧮', name: 'LGS', defaultData: () => ({ type: '2x2' }) }
    // ...
};
2.3 Dynamic Dispatching im HTMLErsetze die fest codierten Modul-Blöcke im Klausur-Rendering durch eine Iteration über das modules-Array.To-Do: Iteriere per <template x-for="module in subtask.modules" :key="module.id">.Lagere komplexe Modul-Logik (JSXGraph, D3) in eigene Dateien/Alpine-Components aus (Code-Splitting), z. B. Alpine.data('geometryModule', ... ).3. Phase 2: UI/UX Modernisierung - Das Modul-ModalDas Modal zum Hinzufügen von Modulen (module-catalog-grid) muss für eine große Anzahl an Werkzeugen optimiert werden.Hinweis: Eine Suchleiste wird explizit NICHT benötigt.3.1 Kategorien-TabsImplementiere eine Tab-Navigation oberhalb des Grids. Der Nutzer klickt auf einen Tab, und das Grid filtert die Module entsprechend.Die Kategorien (IDs für die Registry):algebra (Zahlen & Algebra)analysis (Funktionen & Analysis)geometrie (Geometrie)stochastik (Daten & Zufall)layout (Layout & Struktur)3.2 FarbcodierungWeise den Kategorien CSS-Variablen (Leitfarben) zu. Diese Farbe soll dezent im Grid-Card-Design auftauchen (z. B. als Farbe des Icons oder als linker Border-Rahmen der Karte).Algebra: z. B. Orange/GelbAnalysis: z. B. BlauGeometrie: z. B. GrünStochastik: z. B. RotLayout: z. B. Grau/Neutral4. Phase 3: Implementierung der neuen ModuleSobald die Architektur aus Phase 1 und 2 steht, sollen sukzessive folgende Module der Registry hinzugefügt und entwickelt werden:Kategorie: Zahlen & Algebra (algebra)Dreisatz-Tabelle: Tabelle mit automatischen Rechenpfeilen (links/rechts) für Proportionalität.Bruchrechnung: Visuelle Darstellung von Anteilen (Kreis/Rechteck) per JSXGraph oder SVG.Term-Waage: Grafische Darstellung einer Gleichung (linke/rechte Seite) auf einer Waagschale.Matrizen-Editor: KaTeX-basiertes Eingabefeld, das Vektoren und Matrizen sauber skaliert.Kategorie: Funktionen & Analysis (analysis)Flächenmarkierung: Erweiterung des bestehenden Funktions-Moduls um farbige Integralschraffuren.Steigungsdreieck/Tangente: Tool zum Einzeichnen von Tangenten und Steigungsdreiecken an einem Punkt $x_0$.Kurvendiskussion: Generator zur Anzeige von Nullstellen, Extrem- und Wendepunkten inkl. Ableitungen.Kategorie: Geometrie (geometrie)Spurpunkte (3D): Erweiterung des bestehenden 3D-Moduls zur automatischen Einzeichnung von Schnittpunkten mit Koordinatenebenen und Schattenwurf.Kategorie: Daten & Zufall (stochastik)Glücksrad & Würfel: Generator für anpassbare Glücksräder (Sektorgrößen) und Würfelnetze.Übergangsgraphen: Zustandsdiagramm (Knoten und Kanten mit Wahrscheinlichkeiten) für stochastische Prozesse.Hypothesentest: Visualisierung von Verteilungen mit markierten Annahme-/Ablehnungsbereichen und Signifikanzniveaus.Boxplot & Histogramm: Generierung basierend auf Kennwerten (Min, Q1, Med, Q3, Max) bzw. Klassenbreiten.Kategorie: Layout & Struktur (layout)Erwartungshorizont / Lösung:Ein Lösungs-Toggle-Feld in jeder Aufgabe.Ein Modul für ein Punkte-Raster (Aufschlüsselung nach Teilschritten).Zweiter Druck-Modus: Generierung eines Lösungs-PDFs für die Lehrkraft (inkl. Notenschlüssel am Ende).Anweisung an den Code-Assistenten:Bitte beginne ausschließlich mit Phase 1 (Architektur-Refactoring). Führe keine neuen UI-Elemente oder Module ein, bevor die Datenstruktur nicht erfolgreich auf das Array-basierte System umgestellt und getestet wurde. Melde dich, sobald Phase 1 abgeschlossen ist.