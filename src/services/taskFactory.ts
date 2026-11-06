/**
 * Factory-Funktionen für Default-Datenobjekte.
 *
 * HINWEIS: Die createDefaultXxx()-Funktionen erzeugen nun KEINE show-Flags mehr.
 * Sie liefern nur die reinen Daten, die als TaskModule.data verwendet werden.
 * Das show-Flag entfällt, da ein Modul einfach nicht im modules[]-Array ist, wenn es nicht aktiv ist.
 */

import {
    TableData,
    GeometryData,
    Geometry3dData,
    VerteilungData,
    BaumData,
    UrneData,
    VierfeldertafelData,
    MCQData,
    MatchingData,
    ImageData,
    SubSubtask,
    Subtask,
    Task,
    TreeNode,
    LgsData,
    TaskModule,
    AnalysisKurveData,
    GluecksradData,
    DreisatzData,
    BruchData,
    DiagrammData,
    KoordinatensystemData,
    AnalysisSteckbriefData,
    SteckbriefCondition,
    AnalysisRiemannData,
} from '../types/models';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/** Erzeugt eine eindeutige ID für ein Modul. */
export const generateModuleId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default-Daten pro Modultyp (reine Daten, kein show-Flag mehr)
// ─────────────────────────────────────────────────────────────────────────────

export const createDefaultTable = (): TableData => ({
    formula: 'x^2',
    xValues: 'x',
    yValues: 'f(x)',
    data: [['-2', '-1', '0', '1', '2'], ['', '', '', '', '']],
});

export const createDefaultLgs = (): LgsData => ({
    dimension: 2,
    mode: 'generate',
    variablesRaw: 'x, y',
    manualCoefficients: [
        ['', '', ''],
        ['', '', ''],
    ],
    targetSolutions: ['3', '-2'],
    generatedCoefficients: [
        [0, 0, 0],
        [0, 0, 0],
    ],
});

export const generateLgsCoefficients = (dimension: 2 | 3, targetSolutions: number[]): number[][] => {
    const getRandomCoeff = () => {
        let val = 0;
        while (val === 0) {
            val = Math.floor(Math.random() * 17) - 8; // -8 to 8
        }
        return val;
    };

    let attempts = 0;
    while (attempts < 1000) {
        attempts++;
        if (dimension === 2) {
            const a11 = getRandomCoeff();
            const a12 = getRandomCoeff();
            const a21 = getRandomCoeff();
            const a22 = getRandomCoeff();
            const det = a11 * a22 - a12 * a21;
            if (det !== 0) {
                const b1 = a11 * targetSolutions[0] + a12 * targetSolutions[1];
                const b2 = a21 * targetSolutions[0] + a22 * targetSolutions[1];
                return [[a11, a12, b1], [a21, a22, b2]];
            }
        } else {
            const a = Array.from({ length: 3 }, () => Array.from({ length: 3 }, getRandomCoeff));
            const det = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
                      - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
                      + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
            if (det !== 0) {
                const b1 = a[0][0] * targetSolutions[0] + a[0][1] * targetSolutions[1] + a[0][2] * targetSolutions[2];
                const b2 = a[1][0] * targetSolutions[0] + a[1][1] * targetSolutions[1] + a[1][2] * targetSolutions[2];
                const b3 = a[2][0] * targetSolutions[0] + a[2][1] * targetSolutions[1] + a[2][2] * targetSolutions[2];
                return [
                    [a[0][0], a[0][1], a[0][2], b1],
                    [a[1][0], a[1][1], a[1][2], b2],
                    [a[2][0], a[2][1], a[2][2], b3],
                ];
            }
        }
    }
    // Fallback
    if (dimension === 2) {
        return [[1, 1, targetSolutions[0] + targetSolutions[1]], [1, -1, targetSolutions[0] - targetSolutions[1]]];
    } else {
        return [
            [1, 1, 1, targetSolutions[0] + targetSolutions[1] + targetSolutions[2]],
            [1, -1, 1, targetSolutions[0] - targetSolutions[1] + targetSolutions[2]],
            [1, 1, -1, targetSolutions[0] + targetSolutions[1] - targetSolutions[2]],
        ];
    }
};

export const createDefaultGeometry = (): GeometryData => ({
    settings: { axis: true, grid: true, xMin: -5, xMax: 5, yMin: -5, yMax: 5, width: 10, height: 10 },
    code: '',
    elements: [],
});

export const createDefaultGeometry3d = (): Geometry3dData => ({
    settings: { boxSize: [-5, 5], az: 0.4, el: 0.2, width: 10, height: 10 },
    elements: [],
    code: '',
});

export const createDefaultVerteilung = (): VerteilungData => ({
    type: 'binomial',
    n: 10,
    p: 0.5,
    mu: 0,
    sigma: 1,
    settings: { width: 10, height: 6 },
    markArea: { show: false, min: 2, max: 5 },
});

export const createDefaultBaum = (nodesFunc?: (depth: number, branches: number) => TreeNode[]): BaumData => ({
    height: 6,
    depth: 2,
    branches: 2,
    nodes: nodesFunc ? nodesFunc(2, 2) : [],
    colorNodes: false,
});

export const createDefaultUrne = (): UrneData => ({
    height: 4,
    kugeln: [{ id: Date.now(), type: 'white', label: '' }],
});

export const createDefaultGluecksrad = (): GluecksradData => ({
    height: 5.0,
    showPointer: true,
    sektoren: [
        { id: Date.now(), type: 'white', label: '1', weight: 1 },
        { id: Date.now() + 1, type: 'grey', label: '2', weight: 1 },
        { id: Date.now() + 2, type: 'black', label: '3', weight: 1 },
    ],
});

export const createDefaultDreisatz = (): DreisatzData => ({
    type: 'proportional',
    headers: ['Größe 1', 'Größe 2'],
    data: [['', ''], ['', ''], ['', '']],
    operationsLeft: ['', ''],
    operationsRight: ['', ''],
    printVisibility: {
        data: [[true, true], [true, true], [true, true]],
        operationsLeft: [true, true],
        operationsRight: [true, true],
    },
});

export const createDefaultBruch = (): BruchData => ({
    type: 'kreis',
    numerator: 3,
    denominator: 8,
    mode: 'determine',
    height: 4.0,
    width: 4.0,
    fillType: 'grey',
    showFractionText: true,
    shapeType: 'circle',
});

export const createDefaultDiagramm = (): DiagrammData => ({
    type: 'saeule',
    title: 'Klassenumfrage: Lieblingsfarbe',
    xAxisLabel: 'Farbe',
    yAxisLabel: 'Anzahl',
    yMax: 10,
    yStep: 2,
    showGrid: true,
    mode: 'show',
    height: 5.0,
    width: 10.0,
    fillType: 'grey',
    items: [
        { label: 'Blau', value: 8 },
        { label: 'Rot', value: 5 },
        { label: 'Grün', value: 6 },
        { label: 'Gelb', value: 3 }
    ]
});

export const createDefaultKoordinatensystem = (): KoordinatensystemData => ({
    xMin: 0,
    xMax: 6,
    yMin: 0,
    yMax: 5,
    xStep: 1,
    yStep: 1,
    showGrid: true,
    connectPoints: true,
    closeShape: true,
    mode: 'show',
    height: 6.0,
    width: 8.0,
    points: [
        { label: 'A', x: 1, y: 1 },
        { label: 'B', x: 5, y: 1 },
        { label: 'C', x: 5, y: 4 },
        { label: 'D', x: 1, y: 4 }
    ],
    colorShape: false,
});

export const createDefaultVierfeldertafel = (): VierfeldertafelData => ({
    labels: { top1: '$A$', top2: '$\\overline{A}$', left1: '$B$', left2: '$\\overline{B}$' },
    rawLabels: { top1: 'A', top2: 'A', left1: 'B', left2: 'B' },
    negated: { top1: false, top2: true, left1: false, left2: true },
    data: [['', '', ''], ['', '', ''], ['', '', '']],
    printVisibility: [[true, true, true], [true, true, true], [true, true, true]],
});

export const createDefaultMCQ = (): MCQData => ({
    options: [{ id: Date.now(), text: '' }, { id: Date.now() + 1, text: '' }],
});

export const createDefaultMatching = (): MatchingData => ({
    leftItems: [{ id: Date.now(), text: '' }],
    rightItems: [{ id: Date.now() + 1, text: '' }],
});

export const createDefaultImage = (): ImageData => ({
    rows: 1,
    cols: 1,
    width: 10,
    maxHeight: 5,
    activeIndex: 0,
    slots: [''],
});

export const generateAnalysisRiemannCode = (data: any): string => {
    const formula = data.formula || '';
    const xStart = data.xStart !== undefined ? data.xStart : '0';
    const xEnd = data.xEnd !== undefined ? data.xEnd : '3';
    const rectangles = data.rectangles !== undefined ? data.rectangles : 6;
    const sumType = data.sumType || 'lower';
    const showValue = !!data.showValue;

    return `// Riemann-Summen: f(x) = ${formula} im Intervall [${xStart}; ${xEnd}]
var formula = ${JSON.stringify(formula)};
var xStartVal = parseFloat(${JSON.stringify(xStart)});
var xEndVal = parseFloat(${JSON.stringify(xEnd)});
var rectangles = parseInt(${JSON.stringify(rectangles)}) || 6;
var sumType = ${JSON.stringify(sumType)};

if (isNaN(xStartVal)) xStartVal = 0;
if (isNaN(xEndVal)) xEndVal = 3;

var xMin = board.getBoundingBox()[0];
var xMax = board.getBoundingBox()[2];
var yMin = board.getBoundingBox()[3];
var yMax = board.getBoundingBox()[1];

if (formula && formula.trim() !== "") {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) { 
            try {
                var val = compiled.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        // Plot f(x)
        var f = board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#10b981',
            name: 'f(x)',
            withLabel: true,
            label: { offset: [10, 10], color: '#10b981' }
        });

        // Draw Riemann Sum rectangles
        if (sumType === 'lower' || sumType === 'both') {
            board.create('riemannsum', [fn, rectangles, 'lower', xStartVal, xEndVal], {
                fillColor: '#3b82f6',
                fillOpacity: 0.25,
                strokeColor: '#2563eb',
                strokeWidth: 1
            });
        }
        if (sumType === 'upper' || sumType === 'both') {
            board.create('riemannsum', [fn, rectangles, 'upper', xStartVal, xEndVal], {
                fillColor: '#f97316',
                fillOpacity: 0.25,
                strokeColor: '#ea580c',
                strokeWidth: 1
            });
        }

        // Boundary lines
        board.create('segment', [[xStartVal, yMin], [xStartVal, yMax]], { 
            strokeColor: '#64748b', 
            strokeWidth: 1.2, 
            strokeDash: 2,
            fixed: true,
            name: '',
            withLabel: false
        });
        board.create('segment', [[xEndVal, yMin], [xEndVal, yMax]], { 
            strokeColor: '#64748b', 
            strokeWidth: 1.2, 
            strokeDash: 2,
            fixed: true,
            name: '',
            withLabel: false
        });

        // Numeric values text on board
        if (${showValue}) {
            var txt = '';
            if (sumType === 'lower' || sumType === 'both') {
                var lowerVal = JXG.Math.Numerics.riemannsum(fn, rectangles, 'lower', xStartVal, xEndVal);
                txt += 'U<sub>' + rectangles + '</sub> &asymp; ' + lowerVal.toFixed(2).replace('.', ',');
            }
            if (sumType === 'both') {
                txt += ' &nbsp;&nbsp; ';
            }
            if (sumType === 'upper' || sumType === 'both') {
                var upperVal = JXG.Math.Numerics.riemannsum(fn, rectangles, 'upper', xStartVal, xEndVal);
                txt += 'O<sub>' + rectangles + '</sub> &asymp; ' + upperVal.toFixed(2).replace('.', ',');
            }

            board.create('text', [xMin + 0.5, yMax - 0.5, txt], {
                fontSize: 13,
                strokeColor: '#1e293b',
                display: 'html'
            });
        }

    } catch(err) {
        console.error("Math compilation failed in Riemann-Summen:", err);
    }
}`;
};

