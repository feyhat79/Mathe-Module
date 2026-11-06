/**
 * Zentrale Module-Registry für den AufgabenBuilder.
 * Hier sind alle verfügbaren Module mit ihren Metadaten und Default-Daten registriert.
 * Neue Module müssen nur hier eingetragen werden.
 */

import {
    createDefaultTable,
    createDefaultGeometry,
    createDefaultGeometry3d,
    createDefaultVerteilung,
    createDefaultBaum,
    createDefaultUrne,
    createDefaultVierfeldertafel,
    createDefaultMCQ,
    createDefaultMatching,
    createDefaultImage,
    createDefaultLgs,
    generateTreeNodes,
    createDefaultAnalysisFlaechen,
    createDefaultAnalysisTangente,
    createDefaultAnalysisKurve,
    createDefaultGluecksrad,
    createDefaultDreisatz,
    createDefaultBruch,
    createDefaultDiagramm,
    createDefaultKoordinatensystem,
    createDefaultAnalysisSteckbrief,
    createDefaultAnalysisPuzzle,
    createDefaultAnalysisRotationskoerper,
    createDefaultAnalysisExtremwert,
    createDefaultAnalysisRiemann,
} from '../services/taskFactory';

export type CategoryId = 'algebra' | 'analysis' | 'geometrie' | 'stochastik' | 'layout';

export type ModuleType =
    | 'table'
    | 'lgs'
    | 'zahlenstrahl'
    | 'dreisatz'
    | 'geometry'
    | 'geometry3d'
    | 'strahlensatz'
    | 'verteilung'
    | 'baum'
    | 'urne'
    | 'gluecksrad'
    | 'vierfeldertafel'
    | 'mcq'
    | 'trueFalse'
    | 'matching'
    | 'image'
    | 'zusatz'
    | 'lueckentext'
    | 'bruch'
    | 'diagramm'
    | 'koordinatensystem'
    | 'analysis_flaechen'
    | 'analysis_tangente'
    | 'analysis_kurve'
    | 'analysis_steckbrief'
    | 'analysis_puzzle'
    | 'analysis_rotationskoerper'
    | 'analysis_extremwert'
    | 'analysis_riemann';

export interface ModuleDefinition {
    category: CategoryId;
    icon: string;
    name: string;
    description: string;
    defaultData: () => any;
}

export interface CategoryDefinition {
    id: CategoryId;
    label: string;
    color: string; // CSS-Variablenname, z.B. 'var(--cat-algebra)'
}

export const CATEGORIES: CategoryDefinition[] = [
    { id: 'algebra',    label: 'Zahlen & Algebra',       color: 'var(--cat-algebra)' },
    { id: 'analysis',   label: 'Funktionen & Analysis',  color: 'var(--cat-analysis)' },
    { id: 'geometrie',  label: 'Geometrie',               color: 'var(--cat-geometrie)' },
    { id: 'stochastik', label: 'Daten & Zufall',          color: 'var(--cat-stochastik)' },
    { id: 'layout',     label: 'Layout & Struktur',       color: 'var(--cat-layout)' },
];

