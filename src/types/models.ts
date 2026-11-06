/**
 * Datenmodelle für den AufgabenDesigner.
 *
 * ARCHITEKTUR-HINWEIS (Phase 1 Refactoring):
 * Die neue kanonische Datenstruktur für Module ist:
 *   subtask.modules: TaskModule[]
 * Die alten Felder (table, geometry, ...) existieren nur noch
 * als optional-Felder für die Migrationslogik beim Laden alter Speicherstände.
 */

// ─────────────────────────────────────────────────────────────────────────────
// NEU: Generisches Modul-Interface (Array-basierte Architektur)
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskModule<T = any> {
    id: string;   // crypto.randomUUID()
    type: string; // ModuleType aus moduleRegistry.ts
    data: T;      // Modul-spezifische Daten
}

// ─────────────────────────────────────────────────────────────────────────────
// ALT: Einzelne Modul-Interfaces (weiterhin genutzt als Daten-Shape in TaskModule.data)
// ─────────────────────────────────────────────────────────────────────────────

export interface TableData {
    formula: string;
    xValues: string;
    yValues: string;
    data: string[][];
}

export interface GeometrySettings {
    axis: boolean;
    grid: boolean;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    width: number;
    height: number;
    keepaspectratio?: boolean;
}

export interface GeometryData {
    settings: GeometrySettings;
    code: string;
    elements: any[];
}

export interface AnalysisKurveData {
    settings: GeometrySettings;
    mode?: 'kurve' | 'plot' | 'parabel' | 'tangente' | 'integral';
    formula: string;
    functionName?: string;
    functionName2?: string;
    showNullstellen: boolean;
    showExtrema: boolean;
    showWendepunkte: boolean;
    showDeriv1: boolean;
    showDeriv2: boolean;

    // Mode: plot
    formula2?: string;
    enableG?: boolean;

    // Mode: parabel
    parabolaForm?: 'vertex' | 'general';
    parabolaA?: string;
    parabolaD?: string;
    parabolaE?: string;
    parabolaB?: string;
    parabolaC?: string;
    showVertex?: boolean;
    showSymmetryAxis?: boolean;

    // Mode: tangente
    tangentX?: string;
    showTangent?: boolean;
    showSlopeTriangle?: boolean;

    // Mode: integral
    xStart?: string;
    xEnd?: string;

    code: string;
    elements: any[];
}

export interface AnalysisFlaechenData {
    settings: GeometrySettings;
    formulaF: string;
    formulaG: string;
    enableG: boolean;
    limitA: string;
    limitB: string;
    code: string;
    elements: any[];
}

export interface AnalysisTangenteData {
    settings: GeometrySettings;
    formula: string;
    x0: string;
    showTangent: boolean;
    showSlopeTriangle: boolean;
    code: string;
    elements: any[];
}

export interface AnalysisRotationskoerperData {
    settings: GeometrySettings;
    formula: string;
    xStart: string;
    xEnd: string;
    code: string;
}

export interface AnalysisRiemannData {
    settings: GeometrySettings;
    formula: string;
    xStart: string;
    xEnd: string;
    rectangles: number;
    sumType: 'lower' | 'upper' | 'both';
    showValue: boolean;
    code: string;
}

export interface AnalysisExtremwertData {
    scenarioType: 'pasture' | 'box' | 'cylinder' | 'function_rect' | 'cylinder_min' | 'prism_min' | 'cylinder_in_sphere';
    parameterValue: string;  // Zaunlänge, Kartonbreite, Oberflächeninhalt, Koeffizient a
    parameterValue2: string; // Kartonhöhe, Konstante c bei Parabel
    isFourSided?: boolean;   // Wiese-Szenario: 4-seitig statt 3-seitig am Fluss
    isDiameter?: boolean;    // Zylinder in Kugel: Durchmesser statt Radius vorgegeben
    settings: GeometrySettings;
    code: string;
}


export interface SteckbriefCondition {
    id: string;
    type: 'point' | 'extreme' | 'inflection' | 'saddle' | 'slope' | 'yIntercept' | 'curvature';
    x: string;
    y: string;
}