export const generateAnalysisFlaechenCode = (data: any): string => {
    const formulaF = data.formulaF || '';
    const formulaG = data.formulaG || '';
    const enableG = !!data.enableG;
    const limitA = data.limitA !== undefined ? data.limitA : '0';
    const limitB = data.limitB !== undefined ? data.limitB : '3';

    return `// Flächenmarkierung: f(x) = ${formulaF}${enableG ? `, g(x) = ${formulaG}` : ''}
var formulaF = ${JSON.stringify(formulaF)};
var formulaG = ${JSON.stringify(formulaG)};
var enableG = ${enableG};
var limitAVal = parseFloat(${JSON.stringify(limitA)});
var limitBVal = parseFloat(${JSON.stringify(limitB)});

if (isNaN(limitAVal)) limitAVal = 0;
if (isNaN(limitBVal)) limitBVal = 3;

var xMin = board.getBoundingBox()[0];
var xMax = board.getBoundingBox()[2];
var yMin = board.getBoundingBox()[3];
var yMax = board.getBoundingBox()[1];

if (formulaF && formulaF.trim() !== "") {
    try {
        var math = window.math;
        
        // Compile and evaluate f(x)
        var compiledF = math.compile(formulaF);
        var fnF = function(x) { 
            try {
                var val = compiledF.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        // Plot f(x)
        var f = board.create('functiongraph', [fnF], {
            strokeWidth: 2.5,
            strokeColor: '#3b82f6',
            name: 'f(x)',
            withLabel: true,
            label: { offset: [10, 10], color: '#3b82f6' }
        });

        var g = null;
        var fnG = null;
        
        // Compile and evaluate g(x) if enabled
        if (enableG && formulaG && formulaG.trim() !== "") {
            try {
                var compiledG = math.compile(formulaG);
                fnG = function(x) { 
                    try {
                        var val = compiledG.evaluate({ x: x }); 
                        return (typeof val === 'number' && !isNaN(val)) ? val : null;
                    } catch(e) { return null; }
                };
                g = board.create('functiongraph', [fnG], {
                    strokeWidth: 2.5,
                    strokeColor: '#ef4444',
                    name: 'g(x)',
                    withLabel: true,
                    label: { offset: [10, 10], color: '#ef4444' }
                });
            } catch(gErr) {
                console.error("Error compiling g(x):", gErr);
            }
        }

        // Shading the area
        if (enableG && fnG) {
            // Shading between f(x) and g(x)
            var steps = 100;
            var dx = (limitBVal - limitAVal) / steps;
            var vertices = [];
            for (var i = 0; i <= steps; i++) {
                var x = limitAVal + i * dx;
                var y = fnF(x);
                if (y !== null && !isNaN(y)) {
                    vertices.push([x, y]);
                }
            }
            for (var i = steps; i >= 0; i--) {
                var x = limitAVal + i * dx;
                var y = fnG(x);
                if (y !== null && !isNaN(y)) {
                    vertices.push([x, y]);
                }
            }
            board.create('polygon', vertices, {
                fillColor: '#3b82f6',
                fillOpacity: 0.25,
                borders: { visible: false },
                vertices: { visible: false },
                name: 'A',
                withLabel: false
            });
        } else {
            // Shading between f(x) and x-axis
            board.create('integral', [[limitAVal, limitBVal], f], {
                fillColor: '#3b82f6',
                fillOpacity: 0.25,
                strokeColor: '#2563eb',
                strokeWidth: 1.5,
                label: { visible: true, text: 'A', color: '#1e40af' }
            });
        }

        // Boundary lines
        board.create('segment', [[limitAVal, yMin], [limitAVal, yMax]], { 
            strokeColor: '#64748b', 
            strokeWidth: 1.2, 
            strokeDash: 2,
            fixed: true
        });
        board.create('segment', [[limitBVal, yMin], [limitBVal, yMax]], { 
            strokeColor: '#64748b', 
            strokeWidth: 1.2, 
            strokeDash: 2,
            fixed: true
        });

    } catch(err) {
        console.error("Math compilation failed in Flächenmarkierung:", err);
    }
}`;
};

export const createDefaultAnalysisRiemann = (): AnalysisRiemannData => {
    const data: any = {
        settings: { axis: true, grid: true, xMin: -1, xMax: 4, yMin: -1, yMax: 5, width: 10, height: 10 },
        formula: '0.25*x^2 + 1',
        xStart: '0',
        xEnd: '3',
        rectangles: 6,
        sumType: 'lower',
        showValue: false,
        elements: [],
        code: ''
    };
    data.code = generateAnalysisRiemannCode(data);
    return data;
};

export const createDefaultAnalysisFlaechen = (): any => {
    const data: any = {
        settings: { axis: true, grid: true, xMin: -2, xMax: 5, yMin: -2, yMax: 5, width: 10, height: 10 },
        formulaF: '0.25*x^3 - x^2 + 1',
        formulaG: '-0.5*x + 1.5',
        enableG: false,
        limitA: '0',
        limitB: '3',
        elements: [],
        code: ''
    };
    data.code = generateAnalysisFlaechenCode(data);
    return data;
};

export const generateAnalysisTangenteCode = (data: any): string => {
    const formula = data.formula || '';
    const x0 = data.x0 !== undefined ? data.x0 : '1.0';
    const showTangent = !!data.showTangent;
    const showSlopeTriangle = !!data.showSlopeTriangle;

    return `// Steigungsdreieck & Tangente: f(x) = ${formula} an der Stelle x_0 = ${x0}
var formula = ${JSON.stringify(formula)};
var x0Val = parseFloat(${JSON.stringify(x0)});
if (isNaN(x0Val)) x0Val = 1.0;

if (formula && formula.trim() !== "") {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) { 
            try {
                var val = compiled.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        // Plot f(x)
        var f = board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#8b5cf6',
            name: 'f(x)',
            withLabel: true,
            label: { offset: [10, 10], color: '#8b5cf6' }
        });

        // Glider / Point at x0 on f(x)
        var y0Val = fn(x0Val);
        if (y0Val !== null) {
            var p = board.create('glider', [x0Val, y0Val, f], {
                name: 'P(' + (Math.round(x0Val * 100) / 100) + ' | ' + (Math.round(y0Val * 100) / 100) + ')',
                size: 4,
                face: 'o',
                color: '#8b5cf6',
                fixed: true,
                label: { offset: [5, 10], color: '#8b5cf6' }
            });

            // Tangent line
            var t = null;
            if (${showTangent}) {
                t = board.create('tangent', [p], {
                    strokeWidth: 1.5,
                    strokeColor: '#ef4444',
                    name: 'Tangente',
                    withLabel: true,
                    label: { offset: [10, 10], color: '#ef4444' }
                });
            }

            // Slope Triangle
            if (${showSlopeTriangle}) {
                // If tangent is drawn, bind to it. Else, construct a tangent mathematically to draw slope triangle!
                if (!t) {
                    t = board.create('tangent', [p], { visible: false });
                }
                board.create('slopetriangle', [t], {
                    fillColor: '#8b5cf6',
                    fillOpacity: 0.15,
                    strokeColor: '#7c3aed',
                    strokeWidth: 1.5,
                    label: { color: '#5b21b6', fontSize: 14 }
                });
            }
        }

    } catch(err) {
        console.error("Math compilation failed in Tangente:", err);
    }
}`;
};

export const createDefaultAnalysisTangente = (): any => {
    const data: any = {
        settings: { axis: true, grid: true, xMin: -3, xMax: 4, yMin: -3, yMax: 3, width: 10, height: 10 },
        formula: 'sin(x)',
        x0: '1.0',
        showTangent: true,
        showSlopeTriangle: true,
        elements: [],
        code: ''
    };
    data.code = generateAnalysisTangenteCode(data);
    return data;
};

export const solveSteckbrief = (data: any): any => {
    const degree = parseInt(data.degree as any) || 3;
    const symmetry = data.symmetry || 'none';
    const powers: number[] = [];
    for (let i = degree; i >= 0; i--) {
        if (symmetry === 'achsensymmetrisch' && i % 2 !== 0) continue;
        if (symmetry === 'punktsymmetrisch' && i % 2 === 0) continue;
        powers.push(i);
    }

    const math = (window as any).math;
    const parseVal = (str: string): number => {
        if (str === null || str === undefined || str.trim() === '') return NaN;
        try {
            if (math && math.evaluate) {
                const res = math.evaluate(str.replace(',', '.'));
                return typeof res === 'number' ? res : parseFloat(str.replace(',', '.'));
            }
            return parseFloat(str.replace(',', '.'));
        } catch (e) {
            return parseFloat(str.replace(',', '.'));
        }
    };

    interface EquationDef {
        type: string;
        xStr: string;
        yStr: string;
        x: number;
        y: number;
        d: number;
        label: string;
    }
    const eqDefs: EquationDef[] = [];
    const conditions = data.conditions || [];

    conditions.forEach((cond: any) => {
        const x = parseVal(cond.x);
        const y = parseVal(cond.y);
        if (isNaN(x)) return;

        const xStr = cond.x;
        const yStr = cond.y;

        if (cond.type === 'point') {
            if (isNaN(y)) return;
            eqDefs.push({ type: 'point', xStr, yStr, x, y, d: 0, label: `f(${xStr}) = ${yStr}` });
        } else if (cond.type === 'extreme') {
            eqDefs.push({ type: 'extreme_slope', xStr, yStr: '0', x, y: 0, d: 1, label: `f'(${xStr}) = 0` });
            if (!isNaN(y)) {
                eqDefs.push({ type: 'extreme_point', xStr, yStr, x, y, d: 0, label: `f(${xStr}) = ${yStr}` });
            }
        } else if (cond.type === 'inflection') {
            eqDefs.push({ type: 'inflection_slope', xStr, yStr: '0', x, y: 0, d: 2, label: `f''(${xStr}) = 0` });
            if (!isNaN(y)) {
                eqDefs.push({ type: 'inflection_point', xStr, yStr, x, y, d: 0, label: `f(${xStr}) = ${yStr}` });
            }
        } else if (cond.type === 'saddle') {
            eqDefs.push({ type: 'saddle_d1', xStr, yStr: '0', x, y: 0, d: 1, label: `f'(${xStr}) = 0` });
            eqDefs.push({ type: 'saddle_d2', xStr, yStr: '0', x, y: 0, d: 2, label: `f''(${xStr}) = 0` });
            if (!isNaN(y)) {
                eqDefs.push({ type: 'saddle_point', xStr, yStr, x, y, d: 0, label: `f(${xStr}) = ${yStr}` });
            }
        } else if (cond.type === 'slope') {
            if (isNaN(y)) return;
            eqDefs.push({ type: 'slope', xStr, yStr, x, y, d: 1, label: `f'(${xStr}) = ${yStr}` });
        } else if (cond.type === 'curvature') {
            if (isNaN(y)) return;
            eqDefs.push({ type: 'curvature', xStr, yStr, x, y, d: 2, label: `f''(${xStr}) = ${yStr}` });
        } else if (cond.type === 'yIntercept') {
            if (isNaN(y)) return;
            eqDefs.push({ type: 'yIntercept', xStr: '0', yStr, x: 0, y, d: 0, label: `f(0) = ${yStr}` });
        }
    });

    const numVars = powers.length;
    const numEqs = eqDefs.length;

    const getFactor = (p: number, d: number, x: number): number => {
        if (p < d) return 0;
        let coef = 1;
        for (let j = 0; j < d; j++) {
            coef *= (p - j);
        }
        return coef * Math.pow(x, p - d);
    };

    const M: number[][] = [];
    const V: number[] = [];
    const lgsSteps: string[] = [];
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

    eqDefs.forEach((eq, idx) => {
        const row: number[] = [];
        powers.forEach((p) => {
            row.push(getFactor(p, eq.d, eq.x));
        });
        M.push(row);
        V.push(eq.y);

        const terms: string[] = [];
        powers.forEach((p, k) => {
            const coeffLetter = String.fromCharCode(97 + k);
            const factorVal = getFactor(p, eq.d, eq.x);
            if (factorVal === 0) return;

            let factorStr = '';
            if (factorVal === 1) {
                factorStr = coeffLetter;
            } else if (factorVal === -1) {
                factorStr = `-${coeffLetter}`;
            } else {
                factorStr = `${Math.round(factorVal * 1000) / 1000}${coeffLetter}`;
            }
            terms.push(factorStr);
        });

        const roman = romanNumerals[idx] || `${idx + 1}`;
        const eqExpr = terms.join(' + ').replace(/\+ -/g, '- ');
        lgsSteps.push(`(${roman})\\quad ${eqExpr || '0'} = ${eq.yStr}`);
    });

    let status: 'solved' | 'underdetermined' | 'contradictory' | 'error' = 'underdetermined';
    let coefficientsList: number[] = [];
    const coefficients: Record<string, number> = {};
    let formula = '';
    let formulaDisplay = '';
    let errorMessage = '';

    if (numVars === 0) {
        status = 'underdetermined';
        errorMessage = 'Keine Variable vorhanden.';
    } else if (numEqs < numVars) {
        status = 'underdetermined';
        errorMessage = `Unterbestimmt: Es werden mindestens ${numVars} Bedingungen benötigt (aktuell: ${numEqs}).`;
    } else {
        try {
            if (math && math.lusolve) {
                const squareM = M.slice(0, numVars);
                const squareV = V.slice(0, numVars);

                let det = 0;
                try {
                    det = math.det(squareM);
                } catch(e) {
                    det = 0;
                }

                if (Math.abs(det) < 1e-9) {
                    status = 'contradictory';
                    errorMessage = 'Widersprüchliche oder linear abhängige Bedingungen!';
                } else {
                    const sol = math.lusolve(squareM, squareV);
                    const solvedCoeffs = sol.map((row: any) => typeof row === 'number' ? row : (Array.isArray(row) ? row[0] : parseFloat(row)));
                    
                    let isContradictory = false;
                    for (let i = numVars; i < numEqs; i++) {
                        let sum = 0;
                        for (let k = 0; k < numVars; k++) {
                            sum += M[i][k] * solvedCoeffs[k];
                        }
                        if (Math.abs(sum - V[i]) > 1e-4) {
                            isContradictory = true;
                            break;
                        }
                    }

                    if (isContradictory) {
                        status = 'contradictory';
                        errorMessage = 'Widersprüchliche Bedingungen!';
                    } else {
                        status = 'solved';
                        coefficientsList = solvedCoeffs;
                        powers.forEach((p, k) => {
                            const coeffLetter = String.fromCharCode(97 + k);
                            coefficients[coeffLetter] = solvedCoeffs[k];
                        });

                        const formulaParts: string[] = [];
                        const formulaDisplayParts: string[] = [];

                        const formatCoeff = (val: number): { raw: string, display: string } => {
                            const rounded = Math.round(val * 100000) / 100000;
                            if (rounded === 0) return { raw: '0', display: '0' };
                            
                            if (math && math.fraction) {
                                try {
                                    const frac = math.fraction(rounded);
                                    if (frac.d <= 20 && frac.d > 1) {
                                        const sign = frac.s < 0 ? '-' : '';
                                        const raw = `${sign}${frac.n}/${frac.d}`;
                                        const display = `${sign}\\frac{${frac.n}}{${frac.d}}`;
                                        return { raw, display };
                                    }
                                } catch(e) {}
                            }

                            const str = String(rounded);
                            return { raw: str, display: str.replace('.', ',') };
                        };

                        powers.forEach((p, k) => {
                            const val = solvedCoeffs[k];
                            const roundedVal = Math.round(val * 100000) / 100000;
                            if (roundedVal === 0) return;

                            const isFirst = formulaParts.length === 0;
                            const sign = roundedVal < 0 ? '-' : (isFirst ? '' : '+');
                            const absVal = Math.abs(roundedVal);

                            const formatted = formatCoeff(absVal);

                            let termRaw = '';
                            if (p === 0) {
                                termRaw = `${roundedVal}`;
                            } else if (p === 1) {
                                termRaw = absVal === 1 ? (roundedVal < 0 ? '-x' : 'x') : `${roundedVal}*x`;
                            } else {
                                termRaw = absVal === 1 ? (roundedVal < 0 ? `-x^${p}` : `x^${p}`) : `${roundedVal}*x^${p}`;
                            }
                            if (isFirst) {
                                formulaParts.push(termRaw);
                            } else {
                                if (roundedVal < 0) {
                                    formulaParts.push(termRaw);
                                } else {
                                    formulaParts.push(`+${termRaw}`);
                                }
                            }

                            let termDisplay = '';
                            const coeffDisplay = (formatted.raw === '1' || formatted.raw === '1/1') ? '' : formatted.display;

                            if (p === 0) {
                                termDisplay = formatted.display;
                            } else if (p === 1) {
                                termDisplay = `${coeffDisplay}x`;
                            } else {
                                termDisplay = `${coeffDisplay}x^${p}`;
                            }

                            formulaDisplayParts.push(`${sign} ${termDisplay}`);
                        });

                        formula = formulaParts.join('').replace(/\+\-/g, '-').replace(/\+\+/g, '+');
                        if (formula.startsWith('+')) formula = formula.substring(1);

                        if (formulaParts.length === 0) {
                            formula = '0';
                            formulaDisplay = 'f(x) = 0';
                        } else {
                            formulaDisplay = `f(x) = ${formulaDisplayParts.join(' ')}`;
                            formulaDisplay = formulaDisplay.replace(/\+\s\-/g, '- ').replace(/\-\s\+/g, '- ');
                        }
                    }
                }
            } else {
                status = 'error';
                errorMessage = 'Math.js ist nicht geladen.';
            }
        } catch (solveErr) {
            console.error("Solver error:", solveErr);
            status = 'contradictory';
            errorMessage = 'Widersprüchliche Bedingungen (keine Lösung)!';
        }
    }

    return {
        status,
        formula,
        formulaDisplay,
        coefficients,
        coefficientsList,
        equationsText: eqDefs.map(e => e.label),
        lgsStepsText: lgsSteps,
        errorMessage: errorMessage || undefined
    };
};

