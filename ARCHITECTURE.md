# System-Architektur: AufgabenBuilder

Dieses Dokument bietet Entwicklern und KI-Codier-Assistenten einen präzisen, strukturierten Überblick über die Code-Architektur und das Datenmodell des Projekts **AufgabenDesigner**, ohne dass jede Datei einzeln gelesen werden muss.

---

## 🧭 1. Projekt-Philosophie & Build-Konzept
Der **AufgabenBuilder** ist eine Single-Page-Anwendung (SPA) mit dem Ziel, am Ende eine **einzelne, vollständig inlined A4-Druck-HTML-Datei** (`dist/index.html`) zu kompilieren, die lokal im Browser läuft (offline-fähig).

### Schlüsseltechnologien:
*   **Vite & TypeScript:** Für modernen Compiler-Support, schnelle Hot-Module-Replacement (HMR) und statische Typprüfung.
*   **Vite Single File Plugin:** Packt sämtliche CSS-, JS- und SVG-Ressourcen direkt als Inline-Assets in die finale `dist/index.html`.
*   **Custom HTML Includes:** Um die Benutzeroberfläche übersichtlich zu halten, nutzt die Konfiguration ein Pre-Build-Plugin (`html-include`). UI-Teile werden aus `src/templates/*.html` zur Compile-Zeit per `<include src="..."></include>` in die Haupt-`index.html` eingefügt.
*   **Alpine.js:** Übernimmt die gesamte reaktive UI-Steuerung und Datensynchronisation direkt im DOM.

---

## 📁 2. Verzeichnisstruktur & Verantwortlichkeiten

```text
w:\home\Feyhat\Projekte\AufgabenBuilder - Original
├── css/                     # Styling-System (Strikte Separation von HTML)
│   ├── a4-canvas.css        # A4-Canvas, Seitenumbruch, Tabellen & mathematische Boards
│   ├── builder-ui.css       # App-Layout, Sidebar, Kebab-Dropdowns, Modals
│   ├── main.css             # Globale Styles (Schriften, CSS-Variablen, Reset)
│   └── print.css            # Druck-spezifische Anpassungen (Seitenränder, Knöpfe ausblenden)
├── src/                     # TypeScript-Quellcode
│   ├── app.ts               # Bootstrapping-Einstiegspunkt für Alpine.js
│   ├── state.ts             # Zentraler Alpine.js-Store (Wrapper & Orchestrierung)
│   ├── components/          # UI-Hilfs-Module (Sidebar-Interaktionen, Modals)
│   ├── config/              # Zentraler Modul-Katalog (Module Registry)
│   ├── services/            # Ausgelagerte Business-Logik & Hilfsdienste
│   │   ├── geometryService.ts  # JSXGraph 2D/3D Rendering-Logik (vollständig isoliert)
│   │   ├── fileService.ts      # Lokale Datei-Verwaltung (Laden/Speichern/Import/Export)
│   │   ├── mathRenderer.ts     # KaTeX, SVGs (Baum/Urne) und mathematische Berechnungen
│   │   ├── pagination.ts       # Dynamische A4-Seitenumbruch-Kalkulation
│   │   └── taskFactory.ts      # Fabrik-Methoden & Datenmigrations-Logik
│   ├── templates/           # Ausgelagerte HTML-Template-Fragmente für den Build
│   └── types/               # TypeScript-Interfaces und Datenmodelle
```

---

## 🔄 3. Datenmodell & Modul-Architektur

Das Datenmodell basiert auf einer **Array-basierten Modul-Architektur**. Ein Dokument besteht aus Metadaten und einer Liste von `Task`-Objekten.

Jeder Block (auf **Task-**, **Subtask-** oder **SubSubtask-Ebene**) verfügt über ein dynamisches Array namens `modules`, das alle angehängten Module (wie Wertetabellen, Geometriegitter, Multiple-Choice) verwaltet.

### Die Kern-Interfaces (`src/types/models.ts`):

```typescript
export interface TaskModule<T = any> {
    id: string;   // crypto.randomUUID()
    type: string; // ModuleType (z.B. 'table', 'geometry', 'mcq')
    data: T;      // Modul-spezifische Konfiguration (z.B. MCQData, TableData)
}

export interface Task {
    id: number;
    type: 'task' | 'section';
    context: string;
    subtaskColumns: number;
    subtasks: Subtask[];
    modules: TaskModule[]; // Module auf Kontext-/Aufgabenebene
}

export interface Subtask {
    id: number;
    text: string;
    points: number;
    spaceType: string; // z.B. 'karo', 'none'
    spaceHeight: number;
    subSubtasks: SubSubtask[];
    modules: TaskModule[]; // Module auf Unteraufgabenebene
}
```

### Abwärtskompatibilität & Migration:
Historisch gespeicherte Dokumente nutzen flache, optionale Eigenschaften (z.B. `subtask.geometry`). Beim Laden der JSON-Dateien sorgt die Migrationslogik in `src/services/taskFactory.ts` (`migrateAndEnsureGetters`) dafür, dass diese Altdaten automatisch in das neue reaktive `modules`-Array überführt werden, um Datenverlust zu verhindern.

---

## 🛠️ 4. Integration neuer Aufgabentypen (Entwickler-Leitfaden)

Um einen neuen Aufgabentyp bzw. ein neues Modul hinzuzufügen, müssen exakt die folgenden Schritte ausgeführt werden:

### Schritt A: Standarddaten in `src/services/taskFactory.ts` definieren
Erstelle eine Fabrikfunktion, die das Standarddatenobjekt für das Modul zurückgibt (z. B. `createDefaultMyModule()`).

### Schritt B: Registrierung in `src/config/moduleRegistry.ts`
1. Füge den Typnamen zu `ModuleType` hinzu.
2. Trage das Modul in der `MODULE_REGISTRY` mit Kategorie (Algebra, Analysis, Geometrie, Stochastik, Layout), Icon, Name, Beschreibung und der in Schritt A erstellten Fabrikfunktion (`defaultData`) ein.

### Schritt C: Editor-UI in `src/templates/editor-modal.html` bauen
Füge die Eingabemasken für den Lehrer im Modal hinzu. Verwende zur reaktiven Sichtbarkeit Alpine-Direktiven wie:
*   `x-show="editingTask.modules.some(m => m.type === 'my_module')"`
*   Verbinde die Eingabefelder über `x-model` mit den Attributen des Moduls.

### Schritt D: Render-UI in `index.html` bauen
Erstelle die Schüler-Druckansicht innerhalb des A4-Arbeitsblatts (Bereich `Main Canvas Area`). Nutze ein `<template x-if="module.type === 'my_module'">` innerhalb der `x-for`-Schleifen der Module, um das Element im A4-Dokument zu rendern.

### Schritt E: Styling anpassen
*   Schreibe Editor-relevante Styles (Modals) in `css/builder-ui.css`.
*   Schreibe druck- und darstellungsrelevante Dokument-Styles in `css/a4-canvas.css`.

---

## ⚙️ 5. Wichtige globale APIs & Helfer
*   **KaTeX:** Mathematischer Formelsatz. Wird über die Funktion `formatSubtaskText(text)` gerendert (nutzt `$` für Inline- und `$$` für Block-Formeln).
*   **JSXGraph:** Für 2D- und 3D-Geometriegitter. Die Ausführung wird im `geometryService.ts` isoliert und über Alpine.js `x-effect` mit `renderBoard` / `renderBoard3d` angestoßen.
*   **Math.js:** Globale Math-Utility (erreichbar über `(window as any).math`), genutzt u. a. zur Interpretation von Formeln und Koordinatenberechnungen.