export interface AnalysisSteckbriefData {
    degree: number;
    symmetry: 'none' | 'achsensymmetrisch' | 'punktsymmetrisch';
    conditions: SteckbriefCondition[];
    showGraph: boolean;
    showTextual: boolean;
    settings: GeometrySettings;
    code: string;
    elements: any[];
}

export interface PuzzleFunctionItem {
    id: string;
    expr: string;
    exprFPrime: string;
}

export interface AnalysisPuzzleData {
    mode?: 'derivative' | 'graph_to_equation';
    typeF: 'graph' | 'equation';
    typeFPrime: 'graph' | 'equation';
    showJustification: boolean;
    justificationHeight: number;
    justificationInTable?: boolean;
    functions: PuzzleFunctionItem[];
    shuffledIndices: number[];
    settings: GeometrySettings;
}

export interface Geometry3dSettings {
    boxSize: [number, number];
    az: number;
    el: number;
    width: number;
    height: number;
}

export interface Geometry3dData {
    settings: Geometry3dSettings;
    elements: any[];
    code: string;
}

export interface VerteilungSettings {
    width: number;
    height: number;
}

export interface VerteilungMarkArea {
    show: boolean;
    min: number;
    max: number;
}

export interface VerteilungData {
    type: 'binomial' | 'normal' | string;
    n: number;
    p: number;
    mu: number;
    sigma: number;
    settings: VerteilungSettings;
    markArea: VerteilungMarkArea;
}

export interface TreeNode {
    id: string;
    level: number;
    prob: string;
    label: string;
    isNegated: boolean;
    isProbPlaceholder?: boolean;
    isLabelPlaceholder?: boolean;
    pathProb?: string;
    isPathProbPlaceholder?: boolean;
}

export interface BaumData {
    height: number;
    depth: number;
    branches: number;
    nodes: TreeNode[];
    colorNodes?: boolean;
    showPathProbabilities?: boolean;
}

export interface Kugel {
    id: number;
    type: string;
    label: string;
}

export interface UrneData {
    height: number;
    kugeln: Kugel[];
}

export interface VierfeldertafelLabels {
    top1: string;
    top2: string;
    left1: string;
    left2: string;
}

export interface VierfeldertafelData {
    labels: VierfeldertafelLabels;
    rawLabels?: { top1: string; top2: string; left1: string; left2: string };
    negated?: { top1: boolean; top2: boolean; left1: boolean; left2: boolean };
    data: string[][];
    printVisibility: boolean[][];
    scale?: 'compact' | 'normal' | 'large';
}

export interface MCQOption {
    id: number;
    text: string;
}

export interface MCQData {
    options: MCQOption[];
}

export interface TrueFalseData {
    spaceHeight: number;
    showJustification: boolean;
}

export interface MatchingItem {
    id: number;
    text: string;
}

export interface MatchingData {
    leftItems: MatchingItem[];
    rightItems: MatchingItem[];
}

export interface ImageData {
    rows: number;
    cols: number;
    width: number;
    maxHeight: number;
    activeIndex: number;
    slots: string[];
}

export interface ZusatzData {
    text: string;
}

export interface LueckentextData {
    // Erweiterbar
}

export interface ZahlenstrahlData {
    min: number;
    max: number;
    step: number;
    subdivisions?: number;
    height?: number;
}



export interface LgsData {
    dimension: 2 | 3;
    mode: 'manual' | 'generate';
    variablesRaw: string;
    manualCoefficients: string[][];
    targetSolutions: string[];
    generatedCoefficients: number[][];
}

export interface GluecksradSektor {
    id: number;
    type: 'white' | 'grey' | 'black' | 'dashed' | 'striped';
    label: string;
    weight: number;
}

export interface GluecksradData {
    height: number;
    showPointer: boolean;
    sektoren: GluecksradSektor[];
}

export interface DreisatzData {
    type: 'proportional' | 'antiproportional';
    headers: [string, string];
    data: [[string, string], [string, string], [string, string]];
    operationsLeft: [string, string];
    operationsRight: [string, string];
    printVisibility: {
        data: [[boolean, boolean], [boolean, boolean], [boolean, boolean]];
        operationsLeft: [boolean, boolean];
        operationsRight: [boolean, boolean];
    };
}