export const generateAnalysisSteckbriefCode = (data: any): string => {
    const sol = solveSteckbrief(data);
    const formula = sol.status === 'solved' ? sol.formula : '';

    const pointsToPlot: Array<{x: number, y: number, label: string, color: string}> = [];
    const math = (window as any).math;

    const parseVal = (str: string): number => {
        if (str === null || str === undefined || str.trim() === '') return NaN;
        try {
            if (math && math.evaluate) {
                const res = math.evaluate(str.replace(',', '.'));
                return typeof res === 'number' ? res : parseFloat(str.replace(',', '.'));
            }
            return parseFloat(str.replace(',', '.'));
        } catch (e) {
            return parseFloat(str.replace(',', '.'));
        }
    };

    const conditions = data.conditions || [];
    conditions.forEach((cond: any) => {
        const x = parseVal(cond.x);
        const y = parseVal(cond.y);
        if (isNaN(x)) return;

        let label = '';
        let color = '#3b82f6';
        if (cond.type === 'point') {
            if (isNaN(y)) return;
            label = `P(${cond.x}|${cond.y})`;
        } else if (cond.type === 'extreme') {
            label = isNaN(y) ? `E(x=${cond.x})` : `E(${cond.x}|${cond.y})`;
            color = '#ef4444';
        } else if (cond.type === 'inflection') {
            label = isNaN(y) ? `W(x=${cond.x})` : `W(${cond.x}|${cond.y})`;
            color = '#10b981';
        } else if (cond.type === 'saddle') {
            label = isNaN(y) ? `S(x=${cond.x})` : `S(${cond.x}|${cond.y})`;
            color = '#f59e0b';
        } else if (cond.type === 'yIntercept') {
            if (isNaN(y)) return;
            label = `S_y(0|${cond.y})`;
        }

        if (label && !isNaN(x) && !isNaN(y)) {
            pointsToPlot.push({ x, y, label, color });
        }
    });

    return `// Steckbriefaufgabe Plot
var formula = ${JSON.stringify(formula)};
var points = ${JSON.stringify(pointsToPlot)};

if (formula && formula.trim() !== "") {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) { 
            try {
                var val = compiled.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        // Plot f(x)
        var f = board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#3b82f6',
            name: 'f(x)',
            withLabel: true,
            label: { offset: [10, 10], color: '#3b82f6' }
        });

        // Draw points of conditions
        points.forEach(function(pt) {
            board.create('point', [pt.x, pt.y], {
                name: pt.label,
                size: 4,
                face: 'o',
                color: pt.color,
                strokeColor: pt.color,
                fixed: true,
                label: { offset: [5, 10], color: pt.color }
            });
        });

    } catch(err) {
        console.error("Math compilation failed in Steckbrief Plot:", err);
    }
}`;
};

export const createDefaultAnalysisSteckbrief = (): any => {
    const data: any = {
        degree: 3,
        symmetry: 'none',
        conditions: [
            { id: '1', type: 'yIntercept', x: '0', y: '4' },
            { id: '2', type: 'extreme', x: '2', y: '0' },
            { id: '3', type: 'inflection', x: '1', y: '2' }
        ],
        showGraph: true,
        showTextual: true,
        settings: { axis: true, grid: true, xMin: -2, xMax: 5, yMin: -2, yMax: 6, width: 10, height: 10 },
        code: '',
        elements: []
    };
    data.code = generateAnalysisSteckbriefCode(data);
    return data;
};

export const createDefaultAnalysisPuzzle = (): any => {
    const data: any = {
        mode: 'derivative',
        typeF: 'graph',
        typeFPrime: 'graph',
        showJustification: false,
        justificationHeight: 4,
        justificationInTable: false,
        functions: [
            { id: '1', expr: 'x^2 - 2', exprFPrime: '2 * x' },
            { id: '2', expr: 'x^3 - 3*x', exprFPrime: '3 * x^2 - 3' },
            { id: '3', expr: 'sin(x)', exprFPrime: 'cos(x)' }
        ],
        shuffledIndices: [1, 2, 0],
        settings: { axis: true, grid: true, xMin: -4, xMax: 4, yMin: -4, yMax: 4, width: 6, height: 6 }
    };
    return data;
};

export const generatePuzzleTaskText = (data: any): string => {
    if (data.mode === 'graph_to_equation') {
        return "Ordne den Graphen (I bis III) die entsprechenden Funktionsgleichungen (A bis C) zu.";
    }
    const typeF = data.typeF || 'graph';
    const typeFPrime = data.typeFPrime || 'graph';
    
    if (typeF === 'graph' && typeFPrime === 'graph') {
        return "Ordne die Graphen der Funktionen (I bis III) den Graphen ihrer Ableitungsfunktionen (A bis C) zu.";
    } else if (typeF === 'graph' && typeFPrime === 'equation') {
        return "Ordne die Graphen der Funktionen (I bis III) den Gleichungen ihrer Ableitungsfunktionen (A bis C) zu.";
    } else if (typeF === 'equation' && typeFPrime === 'graph') {
        return "Ordne die Gleichungen der Funktionen (I bis III) den Graphen ihrer Ableitungsfunktionen (A bis C) zu.";
    } else {
        return "Ordne die Gleichungen der Funktionen (I bis III) den Gleichungen ihrer Ableitungsfunktionen (A bis C) zu.";
    }
};

export const updatePuzzleCode = (data: any, parent?: any): void => {
    const math = (window as any).math;
    if (data.functions) {
        data.functions.forEach((fn: any) => {
            if (fn.expr && fn.expr.trim() !== '') {
                try {
                    if (math && math.derivative) {
                        fn.exprFPrime = math.derivative(fn.expr, 'x').toString();
                    }
                } catch (e) {
                    console.error("Derivation failed for:", fn.expr, e);
                }
            }
        });
    }

    const count = data.functions ? data.functions.length : 0;
    if (!data.shuffledIndices || data.shuffledIndices.length !== count) {
        data.shuffledIndices = Array.from({ length: count }, (_, i) => i);
        // Shuffle
        for (let i = count - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [data.shuffledIndices[i], data.shuffledIndices[j]] = [data.shuffledIndices[j], data.shuffledIndices[i]];
        }
    }

    if (parent) {
        const currentText = parent.context !== undefined ? (parent.context || '') : (parent.text || '');
        const isAuto = !currentText || currentText.trim() === "" ||
            currentText.includes("Ordne den Graphen (I bis III) die entsprechenden Funktionsgleichungen") ||
            currentText.includes("Ordne die Graphen der Funktionen (I bis III) den Graphen ihrer Ableitungsfunktionen") ||
            currentText.includes("Ordne die Graphen der Funktionen (I bis III) den Gleichungen ihrer Ableitungsfunktionen") ||
            currentText.includes("Ordne die Gleichungen der Funktionen (I bis III) den Graphen ihrer Ableitungsfunktionen") ||
            currentText.includes("Ordne die Gleichungen der Funktionen (I bis III) den Gleichungen ihrer Ableitungsfunktionen");
        if (isAuto) {
            const newText = generatePuzzleTaskText(data);
            if (parent.context !== undefined) {
                parent.context = newText;
            } else {
                parent.text = newText;
            }
        }
    }
};

export const createDefaultAnalysisRotationskoerper = (): any => {
    const data: any = {
        formula: 'sqrt(x)',
        xStart: '0',
        xEnd: '4',
        settings: { axis: true, grid: true, xMin: -1, xMax: 5, yMin: -3, yMax: 3, width: 8, height: 6 },
        code: ''
    };
    data.code = generateRotationskoerperCode(data);
    return data;
};

