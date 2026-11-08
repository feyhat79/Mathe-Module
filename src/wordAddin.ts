/**
 * Word Add-in Controller (Alpine.js Component)
 * Powers the Taskpane UI directly inside Microsoft Word.
 */

import { MODULE_REGISTRY, ModuleType, CategoryId, CATEGORIES } from './config/moduleRegistry';
import { initOffice, insertModuleIntoWord } from './services/wordService';
import {
    renderTreeSVG,
    renderUrneSVG,
    renderGluecksrad,
    renderVerteilungSVG,
    renderZahlenstrahl,
    renderStrahlensatz,
    renderBruch,
    renderDiagram,
    renderKoordinatensystem
} from './services/mathRenderer';
import {
    generateAnalysisKurveCode,
    generateAnalysisRiemannCode,
    generateAnalysisSteckbriefCode,
    solveSteckbrief,
    updateAnalysisExtremwertCode,
    generateExtremwertTaskText,
    updatePuzzleCode,
    updateRotationskoerperCode,
    generateRotationskoerperTaskText
} from './services/taskFactory';
import { init2DBoard } from './services/geometryService';

declare const Alpine: any;
declare const katex: any;

export function wordAddinComponent() {
    return {
        isWord: false,
        activeCategory: 'analysis' as CategoryId,
        activeModuleType: 'analysis_kurve' as ModuleType,
        workingModule: {
            id: 'word-mod-1',
            type: 'analysis_kurve',
            data: {} as any
        },

        // Feedback Toast
        toastMessage: '',
        showToast: false,
        isInserting: false,

        // Quick Urne controls
        quickKugelCount: 1,
        quickKugelColor: 'red',
        quickKugelLabel: '',

        // Tree navigation
        activeTreeLevel: 1 as number | 'paths',

        // Inspector UI toggles for Analysis
        showExtremwertSol: false,
        showSteckbriefLgs: false,

        async init() {
            this.isWord = await initOffice();
            this.loadModuleType('analysis_kurve');
        },

        getCategories() {
            return CATEGORIES;
        },

        getModulesForCategory(catId: CategoryId) {
            return Object.entries(MODULE_REGISTRY)
                .filter(([, def]) => def.category === catId)
                .map(([type, def]) => ({ type: type as ModuleType, ...def }));
        },

        selectCategory(catId: CategoryId) {
            this.activeCategory = catId;
            const available = this.getModulesForCategory(catId);
            if (available.length > 0 && !available.some(m => m.type === this.activeModuleType)) {
                this.loadModuleType(available[0].type);
            }
        },

        loadModuleType(type: ModuleType) {
            this.activeModuleType = type;
            const def = MODULE_REGISTRY[type];
            const data = def ? def.defaultData() : {};
            this.workingModule = {
                id: 'word-mod-' + Date.now(),
                type: type,
                data: data
            };
            this.ensureDataDefaults();
            this.activeTreeLevel = 1;
            this.refreshJxgPreview();
        },

        ensureDataDefaults() {
            const mod = this.workingModule;
            const d = mod.data;
            if (!d) return;

            if (mod.type === 'analysis_kurve') {
                if (!d.settings) {
                    d.settings = { axis: true, grid: true, xMin: -4, xMax: 4, yMin: -4, yMax: 4, width: 8, height: 6 };
                }
                d.code = generateAnalysisKurveCode(d);
            } else if (mod.type === 'analysis_riemann') {
                if (!d.settings) {
                    d.settings = { axis: true, grid: true, xMin: -1, xMax: 5, yMin: -1, yMax: 9, width: 9, height: 7 };
                }
                d.code = generateAnalysisRiemannCode(d);
            } else if (mod.type === 'analysis_rotationskoerper') {
                if (!d.settings) {
                    d.settings = { axis: true, grid: true, xMin: -1, xMax: 5, yMin: -3, yMax: 3, width: 8, height: 6 };
                }
                if (d.includeTaskText === undefined) d.includeTaskText = true;
                updateRotationskoerperCode(d);
            } else if (mod.type === 'analysis_extremwert') {
                if (!d.settings) {
                    d.settings = { axis: false, grid: false, xMin: 0.5, xMax: 5.5, yMin: -0.3, yMax: 4.0, width: 7, height: 5 };
                }
                if (d.includeTaskText === undefined) d.includeTaskText = true;
                if (d.includeSketch === undefined) d.includeSketch = true;
                if (d.includeSolution === undefined) d.includeSolution = false;
                updateAnalysisExtremwertCode(d);
                d._lastRenderedSolutionRaw = this.solveExtremwert(
                    d.scenarioType,
                    d.parameterValue,
                    d.parameterValue2,
                    !!d.isFourSided
                );
            } else if (mod.type === 'analysis_steckbrief') {
                if (!d.settings) {
                    d.settings = { axis: true, grid: true, xMin: -2, xMax: 5, yMin: -2, yMax: 6, width: 7, height: 6 };
                }
                if (d.showTextual === undefined) d.showTextual = true;
                if (d.showGraph === undefined) d.showGraph = true;
                if (d.includeSolution === undefined) d.includeSolution = false;
                d.code = generateAnalysisSteckbriefCode(d);
            } else if (mod.type === 'analysis_puzzle') {
                if (!d.settings) {
                    d.settings = { axis: true, grid: true, xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
                }
                updatePuzzleCode(d);
            } else if (mod.type === 'baum') {
                if (!d.height) d.height = 6.5;
                if (!d.depth) d.depth = 2;
                if (!d.branches) d.branches = 2;
                if (!Array.isArray(d.nodes) || d.nodes.length === 0) {
                    this.applyTreeStructure();
                }
            } else if (mod.type === 'vierfeldertafel') {
                if (!d.data || !Array.isArray(d.data)) d.data = [['10', '15', '25'], ['20', '35', '55'], ['30', '50', '80']];
                if (!d.printVisibility) d.printVisibility = [[true, true, true], [true, true, true], [true, true, true]];
                if (!d.labels) d.labels = { top1: 'A', top2: 'Ā', left1: 'B', left2: 'B̄' };
            } else if (mod.type === 'urne') {
                if (!d.height) d.height = 4.5;
                if (!Array.isArray(d.kugeln) || d.kugeln.length === 0) {
                    this.applyUrnePreset('two_colors');
                }
            } else if (mod.type === 'gluecksrad') {
                if (!d.height) d.height = 4.5;
                if (d.showPointer === undefined) d.showPointer = true;
                if (!Array.isArray(d.sektoren) || d.sektoren.length === 0) {
                    this.applyGluecksradPreset('farben_4');
                }
            } else if (mod.type === 'verteilung') {
                if (!d.k) d.k = ['0', '1', '2', '3'];
                if (!d.p) d.p = ['0.125', '0.375', '0.375', '0.125'];
                if (!d.height) d.height = 4.5;
            } else if (mod.type === 'mcq') {
                if (!Array.isArray(d.options) || d.options.length === 0) {
                    d.options = [{ id: 1, text: 'Option A' }, { id: 2, text: 'Option B' }, { id: 3, text: 'Option C' }];
                }
            } else if (mod.type === 'matching') {
                if (!Array.isArray(d.leftItems) || d.leftItems.length === 0) {
                    d.leftItems = [{ id: 1, text: 'Begriff 1' }, { id: 2, text: 'Begriff 2' }];
                }
                if (!Array.isArray(d.rightItems) || d.rightItems.length === 0) {
                    d.rightItems = [{ id: 3, text: 'Bedeutung 1' }, { id: 4, text: 'Bedeutung 2' }];
                }
            }
        },

        // ── JSXGRAPH PREVIEW MANAGEMENT ──────────────────────────
        isSingleJxgModule(): boolean {
            const t = this.workingModule?.type;
            if (
                t === 'analysis_kurve' ||
                t === 'analysis_riemann' ||
                t === 'analysis_rotationskoerper' ||
                t === 'analysis_extremwert' ||
                t === 'geometry'
            ) {
                return true;
            }
            if (t === 'analysis_steckbrief') {
                return this.workingModule?.data?.showGraph !== false;
            }
            return false;
        },

        refreshJxgPreview() {
            setTimeout(() => {
                const mod = this.workingModule;
                if (!mod || !mod.data) return;

                if (mod.type === 'analysis_puzzle') {
                    this.refreshPuzzleBoards();
                    return;
                }

                if (this.isSingleJxgModule()) {
                    const boardEl = document.getElementById('word-jxg-board');
                    if (boardEl) {
                        init2DBoard('word-jxg-board', mod.data, window);
                    }
                }
            }, 25);
        },

        refreshPuzzleBoards() {
            const d = this.workingModule?.data;
            if (!d || !Array.isArray(d.functions)) return;

            const isGraphToEq = d.mode === 'graph_to_equation';
            const leftIsGraph = isGraphToEq || d.typeF === 'graph';
            const rightIsGraph = !isGraphToEq && d.typeFPrime === 'graph';

            const shuffled = Array.isArray(d.shuffledIndices) && d.shuffledIndices.length === d.functions.length
                ? d.shuffledIndices
                : d.functions.map((_: any, i: number) => i);

            d.functions.forEach((fn: any, i: number) => {
                if (leftIsGraph) {
                    this.renderPuzzleGraph(`word-puzzle-f-${i}`, fn.expr, d.settings);
                }
                if (rightIsGraph) {
                    const shIdx = shuffled[i] ?? i;
                    const targetFn = d.functions[shIdx] || fn;
                    this.renderPuzzleGraph(`word-puzzle-fp-${i}`, targetFn.exprFPrime, d.settings);
                }
            });
        },

        renderPuzzleGraph(boardId: string, expr: string, settings: any) {
            if (!expr || expr.trim() === '') return;
            setTimeout(() => {
                const win = window as any;
                if (!win.JXG || !win.math) return;
                if (win.JXG.boards && win.JXG.boards[boardId]) {
                    try {
                        win.JXG.JSXGraph.freeBoard(win.JXG.boards[boardId]);
                    } catch (_) {}
                    delete win.JXG.boards[boardId];
                }
                const el = document.getElementById(boardId);
                if (!el) return;
                try {
                    const s = settings || { axis: true, grid: true, xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
                    const board = win.JXG.JSXGraph.initBoard(boardId, {
                        boundingbox: [
                            parseFloat(s.xMin) || -4,
                            parseFloat(s.yMax) || 4,
                            parseFloat(s.xMax) || 4,
                            parseFloat(s.yMin) || -4
                        ],
                        axis: s.axis !== undefined ? s.axis : true,
                        grid: s.grid !== undefined ? s.grid : true,
                        showCopyright: false,
                        showNavigation: false,
                        pan: { enabled: false },
                        zoom: { enabled: false }
                    });

                    const compiled = win.math.compile(expr);
                    board.create(
                        'functiongraph',
                        [
                            function (x: number) {
                                try {
                                    const val = compiled.evaluate({ x });
                                    return typeof val === 'number' && !isNaN(val) ? val : null;
                                } catch (_) {
                                    return null;
                                }
                            }
                        ],
                        {
                            strokeWidth: 2.2,
                            strokeColor: '#3b82f6',
                            highlight: false,
                            withLabel: false
                        }
                    );

                    board.update();
                    if (!win.JXG.boards) win.JXG.boards = {};
                    win.JXG.boards[boardId] = board;
                } catch (err) {
                    console.error('Fehler beim Zeichnen des Puzzle-Graphen:', expr, err);
                }
            }, 20);
        },

        // ── INSERT ACTION ────────────────────────────────────────
        async insertIntoWord() {
            this.isInserting = true;
            try {
                if (this.workingModule.type === 'analysis_extremwert') {
                    const d = this.workingModule.data;
                    d._lastRenderedSolutionRaw = this.solveExtremwert(
                        d.scenarioType,
                        d.parameterValue,
                        d.parameterValue2,
                        !!d.isFourSided
                    );
                }
                const res = await insertModuleIntoWord(this.workingModule);
                this.triggerToast(res.message);
            } catch (err) {
                console.error('Fehler beim Einfügen in Word:', err);
                this.triggerToast('❌ Fehler beim Einfügen.');
            } finally {
                this.isInserting = false;
            }
        },

        triggerToast(msg: string) {
            this.toastMessage = msg;
            this.showToast = true;
            setTimeout(() => {
                this.showToast = false;
            }, 3200);
        },

        // ── PREVIEW HELPERS (Für Nicht-JSXGraph-Module) ──────────
        renderPreview() {
            const mod = this.workingModule;
            const d = mod.data;
            if (!mod || !d) return '';

            switch (mod.type) {
                case 'baum':
                    return `<svg viewBox="0 0 1000 600" style="width: 100%; height: 180px; overflow: visible;" preserveAspectRatio="xMidYMid meet">${renderTreeSVG(d)}</svg>`;
                case 'urne':
                    return renderUrneSVG(d);
                case 'gluecksrad':
                    return renderGluecksrad(d);
                case 'verteilung':
                    return renderVerteilungSVG(d);
                case 'diagramm':
                    return renderDiagram(d);
                case 'koordinatensystem':
                    return renderKoordinatensystem(d);
                case 'strahlensatz':
                    return renderStrahlensatz(d);
                case 'zahlenstrahl':
                    return renderZahlenstrahl(d);
                case 'bruch':
                    return renderBruch(d);
                default:
                    return '';
            }
        },

        // ── FORMATTING & MATH HELPERS ────────────────────────────
        formatSubtaskText(text: string): string {
            if (!text) return '';
            let formatted = text.replace(/\n/g, '<br>');
            formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            formatted = formatted.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
                try {
                    if (typeof katex !== 'undefined') {
                        return katex.renderToString(math, { throwOnError: false, displayMode: true });
                    }
                    return `<div><code>${math}</code></div>`;
                } catch (_) {
                    return match;
                }
            });

            formatted = formatted.replace(/\$([^$]+?)\$/g, (match, math) => {
                try {
                    if (typeof katex !== 'undefined') {
                        return katex.renderToString(math, { throwOnError: false, displayMode: false });
                    }
                    return `<code>${math}</code>`;
                } catch (_) {
                    return match;
                }
            });

            return formatted;
        },

        formatPuzzleFormula(expr: string): string {
            if (!expr) return '';
            let formatted = expr.replace(/\*/g, ' \\cdot ');
            formatted = formatted.replace(/sin\((.*?)\)/g, '\\sin($1)');
            formatted = formatted.replace(/cos\((.*?)\)/g, '\\cos($1)');
            formatted = formatted.replace(/tan\((.*?)\)/g, '\\tan($1)');
            return formatted;
        },

        romanize(num: number): string {
            if (num <= 0) return '';
            const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            return roman[num] || num.toString();
        },

        // ── ANALYSIS HELPER ACTIONS ──────────────────────────────
        updateKurveCode(data: any) {
            if (!data) return;
            data.code = generateAnalysisKurveCode(data);
            this.refreshJxgPreview();
        },

        applyKurvePreset(data: any, presetKey: string) {
            if (!data || !presetKey) return;
            if (presetKey === 'kubisch_sym') {
                data.mode = 'kurve';
                data.formula = '0.25*x^3 - 0.75*x';
                data.settings.xMin = -3; data.settings.xMax = 3;
                data.settings.yMin = -3; data.settings.yMax = 3;
            } else if (presetKey === 'kubisch_allg') {
                data.mode = 'kurve';
                data.formula = '-x^3 + 3*x^2';
                data.settings.xMin = -2; data.settings.xMax = 4;
                data.settings.yMin = -2; data.settings.yMax = 5;
            } else if (presetKey === 'grad4_w') {
                data.mode = 'kurve';
                data.formula = '0.25*x^4 - 2*x^2';
                data.settings.xMin = -4; data.settings.xMax = 4;
                data.settings.yMin = -5; data.settings.yMax = 4;
            } else if (presetKey === 'parabel_normal') {
                data.mode = 'kurve';
                data.formula = 'x^2 - 2*x - 3';
                data.settings.xMin = -3; data.settings.xMax = 5;
                data.settings.yMin = -5; data.settings.yMax = 5;
            } else if (presetKey === 'exp_wachstum') {
                data.mode = 'kurve';
                data.formula = '2*x * exp(-0.5*x)';
                data.settings.xMin = -1; data.settings.xMax = 7;
                data.settings.yMin = -2; data.settings.yMax = 3;
            } else if (presetKey === 'trigo_sin') {
                data.mode = 'kurve';
                data.formula = '2*sin(x)';
                data.settings.xMin = -4; data.settings.xMax = 7;
                data.settings.yMin = -3; data.settings.yMax = 3;
            }
            this.updateKurveCode(data);
        },

        adjustKurveDimension(data: any, dim: 'width' | 'height', delta: number) {
            if (!data || !data.settings) return;
            const current = parseFloat(data.settings[dim]) || 10;
            const minVal = dim === 'width' ? 5 : 3;
            const maxVal = dim === 'width' ? 17 : 15;
            data.settings[dim] = Math.max(minVal, Math.min(maxVal, Math.round((current + delta) * 2) / 2));
            this.refreshJxgPreview();
        },

        setKurveSizePreset(data: any, size: 'S' | 'M' | 'L') {
            if (!data || !data.settings) return;
            if (size === 'S') {
                data.settings.width = 7;
                data.settings.height = 6;
            } else if (size === 'M') {
                data.settings.width = 10;
                data.settings.height = 8;
            } else if (size === 'L') {
                data.settings.width = 14;
                data.settings.height = 10;
            }
            this.refreshJxgPreview();
        },

        autoFitKurveBounds(data: any, modType = 'analysis_kurve') {
            if (!data || !data.settings) return;
            const win = window as any;
            const math = win.math;
            if (!math) return;

            try {
                let expr = data.formula || 'x^2';
                if (modType === 'analysis_steckbrief') {
                    const sol = this.solveSteckbrief(data);
                    if (sol.status === 'solved' && sol.formula) {
                        expr = sol.formula;
                    } else {
                        return;
                    }
                } else if (data.mode === 'parabel') {
                    const a = parseFloat(data.parabolaA) || 1;
                    if (data.parabolaForm === 'general') {
                        const b = parseFloat(data.parabolaB) || 0;
                        const c = parseFloat(data.parabolaC) || 0;
                        expr = `${a}*x^2 + (${b})*x + (${c})`;
                    } else {
                        const d = parseFloat(data.parabolaD) || 0;
                        const e = parseFloat(data.parabolaE) || 0;
                        expr = `${a}*(x - (${d}))^2 + (${e})`;
                    }
                }
                const compiled = math.compile(expr);
                const xMin = parseFloat(data.settings.xMin) ?? -3;
                const xMax = parseFloat(data.settings.xMax) ?? 3;
                let minY = Infinity;
                let maxY = -Infinity;
                const steps = 100;
                for (let i = 0; i <= steps; i++) {
                    const x = xMin + ((xMax - xMin) * i) / steps;
                    const y = compiled.evaluate({ x });
                    if (typeof y === 'number' && isFinite(y)) {
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
                if (isFinite(minY) && isFinite(maxY)) {
                    if (modType === 'analysis_rotationskoerper') {
                        const maxR = Math.max(Math.abs(minY), Math.abs(maxY), 1);
                        const bound = Math.ceil(maxR * 1.25);
                        data.settings.yMin = -bound;
                        data.settings.yMax = bound;
                        this.updateRotationskoerperCode(data);
                    } else {
                        const span = Math.max(2, maxY - minY);
                        const pad = Math.max(1, Math.ceil(span * 0.2));
                        data.settings.yMin = Math.floor(minY - pad);
                        data.settings.yMax = Math.ceil(maxY + pad);
                        if (data.settings.yMin >= 0) data.settings.yMin = -1;
                        if (data.settings.yMax <= 0) data.settings.yMax = 1;
                        if (modType === 'analysis_riemann') {
                            this.updateRiemannCode(data);
                        } else if (modType === 'analysis_steckbrief') {
                            this.updateSteckbriefCode(data);
                        } else {
                            this.updateKurveCode(data);
                        }
                    }
                }
            } catch (err) {
                console.warn('Auto-Fit fehlgeschlagen:', err);
            }
        },

        updateRiemannCode(data: any) {
            if (!data) return;
            data.code = generateAnalysisRiemannCode(data);
            this.refreshJxgPreview();
        },

        updateRotationskoerperCode(data: any) {
            if (!data) return;
            updateRotationskoerperCode(data);
            this.refreshJxgPreview();
        },

        getRotationskoerperTaskText(data: any): string {
            if (!data) return '';
            return generateRotationskoerperTaskText(data);
        },

        calculateRotationVolume(expr: string, xStartVal: any, xEndVal: any): string {
            const xStart = parseFloat(xStartVal);
            const xEnd = parseFloat(xEndVal);
            if (isNaN(xStart) || isNaN(xEnd) || xStart >= xEnd) return 'Ungültiges Intervall';

            const math = (window as any).math;
            if (!math || !expr || expr.trim() === '') return 'Keine Funktion';
            try {
                const compiled = math.compile(expr);
                const f = (x: number) => {
                    try {
                        const val = compiled.evaluate({ x });
                        return val * val;
                    } catch (_) {
                        return 0;
                    }
                };

                const n = 1000;
                const h = (xEnd - xStart) / n;
                let sum = f(xStart) + f(xEnd);
                for (let i = 1; i < n; i++) {
                    const x = xStart + i * h;
                    sum += (i % 2 === 0 ? 2 : 4) * f(x);
                }
                const volume = Math.PI * (h / 3) * sum;
                if (isNaN(volume)) return 'Fehler';

                const volDivPi = (h / 3) * sum;
                return `${volume.toFixed(3)} (ca. ${volDivPi.toFixed(2)}π) VE`;
            } catch (_) {
                return 'Berechnungsfehler';
            }
        },

        updateAnalysisExtremwertCode(data: any) {
            if (!data) return;
            updateAnalysisExtremwertCode(data);
            data._lastRenderedSolutionRaw = this.solveExtremwert(
                data.scenarioType,
                data.parameterValue,
                data.parameterValue2,
                !!data.isFourSided
            );
            this.refreshJxgPreview();
        },

        getExtremwertTaskText(data: any): string {
            if (!data) return '';
            return generateExtremwertTaskText(data);
        },

        solveExtremwert(scenarioType: string, p1: any, p2: any, isFourSided: boolean): string {
            const val1 = parseFloat(p1);
            const val2 = parseFloat(p2);

            if (scenarioType === 'pasture') {
                const L = isNaN(val1) ? 120 : val1;
                if (L <= 0) return 'Die Zaunlänge muss positiv sein.';

                const k = isFourSided ? 2 : 1;
                const optimalY = L / (2 * (k + 1));
                const optimalX = L / (k + 1);
                const maxArea = optimalX * optimalY;

                const nebenbedingungText = isFourSided
                    ? `Zaunlänge: $L = 2x + 2y = ${L}\\text{ m} \\implies x = ${L / 2} - y$`
                    : `Zaunlänge: $L = x + 2y = ${L}\\text{ m} \\implies x = ${L} - 2y$`;

                const zielfunktionText = isFourSided
                    ? `$$A(y) = y \\cdot (${L / 2} - y) = ${L / 2}y - y^2$$`
                    : `$$A(y) = y \\cdot (${L} - 2y) = ${L}y - 2y^2$$`;

                const ableitungText = isFourSided
                    ? `$$A'(y) = ${L / 2} - 2y = 0 \\implies y = ${optimalY.toFixed(2)}\\text{ m}$$`
                    : `$$A'(y) = ${L} - 4y = 0 \\implies y = ${optimalY.toFixed(2)}\\text{ m}$$`;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Weidefläche maximieren):</strong></p>
                        <ul>
                            <li>Hauptbedingung: $A(x, y) = x \\cdot y$</li>
                            <li>Nebenbedingung: ${nebenbedingungText}</li>
                        </ul>
                        ${zielfunktionText}
                        ${ableitungText}
                        <ul>
                            <li>Optimale Breite $x = \\mathbf{${optimalX.toFixed(2)}\\text{ m}}$, Tiefe $y = \\mathbf{${optimalY.toFixed(2)}\\text{ m}}$</li>
                            <li>Maximale Fläche $A_{\\text{max}} = \\mathbf{${maxArea.toFixed(2)}\\text{ m}^2}$</li>
                        </ul>
                    </div>
                `;
            } else if (scenarioType === 'box') {
                const W = isNaN(val1) ? 40 : val1;
                const H = isNaN(val2) ? 30 : val2;
                if (W <= 0 || H <= 0) return 'Kartonabmessungen müssen positiv sein.';

                const optimalX = (W + H - Math.sqrt(W * W + H * H - W * H)) / 6;
                const optimalV = optimalX * (W - 2 * optimalX) * (H - 2 * optimalX);
                const baseW = W - 2 * optimalX;
                const baseH = H - 2 * optimalX;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Schachtelvolumen maximieren):</strong></p>
                        <ul>
                            <li>Zielfunktion: $V(x) = x \\cdot (${W} - 2x) \\cdot (${H} - 2x) = 4x^3 - ${2 * (W + H)}x^2 + ${W * H}x$</li>
                            <li>Ableitung: $V'(x) = 12x^2 - ${4 * (W + H)}x + ${W * H} = 0$</li>
                            <li>Optimaler Einschnitt: $x = \\mathbf{${optimalX.toFixed(2)}\\text{ cm}}$</li>
                            <li>Maße: $\\mathbf{${baseW.toFixed(2)} \\times ${baseH.toFixed(2)} \\times ${optimalX.toFixed(2)}\\text{ cm}}$</li>
                            <li>Maximales Volumen: $V_{\\text{max}} = \\mathbf{${optimalV.toFixed(2)}\\text{ cm}^3}$</li>
                        </ul>
                    </div>
                `;
            } else if (scenarioType === 'cylinder') {
                const O = isNaN(val1) ? 600 : val1;
                if (O <= 0) return 'Die Oberfläche O muss positiv sein.';

                const optimalR = Math.sqrt(O / (6 * Math.PI));
                const optimalH = 2 * optimalR;
                const maxV = Math.PI * optimalR * optimalR * optimalH;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Getränkedose – Volumen max.):</strong></p>
                        <ul>
                            <li>Hauptbedingung: $V(r, h) = \\pi r^2 h$, Nebenbedingung: $2\\pi r^2 + 2\\pi r h = ${O}$</li>
                            <li>Zielfunktion: $V(r) = \\frac{${O}}{2}r - \\pi r^3$, Ableitung: $V'(r) = ${O / 2} - 3\\pi r^2 = 0$</li>
                            <li>Optimaler Radius $r = \\mathbf{${optimalR.toFixed(2)}\\text{ cm}}$, Höhe $h = 2r = \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$</li>
                            <li>Maximales Volumen $V_{\\text{max}} = \\mathbf{${maxV.toFixed(2)}\\text{ cm}^3}$</li>
                        </ul>
                    </div>
                `;
            } else if (scenarioType === 'cylinder_min') {
                const V = isNaN(val1) ? 1000 : val1;
                if (V <= 0) return 'Das Volumen V muss positiv sein.';

                const optimalR = Math.pow(V / (2 * Math.PI), 1 / 3);
                const optimalH = 2 * optimalR;
                const minO = 2 * Math.PI * optimalR * optimalR + 2 * Math.PI * optimalR * optimalH;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Konservendose – Oberfläche min.):</strong></p>
                        <ul>
                            <li>Zielfunktion: $O(r) = 2\\pi r^2 + \\frac{${2 * V}}{r}$, Ableitung: $O'(r) = 4\\pi r - \\frac{${2 * V}}{r^2} = 0$</li>
                            <li>Optimaler Radius $r = \\mathbf{${optimalR.toFixed(2)}\\text{ cm}}$, Höhe $h = 2r = \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$</li>
                            <li>Minimale Oberfläche $O_{\\text{min}} = \\mathbf{${minO.toFixed(2)}\\text{ cm}^2}$</li>
                        </ul>
                    </div>
                `;
            } else if (scenarioType === 'prism_min') {
                const V = isNaN(val1) ? 1000 : val1;
                if (V <= 0) return 'Das Volumen V muss positiv sein.';

                const optimalA = Math.pow(V, 1 / 3);
                const minO = 6 * optimalA * optimalA;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Quadratische Säule – Oberfläche min.):</strong></p>
                        <ul>
                            <li>Zielfunktion: $O(a) = 2a^2 + \\frac{${4 * V}}{a}$, Ableitung: $O'(a) = 4a - \\frac{${4 * V}}{a^2} = 0$</li>
                            <li>Optimale Kantenlänge $a = h = \\mathbf{${optimalA.toFixed(2)}\\text{ cm}}$ (Würfel)</li>
                            <li>Minimale Oberfläche $O_{\\text{min}} = \\mathbf{${minO.toFixed(2)}\\text{ cm}^2}$</li>
                        </ul>
                    </div>
                `;
            } else if (scenarioType === 'cylinder_in_sphere') {
                const R = isNaN(val1) || val1 <= 0 ? 10 : val1;
                const optimalH = (2 * R) / Math.sqrt(3);
                const optimalR = R * Math.sqrt(2.0 / 3.0);
                const maxV = Math.PI * optimalR * optimalR * optimalH;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Zylinder in Kugel – Volumen max.):</strong></p>
                        <ul>
                            <li>Nebenbedingung (Pythagoras): $r^2 = R^2 - \\frac{h^2}{4} = ${(R * R).toFixed(2)} - \\frac{h^2}{4}$</li>
                            <li>Zielfunktion: $V(h) = \\pi \\cdot ${(R * R).toFixed(2)} h - \\frac{\\pi}{4} h^3$</li>
                            <li>Optimaler Radius $r = \\mathbf{${optimalR.toFixed(2)}\\text{ cm}}$, Höhe $h = \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$</li>
                            <li>Maximales Volumen $V_{\\text{max}} = \\mathbf{${maxV.toFixed(2)}\\text{ cm}^3}$</li>
                        </ul>
                    </div>
                `;
            } else if (scenarioType === 'function_rect') {
                const a = isNaN(val1) || val1 <= 0 ? 1 : val1;
                const c = isNaN(val2) || val2 <= 0 ? 9 : val2;
                const optimalX = Math.sqrt(c / (3 * a));
                const optimalY = -a * optimalX * optimalX + c;
                const maxA = 2 * optimalX * optimalY;

                return `
                    <div class="extremwert-solution">
                        <p><strong>Musterlösung (Rechteck unter Parabel):</strong></p>
                        <ul>
                            <li>Zielfunktion: $A(x) = 2x \\cdot (-${a}x^2 + ${c}) = -${2 * a}x^3 + ${2 * c}x$</li>
                            <li>Ableitung: $A'(x) = -${6 * a}x^2 + ${2 * c} = 0 \\implies x = \\mathbf{${optimalX.toFixed(2)}}$</li>
                            <li>Rechtecksbreite $2x = \\mathbf{${(2 * optimalX).toFixed(2)}}$, Höhe $y = \\mathbf{${optimalY.toFixed(2)}}$</li>
                            <li>Maximale Fläche $A_{\\text{max}} = \\mathbf{${maxA.toFixed(2)}\\text{ FE}}$</li>
                        </ul>
                    </div>
                `;
            }
            return '';
        },

        updateSteckbriefCode(data: any) {
            if (!data) return;
            data.code = generateAnalysisSteckbriefCode(data);
            this.refreshJxgPreview();
        },

        solveSteckbrief(data: any) {
            return solveSteckbrief(data);
        },

        addSteckbriefCondition(data: any) {
            if (!data) return;
            if (!Array.isArray(data.conditions)) data.conditions = [];
            data.conditions.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2),
                type: 'point',
                x: '0',
                y: '0'
            });
            this.updateSteckbriefCode(data);
        },

        removeSteckbriefCondition(data: any, idx: number) {
            if (!data || !Array.isArray(data.conditions)) return;
            data.conditions.splice(idx, 1);
            this.updateSteckbriefCode(data);
        },

        applySteckbriefPreset(data: any, presetKey: string) {
            if (!data || !presetKey) return;
            if (presetKey === 'deg3_wp_ep') {
                data.degree = 3;
                data.symmetry = 'none';
                data.conditions = [
                    { id: '1', type: 'yIntercept', x: '0', y: '4' },
                    { id: '2', type: 'extreme', x: '2', y: '0' },
                    { id: '3', type: 'inflection', x: '1', y: '2' }
                ];
                data.settings.xMin = -2; data.settings.xMax = 5;
                data.settings.yMin = -2; data.settings.yMax = 6;
            } else if (presetKey === 'deg3_sym') {
                data.degree = 3;
                data.symmetry = 'punktsymmetrisch';
                data.conditions = [
                    { id: '1', type: 'extreme', x: '1', y: '2' }
                ];
                data.settings.xMin = -3; data.settings.xMax = 3;
                data.settings.yMin = -4; data.settings.yMax = 4;
            } else if (presetKey === 'deg4_sym') {
                data.degree = 4;
                data.symmetry = 'achsensymmetrisch';
                data.conditions = [
                    { id: '1', type: 'yIntercept', x: '0', y: '0' },
                    { id: '2', type: 'extreme', x: '2', y: '-4' }
                ];
                data.settings.xMin = -4; data.settings.xMax = 4;
                data.settings.yMin = -5; data.settings.yMax = 5;
            } else if (presetKey === 'deg2_parabel') {
                data.degree = 2;
                data.symmetry = 'none';
                data.conditions = [
                    { id: '1', type: 'extreme', x: '1', y: '-4' },
                    { id: '2', type: 'point', x: '3', y: '0' }
                ];
                data.settings.xMin = -2; data.settings.xMax = 5;
                data.settings.yMin = -5; data.settings.yMax = 5;
            }
            this.updateSteckbriefCode(data);
        },

        updatePuzzleCode(data: any) {
            if (!data) return;
            updatePuzzleCode(data);
            this.refreshPuzzleBoards();
        },

        reshufflePuzzle(puzzleData: any) {
            if (!puzzleData || !puzzleData.functions) return;
            const count = puzzleData.functions.length;
            const arr = Array.from({ length: count }, (_, i) => i);
            for (let i = count - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            puzzleData.shuffledIndices = arr;
            this.refreshPuzzleBoards();
        },

        addPuzzleFunction(data: any) {
            if (!data) return;
            if (!Array.isArray(data.functions)) data.functions = [];
            data.functions.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2),
                expr: 'x^2',
                exprFPrime: '2 * x'
            });
            updatePuzzleCode(data);
            this.reshufflePuzzle(data);
        },

        removePuzzleFunction(data: any, idx: number) {
            if (!data || !Array.isArray(data.functions) || data.functions.length <= 2) return;
            data.functions.splice(idx, 1);
            updatePuzzleCode(data);
            this.reshufflePuzzle(data);
        },

        adjustJustificationHeight(data: any, delta: number) {
            if (!data) return;
            const current = parseFloat(data.justificationHeight) || 4;
            data.justificationHeight = Math.max(1.5, Math.min(12, Math.round((current + delta) * 2) / 2));
        },

        // ── STOCHASTIK & SONSTIGE HELPER ─────────────────────────
        applyTreeStructure() {
            const d = this.workingModule.data;
            const depth = parseInt(d.depth, 10) || 2;
            const branches = parseInt(d.branches, 10) || 2;
            const nodes: any[] = [];
            const addChildren = (parentId: string | null, lvl: number) => {
                if (lvl > depth) return;
                for (let b = 1; b <= branches; b++) {
                    const id = parentId ? `${parentId}-${b}` : `${b}`;
                    nodes.push({
                        id,
                        parentId,
                        level: lvl,
                        prob: '',
                        label: '',
                        pathProb: '',
                        isProbPlaceholder: false,
                        isLabelPlaceholder: false,
                        isPathProbPlaceholder: false
                    });
                    addChildren(id, lvl + 1);
                }
            };
            addChildren(null, 1);
            d.nodes = nodes;
        },

        applyUrnePreset(preset: string) {
            const d = this.workingModule.data;
            d.kugeln = [];
            let id = Date.now();
            if (preset === 'two_colors') {
                for (let i = 0; i < 4; i++) d.kugeln.push({ id: id++, type: 'red', label: 'R' });
                for (let i = 0; i < 6; i++) d.kugeln.push({ id: id++, type: 'blue', label: 'B' });
            } else if (preset === 'rgb') {
                for (let i = 0; i < 3; i++) d.kugeln.push({ id: id++, type: 'red', label: '1' });
                for (let i = 0; i < 3; i++) d.kugeln.push({ id: id++, type: 'green', label: '2' });
                for (let i = 0; i < 3; i++) d.kugeln.push({ id: id++, type: 'blue', label: '3' });
            } else if (preset === 'numbered') {
                for (let i = 1; i <= 10; i++) d.kugeln.push({ id: id++, type: 'white', label: `${i}` });
            }
        },

        addQuickKugeln() {
            const d = this.workingModule.data;
            const count = Math.max(1, Math.min(30, this.quickKugelCount || 1));
            let id = Date.now();
            for (let i = 0; i < count; i++) {
                d.kugeln.push({
                    id: id++,
                    type: this.quickKugelColor || 'white',
                    label: this.quickKugelLabel || ''
                });
            }
        },

        removeKugel(kugelId: number) {
            const d = this.workingModule.data;
            d.kugeln = d.kugeln.filter((k: any) => k.id !== kugelId);
        },

        applyGluecksradPreset(preset: string) {
            const d = this.workingModule.data;
            const now = Date.now();
            if (preset === '4_equal') {
                d.sektoren = [
                    { id: now + 1, type: 'white', label: '1', weight: 1 },
                    { id: now + 2, type: 'grey', label: '2', weight: 1 },
                    { id: now + 3, type: 'white', label: '3', weight: 1 },
                    { id: now + 4, type: 'grey', label: '4', weight: 1 }
                ];
            } else if (preset === 'farben_4') {
                d.sektoren = [
                    { id: now + 1, type: 'red', label: 'Rot', weight: 1 },
                    { id: now + 2, type: 'yellow', label: 'Gelb', weight: 1 },
                    { id: now + 3, type: 'green', label: 'Grün', weight: 1 },
                    { id: now + 4, type: 'blue', label: 'Blau', weight: 1 }
                ];
            } else if (preset === 'unequal') {
                d.sektoren = [
                    { id: now + 1, type: 'red', label: '½', weight: 2 },
                    { id: now + 2, type: 'blue', label: '¼', weight: 1 },
                    { id: now + 3, type: 'yellow', label: '⅛', weight: 0.5 },
                    { id: now + 4, type: 'green', label: '⅛', weight: 0.5 }
                ];
            }
        },

        addSector() {
            const d = this.workingModule.data;
            if (!Array.isArray(d.sektoren)) d.sektoren = [];
            d.sektoren.push({ id: Date.now(), type: 'white', label: `${d.sektoren.length + 1}`, weight: 1 });
        },

        applyMCQPreset(preset: string) {
            const d = this.workingModule.data;
            const now = Date.now();
            if (preset === 'ja_nein') {
                d.options = [{ id: now, text: 'Ja' }, { id: now + 1, text: 'Nein' }];
            } else if (preset === 'richtig_falsch') {
                d.options = [{ id: now, text: 'Richtig' }, { id: now + 1, text: 'Falsch' }];
            } else if (preset === 'abcd') {
                d.options = [{ id: now, text: 'A' }, { id: now + 1, text: 'B' }, { id: now + 2, text: 'C' }, { id: now + 3, text: 'D' }];
            }
        },

        addMCQOption() {
            const d = this.workingModule.data;
            if (!Array.isArray(d.options)) d.options = [];
            d.options.push({ id: Date.now(), text: '' });
        },

        removeMCQOption(optId: number) {
            const d = this.workingModule.data;
            if (d.options && d.options.length > 1) {
                d.options = d.options.filter((o: any) => o.id !== optId);
            }
        },

        addMatchingLeft() {
            const d = this.workingModule.data;
            if (!Array.isArray(d.leftItems)) d.leftItems = [];
            d.leftItems.push({ id: Date.now(), text: '' });
        },

        removeMatchingLeft(id: number) {
            const d = this.workingModule.data;
            if (d.leftItems && d.leftItems.length > 1) {
                d.leftItems = d.leftItems.filter((i: any) => i.id !== id);
            }
        },

        addMatchingRight() {
            const d = this.workingModule.data;
            if (!Array.isArray(d.rightItems)) d.rightItems = [];
            d.rightItems.push({ id: Date.now(), text: '' });
        },

        removeMatchingRight(id: number) {
            const d = this.workingModule.data;
            if (d.rightItems && d.rightItems.length > 1) {
                d.rightItems = d.rightItems.filter((i: any) => i.id !== id);
            }
        },

        shuffleMatchingRight() {
            const d = this.workingModule.data;
            if (!d || !Array.isArray(d.rightItems) || d.rightItems.length < 2) return;
            const arr = [...d.rightItems];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            d.rightItems = arr;
        }
    };
}

if (typeof window !== 'undefined') {
    (window as any).wordAddinComponent = wordAddinComponent;
    if ((window as any).Alpine) {
        (window as any).Alpine.data('wordAddin', wordAddinComponent);
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('alpine:init', () => {
        if (typeof (window as any).Alpine !== 'undefined') {
            (window as any).Alpine.data('wordAddin', wordAddinComponent);
        }
    });
}