export interface BruchData {
    type: 'kreis' | 'balken' | 'menge';
    numerator: number;
    denominator: number;
    mode: 'determine' | 'color' | 'show';
    height: number;
    width: number;
    fillType: 'grey' | 'striped' | 'black' | 'primary';
    showFractionText: boolean;
    shapeType: 'circle' | 'square' | 'star';
}

export interface DiagrammItem {
    label: string;
    value: number;
}

export interface DiagrammData {
    type: 'saeule' | 'stab' | 'balken' | 'linie';
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    yMax: number;
    yStep: number;
    showGrid: boolean;
    mode: 'show' | 'read' | 'draw';
    height: number;
    width: number;
    fillType: 'grey' | 'striped' | 'black' | 'primary';
    items: DiagrammItem[];
}

export interface KoordinatensystemPoint {
    label: string;
    x: number;
    y: number;
}

export interface KoordinatensystemData {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    xStep: number;
    yStep: number;
    showGrid: boolean;
    connectPoints: boolean;
    closeShape: boolean;
    mode: 'show' | 'read' | 'draw';
    height: number;
    width: number;
    points: KoordinatensystemPoint[];
    colorShape?: boolean;
}


// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Datenstrukturen (NEU: mit modules[])
// ─────────────────────────────────────────────────────────────────────────────

export interface SubSubtask {
    id: number;
    text: string;
    points: number;
    spaceType: string;
    spaceHeight: number;
    spacingTop?: number;
    pageBreakBefore?: boolean;
    /** NEU: Array-basierte Modul-Liste */
    modules: TaskModule[];

    // ALT: optional-Felder, nur noch für Migration alter Speicherstände
    table?: TableData & { show?: boolean };
    geometry?: GeometryData & { show?: boolean };
    analysis_kurve?: AnalysisKurveData & { show?: boolean };
    analysis_flaechen?: AnalysisFlaechenData & { show?: boolean };
    analysis_tangente?: AnalysisTangenteData & { show?: boolean };
    analysis_steckbrief?: AnalysisSteckbriefData & { show?: boolean };
    analysis_puzzle?: AnalysisPuzzleData & { show?: boolean };
    analysis_rotationskoerper?: AnalysisRotationskoerperData & { show?: boolean };
    analysis_extremwert?: AnalysisExtremwertData & { show?: boolean };
    analysis_riemann?: AnalysisRiemannData & { show?: boolean };
    geometry3d?: Geometry3dData & { show?: boolean };
    verteilung?: VerteilungData & { show?: boolean };
    baum?: BaumData & { show?: boolean };
    urne?: UrneData & { show?: boolean };
    vierfeldertafel?: VierfeldertafelData & { show?: boolean };
    mcq?: MCQData & { show?: boolean };
    trueFalse?: TrueFalseData & { show?: boolean };
    matching?: MatchingData & { show?: boolean };
    image?: ImageData & { show?: boolean };
    zusatz?: ZusatzData & { show?: boolean };
    lueckentext?: LueckentextData & { show?: boolean };
    zahlenstrahl?: ZahlenstrahlData & { show?: boolean };

    lgs?: LgsData & { show?: boolean };
    gluecksrad?: GluecksradData & { show?: boolean };
    dreisatz?: DreisatzData & { show?: boolean };
    bruch?: BruchData & { show?: boolean };
    diagramm?: DiagrammData & { show?: boolean };
    koordinatensystem?: KoordinatensystemData & { show?: boolean };
}

export interface Subtask {
    id: number;
    text: string;
    points: number;
    spaceType: string;
    spaceHeight: number;
    spacingTop?: number;
    pageBreakBefore?: boolean;
    subSubtasks: SubSubtask[];
    /** NEU: Array-basierte Modul-Liste */
    modules: TaskModule[];