export const generateRotationskoerperCode = (data: any): string => {
    const fExpr = (data.formula || '').trim();
    const xStart = parseFloat(data.xStart) !== undefined && !isNaN(parseFloat(data.xStart)) ? parseFloat(data.xStart) : 0;
    const xEnd = parseFloat(data.xEnd) !== undefined && !isNaN(parseFloat(data.xEnd)) ? parseFloat(data.xEnd) : 4;
    
    if (fExpr === '') return '';

    return `
// Rotationskoerper-Zeichnung
(function() {
    var fExpr = ${JSON.stringify(fExpr)};
    var xStart = ${xStart};
    var xEnd = ${xEnd};
    
    try {
        var math = window.math;
        var compiled = math.compile(fExpr);
        var fEval = function(x) {
            try { 
                var val = compiled.evaluate({ x: x });
                return (typeof val === 'number' && !isNaN(val)) ? val : 0;
            } catch (e) { return 0; }
        };

        // 1. Obere Kurve f(x)
        board.create('functiongraph', [fEval, xStart, xEnd], {
            strokeColor: '#0f172a',
            strokeWidth: 2.5,
            highlight: false
        });

        // 2. Untere Spiegelkurve -f(x)
        board.create('functiongraph', [function(x) { return -fEval(x); }, xStart, xEnd], {
            strokeColor: '#64748b',
            strokeWidth: 1.8,
            strokeStyle: 2,
            highlight: false
        });

        // 3. Vertikale Seitenbegrenzungen
        board.create('segment', [[xStart, fEval(xStart)], [xStart, -fEval(xStart)]], {
            strokeColor: '#475569',
            strokeWidth: 1.2,
            strokeStyle: 2,
            highlight: false
        });
        board.create('segment', [[xEnd, fEval(xEnd)], [xEnd, -fEval(xEnd)]], {
            strokeColor: '#475569',
            strokeWidth: 1.2,
            highlight: false
        });

        // 4. Schraffierte Fuellung (Koerper-Shading)
        var pathPoints = [];
        var nSteps = 50;
        for (var i = 0; i <= nSteps; i++) {
            var xVal = xStart + (xEnd - xStart) * (i / nSteps);
            pathPoints.push(board.create('point', [xVal, fEval(xVal)], {visible: false}));
        }
        for (var i = nSteps; i >= 0; i--) {
            var xVal = xStart + (xEnd - xStart) * (i / nSteps);
            pathPoints.push(board.create('point', [xVal, -fEval(xVal)], {visible: false}));
        }
        board.create('polygon', pathPoints, {
            fillColor: '#94a3b8',
            fillOpacity: 0.1,
            strokeWidth: 0,
            highlight: false,
            vertices: {visible: false},
            borders: {visible: false}
        });

        // 5. 3D-Look Ellipsen
        var drawEllipse = function(x0) {
            var R = Math.abs(fEval(x0));
            if (R < 0.05) return;
            var r = R * 0.15; // Perspektivische Stauchung

            // Hintere Haelfte (gestrichelt)
            board.create('curve', [
                function(t) { return x0 + r * Math.cos(t); },
                function(t) { return R * Math.sin(t); },
                Math.PI/2, 3*Math.PI/2
            ], {
                strokeColor: '#94a3b8',
                strokeWidth: 1,
                strokeStyle: 2,
                highlight: false
            });

            // Vordere Haelfte (durchgezogen)
            board.create('curve', [
                function(t) { return x0 + r * Math.cos(t); },
                function(t) { return R * Math.sin(t); },
                -Math.PI/2, Math.PI/2
            ], {
                strokeColor: '#0f172a',
                strokeWidth: 1.5,
                highlight: false
            });
        };

        drawEllipse(xStart);
        drawEllipse(xEnd);

        // Zwischen-Ellipsen bei ausreichender Breite
        if (xEnd - xStart > 1.5) {
            drawEllipse(xStart + (xEnd - xStart) * 0.33);
            drawEllipse(xStart + (xEnd - xStart) * 0.66);
        }

        // 6. Rotationspfeil um die x-Achse
        var arrowX = xStart - 0.3;
        // Bestimme den Radius des Pfeils basierend auf dem Koerper-Radius in der Naehe
        var sampleR = Math.abs(fEval(xStart + (xEnd - xStart) * 0.1));
        var arrowR = Math.max(0.6, Math.min(1.2, sampleR * 0.8));
        var arrowr = arrowR * 0.15; // Perspektivische Stauchung
        
        board.create('curve', [
            function(t) { return arrowX + arrowr * Math.cos(t); },
            function(t) { return arrowR * Math.sin(t); },
            -Math.PI * 0.3, Math.PI * 1.2
        ], {
            strokeColor: '#0f172a',
            strokeWidth: 1.5,
            lastArrow: true,
            highlight: false
        });

    } catch (e) {
        console.error("Fehler beim Zeichnen des Rotationskoerpers:", e);
    }
})();
`;
};

export const generateRotationskoerperTaskText = (data: any): string => {
    const formula = data.formula || 'sqrt(x)';
    const a = data.xStart !== undefined ? data.xStart : '0';
    const b = data.xEnd !== undefined ? data.xEnd : '4';
    return `Der Graph der Funktion $f(x) = ${formula}$ rotiert im Intervall $[${a}; ${b}]$ um die x-Achse. Bestimme das Volumen des entstehenden Rotationskörpers.`;
};

export const updateRotationskoerperCode = (data: any, parent?: any): void => {
    if (parent) {
        const currentText = parent.context !== undefined ? (parent.context || '') : (parent.text || '');
        const isAuto = !currentText || currentText.trim() === "" ||
            (currentText.includes("Der Graph der Funktion") && currentText.includes("rotiert im Intervall") && currentText.includes("um die x-Achse. Bestimme das Volumen des entstehenden Rotationskörpers."));
        if (isAuto) {
            const newText = generateRotationskoerperTaskText(data);
            if (parent.context !== undefined) {
                parent.context = newText;
            } else {
                parent.text = newText;
            }
        }
    }
    data.code = generateRotationskoerperCode(data);
};

export const createDefaultAnalysisExtremwert = (): any => {
    const data: any = {
        scenarioType: 'pasture',
        parameterValue: '120',
        parameterValue2: '30',
        isFourSided: false,
        settings: { axis: false, grid: false, xMin: 0.5, xMax: 5.5, yMin: -0.3, yMax: 4.0, width: 7, height: 5 },
        code: ''
    };
    data.code = generateAnalysisExtremwertCode(data);
    return data;
};

export const generateAnalysisExtremwertCode = (data: any): string => {
    const type = data.scenarioType || 'pasture';
    const isFourSided = !!data.isFourSided;
    const p1 = data.parameterValue || '';
    const p2 = data.parameterValue2 || '';

    return `
// Extremwertaufgabe-Zeichnung
(function() {
    var type = ${JSON.stringify(type)};
    var isFourSided = ${isFourSided};
    var p1 = ${JSON.stringify(p1)};
    var p2 = ${JSON.stringify(p2)};

    try {
        if (type === 'pasture') {
            // Wiese am Fluss / Einzäunung
            // Flusslauf (falls 3-seitig)
            if (!isFourSided) {
                // Fluss-Shading
                board.create('polygon', [
                    [-5, -1], [10, -1], [10, 0.5], [-5, 0.5]
                ], {
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    strokeWidth: 0,
                    highlight: false,
                    vertices: {visible: false},
                    borders: {visible: false}
                });

                // Wavy Flussufer
                board.create('curve', [
                    function(x) { return x; },
                    function(x) { return 0.5 + 0.04 * Math.sin(2 * Math.PI * x); },
                    -5, 10
                ], {
                    strokeColor: '#3b82f6',
                    strokeWidth: 2,
                    highlight: false
                });

                board.create('text', [0, 0.1, "Flussufer"], {
                    color: '#2563eb',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fixed: true,
                    highlight: false
                });
            }

            // Weide-Polygon (Shading)
            board.create('polygon', [
                [1, 0.5], [5, 0.5], [5, 3.5], [1, 3.5]
            ], {
                fillColor: '#10b981',
                fillOpacity: 0.12,
                strokeWidth: 0,
                highlight: false,
                vertices: {visible: false},
                borders: {visible: false}
            });

            // Zaun-Segmente
            var fenceColor = '#854d0e';
            var fenceWidth = 2.5;

            board.create('segment', [[1, 0.5], [1, 3.5]], { strokeColor: fenceColor, strokeWidth: fenceWidth, highlight: false });
            board.create('segment', [[1, 3.5], [5, 3.5]], { strokeColor: fenceColor, strokeWidth: fenceWidth, highlight: false });
            board.create('segment', [[5, 3.5], [5, 0.5]], { strokeColor: fenceColor, strokeWidth: fenceWidth, highlight: false });

            if (isFourSided) {
                board.create('segment', [[1, 0.5], [5, 0.5]], { strokeColor: fenceColor, strokeWidth: fenceWidth, highlight: false });
            }

            // Bemaßungen
            board.create('text', [0.7, 2.0, "y"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [5.1, 2.0, "y"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [2.9, 3.7, "x"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            
            board.create('text', [2.4, 2.0, "Weidefläche (A)"], {
                color: '#065f46',
                fontSize: 13,
                fontWeight: 'bold',
                fixed: true,
                highlight: false
            });

        } else if (type === 'box') {
            // Pappkarton-Netz
            var s = 0.8; // Ausschnittsgröße
            var x0 = 1.0;
            var y0 = 1.0;
            var w = 6.0;
            var h = 4.0;

            // Äußerer Umriss mit ausgeschnittenen Ecken
            var pathPoints = [
                [x0 + s, y0],
                [x0 + w - s, y0],
                [x0 + w - s, y0 + s],
                [x0 + w, y0 + s],
                [x0 + w, y0 + h - s],
                [x0 + w - s, y0 + h - s],
                [x0 + w - s, y0 + h],
                [x0 + s, y0 + h],
                [x0 + s, y0 + h - s],
                [x0, y0 + h - s],
                [x0, y0 + s],
                [x0 + s, y0 + s]
            ];

            // Karton-Körper-Netz zeichnen
            var netPoly = board.create('polygon', pathPoints, {
                fillColor: '#f59e0b',
                fillOpacity: 0.08,
                strokeColor: '#334155',
                strokeWidth: 2,
                highlight: false,
                vertices: {visible: false},
                borders: {highlight: false}
            });

            // Innere Faltlinien (gestrichelt)
            board.create('segment', [[x0 + s, y0 + s], [x0 + w - s, y0 + s]], { strokeColor: '#475569', strokeWidth: 1.2, strokeStyle: 2, highlight: false });
            board.create('segment', [[x0 + s, y0 + h - s], [x0 + w - s, y0 + h - s]], { strokeColor: '#475569', strokeWidth: 1.2, strokeStyle: 2, highlight: false });
            board.create('segment', [[x0 + s, y0 + s], [x0 + s, y0 + h - s]], { strokeColor: '#475569', strokeWidth: 1.2, strokeStyle: 2, highlight: false });
            board.create('segment', [[x0 + w - s, y0 + s], [x0 + w - s, y0 + h - s]], { strokeColor: '#475569', strokeWidth: 1.2, strokeStyle: 2, highlight: false });

            // Kennzeichnung der weggeschnittenen Ecken
            var shadeCorner = function(cx, cy) {
                board.create('polygon', [
                    [cx, cy], [cx + s, cy], [cx + s, cy + s], [cx, cy + s]
                ], {
                    fillColor: '#ef4444',
                    fillOpacity: 0.12,
                    strokeColor: '#ef4444',
                    strokeWidth: 1,
                    strokeStyle: 2,
                    highlight: false,
                    vertices: {visible: false},
                    borders: {highlight: false}
                });
            };

            shadeCorner(x0, y0);
            shadeCorner(x0 + w - s, y0);
            shadeCorner(x0, y0 + h - s);
            shadeCorner(x0 + w - s, y0 + h - s);

            // Bemaßungen
            board.create('text', [x0 + w / 2, y0 - 0.3, "W"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [x0 - 0.3, y0 + h / 2, "H"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [x0 + s / 2, y0 + s + 0.15, "x"], { fontSize: 11, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [x0 + s + 0.15, y0 + s / 2, "x"], { fontSize: 11, fontWeight: 'bold', fixed: true, highlight: false });

            var labelText = "Offene Schachtel";
            board.create('text', [x0 + 1.2, y0 + h/2, labelText], {
                color: '#334155',
                fontSize: 12,
                fontWeight: 'bold',
                fixed: true,
                highlight: false
            });

        } else if (type === 'cylinder' || type === 'cylinder_min') {
            // 3D-Zylinder
            var cx = 3.0;
            var R = 1.5;
            var r = R * 0.25; // Perspektive

            board.create('curve', [
                function(t) { return cx + R * Math.cos(t); },
                function(t) { return 4.0 + r * Math.sin(t); },
                0, 2*Math.PI
            ], {
                strokeColor: '#0f172a',
                strokeWidth: 2,
                highlight: false
            });

            board.create('curve', [
                function(t) { return cx + R * Math.cos(t); },
                function(t) { return 1.0 + r * Math.sin(t); },
                -Math.PI, 0
            ], {
                strokeColor: '#0f172a',
                strokeWidth: 2,
                highlight: false
            });

            board.create('curve', [
                function(t) { return cx + R * Math.cos(t); },
                function(t) { return 1.0 + r * Math.sin(t); },
                0, Math.PI
            ], {
                strokeColor: '#94a3b8',
                strokeWidth: 1.2,
                strokeStyle: 2,
                highlight: false
            });

            board.create('segment', [[cx - R, 1.0], [cx - R, 4.0]], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [[cx + R, 1.0], [cx + R, 4.0]], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });

            var nSteps = 20;
            var bodyPoints = [];
            for (var i = 0; i <= nSteps; i++) {
                var tVal = -Math.PI + Math.PI * (i / nSteps);
                bodyPoints.push(board.create('point', [cx + R * Math.cos(tVal), 1.0 + r * Math.sin(tVal)], {visible: false}));
            }
            for (var i = nSteps; i >= 0; i--) {
                var tVal = -Math.PI + Math.PI * (i / nSteps);
                bodyPoints.push(board.create('point', [cx + R * Math.cos(tVal), 4.0 + r * Math.sin(tVal)], {visible: false}));
            }
            board.create('polygon', bodyPoints, {
                fillColor: '#64748b',
                fillOpacity: 0.08,
                strokeWidth: 0,
                highlight: false,
                vertices: {visible: false},
                borders: {visible: false}
            });

            board.create('segment', [[cx, 4.0], [cx + R, 4.0]], { strokeColor: '#ef4444', strokeWidth: 1.5, highlight: false });
            board.create('text', [cx + R/2, 4.15, "r"], { color: '#ef4444', fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });

            board.create('segment', [[cx + R + 0.4, 1.0], [cx + R + 0.4, 4.0]], { strokeColor: '#2563eb', strokeWidth: 1.5, highlight: false });
            board.create('text', [cx + R + 0.6, 2.5, "h"], { color: '#2563eb', fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });

        } else if (type === 'prism_min') {
            // 3D quadratische Säule (Prisma)
            var cx = 3.0; // center x
            var cy = 1.0; // base y
            var a = 2.0;  // width
            var h = 3.0;  // height
            var d = 0.8;  // depth shift (perspective)
            
            // Base corners (front-left, front-right, back-right, back-left)
            var p1 = [cx - a/2, cy];
            var p2 = [cx + a/2, cy];
            var p3 = [cx + a/2 + d, cy + d];
            var p4 = [cx - a/2 + d, cy + d];
            
            // Top corners
            var t1 = [cx - a/2, cy + h];
            var t2 = [cx + a/2, cy + h];
            var t3 = [cx + a/2 + d, cy + h + d];
            var t4 = [cx - a/2 + d, cy + h + d];
            
            // Draw faces and lines
            // Back lines (dashed)
            board.create('segment', [p4, p3], { strokeColor: '#94a3b8', strokeWidth: 1.2, strokeStyle: 2, highlight: false });
            board.create('segment', [p1, p4], { strokeColor: '#94a3b8', strokeWidth: 1.2, strokeStyle: 2, highlight: false });
            board.create('segment', [p4, t4], { strokeColor: '#94a3b8', strokeWidth: 1.2, strokeStyle: 2, highlight: false });
            
            // Front and side lines (solid)
            board.create('segment', [p1, p2], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [p2, p3], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [t1, t2], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [t2, t3], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [t3, t4], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [t4, t1], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            
            // Verticals
            board.create('segment', [p1, t1], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [p2, t2], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            board.create('segment', [p3, t3], { strokeColor: '#0f172a', strokeWidth: 2, highlight: false });
            
            // Shading (fill)
            board.create('polygon', [p1, p2, t2, t1], { fillColor: '#64748b', fillOpacity: 0.08, strokeWidth: 0, highlight: false, vertices: {visible: false}, borders: {visible: false} });
            board.create('polygon', [p2, p3, t3, t2], { fillColor: '#64748b', fillOpacity: 0.12, strokeWidth: 0, highlight: false, vertices: {visible: false}, borders: {visible: false} });
            
            // Labels
            board.create('text', [cx, cy - 0.25, "a"], { color: '#ef4444', fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [cx + a/2 + d/2 + 0.15, cy + d/2 - 0.1, "a"], { color: '#ef4444', fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [cx - a/2 - 0.35, cy + h/2, "h"], { color: '#2563eb', fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });

        } else if (type === 'function_rect') {
            var aVal = parseFloat(p1) || 1;
            var cVal = parseFloat(p2) || 9;
            
            // Eigene x- und y-Achsen erstellen mit genau definierten Ticks
            board.create('axis', [[0, 0], [1, 0]], {
                ticks: {
                    minorTicks: 0,
                    majorHeight: -1,
                    ticksDistance: 1,
                    insertTicks: false,
                    strokeColor: '#cbd5e1',
                    strokeOpacity: 0.5,
                    label: { offset: [-5, -12], visible: true }
                }
            });

            var yTicksDistance = cVal > 15 ? 5 : 2;
            board.create('axis', [[0, 0], [0, 1]], {
                ticks: {
                    minorTicks: 0,
                    majorHeight: -1,
                    ticksDistance: yTicksDistance,
                    insertTicks: false,
                    strokeColor: '#cbd5e1',
                    strokeOpacity: 0.5,
                    label: { offset: [-18, 0], visible: true }
                }
            });

            var fEval = function(x) {
                return -aVal * x * x + cVal;
            };

            board.create('functiongraph', [fEval, -4, 4], {
                strokeColor: '#3b82f6',
                strokeWidth: 2.5,
                highlight: false
            });

            var xOpt = Math.sqrt(cVal / (3 * aVal)) || 1.73;
            var yOpt = fEval(xOpt);

            board.create('polygon', [
                [-xOpt, 0], [xOpt, 0], [xOpt, yOpt], [-xOpt, yOpt]
            ], {
                fillColor: '#8b5cf6',
                fillOpacity: 0.12,
                strokeColor: '#8b5cf6',
                strokeWidth: 2,
                strokeStyle: 2,
                highlight: false,
                vertices: {visible: false},
                borders: {highlight: false}
            });

            board.create('point', [xOpt, yOpt], { name: "P(x|f(x))", size: 3, strokeColor: '#8b5cf6', fillColor: '#ffffff', label: { fontSize: 12, autoPosition: true } });
            
            board.create('text', [xOpt, -0.4, "x"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [-xOpt - 0.25, -0.4, "-x"], { fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
            board.create('text', [0.15, yOpt / 2, "f(x)"], { color: '#8b5cf6', fontSize: 13, fontWeight: 'bold', fixed: true, highlight: false });
        } else if (type === 'cylinder_in_sphere') {
            var R_draw = 2.0;
            var r_draw = R_draw * Math.sqrt(2.0/3.0);
            var half_h_draw = R_draw / Math.sqrt(3.0);

            // Kugel
            board.create('circle', [[0, 0], R_draw], { strokeColor: '#1e40af', strokeWidth: 2.5, fillOpacity: 0.02, fillColor: '#3b82f6', highlight: false });
            
            // Zylinder (Querschnitt)
            board.create('polygon', [
                [-r_draw, -half_h_draw],
                [r_draw, -half_h_draw],
                [r_draw, half_h_draw],
                [-r_draw, half_h_draw]
            ], {
                fillColor: '#10b981',
                fillOpacity: 0.08,
                strokeColor: '#065f46',
                strokeWidth: 2.5,
                highlight: false,
                vertices: {visible: false},
                borders: {highlight: false}
            });

            // Beschriftung h (Höhe des Zylinders, links)
            board.create('text', [-r_draw - 0.35, 0, "h"], { color: '#0f172a', fontSize: 16, fontWeight: 'bold', fixed: true, highlight: false });

            // Beschriftung d (Durchmesser des Zylinders, unten)
            board.create('text', [-0.08, -half_h_draw + 0.22, "d"], { color: '#0f172a', fontSize: 16, fontWeight: 'bold', fixed: true, highlight: false });
        }

    } catch (e) {
        console.error("Fehler beim Zeichnen der Extremwertaufgabe:", e);
    }
})();
`;
};

