/**
 * State Management for the Math Test Builder
 * Encapsulates data and logic for document manipulation.
 */

import { dbGet, dbSet } from './services/storageService';
import { 
    createDefaultSubSubtask, 
    createDefaultSubtask, 
    createDefaultTask,
    generateTreeNodes,
    generateLgsCoefficients,
    migrateToModulesArray,
    generateModuleId,
    ensureCompatibilityGetters,
    migrateAndEnsureGetters,
    generateAnalysisKurveCode,
    generateAnalysisFlaechenCode,
    generateAnalysisTangenteCode,
    generateAnalysisSteckbriefCode,
    solveSteckbrief,
    updateAnalysisExtremwertCode,
    updatePuzzleCode,
    updateRotationskoerperCode,
    generateAnalysisRiemannCode,
    createDefaultAnalysisRiemann
} from './services/taskFactory';
import { 
    renderVerteilung, 
    renderVerteilungSVG,
    getTreeLayout, 
    renderTreeSVG, 
    renderUrneSVG, 
    renderZahlenstrahl, 
    renderStrahlensatz,
    renderGluecksrad,
    renderBruch,
    renderDiagram,
    renderKoordinatensystem
} from './services/mathRenderer';
import { calculatePagination, _doPaginate } from './services/pagination';
import { Task, Meta, TaskModule } from './types/models';
import { MODULE_REGISTRY, ModuleType } from './config/moduleRegistry';
import { init2DBoard, init3DBoard } from './services/geometryService';
import { exportAsJSON, importFromJSON, loadFile, saveFile, saveFileAs } from './services/fileService';

declare const katex: any;
declare const JXG: any;

const compressImage = (fileOrBlob: File | Blob, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event: any) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Seitenverhältnis beibehalten
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                }

                // Als JPEG mit definierter Qualität komprimieren
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = () => {
                // Fallback: Original bei Ladefehler des Bildes
                resolve(event.target.result);
            };
            img.src = event.target.result;
        };
        reader.onerror = () => {
            // Fallback: Wenn FileReader fehlschlägt, resolve leer
            resolve('');
        };
        reader.readAsDataURL(fileOrBlob);
    });
};


