/**
 * Word Add-in Controller (Alpine.js Component)
 * Powers the Taskpane UI directly inside Microsoft Word.
 */

import { MODULE_REGISTRY, ModuleType, CategoryId, CATEGORIES } from './config/moduleRegistry';
import { initOffice, insertModuleIntoWord, isWordHost } from './services/wordService';
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

declare const Alpine: any;

export function wordAddinComponent() {
    return {
        isWord: false,
        activeCategory: 'stochastik' as CategoryId,
        activeModuleType: 'baum' as ModuleType,
        workingModule: {
            id: 'word-mod-1',
            type: 'baum',
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

        async init() {
            this.isWord = await initOffice();
            this.loadModuleType('baum');
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
        },

        ensureDataDefaults() {
            const mod = this.workingModule;
            const d = mod.data;
            if (!d) return;

            if (mod.type === 'baum') {
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

        // ── INSERT ACTION ────────────────────────────────────────
        async insertIntoWord() {
            this.isInserting = true;
            try {
                const res = await insertModuleIntoWord(this.workingModule);
                this.triggerToast(res.message);
            } catch (err) {
                console.error("Fehler beim Einfügen in Word:", err);
                this.triggerToast("❌ Fehler beim Einfügen.");
            } finally {
                this.isInserting = false;
            }
        },

        triggerToast(msg: string) {
            this.toastMessage = msg;
            this.showToast = true;
            setTimeout(() => {
                this.showToast = false;
            }, 3000);
        },

        // ── PREVIEW HELPERS ──────────────────────────────────────
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

        // ── MODULE HELPER ACTIONS ────────────────────────────────
        // Baumdiagramm
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

        // Urne
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

        // Glücksrad
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

        // MCQ
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

        // Matching
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