export const generateExtremwertTaskText = (data: any): string => {
    const type = data.scenarioType || 'pasture';
    const isFourSided = !!data.isFourSided;
    const p1 = data.parameterValue || '120';
    const p2 = data.parameterValue2 || '30';

    if (type === 'pasture') {
        if (isFourSided) {
            return `Ein Landwirt möchte eine rechteckige Wiese vollständig einzäunen. Es stehen insgesamt **${p1}** m Zaun zur Verfügung. Bestimme die Abmessungen der Wiese, sodass die Weidefläche maximal wird, und berechne diesen maximalen Flächeninhalt.`;
        } else {
            return `Ein Landwirt besitzt ein Grundstück an einem geradlinigen Flussufer. Er möchte eine rechteckige Wiese einzäunen, wobei die dem Fluss zugewandte Seite keinen Zaun benötigt. Es stehen insgesamt **${p1}** m Zaun zur Verfügung. Bestimme die Abmessungen der Wiese, sodass die Weidefläche maximal wird, und berechne diesen maximalen Flächeninhalt.`;
        }
    } else if (type === 'box') {
        return `Aus einem rechteckigen Stück Pappkarton der Maße **${p1}** cm $\\times$ **${p2}** cm soll eine oben offene Schachtel hergestellt werden. Dazu werden an den vier Ecken jeweils Quadrate der Seitenlänge $x$ ausgeschnitten und die überstehenden Ränder hochgebogen. Bestimme den Eckenausschnitt $x$ so, dass das Volumen der Schachtel maximal wird, und berechne dieses maximale Volumen.`;
    } else if (type === 'cylinder') {
        return `Eine zylindrische Getränkedose soll bei einem vorgegebenen Oberflächeninhalt von $O = \\mathbf{${p1}}$ cm² ein möglichst großes Volumen besitzen. Bestimme den optimalen Radius $r$ und die optimale Höhe $h$ der Dose für dieses maximale Volumen.`;
    } else if (type === 'cylinder_min') {
        return `Eine zylindrische Dose soll ein vorgegebenes Volumen von $V = \\mathbf{${p1}}$ cm³ besitzen und eine möglichst geringe Oberfläche aufweisen (Materialminimierung). Bestimme den optimalen Radius $r$ und die optimale Höhe $h$ der Dose für diese minimale Oberfläche.`;
    } else if (type === 'prism_min') {
        return `Ein Paketkarton in Form einer quadratischen Säule (quadratische Grundfläche) soll ein festes Volumen von $V = \\mathbf{${p1}}$ cm³ umschließen. Bestimme die Grundkantenlänge $a$ und die Höhe $h$ des Kartons so, dass der Oberflächeninhalt (Materialverbrauch) minimal wird.`;
    } else if (type === 'function_rect') {
        return `Gegeben ist die nach unten geöffnete Parabel $f(x) = -ax^2 + c$ mit $f(x) = -\\mathbf{${p1}}x^2 + \\mathbf{${p2}}$. Unter der Parabel soll ein symmetrisches Rechteck so einbeschrieben werden, dass zwei Ecken auf der x-Achse liegen und die beiden anderen Ecken auf dem Graphen von $f$ liegen. Bestimme die Abmessungen dieses Rechtecks, sodass der Flächeninhalt maximal wird, und berechne diesen maximalen Flächeninhalt.`;
    } else if (type === 'cylinder_in_sphere') {
        return `Aus einer Kugel mit dem Kugelradius $R = \\mathbf{${p1}}$ cm soll ein Zylinder mit möglichst großem Volumen herausgearbeitet werden. Bestimme den optimalen Radius $r$ und die optimale Höhe $h$ des Zylinders für dieses maximale Volumen. Die Skizze zeigt die Situation in einer Querschnittansicht (Achsenschnitt).`;
    }
    return '';
};

export const updateAnalysisExtremwertCode = (data: any, parent?: any): void => {
    if (data.scenarioType === 'pasture') {
        data.settings.axis = false;
        data.settings.grid = false;
        data.settings.xMin = 0.5;
        data.settings.xMax = 5.5;
        data.settings.yMin = -0.3;
        data.settings.yMax = 4.0;
        data.settings.keepaspectratio = false;
    } else if (data.scenarioType === 'box') {
        data.settings.axis = false;
        data.settings.grid = false;
        data.settings.xMin = 0.4;
        data.settings.xMax = 7.6;
        data.settings.yMin = 0.4;
        data.settings.yMax = 5.6;
        data.settings.keepaspectratio = false;
    } else if (data.scenarioType === 'cylinder' || data.scenarioType === 'cylinder_min') {
        data.settings.axis = false;
        data.settings.grid = false;
        data.settings.xMin = 0.8;
        data.settings.xMax = 5.2;
        data.settings.yMin = 0.4;
        data.settings.yMax = 4.6;
        data.settings.keepaspectratio = false;
    } else if (data.scenarioType === 'prism_min') {
        data.settings.axis = false;
        data.settings.grid = false;
        data.settings.xMin = 0.8;
        data.settings.xMax = 6.2;
        data.settings.yMin = 0.4;
        data.settings.yMax = 5.2;
        data.settings.keepaspectratio = false;
    } else if (data.scenarioType === 'cylinder_in_sphere') {
        data.settings.axis = false;
        data.settings.grid = false;
        data.settings.xMin = -2.5;
        data.settings.xMax = 2.5;
        data.settings.yMin = -2.5;
        data.settings.yMax = 2.5;
        data.settings.keepaspectratio = true;
        const val = parseFloat(data.parameterValue);
        if (isNaN(val) || val <= 0) {
            data.parameterValue = '10';
        }
    } else if (data.scenarioType === 'function_rect') {
        data.settings.axis = false;
        data.settings.grid = false;
        data.settings.keepaspectratio = false;
        const a = parseFloat(data.parameterValue) || 1;
        const c = parseFloat(data.parameterValue2) || 9;
        const r = Math.sqrt(c/a) || 3;
        data.settings.xMin = Math.round((-r - 0.8) * 10) / 10;
        data.settings.xMax = Math.round((r + 0.8) * 10) / 10;
        data.settings.yMin = Math.round(Math.min(-2.0, -0.12 * c) * 10) / 10;
        data.settings.yMax = Math.round((c + 1.0) * 10) / 10;
    }

    if (parent) {
        const currentText = parent.context !== undefined ? (parent.context || '') : (parent.text || '');
        const isAuto = !currentText || currentText.trim() === "" || 
            currentText.includes("Ein Landwirt") || 
            currentText.includes("Aus einem rechteckigen Stück Pappkarton") || 
            currentText.includes("Eine zylindrische Getränkedose") || 
            currentText.includes("Eine zylindrische Dose") || 
            currentText.includes("Ein Paketkarton") || 
            currentText.includes("Gegeben ist die nach unten geöffnete Parabel") ||
            currentText.includes("Aus einer Kugel");
            
        if (isAuto) {
            const newText = generateExtremwertTaskText(data);
            if (parent.context !== undefined) {
                parent.context = newText;
            } else {
                parent.text = newText;
            }
        }
    }

    data.code = generateAnalysisExtremwertCode(data);
};