    // ALT: optional-Felder, nur noch für Migration alter Speicherstände
    table?: TableData & { show?: boolean };
    geometry?: GeometryData & { show?: boolean };
    analysis_kurve?: AnalysisKurveData & { show?: boolean };
    analysis_flaechen?: AnalysisFlaechenData & { show?: boolean };
    analysis_tangente?: AnalysisTangenteData & { show?: boolean };
    analysis_steckbrief?: AnalysisSteckbriefData & { show?: boolean };
    analysis_puzzle?: AnalysisPuzzleData & { show?: boolean };
    analysis_rotationskoerper?: AnalysisRotationskoerperData & { show?: boolean };
    analysis_extremwert?: AnalysisExtremwertData & { show?: boolean };
    analysis_riemann?: AnalysisRiemannData & { show?: boolean };
    geometry3d?: Geometry3dData & { show?: boolean };
    verteilung?: VerteilungData & { show?: boolean };
    baum?: BaumData & { show?: boolean };
    urne?: UrneData & { show?: boolean };
    vierfeldertafel?: VierfeldertafelData & { show?: boolean };
    mcq?: MCQData & { show?: boolean };
    trueFalse?: TrueFalseData & { show?: boolean };
    matching?: MatchingData & { show?: boolean };
    image?: ImageData & { show?: boolean };
    zusatz?: ZusatzData & { show?: boolean };
    lueckentext?: LueckentextData & { show?: boolean };
    zahlenstrahl?: ZahlenstrahlData & { show?: boolean };

    lgs?: LgsData & { show?: boolean };
    gluecksrad?: GluecksradData & { show?: boolean };
    dreisatz?: DreisatzData & { show?: boolean };
    bruch?: BruchData & { show?: boolean };
    diagramm?: DiagrammData & { show?: boolean };
    koordinatensystem?: KoordinatensystemData & { show?: boolean };
}

export interface Task {
    id: number;
    type: 'task' | 'section' | string;
    context: string;
    subtaskColumns: number;
    spacingTop?: number;
    pageBreakBefore?: boolean;
    subtasks: Subtask[];
    /** NEU: Array-basierte Modul-Liste (für Kontext-Ebene) */
    modules: TaskModule[];

    // ALT: optional-Felder, nur noch für Migration alter Speicherstände
    table?: TableData & { show?: boolean };
    geometry?: GeometryData & { show?: boolean };
    analysis_kurve?: AnalysisKurveData & { show?: boolean };
    analysis_flaechen?: AnalysisFlaechenData & { show?: boolean };
    analysis_tangente?: AnalysisTangenteData & { show?: boolean };
    analysis_steckbrief?: AnalysisSteckbriefData & { show?: boolean };
    analysis_puzzle?: AnalysisPuzzleData & { show?: boolean };
    analysis_rotationskoerper?: AnalysisRotationskoerperData & { show?: boolean };
    analysis_extremwert?: AnalysisExtremwertData & { show?: boolean };
    analysis_riemann?: AnalysisRiemannData & { show?: boolean };
    geometry3d?: Geometry3dData & { show?: boolean };
    verteilung?: VerteilungData & { show?: boolean };
    baum?: BaumData & { show?: boolean };
    urne?: UrneData & { show?: boolean };
    vierfeldertafel?: VierfeldertafelData & { show?: boolean };
    mcq?: MCQData & { show?: boolean };
    trueFalse?: TrueFalseData & { show?: boolean };
    matching?: MatchingData & { show?: boolean };
    image?: ImageData & { show?: boolean };
    zusatz?: ZusatzData & { show?: boolean };
    lueckentext?: LueckentextData & { show?: boolean };
    lgs?: LgsData & { show?: boolean };
    gluecksrad?: GluecksradData & { show?: boolean };
    dreisatz?: DreisatzData & { show?: boolean };
    bruch?: BruchData & { show?: boolean };
    diagramm?: DiagrammData & { show?: boolean };
    zahlenstrahl?: ZahlenstrahlData & { show?: boolean };

    koordinatensystem?: KoordinatensystemData & { show?: boolean };
    collectionTitle?: string;
}

export interface Meta {
    docType: 'test' | 'worksheet';
    art: string;
    nr: string;
    titel: string;
    fach: string;
    klasse: string;
    datum: string;
    hinweise: string;
    hideSubtaskPoints?: boolean;
}

export interface DocumentState {
    meta: Meta;
    tasks: Task[];
    uiTheme: 'light';
    lastSaveTime: string | null;
}