export const MODULE_REGISTRY: Partial<Record<ModuleType, ModuleDefinition>> = {
    // ── Zahlen & Algebra ─────────────────────────────────────────
    'table': {
        category: 'algebra',
        icon: '📊',
        name: 'Wertetabelle',
        description: 'Erstellt eine Tabelle mit optionaler Autofill-Funktion für x/y-Werte.',
        defaultData: createDefaultTable,
    },
    'lgs': {
        category: 'algebra',
        icon: '🧮',
        name: 'LGS',
        description: 'Erzeugt 2x2 oder 3x3 LGS mit automatischer Ganzzahl-Generierung oder manueller Eingabe.',
        defaultData: createDefaultLgs,
    },
    'dreisatz': {
        category: 'algebra',
        icon: '⚖️',
        name: 'Dreisatz',
        description: 'Erstellt eine Dreisatz-Tabelle mit seitlichen Rechenpfeilen und Auto-Fill-Logik.',
        defaultData: createDefaultDreisatz,
    },
    'zahlenstrahl': {
        category: 'algebra',
        icon: '📏',
        name: 'Zahlenstrahl',
        description: 'Zeichnet einen konfigurierbaren mathematischen Zahlenstrahl.',
        defaultData: () => ({ min: -5, max: 5, step: 1, subdivisions: 4, height: 2.5 }),
    },
    'bruch': {
        category: 'algebra',
        icon: '🍰',
        name: 'Bruchteile',
        description: 'Stellt Brüche anschaulich als Kreis, Balken oder Symbole dar. Perfekt für Zählaufgaben oder zum Selbstausmalen.',
        defaultData: createDefaultBruch,
    },

    // ── Funktionen & Analysis ────────────────────────────────────
    'analysis_kurve': {
        category: 'analysis',
        icon: '📊',
        name: 'Funktionsplotter',
        description: 'Visualisiert Graphen mit Modi für Kurvendiskussionen, einfache Plots, Tangenten, Integrale und Parabeln.',
        defaultData: createDefaultAnalysisKurve,
    },
    'analysis_steckbrief': {
        category: 'analysis',
        icon: '🧩',
        name: 'Steckbriefaufgabe',
        description: 'Rekonstruiert Funktionsgleichungen aus gegebenen Bedingungen (z.B. Punkte, Extrema, Wendestellen) mit integriertem LGS-Solver.',
        defaultData: createDefaultAnalysisSteckbrief,
    },
    'analysis_puzzle': {
        category: 'analysis',
        icon: '🧩',
        name: 'Zuordnungspuzzle',
        description: 'Generiert ein Zuordnungsrätsel (z.B. Graph ↔ Gleichung oder Funktion ↔ Ableitung) wahlweise als Gleichung oder JSXGraph-Plot.',
        defaultData: createDefaultAnalysisPuzzle,
    },
    'analysis_rotationskoerper': {
        category: 'analysis',
        icon: '🌀',
        name: 'Rotationskörper',
        description: 'Visualisiert den Rotationskörper einer Funktion f(x) um die x-Achse im Intervall [a, b] und berechnet das Volumen.',
        defaultData: createDefaultAnalysisRotationskoerper,
    },
    'analysis_extremwert': {
        category: 'analysis',
        icon: '📐',
        name: 'Extremwertaufgabe',
        description: 'Generiert Optimierungsaufgaben (z.B. Wiese am Fluss, Schachtel falten, Dose, Rechteck unter Kurve) mit Schritt-für-Schritt-Löser und Skizze.',
        defaultData: createDefaultAnalysisExtremwert,
    },
    'analysis_riemann': {
        category: 'analysis',
        icon: '📊',
        name: 'Riemann-Summen',
        description: 'Visualisiert Ober- und Untersummen einer Funktion f(x) mit n Rechtecken im Intervall [a, b].',
        defaultData: createDefaultAnalysisRiemann,
    },

    // ── Geometrie ────────────────────────────────────────────────
    'geometry': {
        category: 'geometrie',
        icon: '📐',
        name: '2D Geometrie',
        description: 'Interaktives Koordinatensystem für Graphen und geometrische Formen.',
        defaultData: createDefaultGeometry,
    },
    'geometry3d': {
        category: 'geometrie',
        icon: '🧊',
        name: '3D Geometrie',
        description: 'Dreidimensionales Koordinatensystem für Vektoren, Geraden und Ebenen.',
        defaultData: createDefaultGeometry3d,
    },

    'strahlensatz': {
        category: 'geometrie',
        icon: '📐',
        name: 'Strahlensätze',
        description: 'Zeichnet anpassbare Strahlensatz-Figuren (V-Figur und X-Figur) mit Beschriftungen.',
        defaultData: () => ({
            type: 'v-figur',
            showPoints: true,
            showLabels: true,
            vertexLabel: 'S',
            ptALabel: 'A',
            ptBLabel: 'B',
            ptAprimeLabel: 'A\'',
            ptBprimeLabel: 'B\'',
            labelSA: 'a',
            labelAB: 'b',
            labelSAprime: 'c',
            labelAprimeBprime: 'd',
            labelAAprime: 'x',
            labelBBprime: 'y',
            height: 6.0,
            colorSegments: false
        }),
    },
    'koordinatensystem': {
        category: 'geometrie',
        icon: '🎯',
        name: 'Koordinatensystem',
        description: 'Zeichnet ein flexibel einstellbares 2D-Koordinatensystem für Punkte und Figuren (Unterstufe). Mit Ablese- und Einzeichen-Modus.',
        defaultData: createDefaultKoordinatensystem,
    },

    // ── Daten & Zufall ───────────────────────────────────────────
    'verteilung': {
        category: 'stochastik',
        icon: '📈',
        name: 'Verteilung',
        description: 'Zeichnet Binomial- und Normalverteilungen inkl. Flächenmarkierung.',
        defaultData: createDefaultVerteilung,
    },
    'baum': {
        category: 'stochastik',
        icon: '🌳',
        name: 'Baumdiagramm',
        description: 'Erstellt ein anpassbares Stochastik-Baumdiagramm.',
        defaultData: () => createDefaultBaum(generateTreeNodes),
    },
    'urne': {
        category: 'stochastik',
        icon: '🎲',
        name: 'Urne',
        description: 'Zeichnet eine Urne mit anpassbaren, markierten Kugeln für Stochastik.',
        defaultData: createDefaultUrne,
    },
    'gluecksrad': {
        category: 'stochastik',
        icon: '🎡',
        name: 'Glücksrad',
        description: 'Erzeugt ein kreisförmiges Glücksrad mit einstellbaren Sektoren, Füllungen und Gewichtungen.',
        defaultData: createDefaultGluecksrad,
    },
    'vierfeldertafel': {
        category: 'stochastik',
        icon: '▦',
        name: '4-Felder-Tafel',
        description: 'Erstellt eine konfigurierbare 3×3 Kontingenztafel mit Auto-Fill-Logik.',
        defaultData: createDefaultVierfeldertafel,
    },
    'diagramm': {
        category: 'stochastik',
        icon: '📊',
        name: 'Diagramme',
        description: 'Erstellt Säulen-, Stab-, Balken- oder Liniendiagramme aus einer konfigurierbaren Tabelle.',
        defaultData: createDefaultDiagramm,
    },

    // ── Layout & Struktur ────────────────────────────────────────
    'mcq': {
        category: 'layout',
        icon: '☑️',
        name: 'Multiple Choice',
        description: 'Fügt ankreuzbare Optionen (Checkboxen) für den Druck hinzu.',
        defaultData: createDefaultMCQ,
    },
    'trueFalse': {
        category: 'layout',
        icon: '⚖️',
        name: 'Wahr / Falsch',
        description: 'Bewertungsmatrix für Aussagen mit Platz für Begründungen.',
        defaultData: () => ({ spaceHeight: 3, showJustification: false }),
    },
    'matching': {
        category: 'layout',
        icon: '🔗',
        name: 'Zuordnung',
        description: 'Spalten mit Begriffen, die miteinander per Linie verbunden werden sollen.',
        defaultData: createDefaultMatching,
    },
    'image': {
        category: 'layout',
        icon: '🖼️',
        name: 'Bild',
        description: 'Fügt Bilder über Upload oder direkt via Strg+V (Copy/Paste) ein.',
        defaultData: createDefaultImage,
    },
    'zusatz': {
        category: 'layout',
        icon: '📝',
        name: 'Zusatztext',
        description: 'Kleiner kursiver Textbaustein (z. B. für Zwischenergebnisse).',
        defaultData: () => ({ text: '' }),
    },
    'lueckentext': {
        category: 'layout',
        icon: '🔤',
        name: 'Lückentext',
        description: 'Ermöglicht das Ausblenden markierter Wörter für den Druck.',
        defaultData: () => ({}),
    },
};

/**
 * Gibt alle Module einer bestimmten Kategorie zurück.
 */
export function getModulesByCategory(categoryId: CategoryId): Array<{ type: ModuleType; def: ModuleDefinition }> {
    return (Object.entries(MODULE_REGISTRY) as Array<[ModuleType, ModuleDefinition]>)
        .filter(([, def]) => def.category === categoryId)
        .map(([type, def]) => ({ type, def }));
}