export const generateAnalysisKurveCode = (data: any): string => {
    const mode = data.mode || 'kurve';

    const labelHelperCode = `// Helper for dynamic labels
var drawFunctionLabel = function(nameStr, colorStr, fnEval) {
    if (!nameStr || nameStr.trim() === "") return;
    try {
        var xMin = board.getBoundingBox()[0];
        var xMax = board.getBoundingBox()[2];
        var yMin = board.getBoundingBox()[3];
        var yMax = board.getBoundingBox()[1];
        
        var bestX = null;
        var bestY = null;
        var paddingY = (yMax - yMin) * 0.15;
        var paddingX = (xMax - xMin) * 0.1;
        
        for (var pct = 0.8; pct >= 0.2; pct -= 0.1) {
            var sampleX = xMin + (xMax - xMin) * pct;
            var sampleY = fnEval(sampleX);
            if (sampleY !== null && !isNaN(sampleY) && sampleY >= (yMin + paddingY) && sampleY <= (yMax - paddingY)) {
                bestX = sampleX;
                bestY = sampleY;
                break;
            }
        }
        
        if (bestX === null) {
            for (var pct = 0.8; pct >= 0.2; pct -= 0.05) {
                var sampleX = xMin + (xMax - xMin) * pct;
                var sampleY = fnEval(sampleX);
                if (sampleY !== null && !isNaN(sampleY) && sampleY >= yMin && sampleY <= yMax) {
                    bestX = sampleX;
                    bestY = sampleY;
                    break;
                }
            }
        }
        
        if (bestX === null) {
            bestX = xMax - paddingX;
            bestY = yMax - paddingY;
        }
        
        board.create('text', [bestX + 0.15, bestY + 0.15, nameStr], {
            color: colorStr,
            fixed: true,
            fontSize: 13,
            fontWeight: 'bold',
            highlight: false
        });
    } catch(labelErr) {
        console.error("Error drawing custom function label:", labelErr);
    }
};
`;

    if (mode === 'plot') {
        const formula = data.formula || '';
        const formula2 = data.formula2 || '';
        const enableG = !!data.enableG;
        const fName = data.functionName || 'f';
        const gName = data.functionName2 || 'g';

        return labelHelperCode + `// Einfacher Funktionsplot
var formula = ${JSON.stringify(formula)};
var formula2 = ${JSON.stringify(formula2)};
var enableG = ${enableG};
var fName = ${JSON.stringify(fName)};
var gName = ${JSON.stringify(gName)};

if (formula && formula.trim() !== "") {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) { 
            try {
                var val = compiled.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        var displayNameF = fName.indexOf('(') === -1 ? fName + '(x)' : fName;
        
        // Plot f(x)
        board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#3b82f6',
            withLabel: false
        });
        drawFunctionLabel(displayNameF, '#3b82f6', fn);

        // Plot g(x) if enabled
        if (enableG && formula2 && formula2.trim() !== "") {
            var compiled2 = math.compile(formula2);
            var fn2 = function(x) {
                try {
                    var val = compiled2.evaluate({ x: x });
                    return (typeof val === 'number' && !isNaN(val)) ? val : null;
                } catch(e) { return null; }
            };
            var displayNameG = gName.indexOf('(') === -1 ? gName + '(x)' : gName;
            board.create('functiongraph', [fn2], {
                strokeWidth: 2.5,
                strokeColor: '#ef4444',
                withLabel: false
            });
            drawFunctionLabel(displayNameG, '#ef4444', fn2);
        }
    } catch(err) {
        console.error("Math compilation failed in Simple Plot:", err);
    }
}`;
    }

    if (mode === 'parabel') {
        const parabolaForm = data.parabolaForm || 'vertex';
        const parabolaA = data.parabolaA !== undefined ? data.parabolaA : '1';
        const parabolaD = data.parabolaD !== undefined ? data.parabolaD : '0';
        const parabolaE = data.parabolaE !== undefined ? data.parabolaE : '0';
        const parabolaB = data.parabolaB !== undefined ? data.parabolaB : '0';
        const parabolaC = data.parabolaC !== undefined ? data.parabolaC : '0';
        const showVertex = !!data.showVertex;
        const showSymmetryAxis = !!data.showSymmetryAxis;
        const fName = data.functionName || 'f';

        return labelHelperCode + `// Spezielle Parabelbetrachtung
var parabolaForm = ${JSON.stringify(parabolaForm)};
var a = parseFloat(${JSON.stringify(parabolaA)});
var d = parseFloat(${JSON.stringify(parabolaD)});
var e = parseFloat(${JSON.stringify(parabolaE)});
var b = parseFloat(${JSON.stringify(parabolaB)});
var c = parseFloat(${JSON.stringify(parabolaC)});
var fName = ${JSON.stringify(fName)};

if (isNaN(a)) a = 1;
if (isNaN(d)) d = 0;
if (isNaN(e)) e = 0;
if (isNaN(b)) b = 0;
if (isNaN(c)) c = 0;

var formula = "";
var vertexX = 0;
var vertexY = 0;

if (parabolaForm === 'general') {
    formula = a + "*x^2 + (" + b + ")*x + (" + c + ")";
    if (a !== 0) {
        vertexX = -b / (2 * a);
        vertexY = c - (b * b) / (4 * a);
    } else {
        vertexX = 0;
        vertexY = c;
    }
} else {
    formula = a + "*(x - (" + d + "))^2 + (" + e + ")";
    vertexX = d;
    vertexY = e;
}

if (formula) {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) {
            try {
                var val = compiled.evaluate({ x: x });
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(err2) { return null; }
        };

        var displayName = fName.indexOf('(') === -1 ? fName + '(x)' : fName;

        // Plot Parabel
        var p = board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#ec4899',
            withLabel: false
        });
        drawFunctionLabel(displayName, '#ec4899', fn);

        var yMin = board.getBoundingBox()[3];
        var yMax = board.getBoundingBox()[1];

        // Symmetrieachse
        if (${showSymmetryAxis}) {
            board.create('segment', [[vertexX, yMin], [vertexX, yMax]], {
                strokeColor: '#f472b6',
                strokeWidth: 1.2,
                strokeDash: 3,
                fixed: true,
                name: '',
                withLabel: false
            });
        }

        // Scheitelpunkt
        if (${showVertex}) {
            var vxRound = Math.round(vertexX * 100) / 100;
            var vyRound = Math.round(vertexY * 100) / 100;
            board.create('point', [vertexX, vertexY], {
                name: 'S (' + vxRound + ' | ' + vyRound + ')',
                size: 4,
                color: '#db2777',
                fixed: true,
                label: { offset: [5, 10], color: '#db2777' }
            });
        }
    } catch(err) {
        console.error("Math compilation failed in Parabel:", err);
    }
}`;
    }

    if (mode === 'tangente') {
        const formula = data.formula || '';
        const tangentX = data.tangentX !== undefined ? data.tangentX : '1.0';
        const showTangent = !!data.showTangent;
        const showSlopeTriangle = !!data.showSlopeTriangle;
        const fName = data.functionName || 'f';

        return labelHelperCode + `// Steigungsdreieck & Tangente: f(x) = ${formula} an der Stelle x_0 = ${tangentX}
var formula = ${JSON.stringify(formula)};
var x0Val = parseFloat(${JSON.stringify(tangentX)});
var fName = ${JSON.stringify(fName)};
if (isNaN(x0Val)) x0Val = 1.0;

if (formula && formula.trim() !== "") {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) { 
            try {
                var val = compiled.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        var displayName = fName.indexOf('(') === -1 ? fName + '(x)' : fName;

        // Plot f(x)
        var f = board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#8b5cf6',
            withLabel: false
        });
        drawFunctionLabel(displayName, '#8b5cf6', fn);

        // Point at x0 on f(x)
        var y0Val = fn(x0Val);
        if (y0Val !== null) {
            var p = board.create('glider', [x0Val, y0Val, f], {
                name: 'P(' + (Math.round(x0Val * 100) / 100) + ' | ' + (Math.round(y0Val * 100) / 100) + ')',
                size: 4,
                face: 'o',
                color: '#8b5cf6',
                fixed: true,
                label: { offset: [5, 10], color: '#8b5cf6' }
            });

            // Tangent line
            var t = null;
            if (${showTangent}) {
                t = board.create('tangent', [p], {
                    strokeWidth: 1.5,
                    strokeColor: '#ef4444',
                    name: 'Tangente',
                    withLabel: true,
                    label: { offset: [10, 10], color: '#ef4444' }
                });
            }

            // Slope Triangle
            if (${showSlopeTriangle}) {
                if (!t) {
                    t = board.create('tangent', [p], { visible: false });
                }
                board.create('slopetriangle', [t], {
                    fillColor: '#8b5cf6',
                    fillOpacity: 0.15,
                    strokeColor: '#7c3aed',
                    strokeWidth: 1.5,
                    label: { color: '#5b21b6', fontSize: 14 }
                });
            }
        }
    } catch(err) {
        console.error("Math compilation failed in Tangente:", err);
    }
}`;
    }

    if (mode === 'integral') {
        const formula = data.formula || '';
        const formula2 = data.formula2 || '';
        const enableG = !!data.enableG;
        const xStart = data.xStart !== undefined ? data.xStart : '0';
        const xEnd = data.xEnd !== undefined ? data.xEnd : '2';
        const fName = data.functionName || 'f';
        const gName = data.functionName2 || 'g';

        return labelHelperCode + `// Flächenberechnung (Integral)
var formulaF = ${JSON.stringify(formula)};
var formulaG = ${JSON.stringify(formula2)};
var enableG = ${enableG};
var limitAVal = parseFloat(${JSON.stringify(xStart)});
var limitBVal = parseFloat(${JSON.stringify(xEnd)});
var fName = ${JSON.stringify(fName)};
var gName = ${JSON.stringify(gName)};

if (isNaN(limitAVal)) limitAVal = 0;
if (isNaN(limitBVal)) limitBVal = 2;

var xMin = board.getBoundingBox()[0];
var xMax = board.getBoundingBox()[2];
var yMin = board.getBoundingBox()[3];
var yMax = board.getBoundingBox()[1];

if (formulaF && formulaF.trim() !== "") {
    try {
        var math = window.math;
        
        // Compile and evaluate f(x)
        var compiledF = math.compile(formulaF);
        var fnF = function(x) { 
            try {
                var val = compiledF.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        var displayNameF = fName.indexOf('(') === -1 ? fName + '(x)' : fName;

        // Plot f(x)
        var f = board.create('functiongraph', [fnF], {
            strokeWidth: 2.5,
            strokeColor: '#3b82f6',
            withLabel: false
        });
        drawFunctionLabel(displayNameF, '#3b82f6', fnF);

        var g = null;
        var fnG = null;
        
        // Compile and evaluate g(x) if enabled
        if (enableG && formulaG && formulaG.trim() !== "") {
            try {
                var compiledG = math.compile(formulaG);
                fnG = function(x) { 
                    try {
                        var val = compiledG.evaluate({ x: x }); 
                        return (typeof val === 'number' && !isNaN(val)) ? val : null;
                    } catch(e) { return null; }
                };
                var displayNameG = gName.indexOf('(') === -1 ? gName + '(x)' : gName;
                g = board.create('functiongraph', [fnG], {
                    strokeWidth: 2.5,
                    strokeColor: '#ef4444',
                    withLabel: false
                });
                drawFunctionLabel(displayNameG, '#ef4444', fnG);
            } catch(gErr) {
                console.error("Error compiling g(x):", gErr);
            }
        }

        // Shading the area
        if (enableG && fnG) {
            // Shading between f(x) and g(x)
            var steps = 100;
            var dx = (limitBVal - limitAVal) / steps;
            var vertices = [];
            for (var i = 0; i <= steps; i++) {
                var x = limitAVal + i * dx;
                var y = fnF(x);
                if (y !== null && !isNaN(y)) {
                    vertices.push([x, y]);
                }
            }
            for (var i = steps; i >= 0; i--) {
                var x = limitAVal + i * dx;
                var y = fnG(x);
                if (y !== null && !isNaN(y)) {
                    vertices.push([x, y]);
                }
            }
            board.create('polygon', vertices, {
                fillColor: '#3b82f6',
                fillOpacity: 0.25,
                borders: { visible: false },
                vertices: { visible: false },
                name: 'A',
                withLabel: false
            });
        } else {
            // Shading between f(x) and x-axis
            board.create('integral', [[limitAVal, limitBVal], f], {
                fillColor: '#3b82f6',
                fillOpacity: 0.25,
                strokeColor: '#2563eb',
                strokeWidth: 1.5,
                label: { visible: true, text: 'A', color: '#1e40af' }
            });
        }

        // Boundary lines
        board.create('segment', [[limitAVal, yMin], [limitAVal, yMax]], { 
            strokeColor: '#64748b', 
            strokeWidth: 1.2, 
            strokeDash: 2,
            fixed: true,
            name: '',
            withLabel: false
        });
        board.create('segment', [[limitBVal, yMin], [limitBVal, yMax]], { 
            strokeColor: '#64748b', 
            strokeWidth: 1.2, 
            strokeDash: 2,
            fixed: true,
            name: '',
            withLabel: false
        });

    } catch(err) {
        console.error("Math compilation failed in Flächenmarkierung:", err);
    }
}`;
    }

    // Default 'kurve' mode (Curve discussion)
    const formula = data.formula || '';
    const showNullstellen = !!data.showNullstellen;
    const showExtrema = !!data.showExtrema;
    const showWendepunkte = !!data.showWendepunkte;
    const showDeriv1 = !!data.showDeriv1;
    const showDeriv2 = !!data.showDeriv2;
    const fName = data.functionName || 'f';

    return labelHelperCode + `// Kurvendiskussion: f(x) = ${formula}
var xMin = board.getBoundingBox()[0];
var xMax = board.getBoundingBox()[2];
var formula = ${JSON.stringify(formula)};
var fName = ${JSON.stringify(fName)};
if (formula && formula.trim() !== "") {
    try {
        var math = window.math;
        var compiled = math.compile(formula);
        var fn = function(x) { 
            try {
                var val = compiled.evaluate({ x: x }); 
                return (typeof val === 'number' && !isNaN(val)) ? val : null;
            } catch(e) { return null; }
        };
        
        var displayNameF = fName.indexOf('(') === -1 ? fName + '(x)' : fName;
        var displayNameF1 = displayNameF.indexOf('(') !== -1 ? displayNameF.replace('(', "'(") : displayNameF + "'";
        var displayNameF2 = displayNameF.indexOf('(') !== -1 ? displayNameF.replace('(', "''(") : displayNameF + "''";

        // Plot f(x)
        var f = board.create('functiongraph', [fn], {
            strokeWidth: 2.5,
            strokeColor: '#10b981',
            withLabel: false
        });
        drawFunctionLabel(displayNameF, '#10b981', fn);

        // 1. Ableitung
        if (${showDeriv1}) {
            try {
                var d1 = math.derivative(formula, 'x');
                var compiledD1 = d1.compile();
                var fnD1 = function(x) {
                    try {
                        var val = compiledD1.evaluate({ x: x });
                        return (typeof val === 'number' && !isNaN(val)) ? val : null;
                    } catch(e) { return null; }
                };
                var f1 = board.create('functiongraph', [fnD1], {
                    strokeWidth: 1.5,
                    strokeColor: '#ef4444',
                    strokeDash: 2,
                    withLabel: false
                });
                drawFunctionLabel(displayNameF1, '#ef4444', fnD1);
            } catch(e) { console.error("Error drawing f'(x):", e); }
        }

        // 2. Ableitung
        if (${showDeriv2}) {
            try {
                var d1 = math.derivative(formula, 'x');
                var d2 = math.derivative(d1, 'x');
                var compiledD2 = d2.compile();
                var fnD2 = function(x) {
                    try {
                        var val = compiledD2.evaluate({ x: x });
                        return (typeof val === 'number' && !isNaN(val)) ? val : null;
                    } catch(e) { return null; }
                };
                var f2 = board.create('functiongraph', [fnD2], {
                    strokeWidth: 1.5,
                    strokeColor: '#3b82f6',
                    strokeDash: 2,
                    withLabel: false
                });
                drawFunctionLabel(displayNameF2, '#3b82f6', fnD2);
            } catch(e) { console.error("Error drawing f''(x):", e); }
        }

        // Helper root scanner
        var findRoots = function(fEval, minVal, maxVal) {
            var roots = [];
            var steps = 200;
            var dx = (maxVal - minVal) / steps;
            var prevX = minVal;
            var prevY = fEval(prevX);
            for (var i = 1; i <= steps; i++) {
                var currX = minVal + i * dx;
                var currY = fEval(currX);
                if (currY === null || prevY === null) {
                    prevX = currX;
                    prevY = currY;
                    continue;
                }
                if (Math.abs(currY) < 1e-10) {
                    if (roots.indexOf(currX) === -1) roots.push(currX);
                } else if (prevY * currY < 0) {
                    var a = prevX;
                    var b = currX;
                    var r = a;
                    for (var j = 0; j < 30; j++) {
                        var mid = (a + b) / 2;
                        var midY = fEval(mid);
                        if (midY === null) break;
                        if (Math.abs(midY) < 1e-12) {
                            r = mid;
                            break;
                        }
                        if (midY * fEval(a) < 0) {
                            b = mid;
                        } else {
                            a = mid;
                        }
                        r = mid;
                    }
                    var dup = false;
                    for (var k = 0; k < roots.length; k++) {
                        if (Math.abs(roots[k] - r) < 1e-4) { dup = true; break; }
                    }
                    if (!dup) roots.push(r);
                }
                prevX = currX;
                prevY = currY;
            }
            return roots;
        };

        // Nullstellen
        if (${showNullstellen}) {
            var nsRoots = findRoots(fn, xMin, xMax);
            nsRoots.forEach(function(rx, index) {
                var rxRound = Math.round(rx * 100) / 100;
                board.create('point', [rx, 0], {
                    name: 'N' + (index + 1) + ' (' + rxRound + ' | 0)',
                    size: 4,
                    color: '#10b981',
                    fixed: true,
                    label: { offset: [5, 10], color: '#047857' }
                });
            });
        }

        // Extrempunkte
        if (${showExtrema}) {
            try {
                var d1 = math.derivative(formula, 'x');
                var compiledD1 = d1.compile();
                var fnD1 = function(x) {
                    try { return compiledD1.evaluate({ x: x }); } catch(e) { return null; }
                };
                var d2 = math.derivative(d1, 'x');
                var compiledD2 = d2.compile();
                var fnD2 = function(x) {
                    try { return compiledD2.evaluate({ x: x }); } catch(e) { return null; }
                };
                
                var extRoots = findRoots(fnD1, xMin, xMax);
                extRoots.forEach(function(ex) {
                    var ey = fn(ex);
                    if (ey !== null) {
                        var exRound = Math.round(ex * 100) / 100;
                        var eyRound = Math.round(ey * 100) / 100;
                        var d2Val = fnD2(ex) || 0;
                        var typeLabel = 'EP';
                        var ptColor = '#ef4444';
                        if (d2Val < -1e-5) {
                            typeLabel = 'HP';
                        } else if (d2Val > 1e-5) {
                            typeLabel = 'TP';
                            ptColor = '#f59e0b';
                        }
                        board.create('point', [ex, ey], {
                            name: typeLabel + ' (' + exRound + ' | ' + eyRound + ')',
                            size: 4,
                            color: ptColor,
                            fixed: true,
                            label: { offset: [5, 10], color: ptColor }
                        });
                    }
                });
            } catch(e) { console.error("Error computing extremas:", e); }
        }

        // Wendepunkte
        if (${showWendepunkte}) {
            try {
                var d1 = math.derivative(formula, 'x');
                var d2 = math.derivative(d1, 'x');
                var compiledD2 = d2.compile();
                var fnD2 = function(x) {
                    try { return compiledD2.evaluate({ x: x }); } catch(e) { return null; }
                };
                
                var wpRoots = findRoots(fnD2, xMin, xMax);
                wpRoots.forEach(function(wx) {
                    var wy = fn(wx);
                    if (wy !== null) {
                        var wxRound = Math.round(wx * 100) / 100;
                        var wyRound = Math.round(wy * 100) / 100;
                        board.create('point', [wx, wy], {
                            name: 'WP (' + wxRound + ' | ' + wyRound + ')',
                            size: 4,
                            color: '#3b82f6',
                            fixed: true,
                            label: { offset: [5, 10], color: '#1d4ed8' }
                        });
                    }
                });
            } catch(e) { console.error("Error computing inflection points:", e); }
        }

    } catch(err) {
        console.error("Math compilation failed:", err);
    }
}`;
};