export const documentBuilder = (): any => ({
    // Metadata for the test header
    meta: {
        docType: 'test', // 'test' or 'worksheet'
        art: 'Klassenarbeit',
        nr: '3',
        titel: '3. Klassenarbeit - Mathematik',
        fach: 'Mathematik',
        klasse: '6d',
        datum: new Date().toISOString().split('T')[0], // YYYY-MM-DD for date input
        hinweise: 'Bearbeitungszeit: 90 Minuten. Taschenrechner erlaubt.',
        hideSubtaskPoints: false
    } as Meta,

    // Save/Status State
    lastSaveTime: null as string | null,
    saveMessage: '',

    // List of tasks in the document
    tasks: [] as Task[],

    // Modal State
    isModalOpen: false,
    editingTask: ensureCompatibilityGetters({
        type: 'task',
        modules: [],
        subtasks: [],
        context: ''
    }),

    // Metadata Modal State
    isMetaModalOpen: false,
    isSidebarOpen: true,
    uiTheme: 'light' as 'light',

    // Visual Formula Editor State
    isVisualEditorOpen: false,
    mathEditorTarget: null as any, // Stores { subtask, textareaId }

    // File Handle for File System Access API
    fileHandle: null as any,

    // Active insertion slot cursor state
    activeSlotId: null as string | null,

    // Active inline editing state on the A4 canvas
    activeInlineEditId: null as string | null,

    // Active Selection State for Right Werkzeugleiste (Inspector)
    selectedTaskId: null as number | null,
    selectedSubtaskId: null as number | null,
    selectedSubSubtaskId: null as number | null,
    selectedArea: 'subtask' as 'context' | 'subtask' | 'subsub' | 'section',
    selectedModuleId: null as string | null,
    activeTextareaTarget: null as any,
    activeTextareaId: '' as string,
    activeTextareaField: 'text' as string,
    hasInlineSelection: false as boolean,

    _isPaginating: false,
    _paginationTimer: null as any,

    /**
     * Initializes the component
     */
    async init() {
        console.log('Document Builder State Initialized');

        // Load from IndexedDB on startup (with migration fallback)
        try {
            let saved = await dbGet('math_builder_autosave');
            let isMigrated = false;

            if (!saved) {
                // Check if old data exists in localStorage
                const oldSaved = localStorage.getItem('math_builder_autosave');
                if (oldSaved) {
                    try {
                        saved = JSON.parse(oldSaved);
                        isMigrated = true;
                        console.log('Migrating localStorage autosave to IndexedDB...');
                    } catch (err) {
                        console.error("Failed to parse old localStorage save during migration", err);
                    }
                }
            }

            if (saved) {
                const data = typeof saved === 'string' ? JSON.parse(saved) : saved;
                this.meta = { ...this.meta, ...data.meta };

                // Migrate tasks from old format (show-flags) to new modules[] format
                this.tasks = (data.tasks || []).map((task: any) => {
                    return migrateAndEnsureGetters(task);
                });

                this.lastSaveTime = data.lastSaveTime || null;
                if (data.uiTheme) this.uiTheme = 'light';

                // Save migrating copy into IndexedDB immediately
                if (isMigrated) {
                    await dbSet('math_builder_autosave', data);
                    localStorage.removeItem('math_builder_autosave');
                }
            }
        } catch (e) {
            console.error("Auto-Load or Migration failed:", e);
        }

        // Trigger pagination after initial render and whenever tasks change
        (this as any).$watch('tasks', () => this.calculatePagination());
        (this as any).$watch('meta', () => this.calculatePagination());

        // Set up Auto-Save interval
        setInterval(() => {
            this.autoSave();
        }, 30000); // Every 30 seconds

        // ResizeObserver to detect height changes (KaTeX, JSXGraph)
        // Guard against infinite loops: skip if pagination is in progress
        this._isPaginating = false;
        const container = document.querySelector('.tasks-container');
        if (container) {
            const ro = new ResizeObserver(() => {
                if (!this._isPaginating) {
                    this.calculatePagination();
                }
            });
            ro.observe(container);
        }

        // Initial pagination
        setTimeout(() => this.calculatePagination(), 800);

        // Ensure clean WYSIWYG state and synchronous pagination before native Ctrl+P print
        window.addEventListener('beforeprint', () => {
            if (this.activeInlineEditId) {
                this.activeInlineEditId = null;
            }
            this.activeSlotId = null;
            clearTimeout(this._paginationTimer);
            _doPaginate(this);
        });

        // Listen to events from decoupled modules
        window.addEventListener('import-task', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.importTaskFromCollection(customEvent.detail.task);
        });

        window.addEventListener('show-toast', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.saveMessage = customEvent.detail.message;
            setTimeout(() => this.saveMessage = '', customEvent.detail.duration || 3000);
        });

        window.addEventListener('module-added-to-canvas', (e: Event) => {
            const customEvent = e as CustomEvent;
            const mod = customEvent.detail?.module;
            if (mod && this.isInlineInspectorModule(mod.type)) {
                this.selectedModuleId = mod.id;
                this.ensureSelectedModuleData();
                this.autoSave();
                this.calculatePagination();
            }
        });

        // Track active text selection inside inline canvas textareas for context-sensitive Cloze action
        document.addEventListener('selectionchange', () => {
            const active = document.activeElement as HTMLTextAreaElement | null;
            if (active && active.tagName === 'TEXTAREA' && active.classList.contains('inline-canvas-textarea')) {
                this.hasInlineSelection = (active.selectionEnd - active.selectionStart) > 0;
            } else {
                this.hasInlineSelection = false;
            }
        });

        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                const active = document.activeElement as HTMLTextAreaElement | null;
                if (active && active.tagName === 'TEXTAREA' && active.classList.contains('inline-canvas-textarea')) {
                    if (active.selectionEnd > active.selectionStart) {
                        e.preventDefault();
                        this.triggerClozeForActive();
                        this.hasInlineSelection = false;
                    }
                }
            }
        });
    },

    /**
     * Parst deutsche und englische Zahlen-Strings sicher in Floats.
     * Entfernt Tausendertrennzeichen (Punkte oder Leerzeichen) und wandelt Kommas in Dezimalpunkte um.
     * @param {string|number} val - Der zu parsende Wert
     * @returns {number} Die geparste Zahl oder NaN
     */
    parseLocalizedNumber(val: any): number {
        if (val === null || val === undefined || val === '') return NaN;
        if (typeof val === 'number') return val;
        
        // 1. Alle Leerzeichen entfernen (z.B. "1 500,5")
        // 2. Alle Punkte entfernen (Tausendertrennzeichen, z.B. "1.500,5" -> "1500,5")
        // 3. Das erste Komma durch einen Punkt ersetzen ("1500,5" -> "1500.5")
        let cleanStr = val.toString().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        return Number(cleanStr);
    },

    calculatePagination() {
        return calculatePagination(this);
    },

    _doPaginate() {
        return _doPaginate(this);
    },

    printDocument() {
        this.activeInlineEditId = null;
        this.activeSlotId = null;
        clearTimeout(this._paginationTimer);
        (this as any).$nextTick(() => {
            _doPaginate(this);
            requestAnimationFrame(() => {
                window.print();
            });
        });
    },

    renderVerteilung(target: any) {
        return renderVerteilung(target);
    },

    generateTreeNodes(depth: number, branches: number) {
        return generateTreeNodes(depth, branches);
    },

    getTreeLayout(baum: any) {
        return getTreeLayout(baum);
    },

    renderTreeSVG(baum: any) {
        return renderTreeSVG(baum);
    },

    renderUrneSVG(urne: any) {
        return renderUrneSVG(urne);
    },

    renderGluecksrad(config: any, options?: any) {
        return renderGluecksrad(config, options);
    },

    applyGluecksradPreset(gluecksrad: any, count: number) {
        if (!gluecksrad) return;
        const num = Math.max(1, count);
        const types: Array<'white' | 'grey' | 'black' | 'dashed' | 'striped'> = ['white', 'grey', 'black', 'dashed', 'striped'];
        const sectors = [];
        for (let i = 0; i < num; i++) {
            sectors.push({
                id: Date.now() + i,
                type: types[i % types.length],
                label: (i + 1).toString(),
                weight: 1
            });
        }
        gluecksrad.sektoren = sectors;
    },

    shuffleUrne(urne: any) {
        if (!urne || !urne.kugeln) return;
        for (let i = urne.kugeln.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [urne.kugeln[i], urne.kugeln[j]] = [urne.kugeln[j], urne.kugeln[i]];
        }
    },

    addKugelnToUrne(urne: any, count: number, type: string, label: string) {
        if (!urne) return;
        if (!Array.isArray(urne.kugeln)) urne.kugeln = [];
        const num = Math.max(1, parseInt(count as any) || 1);
        const t = type || 'white';
        const lbl = label || '';
        for (let i = 0; i < num; i++) {
            urne.kugeln.push({
                id: Date.now() + i,
                type: t,
                label: lbl
            });
        }
    },

    autofillVierfeldertafel(target: any) {
        if (!target || !target.data) return;

        let changed = true;
        let iters = 0;

        const d = target.data.map((row: any[]) => row.map(val => {
            if (val === '' || val === null || val === undefined) return null;
            const num = this.parseLocalizedNumber(val);
            return isNaN(num) ? null : num;
        }));

        while (changed && iters < 10) {
            changed = false;
            iters++;

            for (let i = 0; i < 3; i++) {
                let r0 = d[i][0], r1 = d[i][1], r2 = d[i][2];
                if (r0 !== null && r1 !== null && r2 === null) { d[i][2] = r0 + r1; changed = true; }
                if (r0 !== null && r2 !== null && r1 === null) { d[i][1] = r2 - r0; changed = true; }
                if (r1 !== null && r2 !== null && r0 === null) { d[i][0] = r2 - r1; changed = true; }

                let c0 = d[0][i], c1 = d[1][i], c2 = d[2][i];
                if (c0 !== null && c1 !== null && c2 === null) { d[2][i] = c0 + c1; changed = true; }
                if (c0 !== null && c2 !== null && c1 === null) { d[1][i] = c2 - c0; changed = true; }
                if (c1 !== null && c2 !== null && c0 === null) { d[0][i] = c2 - c1; changed = true; }
            }
        }

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (d[r][c] !== null) {
                    target.data[r][c] = String(Math.round(d[r][c] * 100000) / 100000).replace('.', ',');
                }
            }
        }
    },

    ensureVierfelderProperties(target: any) {
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
        
        // Populate rawLabels and negated from existing labels if rawLabels is empty
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
    },

    onVierfelderLabelChange(target: any, key: 'top1' | 'top2' | 'left1' | 'left2') {
        if (!target) return;
        this.ensureVierfelderProperties(target);
        
        const raw = target.rawLabels[key] || '';
        const isNeg = !!target.negated[key];
        
        target.labels[key] = this.buildVierfelderLabel(raw, isNeg);
        this.autoSave();
    },

    buildVierfelderLabel(text: string, negated: boolean): string {
        if (!text) return '';
        const trimmed = text.trim();
        if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
            if (negated) {
                const inner = trimmed.slice(1, -1);
                if (inner.startsWith('\\overline{') && inner.endsWith('}')) {
                    return trimmed;
                }
                return `$\\overline{${inner}}$`;
            }
            return trimmed;
        }
        
        if (negated) {
            if (trimmed.length === 1) {
                return `$\\overline{${trimmed}}$`;
            } else {
                return `$\\overline{\\text{${trimmed}}}$`;
            }
        } else {
            if (trimmed.length === 1) {
                return `$${trimmed}$`;
            }
            return trimmed;
        }
    },

    getVfBadgeText(target: any): string {
        const data = this.getModuleData(target, 'vierfeldertafel') || target?.vierfeldertafel;
        if (!data || !data.printVisibility) return '4-Felder-Tafel';
        let visibleCount = 0;
        let blankCount = 0;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (data.printVisibility[r]?.[c]) {
                    visibleCount++;
                } else {
                    blankCount++;
                }
            }
        }
        if (blankCount === 0) return 'Alle 9 Werte sichtbar';
        if (visibleCount === 0) return 'Komplett leere Tabelle';
        return `${visibleCount} sichtbar, ${blankCount} Lücken`;
    },

    generateVfPuzzle(target: any) {
        if (!target) return;
        this.ensureVierfelderProperties(target);
        this.autofillVierfeldertafel(target);

        const patterns = [
            [[0, 0], [0, 2], [1, 1], [2, 0]],
            [[0, 1], [1, 0], [2, 1], [2, 2]],
            [[0, 0], [1, 0], [1, 1], [2, 2]],
            [[0, 0], [0, 1], [1, 2], [2, 2]],
            [[0, 1], [0, 2], [1, 0], [2, 2]],
            [[0, 0], [1, 1], [1, 2], [2, 0]]
        ];
        const selected = patterns[Math.floor(Math.random() * patterns.length)];

        target.printVisibility = [
            [false, false, false],
            [false, false, false],
            [false, false, false]
        ];
        selected.forEach(([r, c]) => {
            target.printVisibility[r][c] = true;
        });
        this.autoSave();
    },

    setAllVfVisibility(target: any, visible: boolean) {
        if (!target) return;
        this.ensureVierfelderProperties(target);
        target.printVisibility = [
            [visible, visible, visible],
            [visible, visible, visible],
            [visible, visible, visible]
        ];
        this.autoSave();
    },

    /**
     * Setzt Ereignis und Gegenereignis einer Achse (Spalten/Zeilen) der 4-Felder-Tafel gemeinsam.
     */
    setVfEventPair(data: any, axis: 'top' | 'left') {
        if (!data) return;
        this.ensureVierfelderProperties(data);
        const k1 = axis === 'top' ? 'top1' : 'left1';
        const k2 = axis === 'top' ? 'top2' : 'left2';
        const raw = data.rawLabels[k1] || '';
        data.rawLabels[k2] = raw;
        data.negated[k1] = false;
        data.negated[k2] = true;
        data.labels[k1] = this.buildVierfelderLabel(raw, false);
        data.labels[k2] = this.buildVierfelderLabel(raw, true);
    },

    /**
     * Auto-Fill Logik für das Dreisatz-Modul.
     * Benötigt mindestens Zeile 1 (beide Werte) und den linken Zielwert in Zeile 3.
     */
    autofillDreisatz(moduleData: any) {
        if (!moduleData || !moduleData.data) return;

        const parse = (v: any) => {
            const n = this.parseLocalizedNumber(v);
            return isNaN(n) ? null : n;
        };
        const fmt = (n: number) => String(Math.round(n * 1000000) / 1000000).replace('.', ',');

        const r0L = parse(moduleData.data[0][0]); // Zeile 1, links
        const r0R = parse(moduleData.data[0][1]); // Zeile 1, rechts
        const r2L = parse(moduleData.data[2][0]); // Zeile 3, links (Zielwert)

        if (r0L === null || r0R === null || r2L === null || r0L === 0) return;

        const isProp = moduleData.type !== 'antiproportional';

        if (isProp) {
            // Proportional: auf Einheitswert herunterrechnen
            const r1R = r0R / r0L;
            const r2R = r2L * r1R;
            moduleData.data[1][0] = '1';
            moduleData.data[1][1] = fmt(r1R);
            moduleData.data[2][1] = fmt(r2R);
            moduleData.operationsLeft[0] = ': ' + fmt(r0L);
            moduleData.operationsLeft[1] = '\u00d7 ' + fmt(r2L);
            moduleData.operationsRight[0] = ': ' + fmt(r0L);
            moduleData.operationsRight[1] = '\u00d7 ' + fmt(r2L);
        } else {
            // Antiproportional: konstantes Produkt
            const product = r0L * r0R;
            const r1R = product; // bei r1L = 1
            const r2R = product / r2L;
            moduleData.data[1][0] = '1';
            moduleData.data[1][1] = fmt(r1R);
            moduleData.data[2][1] = fmt(r2R);
            moduleData.operationsLeft[0] = ': ' + fmt(r0L);
            moduleData.operationsLeft[1] = '\u00d7 ' + fmt(r2L);
            moduleData.operationsRight[0] = '\u00d7 ' + fmt(r0L);
            moduleData.operationsRight[1] = ': ' + fmt(r2L);
        }
    },

    openMetaModal() { this.isMetaModalOpen = true; },
    closeMetaModal() { this.isMetaModalOpen = false; },

    // Module Catalog Modal
    openModuleModal(target: any) {
        window.dispatchEvent(new CustomEvent('open-module-modal', { detail: { target } }));
    },

    // Module Studio Modal (Split-Screen Live Preview)
    openModuleStudio(target: any, module: any) {
        window.dispatchEvent(new CustomEvent('open-module-studio', {
            detail: { target, module, isNew: false }
        }));
    },

    /**
     * Gibt das erste Modul eines bestimmten Typs aus modules[] zurück.
     * Hilfsfunktion für Render-Methoden und Zugriffe aus dem Template.
     */
    getModuleData(target: any, moduleType: string): any | null {
        if (!target || !Array.isArray(target.modules)) return null;
        const mod = target.modules.find((m: TaskModule) => m.type === moduleType);
        return mod ? mod.data : null;
    },

    getBaumHeight(target: any): number {
        const modData = this.getModuleData(target, 'baum');
        if (modData && modData.height) return Number(modData.height);
        if (target && target.baum && target.baum.height) return Number(target.baum.height);
        return 7;
    },

    setBaumHeight(target: any, height: any) {
        const h = Math.max(2, Math.min(25, parseFloat(height) || 7));
        const modData = this.getModuleData(target, 'baum');
        if (modData) {
            modData.height = h;
        }
        if (target && target.baum) {
            target.baum.height = h;
        }
        this.autoSave();
    },

    getUrneBadgeText(target: any): string {
        const data = this.getModuleData(target, 'urne') || target?.urne;
        if (!data || !Array.isArray(data.kugeln) || data.kugeln.length === 0) {
            return 'Leere Urne';
        }
        const count = data.kugeln.length;
        const counts: Record<string, number> = {};
        data.kugeln.forEach((k: any) => {
            const type = (k.type || 'white').toLowerCase();
            counts[type] = (counts[type] || 0) + 1;
        });
        const summary = Object.entries(counts)
            .map(([col, n]) => {
                const icon = col === 'red' || col === 'rot' ? '🔴'
                    : col === 'blue' || col === 'blau' ? '🔵'
                    : col === 'green' || col === 'grün' ? '🟢'
                    : col === 'yellow' || col === 'gelb' ? '🟡'
                    : col === 'black' || col === 'schwarz' ? '⚫'
                    : col === 'grey' || col === 'grau' ? '🔘'
                    : '⚪';
                return `${n} ${icon}`;
            })
            .join(', ');
        return `${count} ${count === 1 ? 'Kugel' : 'Kugeln'} (${summary})`;
    },

    getUrneHeight(target: any): number {
        const modData = this.getModuleData(target, 'urne');
        if (modData && modData.height) return Number(modData.height);
        if (target && target.urne && target.urne.height) return Number(target.urne.height);
        return 4;
    },

    setUrneHeight(target: any, height: any) {
        const h = Math.max(2, Math.min(25, parseFloat(height) || 4));
        const modData = this.getModuleData(target, 'urne');
        if (modData) {
            modData.height = h;
        }
        if (target && target.urne) {
            target.urne.height = h;
        }
        this.autoSave();
    },

    getGluecksradBadgeText(target: any): string {
        const data = this.getModuleData(target, 'gluecksrad') || target?.gluecksrad;
        if (!data || !Array.isArray(data.sektoren) || data.sektoren.length === 0) {
            return 'Keine Sektoren';
        }
        const count = data.sektoren.length;
        const pointerText = data.showPointer !== false ? 'mit Zeiger' : 'ohne Zeiger';
        return `${count} ${count === 1 ? 'Sektor' : 'Sektoren'}, ${pointerText}`;
    },

    getGluecksradHeight(target: any): number {
        const modData = this.getModuleData(target, 'gluecksrad');
        if (modData && modData.height) return Number(modData.height);
        if (target && target.gluecksrad && target.gluecksrad.height) return Number(target.gluecksrad.height);
        return 4.5;
    },

    setGluecksradHeight(target: any, height: any) {
        const h = Math.max(2, Math.min(25, parseFloat(height) || 4.5));
        const modData = this.getModuleData(target, 'gluecksrad');
        if (modData) {
            modData.height = h;
        }
        if (target && target.gluecksrad) {
            target.gluecksrad.height = h;
        }
        this.autoSave();
    },

    getDiagrammBadgeText(target: any): string {
        const data = this.getModuleData(target, 'diagramm') || target?.diagramm;
        if (!data) return 'Diagramm';
        const typeMap: Record<string, string> = {
            saeule: 'Säulendiagramm',
            balken: 'Balkendiagramm',
            stab: 'Stabdiagramm',
            linie: 'Liniendiagramm'
        };
        const typeName = typeMap[data.type || 'saeule'] || 'Diagramm';
        const count = Array.isArray(data.items) ? data.items.length : 0;
        const modeMap: Record<string, string> = {
            show: 'Anzeigen',
            draw: 'Einzeichnen',
            read: 'Ablesen'
        };
        const modeName = modeMap[data.mode || 'show'] || 'Anzeigen';
        return `${typeName} (${count} ${count === 1 ? 'Wert' : 'Werte'}, ${modeName})`;
    },

    getDiagrammHeight(target: any): number {
        const modData = this.getModuleData(target, 'diagramm');
        if (modData && modData.height) return Number(modData.height);
        if (target && target.diagramm && target.diagramm.height) return Number(target.diagramm.height);
        return 5.0;
    },

    setDiagrammHeight(target: any, height: any) {
        const h = Math.max(2, Math.min(25, parseFloat(height) || 5.0));
        const modData = this.getModuleData(target, 'diagramm');
        if (modData) {
            modData.height = h;
        }
        if (target && target.diagramm) {
            target.diagramm.height = h;
        }
        this.autoSave();
    },

    getVerteilungBadgeText(target: any): string {
        const data = this.getModuleData(target, 'verteilung') || target?.verteilung;
        if (!data) return 'Verteilung';
        const type = data.type === 'normal' ? 'normal' : 'binomial';
        const markArea = data.markArea;
        const markText = (markArea && markArea.show) 
            ? `, P(${markArea.min} ≤ X ≤ ${markArea.max})` 
            : '';
        if (type === 'binomial') {
            const n = data.n !== undefined ? data.n : 10;
            const p = data.p !== undefined ? data.p : 0.5;
            return `Binomial B(n=${n}, p=${p})${markText}`;
        } else {
            const mu = data.mu !== undefined ? data.mu : 0;
            const sigma = data.sigma !== undefined ? data.sigma : 1;
            return `Normal N(μ=${mu}, σ=${sigma})${markText}`;
        }
    },

    getVerteilungHeight(target: any): number {
        const modData = this.getModuleData(target, 'verteilung');
        if (modData && modData.settings && modData.settings.height) return Number(modData.settings.height);
        if (target && target.verteilung && target.verteilung.settings && target.verteilung.settings.height) return Number(target.verteilung.settings.height);
        return 6.0;
    },

    setVerteilungHeight(target: any, height: any) {
        const h = Math.max(2, Math.min(25, parseFloat(height) || 6.0));
        const modData = this.getModuleData(target, 'verteilung');
        if (modData) {
            if (!modData.settings) modData.settings = {};
            modData.settings.height = h;
        }
        if (target && target.verteilung) {
            if (!target.verteilung.settings) target.verteilung.settings = {};
            target.verteilung.settings.height = h;
        }
        this.autoSave();
    },

    getVerteilungWidth(target: any): number {
        const modData = this.getModuleData(target, 'verteilung');
        if (modData && modData.settings && modData.settings.width) return Number(modData.settings.width);
        if (target && target.verteilung && target.verteilung.settings && target.verteilung.settings.width) return Number(target.verteilung.settings.width);
        return 10.0;
    },

    setVerteilungWidth(target: any, width: any) {
        const w = Math.max(3, Math.min(25, parseFloat(width) || 10.0));
        const modData = this.getModuleData(target, 'verteilung');
        if (modData) {
            if (!modData.settings) modData.settings = {};
            modData.settings.width = w;
        }
        if (target && target.verteilung) {
            if (!target.verteilung.settings) target.verteilung.settings = {};
            target.verteilung.settings.width = w;
        }
        this.autoSave();
    },

    /**
     * Gibt den Anzeigenamen für einen Modultyp zurück.
     */
    getModuleDisplayName(type: string): string {
        const def = MODULE_REGISTRY[type as ModuleType];
        if (def?.name) return def.name;
        const names: Record<string, string> = {
            table: 'Wertetabelle',
            lgs: 'LGS',
            dreisatz: 'Dreisatz',
            zahlenstrahl: 'Zahlenstrahl',
            geometry: 'Geometrie',
            geometry3d: '3D-Geo',
            strahlensatz: 'Strahlensatz',
            verteilung: 'Verteilung',
            baum: 'Baumdiagramm',
            urne: 'Urnenmodell',
            gluecksrad: 'Glücksrad',
            vierfeldertafel: '4-Felder',
            mcq: 'Multiple Choice',
            trueFalse: 'Wahr/Falsch',
            matching: 'Zuordnung',
            image: 'Bild',
            zusatz: 'Hinweis',
            lueckentext: 'Lückentext',
            analysis_flaechen: 'Flächenmarkierung',
            analysis_tangente: 'Tangente',
            analysis_kurve: 'Funktionsplotter',
            analysis_steckbrief: 'Steckbriefaufgabe',
            analysis_puzzle: 'Zuordnungspuzzle',
            analysis_rotationskoerper: 'Rotationskörper',
            analysis_extremwert: 'Extremwertaufgabe',
            analysis_riemann: 'Riemann-Summen'
        };
        return names[type] || type;
    },

    getModuleIcon(type: string): string {
        const def = MODULE_REGISTRY[type as ModuleType];
        return def?.icon || '🧩';
    },


    addModuleToTarget(target: any, moduleType: string) {
        if (!target) return;
        const def = MODULE_REGISTRY[moduleType as ModuleType];
        if (!def) return;
        
        const arr = Array.isArray(target.modules) ? [...target.modules] : [];
        arr.push({
            id: generateModuleId(),
            type: moduleType,
            data: def.defaultData(),
        });
        target.modules = arr;

        if (moduleType === 'analysis_extremwert') {
            const defaultText = "Ein Landwirt besitzt ein Grundstück an einem geradlinigen Flussufer. Er möchte eine rechteckige Wiese einzäunen, wobei die dem Fluss zugewandte Seite keinen Zaun benötigt. Es stehen insgesamt **120** m Zaun zur Verfügung. Bestimme die Abmessungen der Wiese, sodass die Weidefläche maximal wird, und berechne diesen maximalen Flächeninhalt.";
            if (target.context !== undefined) {
                if (!target.context || target.context.trim() === "") {
                    target.context = defaultText;
                }
            } else {
                if (!target.text || target.text.trim() === "") {
                    target.text = defaultText;
                }
            }
        } else if (moduleType === 'analysis_puzzle') {
            const defaultText = "Ordne die Graphen der Funktionen (I bis III) den Graphen ihrer Ableitungsfunktionen (A bis C) zu.";
            if (target.context !== undefined) {
                if (!target.context || target.context.trim() === "") {
                    target.context = defaultText;
                }
            } else {
                if (!target.text || target.text.trim() === "") {
                    target.text = defaultText;
                }
            }
        } else if (moduleType === 'analysis_rotationskoerper') {
            const defaultText = "Der Graph der Funktion $f(x) = \\sqrt{x}$ rotiert im Intervall $[0; 4]$ um die x-Achse. Bestimme das Volumen des entstehenden Rotationskörpers.";
            if (target.context !== undefined) {
                if (!target.context || target.context.trim() === "") {
                    target.context = defaultText;
                }
            } else {
                if (!target.text || target.text.trim() === "") {
                    target.text = defaultText;
                }
            }
        }
    },

    /**
     * Entfernt ein Modul aus dem modules[]-Array anhand seiner ID.
     */
    removeModuleById(target: any, moduleId: string) {
        if (!target || !Array.isArray(target.modules)) return;
        target.modules = target.modules.filter((m: TaskModule) => m.id !== moduleId);
        if (this.selectedModuleId === moduleId) {
            this.selectedModuleId = null;
        }
    },

    /**
     * Verschiebt ein Modul im modules[]-Array um eine Position nach oben oder unten.
     */
    moveModule(target: any, moduleId: string, direction: 'up' | 'down') {
        if (!target || !Array.isArray(target.modules)) return;
        const arr = target.modules;
        const idx = arr.findIndex((m: TaskModule) => m.id === moduleId);
        if (idx === -1) return;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= arr.length) return;
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    },

    saveTaskToCollection(task: Task) {
        window.dispatchEvent(new CustomEvent('save-task-to-collection', { detail: { task } }));
    },

    importTaskFromCollection(task: Task) {
        const taskCopy = JSON.parse(JSON.stringify(task));
        taskCopy.id = Date.now();
        // Unteraufgaben IDs ebenfalls erneuern, um Render-Kollisionen zu vermeiden
        let idCounter = 0;
        taskCopy.subtasks.forEach((sub: any) => {
            sub.id = Date.now() + (idCounter++);
            if (sub.subSubtasks) {
                sub.subSubtasks.forEach((subSub: any) => {
                    subSub.id = Date.now() + (idCounter++);
                });
            }
        });
        const preparedTask = migrateAndEnsureGetters(taskCopy);
        this.tasks.push(preparedTask);
        this.autoSave();
        this.saveMessage = 'Aufgabe hinzugefügt!';
        setTimeout(() => this.saveMessage = '', 2000);
    },

    getTaskModules(task: Task) {
        const modules: string[] = [];
        if (task.table?.show) modules.push('📊 Tabelle');
        if (task.geometry?.show) modules.push('📐 Geo');
        if (task.geometry3d?.show || task.subtasks.some(s => s.geometry3d?.show)) modules.push('🧊 3D-Geo');

        let mcq = false, tf = false, match = false, karo = false, cloze = false, dist = task.verteilung?.show, zs = task.zahlenstrahl?.show;
        task.subtasks.forEach(s => {
            if (s.mcq?.show) mcq = true;
            if (s.trueFalse?.show) tf = true;
            if (s.matching?.show) match = true;
            if (s.spaceType === 'karo') karo = true;
            if (s.lueckentext?.show) cloze = true;
            if (s.verteilung?.show) dist = true;
            if (s.zahlenstrahl?.show) zs = true;
            if (s.image?.show) modules.push('🖼️ Bild');
        });

        if (dist) modules.push('📊 Verteilung');
        if (mcq) modules.push('☑️ MCQ');
        if (tf) modules.push('⚖️ W/F');
        if (match) modules.push('🔗 Zuordnung');
        if (cloze) modules.push('🔤 Lücke');
        if (karo) modules.push('📝 Karo');
        if (task.baum?.show || task.subtasks.some(s => s.baum?.show)) modules.push('🌳 Baum');
        if (task.urne?.show || task.subtasks.some(s => s.urne?.show)) modules.push('🎲 Urne');
        if (task.vierfeldertafel?.show || task.subtasks.some(s => s.vierfeldertafel?.show)) modules.push('▦ 4-Felder');
        if (zs) modules.push('📏 Zahlenstrahl');

        let hasStrahl = false;
        if (Array.isArray(task.modules) && task.modules.some((m: any) => m.type === 'strahlensatz')) {
            hasStrahl = true;
        }
        task.subtasks.forEach(s => {
            if (Array.isArray(s.modules) && s.modules.some((m: any) => m.type === 'strahlensatz')) {
                hasStrahl = true;
            }
            s.subSubtasks.forEach(ss => {
                if (Array.isArray(ss.modules) && ss.modules.some((m: any) => m.type === 'strahlensatz')) {
                    hasStrahl = true;
                }
            });
        });
        if (hasStrahl) modules.push('📐 Strahlensatz');

        let hasGluecksrad = false;
        if (Array.isArray(task.modules) && task.modules.some((m: any) => m.type === 'gluecksrad')) {
            hasGluecksrad = true;
        }
        task.subtasks.forEach(s => {
            if (Array.isArray(s.modules) && s.modules.some((m: any) => m.type === 'gluecksrad')) {
                hasGluecksrad = true;
            }
            s.subSubtasks.forEach(ss => {
                if (Array.isArray(ss.modules) && ss.modules.some((m: any) => m.type === 'gluecksrad')) {
                    hasGluecksrad = true;
                }
            });
        });
        if (hasGluecksrad) modules.push('🎡 Glücksrad');

        let hasDreisatz = false;
        if (Array.isArray(task.modules) && task.modules.some((m: any) => m.type === 'dreisatz')) {
            hasDreisatz = true;
        }
        task.subtasks.forEach((s: any) => {
            if (Array.isArray(s.modules) && s.modules.some((m: any) => m.type === 'dreisatz')) {
                hasDreisatz = true;
            }
            s.subSubtasks.forEach((ss: any) => {
                if (Array.isArray(ss.modules) && ss.modules.some((m: any) => m.type === 'dreisatz')) {
                    hasDreisatz = true;
                }
            });
        });
        if (hasDreisatz) modules.push('⚖️ Dreisatz');

        let hasBruch = false;
        if (Array.isArray(task.modules) && task.modules.some((m: any) => m.type === 'bruch')) {
            hasBruch = true;
        }
        task.subtasks.forEach(s => {
            if (Array.isArray(s.modules) && s.modules.some((m: any) => m.type === 'bruch')) {
                hasBruch = true;
            }
            s.subSubtasks.forEach(ss => {
                if (Array.isArray(ss.modules) && ss.modules.some((m: any) => m.type === 'bruch')) {
                    hasBruch = true;
                }
            });
        });
        if (hasBruch) modules.push('🍰 Bruchteile');
        
        let hasDiagramm = false;
        if (Array.isArray(task.modules) && task.modules.some((m: any) => m.type === 'diagramm')) {
            hasDiagramm = true;
        }
        task.subtasks.forEach(s => {
            if (Array.isArray(s.modules) && s.modules.some((m: any) => m.type === 'diagramm')) {
                hasDiagramm = true;
            }
            s.subSubtasks.forEach(ss => {
                if (Array.isArray(ss.modules) && ss.modules.some((m: any) => m.type === 'diagramm')) {
                    hasDiagramm = true;
                }
            });
        });
        if (hasDiagramm) modules.push('📊 Diagramme');

        let hasKoordinatensystem = false;
        if (Array.isArray(task.modules) && task.modules.some((m: any) => m.type === 'koordinatensystem')) {
            hasKoordinatensystem = true;
        }
        task.subtasks.forEach(s => {
            if (Array.isArray(s.modules) && s.modules.some((m: any) => m.type === 'koordinatensystem')) {
                hasKoordinatensystem = true;
            }
            s.subSubtasks.forEach(ss => {
                if (Array.isArray(ss.modules) && ss.modules.some((m: any) => m.type === 'koordinatensystem')) {
                    hasKoordinatensystem = true;
                }
            });
        });
        if (hasKoordinatensystem) modules.push('🎯 Koordinatensystem');

        if (modules.length === 0) modules.push('📝 Text');
        return modules;
    },

    /**
     * Gibt die passende CSS-Farbklasse für ein Modul zurück
     * @param {string} modName 
     * @returns {string}
     */
    getBadgeColorClass(modName: string) {
        if (modName.includes('Tabelle') || modName.includes('Verteilung')) return 'table';
        if (modName.includes('Geo') || modName.includes('Zahlenstrahl') || modName.includes('Strahlensatz') || modName.includes('Koordinatensystem')) return 'geo';
        if (modName.includes('MCQ')) return 'mcq';
        if (modName.includes('W/F')) return 'tf';
        if (modName.includes('Zuordnung')) return 'matching';
        if (modName.includes('Lücke')) return 'cloze';
        if (modName.includes('Karo')) return 'karo';
        if (modName.includes('Bild')) return 'image';
        if (modName.includes('Baum')) return 'matching'; // Use matching color for Tree
        if (modName.includes('Urne')) return 'geo'; // Use geo color for Urne
        if (modName.includes('Glücksrad')) return 'geo';
        if (modName.includes('Dreisatz')) return 'table';
        if (modName.includes('4-Felder')) return 'table';
        if (modName.includes('Bruchteile')) return 'geo';
        if (modName.includes('Diagramme')) return 'table';
        return 'text';
    },

    /**
     * Checks if a task has any context content (text or active modules)
     */
    hasContextContent(task: Task) {
        if (!task) return false;
        return (task.context && task.context.trim() !== '') ||
            (Array.isArray(task.modules) && task.modules.length > 0) ||
            Boolean(task.baum && (task.baum.show || (task.baum as any).nodes));
    },

    async autoSave() {
        const data = {
            meta: this.meta,
            tasks: this.tasks,
            uiTheme: this.uiTheme,
            lastSaveTime: new Date().toISOString()
        };
        await dbSet('math_builder_autosave', data);
        this.lastSaveTime = data.lastSaveTime;
    },

    /**
     * Saves the current state manually to IndexedDB
     */
    async saveToBrowser() {
        const key = `math_builder_${this.meta.titel.replace(/\s+/g, '_')}`;
        const data = {
            meta: this.meta,
            tasks: this.tasks,
            lastSaveTime: new Date().toISOString()
        };
        await dbSet(key, data);
        this.lastSaveTime = data.lastSaveTime;

        this.saveMessage = 'Gespeichert!';
        setTimeout(() => this.saveMessage = '', 3000);
    },

    /**
     * Exports the state as a JSON file
     */
    exportAsJSON() {
        exportAsJSON(this);
    },

    /**
     * Imports the state from a JSON file
     */
    importFromJSON(event: any) {
        importFromJSON(this, event);
    },

    /**
     * Loads a file via File System Access API or Fallback
     */
    async loadFile() {
        await loadFile(this);
    },

    resetTest() {
        if (confirm('Möchten Sie wirklich einen neuen Test erstellen? Alle aktuellen Aufgaben werden dabei unwiderruflich gelöscht.')) {
            this.tasks = [];
            this.meta = {
                docType: 'test',
                art: 'Klassenarbeit',
                nr: '1',
                titel: 'Neue Klassenarbeit',
                fach: 'Mathematik',
                klasse: '',
                datum: new Date().toISOString().split('T')[0],
                hinweise: '',
                hideSubtaskPoints: false
            };
            this.fileHandle = null;
            this.autoSave();
            this.calculatePagination();
        }
    },

    async saveFile() {
        await saveFile(this);
    },

    /**
     * Forces a "Save As" dialog to create a copy
     */
    async saveFileAs() {
        await saveFileAs(this);
    },

    /**
     * Opens the modal for adding a new section (divider)
     */
    openSectionModal() {
        const sectionObj = {
            id: Date.now(),
            type: 'section',
            title: '',
            subtitle: '',
            subtasks: [] // Sections have no subtasks but we keep the array for compatibility
        };
        this.editingTask = ensureCompatibilityGetters(sectionObj);
        this.isModalOpen = true;
    },

    /**
     * Opens the modal for adding or editing a task
     * @param {Object|null} taskToEdit - The task to edit, or null for a new task
     */
    openTaskModal(taskToEdit = null) {
        if (taskToEdit) {
            // Deep copy to prevent accidental live-updates before saving
            const taskCopy = JSON.parse(JSON.stringify(taskToEdit));
 
            // Skip migrations for sections
            if (taskCopy.type === 'section') {
                this.editingTask = taskCopy;
                this.isModalOpen = true;
                return;
            }
 
            this.editingTask = migrateAndEnsureGetters(taskCopy);
        } else {
            // Neue Aufgabe aus Factory (bereits mit modules: [])
            this.editingTask = createDefaultTask(this.generateTreeNodes.bind(this));
        }
        this.isModalOpen = true;
    },
 
    /**
     * Closes the task modal and resets editing state
     */
    closeTaskModal() {
        this.isModalOpen = false;
        // Sicheres Dummy-Objekt für Alpine.js während der Exit-Animation
        const dummy = {
            type: 'task',
            modules: [],
            subtasks: [],
            context: ''
        };
        this.editingTask = ensureCompatibilityGetters(dummy);
    },

    /**
     * Selects a task / subtask / sub-subtask / section on the A4 canvas for the Right Werkzeugleiste
     */
    selectCanvasItem(task: any, area: 'context' | 'subtask' | 'subsub' | 'section' = 'subtask', subtask?: any, subSub?: any, keepModuleSelection = false) {
        if (!task) return;
        const prevTaskId = this.selectedTaskId;
        const prevArea = this.selectedArea;
        const prevSubId = this.selectedSubtaskId;
        const prevSubSubId = this.selectedSubSubtaskId;

        this.selectedTaskId = task.id;
        if (task.type === 'section') {
            this.selectedArea = 'section';
            this.selectedSubtaskId = null;
            this.selectedSubSubtaskId = null;
            this.selectedModuleId = null;
            return;
        }
        this.selectedArea = area;
        if (subtask) {
            this.selectedSubtaskId = subtask.id;
        } else if (!this.selectedSubtaskId || !task.subtasks?.some((s: any) => s.id === this.selectedSubtaskId)) {
            this.selectedSubtaskId = task.subtasks?.[0]?.id || null;
        }
        if (subSub) {
            this.selectedSubSubtaskId = subSub.id;
        } else if (area !== 'subsub') {
            this.selectedSubSubtaskId = null;
        }

        if (!keepModuleSelection) {
            this.selectedModuleId = null;
        } else if (prevTaskId !== this.selectedTaskId || prevArea !== this.selectedArea || prevSubId !== this.selectedSubtaskId || prevSubSubId !== this.selectedSubSubtaskId) {
            // Check if the selectedModuleId actually belongs to the new holder
            const holder = this.getActiveModuleHolder();
            if (!holder || !Array.isArray(holder.modules) || !holder.modules.some((m: any) => m.id === this.selectedModuleId)) {
                this.selectedModuleId = null;
            }
        }
    },

    /**
     * Selects a module directly on the A4 canvas or in the Inspector list to show its settings in the Right Sidebar
     */
    selectModuleOnCanvas(moduleId: string, task: any, area: 'context' | 'subtask' | 'subsub' = 'subtask', subtask?: any, subSub?: any) {
        this.selectCanvasItem(task, area, subtask, subSub, true);
        this.selectedModuleId = moduleId;
        this.ensureSelectedModuleData();
    },

    closeInspectorModule() {
        this.selectedModuleId = null;
    },

    isInlineInspectorModule(type: string | undefined): boolean {
        if (!type) return false;
        return [
            'analysis_kurve',
            'analysis_riemann',
            'analysis_rotationskoerper',
            'analysis_extremwert',
            'analysis_steckbrief',
            'analysis_puzzle',
            'table',
            'lgs',
            'dreisatz',
            'zahlenstrahl',
            'bruch',
            'koordinatensystem',
            'strahlensatz',
            'geometry',
            'geometry3d',
            'baum',
            'vierfeldertafel',
            'urne',
            'gluecksrad',
            'diagramm',
            'verteilung',
            'mcq',
            'trueFalse',
            'matching',
            'image',
            'zusatz',
            'lueckentext'
        ].includes(type);
    },

    /**
     * Stellt sicher, dass ein Modul alle für den Inspector nötigen Felder besitzt
     * (entspricht der früheren Initialisierung in Modalen / TaskFactory).
     */
    ensureModuleData(mod: any) {
        if (!mod || !mod.data) return;
        const data = mod.data;
        switch (mod.type) {
            case 'baum': {
                if (!data.height) data.height = 7;
                if (!data.depth) data.depth = 2;
                if (!data.branches) data.branches = 2;
                if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
                    data.nodes = generateTreeNodes(data.depth, data.branches);
                }
                data.nodes.forEach((n: any) => {
                    n.isProbPlaceholder = !!n.isProbPlaceholder;
                    n.isLabelPlaceholder = !!n.isLabelPlaceholder;
                    n.isPathProbPlaceholder = !!n.isPathProbPlaceholder;
                    n.isNegated = !!n.isNegated;
                    if (n.prob === undefined) n.prob = '';
                    if (n.label === undefined) n.label = '';
                    if (n.pathProb === undefined) n.pathProb = '';
                });
                break;
            }
            case 'vierfeldertafel': {
                if (!Array.isArray(data.data) || data.data.length !== 3) {
                    data.data = [['', '', ''], ['', '', ''], ['', '', '']];
                }
                if (!Array.isArray(data.printVisibility) || data.printVisibility.length !== 3) {
                    data.printVisibility = [[true, true, true], [true, true, true], [true, true, true]];
                }
                if (!data.labels) data.labels = { top1: '$A$', top2: '$\\overline{A}$', left1: '$B$', left2: '$\\overline{B}$' };
                if (!data.rawLabels) data.rawLabels = { top1: 'A', top2: 'A', left1: 'B', left2: 'B' };
                if (!data.negated) data.negated = { top1: false, top2: true, left1: false, left2: true };
                break;
            }
            case 'urne': {
                if (!Array.isArray(data.kugeln)) data.kugeln = [];
                if (!data.height) data.height = 4.5;
                break;
            }
            case 'gluecksrad': {
                if (data.height === undefined) data.height = 4.5;
                if (data.showPointer === undefined) data.showPointer = true;
                if (!Array.isArray(data.sektoren) || data.sektoren.length === 0) {
                    const now = Date.now();
                    data.sektoren = [
                        { id: now + 1, type: 'white', label: '1', weight: 1 },
                        { id: now + 2, type: 'grey', label: '2', weight: 1 },
                        { id: now + 3, type: 'white', label: '3', weight: 1 },
                        { id: now + 4, type: 'grey', label: '4', weight: 1 }
                    ];
                }
                break;
            }
            case 'diagramm': {
                if (!data.type) data.type = 'saeule';
                if (data.height === undefined) data.height = 5.0;
                if (data.width === undefined) data.width = 10.0;
                if (data.yMax === undefined) data.yMax = 10;
                if (data.yStep === undefined) data.yStep = 2;
                if (data.showGrid === undefined) data.showGrid = true;
                if (!data.mode) data.mode = 'show';
                if (!data.fillType) data.fillType = 'grey';
                if (data.title === undefined) data.title = '';
                if (data.xAxisLabel === undefined) data.xAxisLabel = '';
                if (data.yAxisLabel === undefined) data.yAxisLabel = '';
                if (!Array.isArray(data.items)) data.items = [];
                break;
            }
            case 'verteilung': {
                if (!data.type) data.type = 'binomial';
                if (data.n === undefined) data.n = 10;
                if (data.p === undefined) data.p = 0.5;
                if (data.mu === undefined) data.mu = 0;
                if (data.sigma === undefined) data.sigma = 1;
                if (!data.settings) data.settings = { width: 10, height: 6 };
                if (!data.markArea) data.markArea = { show: false, min: 2, max: 5 };
                break;
            }
            case 'mcq': {
                if (!Array.isArray(data.options) || data.options.length === 0) {
                    const now = Date.now();
                    data.options = [{ id: now, text: 'Option 1' }, { id: now + 1, text: 'Option 2' }];
                }
                break;
            }
            case 'trueFalse': {
                if (data.spaceHeight === undefined) data.spaceHeight = 3;
                if (data.showJustification === undefined) data.showJustification = false;
                break;
            }
            case 'matching': {
                if (!Array.isArray(data.leftItems) || data.leftItems.length === 0) {
                    const now = Date.now();
                    data.leftItems = [{ id: now, text: 'Begriff A' }, { id: now + 1, text: 'Begriff B' }];
                }
                if (!Array.isArray(data.rightItems) || data.rightItems.length === 0) {
                    const now = Date.now();
                    data.rightItems = [{ id: now + 2, text: 'Zuordnung A' }, { id: now + 3, text: 'Zuordnung B' }];
                }
                break;
            }
            case 'image': {
                if (data.rows === undefined) data.rows = 1;
                if (data.cols === undefined) data.cols = 1;
                if (data.width === undefined) data.width = 10;
                if (data.maxHeight === undefined) data.maxHeight = 5;
                if (data.activeIndex === undefined) data.activeIndex = 0;
                if (!Array.isArray(data.slots) || data.slots.length === 0) {
                    data.slots = [''];
                }
                break;
            }
            case 'zusatz': {
                if (data.text === undefined) data.text = '';
                break;
            }
            case 'lueckentext': {
                break;
            }
        }
    },

    /** Rückwärtskompatibler Alias */
    ensureStochastikData(mod: any) {
        this.ensureModuleData(mod);
    },

    /** Ergänzt fehlende Felder am aktuell im Inspector gewählten Modul. */
    ensureSelectedModuleData() {
        this.ensureModuleData(this.getSelectedModule());
    },

    getSelectedModule(): any {
        if (!this.selectedModuleId) return null;
        const holder = this.getActiveModuleHolder();
        if (!holder || !Array.isArray(holder.modules)) return null;
        return holder.modules.find((m: any) => m.id === this.selectedModuleId) || null;
    },

    editModuleFromInspector(holder: any, mod: any) {
        if (!mod) return;
        this.selectedModuleId = mod.id;
        this.ensureSelectedModuleData();
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
        this.autoSave();
        this.calculatePagination();
    },

    removeSteckbriefCondition(data: any, idx: number) {
        if (!data || !Array.isArray(data.conditions)) return;
        data.conditions.splice(idx, 1);
        this.updateSteckbriefCode(data);
        this.autoSave();
        this.calculatePagination();
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
        this.autoSave();
        this.calculatePagination();
    },

    addPuzzleFunction(data: any) {
        if (!data) return;
        if (!Array.isArray(data.functions)) data.functions = [];
        data.functions.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            expr: 'x^2',
            exprFPrime: '2 * x'
        });
        this.updatePuzzleCode(data, this.getActiveModuleHolder());
        this.reshufflePuzzle(data);
        this.autoSave();
        this.calculatePagination();
    },

    removePuzzleFunction(data: any, idx: number) {
        if (!data || !Array.isArray(data.functions) || data.functions.length <= 2) return;
        data.functions.splice(idx, 1);
        this.updatePuzzleCode(data, this.getActiveModuleHolder());
        this.reshufflePuzzle(data);
        this.autoSave();
        this.calculatePagination();
    },

    adjustJustificationHeight(data: any, delta: number) {
        if (!data) return;
        const current = parseFloat(data.justificationHeight) || 4;
        data.justificationHeight = Math.max(1.5, Math.min(12, Math.round((current + delta) * 2) / 2));
        this.autoSave();
        this.calculatePagination();
    },

    adjustDirectDimension(data: any, prop: 'width' | 'height', delta: number, minVal = 1, maxVal = 18) {
        if (!data) return;
        const fallback = prop === 'width' ? 4 : 3;
        const current = parseFloat(data[prop]) || fallback;
        data[prop] = Math.max(minVal, Math.min(maxVal, Math.round((current + delta) * 2) / 2));
        this.autoSave();
        this.calculatePagination();
    },

    applyZahlenstrahlPreset(data: any, presetKey: string) {
        if (!data || !presetKey) return;
        if (presetKey === 'neg5_5') {
            data.min = -5; data.max = 5; data.step = 1; data.subdivisions = 2;
        } else if (presetKey === '0_10') {
            data.min = 0; data.max = 10; data.step = 1; data.subdivisions = 2;
        } else if (presetKey === '0_100') {
            data.min = 0; data.max = 100; data.step = 10; data.subdivisions = 2;
        } else if (presetKey === '0_1_dec') {
            data.min = 0; data.max = 1; data.step = 0.2; data.subdivisions = 2;
        } else if (presetKey === 'neg10_10') {
            data.min = -10; data.max = 10; data.step = 2; data.subdivisions = 2;
        }
        this.autoSave();
        this.calculatePagination();
    },

    setDreisatzVisibilityPreset(data: any, mode: 'all' | 'student_blank') {
        if (!data || !data.printVisibility) return;
        if (mode === 'all') {
            data.printVisibility.data = [[true, true], [true, true], [true, true]];
        } else {
            data.printVisibility.data = [[true, true], [false, false], [true, false]];
        }
        this.autoSave();
    },

    // ───────── Paket 3: Geometrie-Module (Inspector) ─────────

    addGeometryElementInline(data: any, type: string) {
        if (!data) return;
        this.addGeometryElement(null, type, data);
        this.autoSave();
        this.calculatePagination();
    },

    removeGeometryElementInline(data: any, id: number) {
        if (!data) return;
        this.removeGeometryElement(null, id, data);
        this.autoSave();
        this.calculatePagination();
    },

    removeGeometryVertexInline(el: any, idx: number, minVertices = 3) {
        if (!el || !Array.isArray(el.vertices) || el.vertices.length <= minVertices) return;
        el.vertices.splice(idx, 1);
        this.autoSave();
    },

    addGeometryVertexInline(el: any, is3d = false) {
        if (!el || !Array.isArray(el.vertices)) return;
        el.vertices.push(is3d ? { x: 0, y: 0, z: 0 } : { x: 0, y: 0 });
        this.autoSave();
    },

    applyGeometryViewPreset(data: any, key: string) {
        if (!data || !data.settings || !key) return;
        const presets: Record<string, number[]> = {
            vier: [-5, 5, -5, 5],
            erster: [-1, 10, -1, 10],
            weit: [-10, 10, -10, 10],
            klein: [-1, 6, -1, 6]
        };
        const p = presets[key];
        if (!p) return;
        data.settings.xMin = p[0]; data.settings.xMax = p[1];
        data.settings.yMin = p[2]; data.settings.yMax = p[3];
        this.autoSave();
    },

    addGeometry3dElementInline(data: any, type: string) {
        if (!data) return;
        if (type === 'cube') {
            this.addGeometry3dElement(null, 'cuboid3d', data);
            const el = data.elements[data.elements.length - 1];
            if (el) { el.w = 4; el.d = 4; el.h = 4; }
        } else {
            this.addGeometry3dElement(null, type, data);
        }
        this.autoSave();
        this.calculatePagination();
    },

    removeGeometry3dElementInline(data: any, id: number) {
        if (!data) return;
        this.removeGeometry3dElement(null, id, data);
        this.autoSave();
        this.calculatePagination();
    },

    applyGeometry3dViewPreset(data: any, key: string) {
        if (!data || !data.settings || !key) return;
        const presets: Record<string, [number, number]> = {
            standard: [0.4, 0.2],
            oben: [0.4, 0.9],
            frontal: [0, 0.1],
            seitlich: [1.2, 0.25]
        };
        const p = presets[key];
        if (!p) return;
        data.settings.az = p[0];
        data.settings.el = p[1];
        this.autoSave();
    },

    addKoordPoint(data: any) {
        if (!data) return;
        if (!Array.isArray(data.points)) data.points = [];
        const nextLabel = String.fromCharCode(65 + (data.points.length % 26));
        data.points.push({ label: nextLabel, x: 0, y: 0 });
        this.autoSave();
        this.calculatePagination();
    },

    removeKoordPoint(data: any, idx: number) {
        if (!data || !Array.isArray(data.points)) return;
        data.points.splice(idx, 1);
        this.autoSave();
        this.calculatePagination();
    },

    moveKoordPoint(data: any, idx: number, direction: 'up' | 'down') {
        if (!data || !Array.isArray(data.points)) return;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= data.points.length) return;
        const arr = [...data.points];
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        data.points = arr;
        this.autoSave();
    },

    clearKoordPoints(data: any) {
        if (!data) return;
        data.points = [];
        this.autoSave();
        this.calculatePagination();
    },

    autoFitKoordBounds(data: any) {
        if (!data || !Array.isArray(data.points) || data.points.length === 0) return;
        const xs = data.points.map((p: any) => parseFloat(p.x)).filter((v: number) => !isNaN(v));
        const ys = data.points.map((p: any) => parseFloat(p.y)).filter((v: number) => !isNaN(v));
        if (xs.length === 0 || ys.length === 0) return;
        data.xMin = Math.min(0, Math.floor(Math.min(...xs)) - 1);
        data.xMax = Math.ceil(Math.max(...xs)) + 1;
        data.yMin = Math.min(0, Math.floor(Math.min(...ys)) - 1);
        data.yMax = Math.ceil(Math.max(...ys)) + 1;
        this.autoSave();
    },

    applyKoordPreset(data: any, key: string) {
        if (!data || !key) return;
        const shapes: Record<string, { points: Array<[string, number, number]>, connect: boolean, close: boolean }> = {
            rechteck: { points: [['A', 1, 1], ['B', 5, 1], ['C', 5, 4], ['D', 1, 4]], connect: true, close: true },
            dreieck: { points: [['A', 1, 1], ['B', 5, 1], ['C', 3, 4]], connect: true, close: true },
            parallelogramm: { points: [['A', 1, 1], ['B', 5, 1], ['C', 6, 4], ['D', 2, 4]], connect: true, close: true },
            drachen: { points: [['A', 1, 3], ['B', 3, 1], ['C', 6, 3], ['D', 3, 5]], connect: true, close: true },
            punkte: { points: [['A', 1, 2], ['B', 3, 4], ['C', 5, 1]], connect: false, close: false }
        };
        const s = shapes[key];
        if (!s) return;
        data.points = s.points.map(([label, x, y]) => ({ label, x, y }));
        data.connectPoints = s.connect;
        data.closeShape = s.close;
        this.autoFitKoordBounds(data);
        this.autoSave();
        this.calculatePagination();
    },

    applyStrahlensatzLabelPreset(data: any, key: string) {
        if (!data || !key) return;
        if (key === 'buchstaben') {
            data.labelSA = 'a'; data.labelAB = 'b'; data.labelSAprime = 'c';
            data.labelAprimeBprime = 'd'; data.labelAAprime = 'x'; data.labelBBprime = 'y';
        } else if (key === 'gesucht') {
            // Ein Leerzeichen blendet die jeweilige Beschriftung aus
            data.labelSA = '4 cm'; data.labelAB = '6 cm'; data.labelSAprime = '3 cm';
            data.labelAprimeBprime = 'x'; data.labelAAprime = ' '; data.labelBBprime = ' ';
        } else if (key === 'parallelen') {
            data.labelSA = '3 cm'; data.labelAB = '2 cm'; data.labelSAprime = ' ';
            data.labelAprimeBprime = ' '; data.labelAAprime = '4 cm'; data.labelBBprime = 'x';
        }
        this.autoSave();
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
        this.autoSave();
        this.calculatePagination();
    },

    adjustKurveDimension(data: any, dim: 'width' | 'height', delta: number) {
        if (!data || !data.settings) return;
        const current = parseFloat(data.settings[dim]) || 10;
        const minVal = dim === 'width' ? 5 : 3;
        const maxVal = dim === 'width' ? 17 : 15;
        data.settings[dim] = Math.max(minVal, Math.min(maxVal, Math.round((current + delta) * 2) / 2));
        this.autoSave();
        this.calculatePagination();
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
        this.autoSave();
        this.calculatePagination();
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
                    this.updateRotationskoerperCode(data, this.getActiveModuleHolder());
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
                this.autoSave();
            }
        } catch (err) {
            console.warn('Auto-Fit fehlgeschlagen:', err);
        }
    },

    getSelectedTask(): any {
        if (!this.tasks || this.tasks.length === 0) return null;
        const found = this.tasks.find((t: any) => t.id === this.selectedTaskId);
        return found || this.tasks[0];
    },

    getSelectedTaskIndex(): number {
        const task = this.getSelectedTask();
        if (!task) return -1;
        return this.tasks.findIndex((t: any) => t.id === task.id);
    },

    getSelectedSubtask(): any {
        const task = this.getSelectedTask();
        if (!task || task.type === 'section' || !Array.isArray(task.subtasks) || task.subtasks.length === 0) return null;
        const found = task.subtasks.find((s: any) => s.id === this.selectedSubtaskId);
        return found || task.subtasks[0];
    },

    getSelectedSubtaskIndex(): number {
        const task = this.getSelectedTask();
        const sub = this.getSelectedSubtask();
        if (!task || !sub || !Array.isArray(task.subtasks)) return -1;
        return task.subtasks.findIndex((s: any) => s.id === sub.id);
    },

    getSelectedSubSubtask(): any {
        const sub = this.getSelectedSubtask();
        if (!sub || !Array.isArray(sub.subSubtasks) || sub.subSubtasks.length === 0) return null;
        const found = sub.subSubtasks.find((ss: any) => ss.id === this.selectedSubSubtaskId);
        return found || null;
    },

    getSelectedSubSubtaskIndex(): number {
        const sub = this.getSelectedSubtask();
        const subSub = this.getSelectedSubSubtask();
        if (!sub || !subSub || !Array.isArray(sub.subSubtasks)) return -1;
        return sub.subSubtasks.findIndex((ss: any) => ss.id === subSub.id);
    },

    getActiveSpaceTarget(): any {
        if (this.selectedArea === 'subsub') {
            const ss = this.getSelectedSubSubtask();
            if (ss) return ss;
        }
        return this.getSelectedSubtask();
    },

    getActiveModuleHolder(): any {
        const task = this.getSelectedTask();
        if (!task || task.type === 'section') return null;
        if (this.selectedArea === 'context') return task;
        if (this.selectedArea === 'subsub') {
            const ss = this.getSelectedSubSubtask();
            if (ss) return ss;
        }
        return this.getSelectedSubtask() || task;
    },

    adjustPoints(target: any, delta: number) {
        if (!target) return;
        const current = parseFloat(target.points) || 0;
        target.points = Math.max(0, Math.round((current + delta) * 10) / 10);
        this.autoSave();
        this.calculatePagination();
    },

    adjustSpaceHeight(target: any, delta: number) {
        if (!target) return;
        const current = parseFloat(target.spaceHeight) || 4;
        target.spaceHeight = Math.max(1, Math.min(24, Math.round((current + delta) * 2) / 2));
        this.autoSave();
        this.calculatePagination();
    },

    getOutlineSnippet(text: string, fallback: string): string {
        if (!text || !text.trim()) return fallback;
        const clean = text.replace(/\$\$[\s\S]*?\$\$/g, ' [Formel] ')
                          .replace(/\$[^\$]+\$/g, ' [Formel] ')
                          .replace(/\s+/g, ' ')
                          .trim();
        if (!clean) return fallback;
        return clean.length > 26 ? clean.substring(0, 26) + '…' : clean;
    },

    /**
     * Triggers the Visual Formula Editor for the currently active textarea or selected task element
     */
    triggerFormulaForActive() {
        const task = this.getSelectedTask();
        if (!task || task.type === 'section') return;

        if (this.activeInlineEditId && this.activeTextareaTarget && this.activeTextareaId) {
            this.openVisualEditor(this.activeTextareaTarget, this.activeTextareaId, this.activeTextareaField);
            return;
        }

        if (this.selectedArea === 'context') {
            this.startInlineEdit('context-' + task.id, 'inline-context-' + task.id, task, 'context');
            (this as any).$nextTick(() => {
                this.openVisualEditor(task, 'inline-context-' + task.id, 'context');
            });
        } else if (this.selectedArea === 'subsub' && this.getSelectedSubSubtask()) {
            const ss = this.getSelectedSubSubtask();
            this.startInlineEdit('subsub-' + ss.id, 'inline-subsub-' + ss.id, ss, 'text');
            (this as any).$nextTick(() => {
                this.openVisualEditor(ss, 'inline-subsub-' + ss.id, 'text');
            });
        } else {
            const sub = this.getSelectedSubtask();
            if (!sub) return;
            this.startInlineEdit('subtask-' + sub.id, 'inline-subtask-' + sub.id, sub, 'text');
            (this as any).$nextTick(() => {
                this.openVisualEditor(sub, 'inline-subtask-' + sub.id, 'text');
            });
        }
    },

    /**
     * Triggers Cloze (Lückentext) wrapping for the currently active textarea or selected task element
     */
    triggerClozeForActive() {
        const task = this.getSelectedTask();
        if (!task || task.type === 'section') return;

        if (this.activeInlineEditId && this.activeTextareaTarget && this.activeTextareaId) {
            this.wrapClozeText(this.activeTextareaTarget, this.activeTextareaId, this.activeTextareaField);
            return;
        }

        if (this.selectedArea === 'context') {
            this.startInlineEdit('context-' + task.id, 'inline-context-' + task.id, task, 'context');
            (this as any).$nextTick(() => {
                this.wrapClozeText(task, 'inline-context-' + task.id, 'context');
            });
        } else if (this.selectedArea === 'subsub' && this.getSelectedSubSubtask()) {
            const ss = this.getSelectedSubSubtask();
            this.startInlineEdit('subsub-' + ss.id, 'inline-subsub-' + ss.id, ss, 'text');
            (this as any).$nextTick(() => {
                this.wrapClozeText(ss, 'inline-subsub-' + ss.id, 'text');
            });
        } else {
            const sub = this.getSelectedSubtask();
            if (!sub) return;
            this.startInlineEdit('subtask-' + sub.id, 'inline-subtask-' + sub.id, sub, 'text');
            (this as any).$nextTick(() => {
                this.wrapClozeText(sub, 'inline-subtask-' + sub.id, 'text');
            });
        }
    },

    triggerInlineCloze() {
        this.triggerClozeForActive();
    },

    /**
     * Starts inline editing on the A4 canvas and focuses the input/textarea
     */
    startInlineEdit(editId: string, elementId?: string, targetObj?: any, fieldName = 'text', cursorAtStart = false, clickEvent?: MouseEvent) {
        let placeAtStart = cursorAtStart;
        if (!placeAtStart && clickEvent && clickEvent.currentTarget instanceof HTMLElement) {
            const rect = clickEvent.currentTarget.getBoundingClientRect();
            const relX = clickEvent.clientX - rect.left;
            const relY = clickEvent.clientY - rect.top;
            if (relX < 48 && relY < 28) {
                placeAtStart = true;
            }
        }

        this.activeInlineEditId = editId;
        if (targetObj && elementId) {
            this.activeTextareaTarget = targetObj;
            this.activeTextareaId = elementId;
            this.activeTextareaField = fieldName;
        }
        (this as any).$nextTick(() => {
            if (elementId) {
                const el = document.getElementById(elementId) as HTMLTextAreaElement | HTMLInputElement | null;
                if (el) {
                    el.focus();
                    if (el.tagName === 'TEXTAREA') {
                        this.autoResizeTextarea(el as HTMLTextAreaElement);
                        const pos = placeAtStart ? 0 : el.value.length;
                        el.setSelectionRange(pos, pos);
                    } else if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'number') {
                        el.select();
                    }
                }
            }
        });
    },

    /**
     * Behandelt Enter und Backspace am Textanfang (Position 0) eines Inline-Textfeldes:
     * - Enter an Position 0: Schiebt das aktuelle Element um 1 Leerzeile nach unten
     * - Backspace an Position 0: Löscht 1 vorhandene Leerzeile darüber
     */
    handleInlineTextareaKeydown(event: KeyboardEvent, target: any, type: 'task' | 'subtask' | 'subsubtask', parentTask?: any, subIndex?: number) {
        const el = event.target as HTMLTextAreaElement | null;
        if (!el || el.tagName !== 'TEXTAREA') return;

        // Nur eingreifen, wenn der Cursor ohne Textmarkierung ganz am Anfang (Position 0) steht
        if (el.selectionStart !== 0 || el.selectionEnd !== 0) return;

        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (type === 'task') {
                this.toggleTaskPageBreak(target);
            } else if (type === 'subtask') {
                this.toggleSubtaskPageBreak(target);
            } else {
                this.toggleSubSubtaskPageBreak(target);
            }
            return;
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (type === 'task') {
                this.increaseTaskSpacing(target);
            } else if (type === 'subtask') {
                this.increaseSubtaskSpacing(target);
            } else {
                this.increaseSubSubtaskSpacing(target);
            }
            return;
        }

        if (event.key === 'Backspace') {
            if (type === 'task' && (target.spacingTop || 0) > 0) {
                event.preventDefault();
                this.decreaseTaskSpacing(target);
            } else if (type === 'subtask') {
                if ((target.spacingTop || 0) > 0) {
                    event.preventDefault();
                    this.decreaseSubtaskSpacing(target);
                } else if (subIndex === 0 && parentTask && !this.hasContextContent(parentTask) && (parentTask.spacingTop || 0) > 0) {
                    event.preventDefault();
                    this.decreaseTaskSpacing(parentTask);
                }
            } else if (type === 'subsubtask' && (target.spacingTop || 0) > 0) {
                event.preventDefault();
                this.decreaseSubSubtaskSpacing(target);
            }
        }
    },

    /**
     * Stops inline editing and triggers autosave + pagination
     */
    stopInlineEdit(editId?: string) {
        if (!editId || this.activeInlineEditId === editId) {
            this.activeInlineEditId = null;
            this.autoSave();
            this.calculatePagination();
        }
    },

    /**
     * Handles blur on an inline editor without closing if the Visual Formula Editor modal is open
     */
    handleInlineBlur(editId: string) {
        setTimeout(() => {
            if (this.isVisualEditorOpen) return;
            if (this.activeInlineEditId === editId) {
                this.stopInlineEdit(editId);
            }
        }, 120);
    },

    /**
     * Automatically adjusts the height of an inline textarea to fit its content
     */
    autoResizeTextarea(el: HTMLTextAreaElement | null) {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.max(34, el.scrollHeight) + 'px';
    },

    /**
     * Creates a new task directly on the A4 canvas and focuses its Sachkontext
     */
    addTaskInline(insertAfterIndex?: number) {
        const newTask = createDefaultTask(this.generateTreeNodes.bind(this));
        if (typeof insertAfterIndex === 'number' && insertAfterIndex >= 0 && insertAfterIndex < this.tasks.length) {
            const copy = [...this.tasks];
            copy.splice(insertAfterIndex + 1, 0, newTask);
            this.tasks = copy;
        } else {
            this.tasks = [...this.tasks, newTask];
        }
        this.selectCanvasItem(newTask, 'context');
        this.autoSave();
        this.calculatePagination();
        this.startInlineEdit('context-' + newTask.id, 'inline-context-' + newTask.id, newTask, 'context');
        (this as any).$nextTick(() => {
            const wrapper = document.querySelector(`[data-task-id="${newTask.id}"]`);
            if (wrapper) {
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    },

    /**
     * Creates a new section divider directly on the A4 canvas and focuses its title
     */
    addSectionInline(insertAfterIndex?: number) {
        const sectionObj = ensureCompatibilityGetters({
            id: Date.now(),
            type: 'section',
            title: 'Teil A: Hilfsmittelfreier Teil',
            subtitle: '',
            subtasks: []
        });
        if (typeof insertAfterIndex === 'number' && insertAfterIndex >= 0 && insertAfterIndex < this.tasks.length) {
            const copy = [...this.tasks];
            copy.splice(insertAfterIndex + 1, 0, sectionObj);
            this.tasks = copy;
        } else {
            this.tasks = [...this.tasks, sectionObj];
        }
        this.selectCanvasItem(sectionObj, 'section');
        this.autoSave();
        this.calculatePagination();
        this.startInlineEdit('section-' + sectionObj.id, 'inline-section-title-' + sectionObj.id);
    },

    /**
     * Adds a subtask directly on the A4 canvas and focuses its text
     */
    addSubtaskInline(task: any, insertAfterIndex?: number) {
        if (!task || !Array.isArray(task.subtasks)) return;
        const newSub = createDefaultSubtask(this.generateTreeNodes.bind(this));
        if (typeof insertAfterIndex === 'number' && insertAfterIndex >= 0 && insertAfterIndex < task.subtasks.length) {
            task.subtasks.splice(insertAfterIndex + 1, 0, newSub);
        } else {
            task.subtasks.push(newSub);
        }
        this.selectCanvasItem(task, 'subtask', newSub);
        this.autoSave();
        this.calculatePagination();
        this.startInlineEdit('subtask-' + newSub.id, 'inline-subtask-' + newSub.id, newSub, 'text');
    },

    /**
     * Removes a subtask directly on the A4 canvas
     */
    removeSubtaskInline(task: any, subtaskId: number) {
        if (!task || !Array.isArray(task.subtasks)) return;
        if (task.subtasks.length <= 1) {
            // Reset single subtask instead of leaving task without subtasks array item
            const sub = task.subtasks[0];
            if (sub) {
                sub.text = '';
                sub.points = 0;
                sub.spaceType = 'none';
                sub.subSubtasks = [];
            }
        } else {
            task.subtasks = task.subtasks.filter((s: any) => s.id !== subtaskId);
            if (this.selectedSubtaskId === subtaskId) {
                this.selectedSubtaskId = task.subtasks[0]?.id || null;
                this.selectedArea = 'subtask';
            }
        }
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Adds a sub-subtask (1, 2, 3) directly on the A4 canvas and focuses its text
     */
    addSubSubtaskInline(subtask: any, task?: any, insertAfterIndex?: number) {
        if (!subtask) return;
        if (!Array.isArray(subtask.subSubtasks)) subtask.subSubtasks = [];
        const newSubSub = createDefaultSubSubtask(this.generateTreeNodes.bind(this));
        if (typeof insertAfterIndex === 'number' && insertAfterIndex >= 0 && insertAfterIndex < subtask.subSubtasks.length) {
            subtask.subSubtasks.splice(insertAfterIndex + 1, 0, newSubSub);
        } else {
            subtask.subSubtasks.push(newSubSub);
        }
        if (task) {
            this.selectCanvasItem(task, 'subsub', subtask, newSubSub);
        } else {
            this.selectedSubtaskId = subtask.id;
            this.selectedSubSubtaskId = newSubSub.id;
            this.selectedArea = 'subsub';
        }
        this.autoSave();
        this.calculatePagination();
        this.startInlineEdit('subsub-' + newSubSub.id, 'inline-subsub-' + newSubSub.id, newSubSub, 'text');
    },

    /**
     * Removes a sub-subtask directly on the A4 canvas
     */
    removeSubSubtaskInline(subtask: any, subSubId: number) {
        if (!subtask || !Array.isArray(subtask.subSubtasks)) return;
        subtask.subSubtasks = subtask.subSubtasks.filter((ss: any) => ss.id !== subSubId);
        if (this.selectedSubSubtaskId === subSubId) {
            this.selectedSubSubtaskId = subtask.subSubtasks[0]?.id || null;
            if (!this.selectedSubSubtaskId) this.selectedArea = 'subtask';
        }
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Toggles or sets the answer space type (none, karo, linien, millimeter) directly on the A4 canvas
     */
    setSubtaskSpaceType(target: any, type: string) {
        if (!target) return;
        if (target.spaceType === type && type !== 'none') {
            target.spaceType = 'none';
        } else {
            target.spaceType = type;
            if (!target.spaceHeight || target.spaceHeight < 1) {
                target.spaceHeight = 4;
            }
        }
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Drag-to-resize handler for answer spaces (Karo / Linien / Millimeter) directly on the A4 sheet
     */
    startSpaceResize(event: MouseEvent, target: any) {
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();

        const startY = event.clientY;
        const startHeightCm = parseFloat(target.spaceHeight) || 5;
        const handleEl = event.currentTarget as HTMLElement;
        const spaceEl = handleEl?.parentElement;
        const pxPerCm = (spaceEl && spaceEl.offsetHeight > 10 && startHeightCm > 0)
            ? (spaceEl.offsetHeight / startHeightCm)
            : 37.795;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaPx = moveEvent.clientY - startY;
            const deltaCm = deltaPx / pxPerCm;
            const rawCm = startHeightCm + deltaCm;
            // Snap to 0.5cm steps (1 Karo-Kästchen = 0.5cm)
            const snappedCm = Math.max(1, Math.min(24, Math.round(rawCm * 2) / 2));
            if (target.spaceHeight !== snappedCm) {
                target.spaceHeight = snappedCm;
                this.calculatePagination();
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            this.autoSave();
            this.calculatePagination();
        };

        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    },

    formatSubtaskText(text: string) {
        if (!text) return '';

        // 1. Zeilenumbrüche beibehalten
        let formatted = text.replace(/\n/g, '<br>');

        // 2. Block-Formeln ($$ ... $$)
        formatted = formatted.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
            try {
                return katex.renderToString(math, { throwOnError: false, displayMode: true });
            } catch (e) {
                console.error("KaTeX Fehler:", e);
                return match;
            }
        });

        // 3. Inline-Formeln ($ ... $)
        formatted = formatted.replace(/\$([^\$]+?)\$/g, (match, math) => {
            try {
                return katex.renderToString(math, { throwOnError: false, displayMode: false });
            } catch (e) {
                console.error("KaTeX Fehler:", e);
                return match;
            }
        });

        // 4. Lückentext ({{Text}})
        formatted = formatted.replace(/\{\{(.+?)\}\}/g, '<span class="cloze-word">$1</span>');

        return formatted;
    },

    /**
     * Renders a short string with inline KaTeX (no block mode, no cloze)
     * Used for Vierfeldertafel labels and cell values.
     * @param {string} text
     * @returns {string}
     */
    renderMathInline(text: any) {
        if (!text && text !== 0) return '';
        const str = String(text);
        // Render inline $...$ formulas only
        return str.replace(/\$([^$]+?)\$/g, (match, math) => {
            try {
                return katex.renderToString(math, { throwOnError: false, displayMode: false });
            } catch (e) {
                return match;
            }
        });
    },

    generateLGS(lgs: any) {
        if (!lgs) return;
        const dim = lgs.dimension || 2;
        const targetSols = (lgs.targetSolutions || []).map((s: string) => {
            const parsed = parseInt(s, 10);
            return isNaN(parsed) ? 1 : parsed;
        });
        while (targetSols.length < dim) targetSols.push(1);
        
        // Save target solutions
        lgs.targetSolutions = targetSols.map(n => n.toString());
        
        // Generate coefficients
        lgs.generatedCoefficients = generateLgsCoefficients(dim, targetSols);
        this.autoSave();
    },

    onLgsDimensionChange(lgs: any) {
        if (!lgs) return;
        const dim = lgs.dimension;
        if (dim === 2) {
            lgs.variablesRaw = 'x, y';
            lgs.manualCoefficients = [
                ['', '', ''],
                ['', '', '']
            ];
            lgs.targetSolutions = ['3', '-2'];
            lgs.generatedCoefficients = [
                [0, 0, 0],
                [0, 0, 0]
            ];
        } else {
            lgs.variablesRaw = 'x, y, z';
            lgs.manualCoefficients = [
                ['', '', '', ''],
                ['', '', '', ''],
                ['', '', '', '']
            ];
            lgs.targetSolutions = ['3', '-2', '1'];
            lgs.generatedCoefficients = [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ];
        }
        this.generateLGS(lgs);
    },

    renderLgs(lgs: any): string {
        if (!lgs) return '';
        try {
            const dim = lgs.dimension || 2;
            const mode = lgs.mode || 'generate';
            
            // Parse variable names
            const rawVars = (lgs.variablesRaw || '')
                .split(',')
                .map((v: string) => v.trim())
                .filter((v: string) => v.length > 0);
                
            const vars: string[] = [];
            for (let i = 0; i < dim; i++) {
                if (i < rawVars.length) {
                    vars.push(rawVars[i]);
                } else {
                    vars.push(['x', 'y', 'z'][i]);
                }
            }

            // Get coefficients: number[][]
            let coeffs: number[][] = [];
            if (mode === 'manual') {
                const rows = lgs.manualCoefficients || [];
                for (let i = 0; i < dim; i++) {
                    const rowCoeffs: number[] = [];
                    const row = rows[i] || [];
                    const colsCount = dim + 1;
                    for (let j = 0; j < colsCount; j++) {
                        const parsed = parseFloat(row[j]);
                        rowCoeffs.push(isNaN(parsed) ? 0 : parsed);
                    }
                    coeffs.push(rowCoeffs);
                }
            } else {
                coeffs = lgs.generatedCoefficients || [];
                // If not generated yet or size mismatch, generate them on the fly
                if (!coeffs || coeffs.length !== dim || coeffs[0]?.length !== dim + 1) {
                    const targetSols = (lgs.targetSolutions || []).map((s: string) => {
                        const parsed = parseInt(s, 10);
                        return isNaN(parsed) ? 1 : parsed;
                    });
                    while (targetSols.length < dim) targetSols.push(1);
                    coeffs = generateLgsCoefficients(dim, targetSols);
                    lgs.generatedCoefficients = coeffs;
                }
            }

            // Format LaTeX equations
            const romanNumerals = ['I', 'II', 'III'];
            const latexRows: string[] = [];

            for (let i = 0; i < dim; i++) {
                const row = coeffs[i] || [];
                const parts: string[] = [];
                let isFirst = true;

                // Format variables term-by-term
                for (let j = 0; j < dim; j++) {
                    const c = row[j] ?? 0;
                    if (c !== 0) {
                        const varName = vars[j];
                        let term = '';
                        
                        if (c < 0) {
                            term = isFirst ? `-${Math.abs(c) === 1 ? '' : Math.abs(c)}${varName}` : ` - ${Math.abs(c) === 1 ? '' : Math.abs(c)}${varName}`;
                        } else {
                            term = isFirst ? `${c === 1 ? '' : c}${varName}` : ` + ${c === 1 ? '' : c}${varName}`;
                        }
                        parts.push(term);
                        isFirst = false;
                    }
                }

                // If all variable coefficients are 0, put '0'
                const leftSide = parts.length > 0 ? parts.join('') : '0';
                const rightSide = row[dim] ?? 0;
                
                latexRows.push(`\\text{${romanNumerals[i]}:} & ${leftSide} = ${rightSide}`);
            }

            const latex = `\\begin{array}{ll}\n${latexRows.join(' \\\\\n')}\n\\end{array}`;
            return katex.renderToString(latex, { throwOnError: false, displayMode: true });
        } catch (err) {
            console.error("LGS Rendering Error:", err);
            return '<span class="error">Fehler bei der LGS-Generierung</span>';
        }
    },

    /**
     * Formats a YYYY-MM-DD date string to German DD.MM.YYYY format
     * @param {string} dateStr 
     * @returns {string}
     */
    formatDate(dateStr: string) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    },

    /**
     * Opens the visual formula editor (MathLive)
     */
    openVisualEditor(target: any, textareaId: string, fieldName = 'text') {
        const el = document.getElementById(textareaId) as HTMLTextAreaElement;
        let formulaStart: number | null = null;
        let formulaEnd: number | null = null;
        let existingLatex = '';

        if (el) {
            const text = target[fieldName] || '';
            const pos = el.selectionStart;

            // Search for $...$ formula blocks and check if cursor is inside
            const regex = /\$([^\$]+)\$/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const start = match.index;
                const end = regex.lastIndex;
                if (pos >= start && pos <= end) {
                    formulaStart = start;
                    formulaEnd = end;
                    existingLatex = match[1];
                    break;
                }
            }
        }

        this.mathEditorTarget = { target, textareaId, fieldName, formulaStart, formulaEnd };
        this.isVisualEditorOpen = true;

        // Fill math field with existing LaTeX or empty
        (this as any).$nextTick(() => {
            const mf = document.getElementById('main-math-field') as any;
            if (mf) {
                mf.value = existingLatex;
            }
        });
    },

    /**
     * Closes the visual formula editor
     */
    closeVisualEditor() {
        this.isVisualEditorOpen = false;
        this.mathEditorTarget = null;
    },

    /**
     * Takes LaTeX from MathLive and inserts it into the target textarea
     */
    insertMathFromEditor() {
        if (!this.mathEditorTarget) return;

        const mf = document.getElementById('main-math-field') as any;
        if (!mf) return;

        const latex = mf.value;
        const { target, textareaId, fieldName, formulaStart, formulaEnd } = this.mathEditorTarget;
        const el = document.getElementById(textareaId) as HTMLTextAreaElement;
        const snippet = latex ? `$${latex}$` : '';

        if (el) {
            const text = target[fieldName] || '';
            let newText;
            let newCursorPos;

            if (formulaStart !== null && formulaEnd !== null) {
                // Replace the existing formula at the stored positions
                newText = text.substring(0, formulaStart) + snippet + text.substring(formulaEnd);
                newCursorPos = formulaStart + snippet.length;
            } else {
                // Standard insertion at current cursor selection
                const start = el.selectionStart;
                const end = el.selectionEnd;
                newText = text.substring(0, start) + snippet + text.substring(end);
                newCursorPos = start + snippet.length;
            }

            target[fieldName] = newText;

            this.closeVisualEditor();

            (this as any).$nextTick(() => {
                el.focus();
                this.autoResizeTextarea(el);
                el.setSelectionRange(newCursorPos, newCursorPos);
                this.autoSave();
            });
            return;
        } else if (target && fieldName && snippet) {
            target[fieldName] = (target[fieldName] || '') + (target[fieldName] ? ' ' : '') + snippet;
            this.autoSave();
            this.calculatePagination();
        }

        this.closeVisualEditor();
    },

    /**
     * Autofills y-values based on formula and x-values.
     * Supports both TableData directly and a parent holder with .table.
     */
    autofillTable(targetOrData: any) {
        const tbl = targetOrData?.data !== undefined ? targetOrData : targetOrData?.table;
        if (!tbl) return;
        const formula = tbl.formula;
        if (!formula) return;

        try {
            const win = window as any;
            // 1. Formel vorab prüfen (einmalig kompilieren)
            const node = win.math.parse(formula);
            const code = node.compile();

            // 2. x-Werte verarbeiten und y-Werte berechnen
            tbl.data[1] = tbl.data[0].map((xRaw: any) => {
                // Falls das Feld leer ist, überspringen
                if (xRaw === null || xRaw === undefined || xRaw.toString().trim() === '') return '';

                // Deutsches Komma zu Punkt umwandeln und in echte Zahl konvertieren
                const xVal = this.parseLocalizedNumber(xRaw);

                if (isNaN(xVal)) return '?'; // Fehler-Marker für ungültige x-Eingabe

                // Berechnung durchführen
                const result = code.evaluate({ x: xVal });

                // Ergebnis runden und zurück zu Komma für die Anzeige
                return win.math.format(result, { precision: 14, upperExp: 10, lowerExp: -10 })
                    .toString()
                    .replace('.', ',');
            });
            this.autoSave();
            this.calculatePagination();
        } catch (e: any) {
            console.error("Berechnungsfehler:", e);
            alert("Fehler in der Formel: " + e.message + "\n\nNutzen Sie 'x' als Variable und '.' für Dezimalzahlen.");
        }
    },

    clearTableYValues(targetOrData: any) {
        const tbl = targetOrData?.data !== undefined ? targetOrData : targetOrData?.table;
        if (!tbl || !Array.isArray(tbl.data?.[0])) return;
        tbl.data[1] = tbl.data[0].map(() => '');
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Adds a column to the table
     */
    addColumn(targetOrData: any) {
        const tbl = targetOrData?.data !== undefined ? targetOrData : targetOrData?.table;
        if (!tbl || !Array.isArray(tbl.data)) return;
        tbl.data[0].push('');
        tbl.data[1].push('');
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Removes the last column from the table
     */
    removeColumn(targetOrData: any) {
        const tbl = targetOrData?.data !== undefined ? targetOrData : targetOrData?.table;
        if (!tbl || !Array.isArray(tbl.data?.[0]) || tbl.data[0].length <= 1) return;
        tbl.data[0].pop();
        tbl.data[1].pop();
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Wraps the selected text in a textarea with {{ }} for cloze tests
     */
    wrapClozeText(target: any, textareaId: string, fieldName = 'text') {
        const el = document.getElementById(textareaId) as HTMLTextAreaElement;
        if (!el) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = target[fieldName] || '';
        const selectedText = text.substring(start, end);

        if (!selectedText) {
            alert("Bitte markieren Sie zuerst ein Wort, das zur Lücke werden soll.");
            return;
        }

        const newText = text.substring(0, start) + `{{${selectedText}}}` + text.substring(end);
        target[fieldName] = newText;

        const newCursorPos = start + selectedText.length + 4; // Length of {{ + text + }}

        (this as any).$nextTick(() => {
            el.focus();
            this.autoResizeTextarea(el);
            el.setSelectionRange(newCursorPos, newCursorPos);
            this.autoSave();
        });
    },

    /**
     * Adds an item to the left side of Matching
     */
    addMatchingLeftItem(target: any) {
        const list = target.leftItems ? target.leftItems : (target.matching ? target.matching.leftItems : null);
        if (list) list.push({ id: Date.now(), text: '' });
    },

    /**
     * Removes an item from the left side of Matching
     */
    removeMatchingLeftItem(target: any, itemId: number) {
        const container = target.leftItems ? target : (target.matching ? target.matching : null);
        if (container && container.leftItems && container.leftItems.length > 1) {
            container.leftItems = container.leftItems.filter((i: any) => i.id !== itemId);
        }
    },

    /**
     * Adds an item to the right side of Matching
     */
    addMatchingRightItem(target: any) {
        const list = target.rightItems ? target.rightItems : (target.matching ? target.matching.rightItems : null);
        if (list) list.push({ id: Date.now(), text: '' });
    },

    /**
     * Removes an item from the right side of Matching
     */
    removeMatchingRightItem(target: any, itemId: number) {
        const container = target.rightItems ? target : (target.matching ? target.matching : null);
        if (container && container.rightItems && container.rightItems.length > 1) {
            container.rightItems = container.rightItems.filter((i: any) => i.id !== itemId);
        }
    },

    /**
     * Adds an option to MCQ
     */
    addMCQOption(target: any) {
        const list = target.options ? target.options : (target.mcq ? target.mcq.options : null);
        if (list) list.push({ id: Date.now(), text: '' });
    },

    /**
     * Removes an option from MCQ
     */
    removeMCQOption(target: any, optionId: number) {
        const container = target.options ? target : (target.mcq ? target.mcq : null);
        if (container && container.options && container.options.length > 1) {
            container.options = container.options.filter((opt: any) => opt.id !== optionId);
        }
    },

    applyMCQPreset(d: any, preset: string) {
        if (!d) return;
        const now = Date.now();
        if (preset === 'ja_nein') {
            d.options = [{ id: now, text: 'Ja' }, { id: now + 1, text: 'Nein' }];
        } else if (preset === 'richtig_falsch') {
            d.options = [{ id: now, text: 'Richtig' }, { id: now + 1, text: 'Falsch' }];
        } else if (preset === 'abcd') {
            d.options = [
                { id: now, text: 'A' },
                { id: now + 1, text: 'B' },
                { id: now + 2, text: 'C' },
                { id: now + 3, text: 'D' }
            ];
        } else if (preset === 'likert') {
            d.options = [
                { id: now, text: 'Trifft voll zu' },
                { id: now + 1, text: 'Trifft eher zu' },
                { id: now + 2, text: 'Trifft eher nicht zu' },
                { id: now + 3, text: 'Trifft gar nicht zu' }
            ];
        }
        this.autoSave();
    },

    applyMatchingPreset(d: any, pairCount: number) {
        if (!d) return;
        const now = Date.now();
        d.leftItems = [];
        d.rightItems = [];
        for (let i = 0; i < pairCount; i++) {
            d.leftItems.push({ id: now + i * 2, text: `Begriff ${i + 1}` });
            d.rightItems.push({ id: now + i * 2 + 1, text: `Bedeutung ${i + 1}` });
        }
        this.autoSave();
    },

    shuffleMatchingRight(d: any) {
        if (!d || !Array.isArray(d.rightItems) || d.rightItems.length < 2) return;
        const arr = [...d.rightItems];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        d.rightItems = arr;
        this.autoSave();
    },

    setImageGrid(d: any, rows: number, cols: number) {
        if (!d) return;
        d.rows = rows;
        d.cols = cols;
        this.changeGridLayout(d);
        this.autoSave();
        this.calculatePagination();
    },

    applyZusatzPreset(d: any, preset: string) {
        if (!d) return;
        if (preset === 'kontrolle') {
            d.text = '[Zur Kontrolle: x = 5]';
        } else if (preset === 'hinweis') {
            d.text = '(Hinweis: Runde alle Zwischenergebnisse auf zwei Nachkommastellen.)';
        } else if (preset === 'ergebnis') {
            d.text = '[Ergebnis: A = 42 cm²]';
        } else if (preset === 'rechenweg') {
            d.text = '(Der Rechenweg muss nachvollziehbar dokumentiert werden.)';
        }
        this.autoSave();
        this.calculatePagination();
    },

    getActiveClozeList(): string[] {
        const holder = this.getActiveModuleHolder();
        if (!holder) return [];
        const text = holder.context !== undefined ? (holder.context || '') : (holder.text || '');
        const matches = text.match(/\{\{([^}]+)\}\}/g);
        if (!matches) return [];
        return Array.from(new Set(matches.map((m: string) => m.replace(/^\{\{|\}\}$/g, ''))));
    },

    removeClozeWord(word: string) {
        const holder = this.getActiveModuleHolder();
        if (!holder) return;
        const field = holder.context !== undefined ? 'context' : 'text';
        if (holder[field]) {
            holder[field] = holder[field].replaceAll(`{{${word}}}`, word);
            this.autoSave();
            this.calculatePagination();
        }
    },

    /**
     * Updates the image grid layout.
     * target kann ein module.data (image) oder ein Objekt mit .image-Feld sein.
     */
    changeGridLayout(target: any) {
        // Neue Architektur: target IST das module.data (image-Daten direkt)
        const img = target.slots !== undefined ? target : target.image;
        if (!img) return;
        const newSize = (img.rows || 1) * (img.cols || 1);
        const currentSlots = img.slots || [];

        // Adjust slots array
        if (currentSlots.length < newSize) {
            while (currentSlots.length < newSize) currentSlots.push('');
        } else if (currentSlots.length > newSize) {
            img.slots = currentSlots.slice(0, newSize);
        }

        if (img.activeIndex >= newSize) {
            img.activeIndex = 0;
        }
    },

    /**
     * Clears an image from a specific grid slot.
     * target ist direkt das module.data (ImageData).
     */
    clearImageSlot(target: any, index: number) {
        if (target && target.slots) {
            target.slots[index] = '';
        }
    },

    /**
     * Handles image file selection and converts to a compressed Data URL.
     * target ist direkt das module.data (ImageData).
     */
    async handleImageUpload(target: any, event: any) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const compressedDataUrl = await compressImage(file);
            if (!target.slots) target.slots = [''];
            target.slots[target.activeIndex] = compressedDataUrl;
            this.autoSave();
        } catch (err) {
            console.error("Image upload & compression failed:", err);
        }
    },

    /**
     * Catches paste events for screenshots and compresses them.
     * Mit der neuen modules[]-Architektur wird das erste aktive Bild-Modul als Ziel verwendet.
     */
    handleGlobalPaste(event: any) {
        const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
        if (!items) return;

        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.includes('image')) {
                const blob = item.getAsFile();
                if (!blob) continue;

                // 1. Priorität: Aktuell im Inline-Inspector gewähltes Bild-Modul
                const selMod = this.getSelectedModule();
                if (selMod && selMod.type === 'image' && selMod.data) {
                    compressImage(blob).then((compressedDataUrl) => {
                        const img = selMod.data;
                        if (!Array.isArray(img.slots)) img.slots = [''];
                        const idx = typeof img.activeIndex === 'number' ? img.activeIndex : 0;
                        img.slots[idx] = compressedDataUrl;
                        this.saveMessage = "Bild eingefügt (komprimiert)!";
                        setTimeout(() => this.saveMessage = "", 2000);
                        this.autoSave();
                        this.calculatePagination();
                    }).catch(err => {
                        console.error("Paste image compression failed:", err);
                    });
                    return;
                }

                if (!this.isModalOpen || !this.editingTask) return;

                compressImage(blob).then((compressedDataUrl) => {
                    // Finde das erste aktive Bild-Modul
                    let imageData: any = null;

                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.id === 'context-ta') {
                        // Kontext: erstes Bild-Modul der Task-Ebene
                        const imgMod = (this.editingTask.modules || []).find((m: TaskModule) => m.type === 'image');
                        if (imgMod) imageData = imgMod.data;
                    } else if (activeEl && activeEl.id.startsWith('ta-')) {
                        const subtaskId = activeEl.id.replace('ta-', '');
                        const st = this.editingTask.subtasks.find((s: any) => s.id.toString() === subtaskId);
                        if (st) {
                            const imgMod = (st.modules || []).find((m: TaskModule) => m.type === 'image');
                            if (imgMod) imageData = imgMod.data;
                        }
                    }

                    // Fallback: erstes Bild-Modul irgendwo in der Task
                    if (!imageData) {
                        const taskImgMod = (this.editingTask.modules || []).find((m: TaskModule) => m.type === 'image');
                        if (taskImgMod) {
                            imageData = taskImgMod.data;
                        } else {
                            for (const sub of (this.editingTask.subtasks || [])) {
                                const subImgMod = (sub.modules || []).find((m: TaskModule) => m.type === 'image');
                                if (subImgMod) { imageData = subImgMod.data; break; }
                            }
                        }
                    }

                    if (imageData && imageData.slots) {
                        imageData.slots[imageData.activeIndex] = compressedDataUrl;
                        this.saveMessage = "Bild eingefügt (komprimiert)!";
                        setTimeout(() => this.saveMessage = "", 2000);
                        this.autoSave();
                    }
                }).catch(err => {
                    console.error("Paste image compression failed:", err);
                });
            }
        }
    },

    /**
     * Adds an element to the geometry board.
     * target ist der Holder (subtask/task/subSubtask), geometryData ist module.data des geometry-Moduls.
     * Wenn geometryData übergeben wird, wird direkt darauf operiert.
     */
    addGeometryElement(target: any, type: string, geometryData?: any) {
        const geo = geometryData || target.geometry;
        if (!geo || !geo.elements) { if (geo) geo.elements = []; else return; }
        const id = Date.now();
        let el: any = { id, type };

        switch (type) {
            case 'point':
                const existingNames = geo.elements.filter((e: any) => e.type === 'point').map((e: any) => e.name);
                let name = 'A';
                for (let i = 0; i < 26; i++) {
                    const candidate = String.fromCharCode(65 + i);
                    if (!existingNames.includes(candidate)) {
                        name = candidate;
                        break;
                    }
                }
                el = { ...el, name, x: 0, y: 0 };
                break;
            case 'segment':
            case 'line':
                el = { ...el, p1: { x: -2, y: 0 }, p2: { x: 2, y: 0 }, showLabels: false };
                break;
            case 'circle':
                el = { ...el, center: { x: 0, y: 0 }, radius: 3, showCenter: true };
                break;
            case 'vector':
                el = { ...el, p1: { x: -2, y: 0 }, p2: { x: 2, y: 0 }, showLabels: false, name: 'v' };
                break;
            case 'angle':
                el = { ...el, p1: { x: 3, y: 0 }, center: { x: 0, y: 0 }, p2: { x: 0, y: 3 }, isRightAngle: false, showLabel: true };
                break;
            case 'text':
                el = { ...el, x: 0, y: 0, text: 'Beschriftung', fontSize: 16 };
                break;
            case 'sector':
                el = { ...el, center: { x: 0, y: 0 }, p1: { x: 3, y: 0 }, p2: { x: 0, y: 3 }, fillOpacity: 0.3, showEdges: true };
                break;
            case 'polygon':
                el = {
                    ...el,
                    vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 3 }],
                    showVertices: true,
                    showEdges: false
                };
                break;
            case 'function':
                el = { ...el, name: 'f', expr: 'x^2' }; break;
        }
        geo.elements.push(el);
    },

    /**
     * Removes an element from the geometry board.
     * geometryData ist optional – wenn übergeben, wird direkt darauf operiert.
     */
    removeGeometryElement(target: any, id: number, geometryData?: any) {
        const geo = geometryData || target.geometry;
        if (!geo) return;
        geo.elements = geo.elements.filter((el: any) => el.id !== id);
    },

    /**
     * Inserts a geometry code snippet.
     * geometryData ist das module.data des geometry-Moduls.
     */
    insertGeometrySnippet(subtask: any, snippet: string, geometryData?: any) {
        const geo = geometryData || subtask.geometry;
        if (geo) geo.code += "\n" + snippet;
    },

    updateKurveCode(data: any) {
        if (!data) return;
        data.code = generateAnalysisKurveCode(data);
    },

    updateFlaechenCode(data: any) {
        if (!data) return;
        data.code = generateAnalysisFlaechenCode(data);
    },

    updateTangenteCode(data: any) {
        if (!data) return;
        data.code = generateAnalysisTangenteCode(data);
    },

    updateRiemannCode(data: any) {
        if (!data) return;
        data.code = generateAnalysisRiemannCode(data);
    },

    updateSteckbriefCode(data: any) {
        if (!data) return;
        data.code = generateAnalysisSteckbriefCode(data);
    },

    solveSteckbrief(data: any) {
        return solveSteckbrief(data);
    },

    updateAnalysisExtremwertCode(data: any, parent?: any) {
        if (!data) return;
        updateAnalysisExtremwertCode(data, parent);
    },

    updatePuzzleCode(data: any, parent?: any) {
        if (!data) return;
        updatePuzzleCode(data, parent);
    },

    updateRotationskoerperCode(data: any, parent?: any) {
        if (!data) return;
        updateRotationskoerperCode(data, parent);
    },

    /**
     * Renders or updates a JSXGraph board.
     * subtask kann ein subtask/task/subSubtask oder direkt ein geometry-module.data sein.
     * Wenn boardId explizit übergeben wird, wird er direkt genutzt.
     */
    renderBoard(subtask: any, explicitBoardId?: string, geometryData?: any) {
        const boardId = explicitBoardId || ('jxgbox-' + subtask.id);
        const geo = geometryData || subtask.geometry;
        if (!geo) return;
        (this as any).$nextTick(() => {
            init2DBoard(boardId, geo, window);
        });
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
        (this as any).autoSave();
    },

    renderPuzzleGraph(boardId: string, expr: string, settings: any) {
        if (!expr || expr.trim() === '') return;
        (this as any).$nextTick(() => {
            const win = window as any;
            if (win.JXG && win.JXG.boards && win.JXG.boards[boardId]) {
                win.JXG.JSXGraph.freeBoard(win.JXG.boards[boardId]);
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
                    showNavigation: false
                });

                const compiled = win.math.compile(expr);
                board.create('functiongraph', [
                    function (x: number) {
                        try {
                            const val = compiled.evaluate({ x: x });
                            return (typeof val === 'number' && !isNaN(val)) ? val : null;
                        } catch(e) { return null; }
                    }
                ], {
                    strokeWidth: 2.5,
                    strokeColor: '#3b82f6',
                    highlight: false,
                    withLabel: false
                });

                board.update();
                if (!win.JXG.boards) win.JXG.boards = {};
                win.JXG.boards[boardId] = board;
            } catch (err) {
                console.error("Failed to render mini puzzle graph:", expr, err);
            }
        });
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
        const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
        return roman[num] || num.toString();
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
                } catch (e) {
                    return 0;
                }
            };
            
            // Simpson's 1/3 Rule
            const n = 1000; // must be even
            const h = (xEnd - xStart) / n;
            let sum = f(xStart) + f(xEnd);
            for (let i = 1; i < n; i++) {
                const x = xStart + i * h;
                sum += (i % 2 === 0 ? 2 : 4) * f(x);
            }
            const volume = Math.PI * (h / 3) * sum;
            if (isNaN(volume)) return 'Fehler';
            
            // Also express in terms of pi
            const volDivPi = (h / 3) * sum;
            return `${volume.toFixed(3)} (ca. ${volDivPi.toFixed(2)}π) VE`;
        } catch (e) {
            return 'Berechnungsfehler';
        }
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
                ? `Zaunlänge: $L = 2x + 2y = ${L}$m $\\implies x = \\frac{${L} - 2y}{2} = ${L/2} - y$`
                : `Zaunlänge: $L = x + 2y = ${L}$m $\\implies x = ${L} - 2y$`;
                
            const zielfunktionText = isFourSided
                ? `$$\\text{Fläche } A(y) = y \\cdot (${L/2} - y) = ${L/2}y - y^2$$`
                : `$$\\text{Fläche } A(y) = y \\cdot (${L} - 2y) = ${L}y - 2y^2$$`;
                
            const ableitungText = isFourSided
                ? `$$A'(y) = ${L/2} - 2y = 0 \\implies y = ${optimalY.toFixed(2)}\\text{m}$$`
                : `$$A'(y) = ${L} - 4y = 0 \\implies y = ${optimalY.toFixed(2)}\\text{m}$$`;

            return `
                <div class="extremwert-solution">
                    <h4 class="sol-title">Musterlösung: Weidenflächen-Maximierung</h4>
                    <p><strong>1. Haupt- und Nebenbedingung:</strong></p>
                    <ul>
                        <li>Hauptbedingung: $A(x, y) = x \\cdot y$ (Weidefläche soll maximal werden).</li>
                        <li>Nebenbedingung (${nebenbedingungText}).</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    ${zielfunktionText}
                    <p><strong>3. Extremstelle (Ableitung gleich Null setzen):</strong></p>
                    ${ableitungText}
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimale Höhe $y = \\mathbf{${optimalY.toFixed(2)}\\text{ m}}$</li>
                        <li>Optimale Breite $x = \\mathbf{${optimalX.toFixed(2)}\\text{ m}}$</li>
                        <li>Maximale Weidefläche $A_{\\text{max}} = \\mathbf{${maxArea.toFixed(2)}\\text{ m}^2}$</li>
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
            
            const zielfunktionText = `$$\\text{Volumen } V(x) = x \\cdot (W - 2x) \\cdot (H - 2x) = x (${W} - 2x)(${H} - 2x)$$`;
            const formelAusgeschrieben = `$$V(x) = 4x^3 - ${2*(W+H)}x^2 + ${W*H}x$$`;
            const ableitungText = `$$V'(x) = 12x^2 - ${4*(W+H)}x + ${W*H} = 0$$`;

            return `
                <div class="extremwert-solution">
                    <h4 class="sol-title">Musterlösung: Schachtel-Volumen</h4>
                    <p><strong>1. Haupt- und Nebenbedingungen:</strong></p>
                    <ul>
                        <li>Schachteltyp: <strong>Offen (ohne Deckel)</strong></li>
                        <li>Kartonabmessungen: $W = ${W}$cm, $H = ${H}$cm</li>
                        <li>Kartonbreite: $b = ${W} - 2x$</li>
                        <li>Kartonlänge: $l = ${H} - 2x$</li>
                        <li>Schachtelhöhe: $h = x$</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    ${zielfunktionText}
                    ${formelAusgeschrieben}
                    <p><strong>3. Erste Ableitung:</strong></p>
                    ${ableitungText}
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimaler Eckenausschnitt $x = \\mathbf{${optimalX.toFixed(2)}\\text{ cm}}$</li>
                        <li>Abmessungen der Schachtel: $\\mathbf{${baseW.toFixed(2)} \\times ${baseH.toFixed(2)} \\times ${optimalX.toFixed(2)}\\text{ cm}}$</li>
                        <li>Maximales Schachtelvolumen $V_{\\text{max}} = \\mathbf{${optimalV.toFixed(2)}\\text{ cm}^3}$</li>
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
                    <h4 class="sol-title">Musterlösung: Getränkedose (Zylinder)</h4>
                    <p><strong>1. Haupt- und Nebenbedingung:</strong></p>
                    <ul>
                        <li>Hauptbedingung: $V(r, h) = \\pi r^2 h$ (Zylindervolumen maximieren).</li>
                        <li>Nebenbedingung: Oberflächeninhalt $O = 2\\pi r^2 + 2\\pi r h = ${O} \\implies h = \\frac{${O}}{2\\pi r} - r$.</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    $$V(r) = \\pi r^2 \\left(\\frac{${O}}{2\\pi r} - r\\right) = \\frac{${O}}{2}r - \\pi r^3$$
                    <p><strong>3. Extremstelle (Ableitung gleich Null setzen):</strong></p>
                    $$V'(r) = ${O/2} - 3\\pi r^2 = 0 \\implies r = \\sqrt{\\frac{${O}}{6\\pi}} \\approx ${optimalR.toFixed(2)}\\text{ cm}$$
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimaler Dosenradius $r = \\mathbf{${optimalR.toFixed(2)}\\text{ cm}}$</li>
                        <li>Optimale Dosenhöhe $h = 2r \\approx \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$</li>
                        <li>Maximales Dosenvolumen $V_{\\text{max}} = \\mathbf{${maxV.toFixed(2)}\\text{ cm}^3}$ (ca. ${(maxV/1000).toFixed(2)} Liter)</li>
                    </ul>
                </div>
            `;
            
        } else if (scenarioType === 'cylinder_min') {
            const V = isNaN(val1) ? 1000 : val1;
            if (V <= 0) return 'Das Volumen V muss positiv sein.';
            
            const optimalR = Math.pow(V / (2 * Math.PI), 1/3);
            const optimalH = 2 * optimalR;
            const minO = 2 * Math.PI * optimalR * optimalR + 2 * Math.PI * optimalR * optimalH;
            
            return `
                <div class="extremwert-solution">
                    <h4 class="sol-title">Musterlösung: Zylinder (Oberflächenminimierung)</h4>
                    <p><strong>1. Haupt- und Nebenbedingung:</strong></p>
                    <ul>
                        <li>Hauptbedingung: $O(r, h) = 2\\pi r^2 + 2\\pi r h$ (Oberfläche minimieren).</li>
                        <li>Nebenbedingung: Volumen $V = \\pi r^2 h = ${V} \\implies h = \\frac{${V}}{\\pi r^2}$.</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    $$O(r) = 2\\pi r^2 + 2\\pi r \\left(\\frac{${V}}{\\pi r^2}\\right) = 2\\pi r^2 + \\frac{${2*V}}{r}$$
                    <p><strong>3. Extremstelle (Ableitung gleich Null setzen):</strong></p>
                    $$O'(r) = 4\\pi r - \\frac{${2*V}}{r^2} = 0 \\implies 4\\pi r^3 = ${2*V} \\implies r = \\sqrt[3]{\\frac{${V}}{2\\pi}} \\approx ${optimalR.toFixed(2)}\\text{ cm}$$
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimaler Radius $r = \\mathbf{${optimalR.toFixed(2)}\\text{ cm}}$</li>
                        <li>Optimale Höhe $h = 2r \\approx \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$</li>
                        <li>Minimale Oberfläche $O_{\\text{min}} = \\mathbf{${minO.toFixed(2)}\\text{ cm}^2}$</li>
                    </ul>
                </div>
            `;
            
        } else if (scenarioType === 'prism_min') {
            const V = isNaN(val1) ? 1000 : val1;
            if (V <= 0) return 'Das Volumen V muss positiv sein.';
            
            const optimalA = Math.pow(V, 1/3);
            const optimalH = optimalA;
            const minO = 6 * optimalA * optimalA;
            
            return `
                <div class="extremwert-solution">
                    <h4 class="sol-title">Musterlösung: Quadratische Säule (Oberflächenminimierung)</h4>
                    <p><strong>1. Haupt- und Nebenbedingung:</strong></p>
                    <ul>
                        <li>Hauptbedingung: $O(a, h) = 2a^2 + 4ah$ (Oberfläche minimieren).</li>
                        <li>Nebenbedingung: Volumen $V = a^2 h = ${V} \\implies h = \\frac{${V}}{a^2}$.</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    $$O(a) = 2a^2 + 4a \\left(\\frac{${V}}{a^2}\\right) = 2a^2 + \\frac{${4*V}}{a}$$
                    <p><strong>3. Extremstelle (Ableitung gleich Null setzen):</strong></p>
                    $$O'(a) = 4a - \\frac{${4*V}}{a^2} = 0 \\implies 4a^3 = ${4*V} \\implies a = \\sqrt[3]{${V}} \\approx ${optimalA.toFixed(2)}\\text{ cm}$$
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimale Grundseite $a = \\mathbf{${optimalA.toFixed(2)}\\text{ cm}}$</li>
                        <li>Optimale Höhe $h = a \\approx \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$ (Würfelform)</li>
                        <li>Minimale Oberfläche $O_{\\text{min}} = \\mathbf{${minO.toFixed(2)}\\text{ cm}^2}$</li>
                    </ul>
                </div>
            `;
            
        } else if (scenarioType === 'cylinder_in_sphere') {
            const val = isNaN(val1) ? 10 : val1;
            if (val <= 0) return 'Der Kugelradius R muss positiv sein.';
            
            const R = val;
            const optimalH = (2 * R) / Math.sqrt(3);
            const optimalR = R * Math.sqrt(2.0/3.0);
            const maxV = Math.PI * optimalR * optimalR * optimalH;
            
            const nebenbedingungText = `Kugelradius $R = ${R}\\text{ cm}$. Satz des Pythagoras im Querschnitt: $r^2 + \\left(\\frac{h}{2}\\right)^2 = R^2 \\implies r^2 = R^2 - \\frac{h^2}{4} = ${(R*R).toFixed(2)} - \\frac{h^2}{4}$`;

            return `
                <div class="extremwert-solution">
                    <h4 class="sol-title">Musterlösung: Zylinder in Kugel (Volumenmaximierung)</h4>
                    <p><strong>1. Haupt- und Nebenbedingung:</strong></p>
                    <ul>
                        <li>Hauptbedingung: $V(r, h) = \\pi r^2 h$ (Zylindervolumen maximieren).</li>
                        <li>Nebenbedingung: ${nebenbedingungText}.</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    $$V(h) = \\pi \\left(${(R*R).toFixed(2)} - \\frac{h^2}{4}\\right) h = \\pi \\cdot ${(R*R).toFixed(2)} h - \\frac{\\pi}{4} h^3$$
                    <p><strong>3. Extremstelle (Ableitung gleich Null setzen):</strong></p>
                    $$V'(h) = ${(R*R).toFixed(2)}\\pi - \\frac{3\\pi}{4} h^2 = 0 \\implies h^2 = \\frac{4 \\cdot ${(R*R).toFixed(2)}}{3} \\implies h = \\frac{2 \\cdot ${R.toFixed(2)}}{\\sqrt{3}} \\approx \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$$
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimaler Zylinderradius $r = R \\sqrt{\\frac{2}{3}} \\approx \\mathbf{${optimalR.toFixed(2)}\\text{ cm}}$</li>
                        <li>Optimale Zylinderhöhe $h = \\frac{2R}{\\sqrt{3}} \\approx \\mathbf{${optimalH.toFixed(2)}\\text{ cm}}$</li>
                        <li>Maximales Zylindervolumen $V_{\\text{max}} = \\mathbf{${maxV.toFixed(2)}\\text{ cm}^3}$ (ca. ${(maxV/1000).toFixed(2)} Liter)</li>
                    </ul>
                </div>
            `;

        } else if (scenarioType === 'function_rect') {
            const a = isNaN(val1) ? 1 : val1;
            const c = isNaN(val2) ? 9 : val2;
            if (a <= 0 || c <= 0) return 'Die Koeffizienten der Parabel f(x) = -ax^2 + c müssen positiv sein.';
            
            const optimalX = Math.sqrt(c / (3 * a));
            const optimalY = -a * optimalX * optimalX + c;
            const maxA = 2 * optimalX * optimalY;
            
            return `
                <div class="extremwert-solution">
                    <h4 class="sol-title">Musterlösung: Rechteck unter Parabel</h4>
                    <p><strong>1. Haupt- und Nebenbedingung:</strong></p>
                    <ul>
                        <li>Hauptbedingung: $A(x, y) = 2x \\cdot y$ (Symmetrische Breite $2x$ und Höhe $y$).</li>
                        <li>Nebenbedingung: Der Punkt $P(x|y)$ liegt auf der Parabel $f(x) = -${a}x^2 + ${c} \\implies y = f(x)$.</li>
                    </ul>
                    <p><strong>2. Zielfunktion:</strong></p>
                    $$A(x) = 2x \\cdot (-${a}x^2 + ${c}) = -${2*a}x^3 + ${2*c}x$$
                    <p><strong>3. Extremstelle (Ableitung gleich Null setzen):</strong></p>
                    $$A'(x) = -${6*a}x^2 + ${2*c} = 0 \\implies x = \\sqrt{\\frac{${2*c}}{${6*a}}} = \\sqrt{\\frac{${c}}{${3*a}}} \\approx ${optimalX.toFixed(2)}$$
                    <p><strong>4. Optimales Ergebnis:</strong></p>
                    <ul>
                        <li>Optimale halbe Breite $x = \\mathbf{${optimalX.toFixed(2)}}$ (Rechtecksbreite $= \\mathbf{${(2*optimalX).toFixed(2)}}$)</li>
                        <li>Optimale Rechteckshöhe $y = f(x) = \\mathbf{${optimalY.toFixed(2)}}$</li>
                        <li>Maximaler Flächeninhalt $A_{\\text{max}} = \\mathbf{${maxA.toFixed(2)}\\text{ FE}}$</li>
                    </ul>
                </div>
            `;
        }
        
        return 'Wähle einen Szenariotyp aus.';
    },


    /**
     * Adds a 3D geometry element to the target.
     * geo3dData ist optional – wenn übergeben, wird direkt darauf operiert.
     */
    addGeometry3dElement(target: any, type: string, geo3dData?: any) {
        const geo = geo3dData || target.geometry3d;
        if (!geo) return;
        const id = Date.now();
        let el: any = { id, type };
        switch (type) {
            case 'point3d':
                el = { ...el, x: 0, y: 0, z: 0, name: 'A' }; break;
            case 'vector3d':
                el = { ...el, p1: { x: 0, y: 0, z: 0 }, p2: { x: 2, y: 2, z: 2 } }; break;
            case 'line3d':
                el = { ...el, p: { x: 0, y: 0, z: 0 }, v: { x: 1, y: 1, z: 1 } }; break;
            case 'plane3d':
                el = { ...el, a: 1, b: 1, c: 1, d: 0 }; break;
            case 'cuboid3d':
                el = { ...el, p: { x: 0, y: 0, z: 0 }, w: 4, d: 4, h: 4, fillOpacity: 0.1, showVertices: true }; break;
            case 'pyramid3d':
                el = { ...el, center: { x: 0, y: 0, z: 0 }, s: 4, h: 6, fillOpacity: 0.1, showVertices: true }; break;
            case 'polyhedron3d':
                el = { ...el, vertices: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 2, y: 4, z: 0 }, { x: 2, y: 2, z: 4 }], faces: "0,1,2;0,1,3;1,2,3;2,0,3", fillOpacity: 0.1, showVertices: true }; break;
        }
        (geo3dData || target.geometry3d).elements.push(el);
    },

    /**
     * Removes a 3D geometry element.
     */
    removeGeometry3dElement(target: any, id: number, geo3dData?: any) {
        const geo = geo3dData || target.geometry3d;
        if (!geo) return;
        geo.elements = geo.elements.filter((el: any) => el.id !== id);
    },

    /**
     * Renders a 3D JSXGraph board.
     * subtask ist ein subtask/task/subSubtask oder direkt ein geometry3d-module.data.
     */
    renderBoard3d(subtask: any, explicitBoardId?: string, geo3dData?: any) {
        const geo = geo3dData || subtask.geometry3d;
        if (!geo) return;
        const boardId = explicitBoardId || `jxgbox-3d-${subtask.id}`;
        (this as any).$nextTick(() => {
            init3DBoard(boardId, geo, window);
        });
    },

    /**
     * Adds a subtask to the current editing task
     */
    addSubtask() {
        if (!this.editingTask) return;
        this.editingTask.subtasks.push(createDefaultSubtask(this.generateTreeNodes.bind(this)));
    },

    /**
     * Adds a sub-subtask to a given subtask
     */
    addSubSubtask(subtask: any) {
        if (!subtask) return;
        if (!subtask.subSubtasks) subtask.subSubtasks = [];
        subtask.subSubtasks.push(createDefaultSubSubtask(this.generateTreeNodes.bind(this)));
    },

    /**
     * Removes a subtask from the current editing task
     */
    removeSubtask(subtaskId: number) {
        if (!this.editingTask || this.editingTask.subtasks.length <= 1) return;
        this.editingTask.subtasks = this.editingTask.subtasks.filter((s: any) => s.id !== subtaskId);
    },

    /**
     * Verschiebt eine Teilaufgabe im Array um eine Position nach oben oder unten
     */
    moveSubtask(subtaskId: number, direction: 'up' | 'down') {
        if (!this.editingTask) return;
        const arr = this.editingTask.subtasks;
        const idx = arr.findIndex((s: any) => s.id === subtaskId);
        if (idx === -1) return;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= arr.length) return;
        const copy = [...arr];
        [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
        this.editingTask.subtasks = copy;
    },

    /**
     * Verschiebt eine Unteraufgabe (sub-subtask) in einer Teilaufgabe nach oben oder unten
     */
    moveSubSubtask(subtask: any, subSubIdx: number, direction: 'up' | 'down') {
        const arr = subtask.subSubtasks;
        if (!arr) return;
        const newIdx = direction === 'up' ? subSubIdx - 1 : subSubIdx + 1;
        if (newIdx < 0 || newIdx >= arr.length) return;
        const copy = [...arr];
        [copy[subSubIdx], copy[newIdx]] = [copy[newIdx], copy[subSubIdx]];
        subtask.subSubtasks = copy;
    },

    /**
     * Saves the task from the modal to the tasks array
     */
    saveTask() {
        if (!this.editingTask) return;

        const index = this.tasks.findIndex((t: Task) => t.id === this.editingTask.id);

        if (index !== -1) {
            // Update existing task - replace entire array for reactivity
            const updatedTask = JSON.parse(JSON.stringify(this.editingTask));
            this.tasks = [
                ...this.tasks.slice(0, index),
                migrateAndEnsureGetters(updatedTask),
                ...this.tasks.slice(index + 1)
            ];
        } else {
            // Create new task
            const newTask = JSON.parse(JSON.stringify(this.editingTask));
            this.tasks = [...this.tasks, migrateAndEnsureGetters(newTask)];
        }

        this.autoSave();
        this.closeTaskModal();
    },

    /**
     * Removes a task by its ID
     */
    removeTask(id: number) {
        if (confirm('Möchten Sie diese Aufgabe wirklich löschen?')) {
            this.tasks = this.tasks.filter((task: Task) => task.id !== id);
        }
    },

    /**
     * Returns the correct task number by counting only items of type 'task'
     */
    getTaskNumber(taskId: number) {
        let count = 0;
        for (const task of this.tasks) {
            if (task.type !== 'section') {
                count++;
            }
            if (task.id === taskId) return count;
        }
        return count;
    },

    /**
     * Calculates the sum of all task points
     */
    getTotalPoints() {
        return this.tasks.reduce((total: number, task: Task) => {
            return total + this.getTaskPoints(task);
        }, 0);
    },

    /**
     * Berechnet die Punkte einer Teilaufgabe (Teilaufgabe) dynamisch.
     * Wenn Unteraufgaben vorhanden sind, ist es die Summe der Unteraufgabenpunkte,
     * andernfalls der in subtask.points gespeicherte Wert.
     */
    getSubtaskPoints(subtask: any) {
        if (subtask.subSubtasks && subtask.subSubtasks.length > 0) {
            return subtask.subSubtasks.reduce((sum: number, subSub: any) => sum + (parseFloat(subSub.points) || 0), 0);
        }
        return parseFloat(subtask.points) || 0;
    },

    /**
     * Berechnet die Gesamtpunktzahl einer Aufgabe (Summe aller Teilaufgaben)
     */
    getTaskPoints(task: Task) {
        return task.subtasks.reduce((sum: number, sub: any) => sum + this.getSubtaskPoints(sub), 0);
    },

    /**
     * Verschiebt eine Aufgabe im Array um eine Position nach oben
     */
    moveTaskUp(index: number) {
        if (index <= 0) return;
        const temp = this.tasks[index];
        this.tasks[index] = this.tasks[index - 1];
        this.tasks[index - 1] = temp;
        this.autoSave();
    },

    /**
     * Verschiebt eine Aufgabe im Array um eine Position nach unten
     */
    moveTaskDown(index: number) {
        if (index >= this.tasks.length - 1) return;
        const temp = this.tasks[index];
        this.tasks[index] = this.tasks[index + 1];
        this.tasks[index + 1] = temp;
        this.autoSave();
    },

    /**
     * Erhöht die Leerzeilen vor einer Aufgabe
     */
    increaseTaskSpacing(task: any) {
        if (!task) return;
        task.spacingTop = Math.min(15, (task.spacingTop || 0) + 1);
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Verringert die Leerzeilen vor einer Aufgabe
     */
    decreaseTaskSpacing(task: any) {
        if (!task) return;
        task.spacingTop = Math.max(0, (task.spacingTop || 0) - 1);
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Entfernt alle Leerzeilen vor einer Aufgabe
     */
    removeTaskSpacing(task: any) {
        if (!task) return;
        task.spacingTop = 0;
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Schaltet erzwungenen Seitenumbruch vor einer Aufgabe um
     */
    toggleTaskPageBreak(task: any) {
        if (!task) return;
        task.pageBreakBefore = !task.pageBreakBefore;
        if (task.pageBreakBefore) {
            task.spacingTop = 0; // Am Seitenanfang keine überflüssigen Leerzeilen
        }
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Erhöht die Leerzeilen vor einer Teilaufgabe
     */
    increaseSubtaskSpacing(subtask: any) {
        if (!subtask) return;
        subtask.spacingTop = Math.min(15, (subtask.spacingTop || 0) + 1);
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Verringert die Leerzeilen vor einer Teilaufgabe
     */
    decreaseSubtaskSpacing(subtask: any) {
        if (!subtask) return;
        subtask.spacingTop = Math.max(0, (subtask.spacingTop || 0) - 1);
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Entfernt alle Leerzeilen vor einer Teilaufgabe
     */
    removeSubtaskSpacing(subtask: any) {
        if (!subtask) return;
        subtask.spacingTop = 0;
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Schaltet erzwungenen Seitenumbruch vor einer Teilaufgabe um
     */
    toggleSubtaskPageBreak(subtask: any) {
        if (!subtask) return;
        subtask.pageBreakBefore = !subtask.pageBreakBefore;
        if (subtask.pageBreakBefore) {
            subtask.spacingTop = 0; // Am Seitenanfang keine überflüssigen Leerzeilen
        }
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Erhöht die Leerzeilen vor einer Unteraufgabe
     */
    increaseSubSubtaskSpacing(subSub: any) {
        if (!subSub) return;
        subSub.spacingTop = Math.min(15, (subSub.spacingTop || 0) + 1);
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Verringert die Leerzeilen vor einer Unteraufgabe
     */
    decreaseSubSubtaskSpacing(subSub: any) {
        if (!subSub) return;
        subSub.spacingTop = Math.max(0, (subSub.spacingTop || 0) - 1);
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Entfernt alle Leerzeilen vor einer Unteraufgabe
     */
    removeSubSubtaskSpacing(subSub: any) {
        if (!subSub) return;
        subSub.spacingTop = 0;
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Schaltet erzwungenen Seitenumbruch vor einer Unteraufgabe um
     */
    toggleSubSubtaskPageBreak(subSub: any) {
        if (!subSub) return;
        subSub.pageBreakBefore = !subSub.pageBreakBefore;
        if (subSub.pageBreakBefore) {
            subSub.spacingTop = 0;
        }
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Setzt den Tastatur- und Cursor-Fokus auf einen Einfügebereich (Word-Style)
     */
    focusLineSlot(slotId: string) {
        this.activeSlotId = slotId;
    },

    /**
     * Entfernt den Slot-Fokus
     */
    blurLineSlot(slotId?: string) {
        if (!slotId || this.activeSlotId === slotId) {
            this.activeSlotId = null;
        }
    },

    /**
     * Behandelt Tastatur-Eingaben auf einem Line-Insertion-Slot (Word-Steuerung)
     * - Enter: Erzeugt Zeilenumbruch (+1 Leerzeile)
     * - Backspace / Entf: Entfernt Leerzeile (-1 Leerzeile)
     * - Strg+Enter / Cmd+Enter: Toggelt Seitenumbruch
     */
    handleSlotKeydown(event: KeyboardEvent, target: any, type: 'task' | 'subtask' | 'subsubtask') {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (type === 'task') {
                this.toggleTaskPageBreak(target);
            } else if (type === 'subtask') {
                this.toggleSubtaskPageBreak(target);
            } else {
                this.toggleSubSubtaskPageBreak(target);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (type === 'task') {
                this.increaseTaskSpacing(target);
            } else if (type === 'subtask') {
                this.increaseSubtaskSpacing(target);
            } else {
                this.increaseSubSubtaskSpacing(target);
            }
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            if (type === 'task') {
                this.decreaseTaskSpacing(target);
            } else if (type === 'subtask') {
                this.decreaseSubtaskSpacing(target);
            } else {
                this.decreaseSubSubtaskSpacing(target);
            }
        }
    },

    /**
     * Verschiebt eine Teilaufgabe direkt auf dem Arbeitsblatt nach oben oder unten
     */
    moveSubtaskOnCanvas(task: any, subIndex: number, direction: 'up' | 'down') {
        if (!task || !Array.isArray(task.subtasks)) return;
        const arr = task.subtasks;
        const newIdx = direction === 'up' ? subIndex - 1 : subIndex + 1;
        if (newIdx < 0 || newIdx >= arr.length) return;
        const temp = arr[subIndex];
        arr[subIndex] = arr[newIdx];
        arr[newIdx] = temp;
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Verschiebt eine Unteraufgabe direkt auf dem Arbeitsblatt nach oben oder unten
     */
    moveSubSubtaskOnCanvas(subtask: any, subSubIdx: number, direction: 'up' | 'down') {
        if (!subtask || !Array.isArray(subtask.subSubtasks)) return;
        const arr = subtask.subSubtasks;
        const newIdx = direction === 'up' ? subSubIdx - 1 : subSubIdx + 1;
        if (newIdx < 0 || newIdx >= arr.length) return;
        const temp = arr[subSubIdx];
        arr[subSubIdx] = arr[newIdx];
        arr[newIdx] = temp;
        this.autoSave();
        this.calculatePagination();
    },

    /**
     * Zeichnet eine hochpräzise, responsive Zahlenstrahl-Vektorgrafik (SVG)
     * @param {Object} config - { min, max, step }
     * @returns {string} SVG HTML-String
     */
    renderZahlenstrahl(config: any) {
        return renderZahlenstrahl(config);
    },


    renderStrahlensatz(config: any) {
        return renderStrahlensatz(config);
    },

    renderBruch(config: any) {
        return renderBruch(config);
    },
    renderDiagram(config: any, options?: any) {
        return renderDiagram(config, options);
    },
    renderVerteilungSVG(config: any, options?: any) {
        return renderVerteilungSVG(config, options);
    },
    renderKoordinatensystem(config: any) {
        return renderKoordinatensystem(config);
    }
});