export const createDefaultAnalysisKurve = (): AnalysisKurveData => {
    const data: any = {
        settings: { axis: true, grid: true, xMin: -3, xMax: 3, yMin: -3, yMax: 3, width: 10, height: 10 },
        mode: 'kurve',
        formula: '0.2*x^3 - 1.2*x',
        functionName: 'f',
        functionName2: 'g',
        showNullstellen: true,
        showExtrema: true,
        showWendepunkte: true,
        showDeriv1: false,
        showDeriv2: false,
        formula2: 'x - 1',
        enableG: false,
        parabolaForm: 'vertex',
        parabolaA: '1',
        parabolaD: '0',
        parabolaE: '0',
        parabolaB: '0',
        parabolaC: '0',
        showVertex: true,
        showSymmetryAxis: true,
        tangentX: '1.0',
        showTangent: true,
        showSlopeTriangle: true,
        xStart: '0',
        xEnd: '2',
        elements: [],
        code: ''
    };
    data.code = generateAnalysisKurveCode(data);
    return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Factory-Funktionen (NEU: mit modules: [])
// ─────────────────────────────────────────────────────────────────────────────

export const createDefaultSubSubtask = (nodesFunc?: (depth: number, branches: number) => TreeNode[]): SubSubtask => {
    const obj = {
        id: Date.now() + Math.random(),
        text: '',
        points: 0,
        spaceType: 'none',
        spaceHeight: 5,
        spacingTop: 0,
        pageBreakBefore: false,
        modules: [],
    };
    return ensureCompatibilityGetters(obj) as any;
};

export const createDefaultSubtask = (nodesFunc?: (depth: number, branches: number) => TreeNode[]): Subtask => {
    const obj = {
        id: Date.now(),
        text: '',
        points: 0,
        spaceType: 'none',
        spaceHeight: 5,
        spacingTop: 0,
        pageBreakBefore: false,
        modules: [],
        subSubtasks: [],
    };
    return ensureCompatibilityGetters(obj) as any;
};

export const createDefaultTask = (nodesFunc?: (depth: number, branches: number) => TreeNode[]): Task => {
    const obj = {
        id: Date.now(),
        type: 'task',
        context: '',
        subtaskColumns: 1,
        spacingTop: 0,
        pageBreakBefore: false,
        modules: [],
        subtasks: [createDefaultSubtask(nodesFunc)],
    };
    return ensureCompatibilityGetters(obj) as any;
};

// ─────────────────────────────────────────────────────────────────────────────
// Baum-Hilfsfunktion
// ─────────────────────────────────────────────────────────────────────────────

export const generateTreeNodes = (depth: number, branches: number): TreeNode[] => {
    const nodes: TreeNode[] = [];
    const generate = (currentDepth: number, prefix: string) => {
        if (currentDepth > depth) return;
        for (let i = 1; i <= branches; i++) {
            const id = prefix ? `${prefix}-${i}` : `${i}`;
            nodes.push({ 
                id, 
                level: currentDepth, 
                prob: '', 
                label: `E${id}`, 
                isNegated: false,
                isProbPlaceholder: false,
                isLabelPlaceholder: false,
                pathProb: '',
                isPathProbPlaceholder: false
            });
            generate(currentDepth + 1, id);
        }
    };
    generate(1, '');
    return nodes;
};

// ─────────────────────────────────────────────────────────────────────────────
// Migrations-Hilfsfunktion: Altes Format → modules[]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Konvertiert ein altes Subtask/SubSubtask/Task-Objekt (mit festen show-Feldern)
 * in das neue Format mit modules[].
 * Ist modules[] bereits vorhanden, wird nichts getan.
 */
export const migrateToModulesArray = (obj: any): any => {
    // Bereits migriert
    if (Array.isArray(obj.modules)) return obj;

    const modules: TaskModule[] = [];

    const addIfShow = (key: string, dataTransform?: (d: any) => any) => {
        const field = obj[key];
        if (field && field.show === true) {
            const rawData = { ...field };
            delete rawData.show;
            modules.push({
                id: generateModuleId(),
                type: key,
                data: dataTransform ? dataTransform(rawData) : rawData,
            });
        }
    };

    // Alle bekannten Modultypen migrieren (Reihenfolge = Anzeigereihenfolge)
    addIfShow('table');
    addIfShow('geometry');
    addIfShow('geometry3d');
    addIfShow('verteilung');
    addIfShow('baum');
    addIfShow('urne');
    addIfShow('vierfeldertafel');
    addIfShow('lgs');
    addIfShow('mcq');
    addIfShow('trueFalse');
    addIfShow('matching');
    addIfShow('image');
    addIfShow('zusatz');
    addIfShow('lueckentext');

    // zahlenstrahl hat kein show-Flag – nur migrieren wenn spaceType darauf hinweist
    // (sie wurden nicht als show:true gespeichert, daher kein Eintrag nötig)

    return { ...obj, modules };
};

export const getSafeFallbackData = (type: string): any => {
    switch (type) {
        case 'table':
            return { formula: 'x^2', xValues: 'x', yValues: 'f(x)', data: [['-2', '-1', '0', '1', '2'], ['', '', '', '', '']], show: false };
        case 'lgs':
            return {
                dimension: 2,
                mode: 'generate',
                variablesRaw: 'x, y',
                manualCoefficients: [['', '', ''], ['', '', '']],
                targetSolutions: ['3', '-2'],
                generatedCoefficients: [[0, 0, 0], [0, 0, 0]],
                show: false
            };
        case 'zahlenstrahl':
            return { min: -5, max: 5, step: 1, subdivisions: 4, height: 2.5, show: false };
        case 'strahlensatz':
            return {
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
                show: false
            };
        case 'geometry':
        case 'analysis_tangente':
            return {
                settings: { axis: true, grid: true, xMin: -5, xMax: 5, yMin: -5, yMax: 5, width: 10, height: 10 },
                elements: [],
                code: '',
                show: false
            };
        case 'analysis_flaechen':
            return {
                settings: { axis: true, grid: true, xMin: -5, xMax: 5, yMin: -5, yMax: 5, width: 10, height: 10 },
                formulaF: '0.25*x^3 - x^2 + 1',
                formulaG: '-0.5*x + 1.5',
                enableG: false,
                limitA: '0',
                limitB: '3',
                elements: [],
                code: '',
                show: false
            };
        case 'analysis_steckbrief':
            return {
                ...createDefaultAnalysisSteckbrief(),
                show: false
            };
        case 'analysis_kurve':
            return {
                settings: { axis: true, grid: true, xMin: -3, xMax: 3, yMin: -3, yMax: 3, width: 10, height: 10 },
                elements: [],
                formula: '0.2*x^3 - 1.2*x',
                showNullstellen: true,
                showExtrema: true,
                showWendepunkte: true,
                showDeriv1: false,
                showDeriv2: false,
                code: '',
                show: false
            };
        case 'analysis_riemann':
            return {
                settings: { axis: true, grid: true, xMin: -1, xMax: 4, yMin: -1, yMax: 5, width: 10, height: 10 },
                formula: '0.25*x^2 + 1',
                xStart: '0',
                xEnd: '3',
                rectangles: 6,
                sumType: 'lower',
                showValue: false,
                elements: [],
                code: '',
                show: false
            };
        case 'geometry3d':
            return {
                settings: { boxSize: [-5, 5], az: 0.4, el: 0.2, width: 10, height: 10 },
                elements: [],
                code: '',
                show: false
            };

        case 'verteilung':
            return {
                type: 'binomial',
                n: 10,
                p: 0.5,
                mu: 0,
                sigma: 1,
                settings: { width: 10, height: 6 },
                markArea: { show: false, min: 2, max: 5 },
                show: false
            };
        case 'baum':
            return { height: 6, depth: 2, branches: 2, nodes: [], show: false };
        case 'urne':
            return { height: 4, kugeln: [], show: false };
        case 'gluecksrad':
            return { height: 5.0, showPointer: true, sektoren: [], show: false };
        case 'dreisatz':
            return {
                type: 'proportional',
                headers: ['Größe 1', 'Größe 2'],
                data: [['', ''], ['', ''], ['', '']],
                operationsLeft: ['', ''],
                operationsRight: ['', ''],
                printVisibility: {
                    data: [[true, true], [true, true], [true, true]],
                    operationsLeft: [true, true],
                    operationsRight: [true, true],
                },
                show: false
            };
        case 'vierfeldertafel':
            return {
                labels: { top1: '$A$', top2: '$\\overline{A}$', left1: '$B$', left2: '$\\overline{B}$' },
                rawLabels: { top1: 'A', top2: 'A', left1: 'B', left2: 'B' },
                negated: { top1: false, top2: true, left1: false, left2: true },
                data: [['', '', ''], ['', '', ''], ['', '', '']],
                printVisibility: [[true, true, true], [true, true, true], [true, true, true]],
                show: false
            };
        case 'mcq':
            return { options: [], show: false };
        case 'trueFalse':
            return { spaceHeight: 3, showJustification: false, show: false };
        case 'matching':
            return { leftItems: [], rightItems: [], show: false };
        case 'image':
            return { rows: 1, cols: 1, width: 10, maxHeight: 5, activeIndex: 0, slots: [], show: false };
        case 'zusatz':
            return { text: '', show: false };
        case 'lueckentext':
            return { show: false };
        case 'bruch':
            return { ...createDefaultBruch(), show: false };
        case 'diagramm':
            return { ...createDefaultDiagramm(), show: false };
        case 'koordinatensystem':
            return { ...createDefaultKoordinatensystem(), show: false };
        case 'analysis_extremwert':
            return { ...createDefaultAnalysisExtremwert(), show: false };
        default:
            return { show: false };
    }
};

const moduleTypes = [
    'table', 'lgs', 'zahlenstrahl', 'dreisatz', 'geometry', 'geometry3d', 'strahlensatz',
    'verteilung', 'baum', 'urne', 'gluecksrad', 'vierfeldertafel', 'mcq', 'trueFalse',
    'matching', 'image', 'zusatz', 'lueckentext', 'bruch', 'diagramm', 'koordinatensystem',
    'analysis_flaechen', 'analysis_tangente', 'analysis_kurve', 'analysis_steckbrief', 'analysis_puzzle', 'analysis_rotationskoerper', 'analysis_extremwert', 'analysis_riemann'
];

export const ensureCompatibilityGetters = (obj: any): any => {
    if (!obj) return obj;
    
    // Fallback: Make sure obj has a modules array
    if (!Array.isArray(obj.modules)) {
        obj.modules = [];
    }

    // Initialize fallback cache
    if (!obj._fallbacks) {
        Object.defineProperty(obj, '_fallbacks', {
            value: {},
            writable: true,
            configurable: true,
            enumerable: false
        });
    }

    // Wire up spaceType synchronization for subtasks and subsubtasks
    if (Object.prototype.hasOwnProperty.call(obj, 'spaceType') || obj.spaceType !== undefined) {
        let _spaceType = obj.spaceType || 'none';
        Object.defineProperty(obj, 'spaceType', {
            get() {
                return _spaceType;
            },
            set(val) {
                _spaceType = val;
                if (!Array.isArray(this.modules)) this.modules = [];
                
                if (val === 'zahlenstrahl') {
                    const hasMod = this.modules.some((m: any) => m.type === 'zahlenstrahl');
                    if (!hasMod) {
                        this.modules.push({
                            id: generateModuleId(),
                            type: 'zahlenstrahl',
                            data: { min: -5, max: 5, step: 1 }
                        });
                    }
                } else {
                    this.modules = this.modules.filter((m: any) => m.type !== 'zahlenstrahl');
                }

            },
            configurable: true,
            enumerable: true
        });
    }

    moduleTypes.forEach(type => {
        // If the object already has a concrete property, delete it and integrate into modules if active
        if (Object.prototype.hasOwnProperty.call(obj, type)) {
            const val = obj[type];
            if (val && typeof val === 'object') {
                delete obj[type];
                const hasMod = obj.modules.some((m: any) => m.type === type);
                if (!hasMod && (val.show === true || val.active === true || (type === 'zusatz' && val.text) || val.nodes !== undefined || val.kugeln !== undefined)) {
                    const rawData = { ...val };
                    rawData.show = true;
                    obj.modules.push({
                        id: generateModuleId(),
                        type,
                        data: rawData
                    });
                }
            } else {
                delete obj[type];
            }
        }

        Object.defineProperty(obj, type, {
            get() {
                if (!Array.isArray(this.modules)) {
                    if (!this._fallbacks[type]) {
                        this._fallbacks[type] = getSafeFallbackData(type);
                    }
                    return this._fallbacks[type];
                }
                
                // Unified geometry bridge
                let activeType = type;
                if (type === 'geometry') {
                    const geomTypes = ['geometry', 'analysis_flaechen', 'analysis_tangente', 'analysis_kurve', 'analysis_riemann'];
                    const found = this.modules.find((m: any) => geomTypes.includes(m.type));
                    if (found) {
                        activeType = found.type;
                    }
                }
                
                const mod = this.modules.find((m: any) => m.type === activeType);
                if (!mod) {
                    if (!this._fallbacks[type]) {
                        this._fallbacks[type] = getSafeFallbackData(type);
                    }
                    return this._fallbacks[type];
                }
                if (mod.data) {
                    mod.data.show = true;
                    if (activeType === 'vierfeldertafel') {
                        ensureVierfelderProperties(mod.data);
                    }
                }
                return mod.data;
            },
            set(val) {
                if (!Array.isArray(this.modules)) this.modules = [];
                
                // Unified geometry bridge
                let activeType = type;
                if (type === 'geometry') {
                    const geomTypes = ['geometry', 'analysis_flaechen', 'analysis_tangente', 'analysis_kurve', 'analysis_riemann'];
                    const found = this.modules.find((m: any) => geomTypes.includes(m.type));
                    if (found) {
                        activeType = found.type;
                    }
                }
                
                let mod = this.modules.find((m: any) => m.type === activeType);
                if (val && (val.show === true || val.active === true || val.text !== undefined || val.nodes !== undefined || val.kugeln !== undefined || val.data !== undefined)) {
                    if (typeof val === 'object') {
                        val.show = true;
                    }
                    if (!mod) {
                        mod = {
                            id: generateModuleId(),
                            type: activeType,
                            data: val
                        };
                        this.modules.push(mod);
                    } else {
                        mod.data = val;
                    }
                } else {
                    if (mod) {
                        this.modules = this.modules.filter((m: any) => m.type !== activeType);
                    }
                }
            },
            configurable: true,
            enumerable: false
        });
    });
    return obj;
};

const repairAnalysisModulesCode = (obj: any) => {
    if (obj && Array.isArray(obj.modules)) {
        obj.modules.forEach((mod: any) => {
            if (mod.type === 'analysis_kurve' && mod.data) {
                mod.data.code = generateAnalysisKurveCode(mod.data);
            } else if (mod.type === 'analysis_flaechen' && mod.data) {
                mod.data.code = generateAnalysisFlaechenCode(mod.data);
            } else if (mod.type === 'analysis_tangente' && mod.data) {
                mod.data.code = generateAnalysisTangenteCode(mod.data);
            } else if (mod.type === 'analysis_steckbrief' && mod.data) {
                mod.data.code = generateAnalysisSteckbriefCode(mod.data);
            } else if (mod.type === 'analysis_puzzle' && mod.data) {
                updatePuzzleCode(mod.data, obj);
            } else if (mod.type === 'analysis_rotationskoerper' && mod.data) {
                updateRotationskoerperCode(mod.data, obj);
            } else if (mod.type === 'analysis_extremwert' && mod.data) {
                updateAnalysisExtremwertCode(mod.data, obj);
            } else if (mod.type === 'analysis_riemann' && mod.data) {
                mod.data.code = generateAnalysisRiemannCode(mod.data);
            }
        });
    }
};

export const migrateAndEnsureGetters = (task: any): any => {
    if (!task) return task;
    const migrated = migrateToModulesArray(task);
    ensureCompatibilityGetters(migrated);
    repairAnalysisModulesCode(migrated);
    if (migrated.spacingTop === undefined) migrated.spacingTop = 0;
    if (migrated.pageBreakBefore === undefined) migrated.pageBreakBefore = false;
    if (Array.isArray(migrated.subtasks)) {
        migrated.subtasks = migrated.subtasks.map((sub: any) => {
            const migratedSub = migrateToModulesArray(sub);
            ensureCompatibilityGetters(migratedSub);
            repairAnalysisModulesCode(migratedSub);
            if (migratedSub.subSubtasks === undefined) migratedSub.subSubtasks = [];
            if (migratedSub.spaceType === undefined) migratedSub.spaceType = 'none';
            if (migratedSub.spaceHeight === undefined) migratedSub.spaceHeight = 5;
            if (migratedSub.spacingTop === undefined) migratedSub.spacingTop = 0;
            if (migratedSub.pageBreakBefore === undefined) migratedSub.pageBreakBefore = false;
            if (Array.isArray(migratedSub.subSubtasks)) {
                migratedSub.subSubtasks = migratedSub.subSubtasks.map((ss: any) => {
                    const migratedSS = migrateToModulesArray(ss);
                    ensureCompatibilityGetters(migratedSS);
                    repairAnalysisModulesCode(migratedSS);
                    if (migratedSS.spaceType === undefined) migratedSS.spaceType = 'none';
                    if (migratedSS.spaceHeight === undefined) migratedSS.spaceHeight = 5;
                    return migratedSS;
                });
            }
            return migratedSub;
        });
    }
    return migrated;
};

export function ensureVierfelderProperties(target: any) {
    if (!target) return;
    if (!target.rawLabels) {
        target.rawLabels = { top1: '', top2: '', left1: '', left2: '' };
    }
    if (!target.negated) {
        target.negated = { top1: false, top2: false, left1: false, left2: false };
    }
    if (!target.labels) {
        target.labels = { top1: '', top2: '', left1: '', left2: '' };
    }
    
    const keys: Array<'top1' | 'top2' | 'left1' | 'left2'> = ['top1', 'top2', 'left1', 'left2'];
    keys.forEach(k => {
        if (!target.rawLabels[k] && target.labels[k]) {
            const label = target.labels[k];
            let raw = label;
            let isNeg = false;
            
            if (label.startsWith('$') && label.endsWith('$')) {
                const inner = label.slice(1, -1);
                if (inner.startsWith('\\overline{') && inner.endsWith('}')) {
                    isNeg = true;
                    const content = inner.slice(10, -1);
                    if (content.startsWith('\\text{') && content.endsWith('}')) {
                        raw = content.slice(6, -1);
                    } else {
                        raw = content;
                    }
                } else {
                    raw = inner;
                }
            } else if (label.startsWith('\\overline{') && label.endsWith('}')) {
                isNeg = true;
                const content = label.slice(10, -1);
                if (content.startsWith('\\text{') && content.endsWith('}')) {
                    raw = content.slice(6, -1);
                } else {
                    raw = content;
                }
            }
            
            target.rawLabels[k] = raw;
            target.negated[k] = isNeg;
        }
    });
}

