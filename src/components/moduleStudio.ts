/**
 * Modul-Studio Component.
 * 
 * Ermöglicht die isolierte Konfiguration von Aufgaben-Modulen in einem 
 * Split-Screen-Modal mit Live-Druck-Vorschau.
 */

import { MODULE_REGISTRY, ModuleType } from '../config/moduleRegistry';
import { generateModuleId, generateTreeNodes } from '../services/taskFactory';
import { 
    renderTreeSVG, 
    renderUrneSVG, 
    renderGluecksrad, 
    renderDiagram,
    renderVerteilungSVG,
    calcBinomialProb,
    calcNormalCDF
} from '../services/mathRenderer';

export const moduleStudio = (): any => ({
    isStudioOpen: false,
    studioTarget: null as any,
    isNewModule: false,
    originalModuleRef: null as any,
    workingModule: null as any,
    activeTreeLevel: 1 as number | 'paths',
    renderTrigger: 0,
    highlightedNodeId: null as string | null,
    highlightedPathId: null as string | null,
    activeTarget: null as { type: 'edge' | 'node' | 'path'; id: string } | null,
    activeVfTarget: null as { type: 'cell'; r: number; c: number } | { type: 'label'; key: 'top1' | 'top2' | 'left1' | 'left2' } | null,
    vfAutoPair: true,
    activeKugelId: null as number | null,
    quickKugelColor: 'red',
    quickKugelCount: 1,
    quickKugelLabel: '',
    activeSectorId: null as number | null,
    activeDiagItemIdx: null as number | null,
    popoverPos: { x: 0, y: 0 },

    init() {
        window.addEventListener('open-module-studio', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;

            if (detail.isNew) {
                this.openStudioForNew(detail.target, detail.moduleType);
            } else if (detail.module) {
                this.openStudioForEdit(detail.target, detail.module);
            }
        });

        window.addEventListener('resize', () => {
            if (this.activeTarget) {
                this.updatePopoverPosition();
            }
            if (this.activeVfTarget) {
                this.updateVfPopoverPosition();
            }
            if (this.activeKugelId) {
                this.updateUrnePopoverPosition();
            }
            if (this.activeSectorId) {
                this.updateGluecksradPopoverPosition();
            }
            if (this.activeDiagItemIdx !== null) {
                this.updateDiagPopoverPosition();
            }
        });
    },

    /**
     * Stößt eine sofortige Neu-Evaluierung der Live-Vorschau an.
     */
    touchRender() {
        this.renderTrigger++;
    },

    /**
     * Hebt einen Ast/Knoten im Live-SVG hervor.
     */
    setHighlightNode(id: string | null) {
        if (this.highlightedNodeId !== id) {
            this.highlightedNodeId = id;
            this.highlightedPathId = null;
            this.renderTrigger++;
        }
    },

    /**
     * Hebt einen gesamten Pfad im Live-SVG hervor.
     */
    setHighlightPath(id: string | null) {
        if (this.highlightedPathId !== id) {
            this.highlightedPathId = id;
            this.highlightedNodeId = null;
            this.renderTrigger++;
        }
    },

    /**
     * Öffnet das Studio für ein neu hinzuzufügendes Modul mit Default-Werten.
     */
    openStudioForNew(target: any, moduleType: string) {
        this.studioTarget = target;
        this.isNewModule = true;
        this.originalModuleRef = null;
        this.activeTreeLevel = 1;
        this.highlightedNodeId = null;
        this.highlightedPathId = null;
        this.activeTarget = null;
        this.activeVfTarget = null;
        this.activeKugelId = null;
        this.activeSectorId = null;
        this.popoverPos = { x: 0, y: 0 };
        this.renderTrigger = 0;

        const def = MODULE_REGISTRY[moduleType as ModuleType];
        const defaultData = def ? def.defaultData() : {};

        // Deep clone, um eine vollständig isolierte Arbeitskopie zu haben
        this.workingModule = {
            id: generateModuleId(),
            type: moduleType,
            data: JSON.parse(JSON.stringify(defaultData)),
        };

        if (this.workingModule.data) {
            this.workingModule.data.show = true;
        }

        if (this.workingModule.type === 'baum') {
            if (!this.workingModule.data.height) {
                this.workingModule.data.height = 7;
            }
            if (Array.isArray(this.workingModule.data?.nodes)) {
                this.workingModule.data.nodes.forEach((n: any) => {
                    n.isProbPlaceholder = !!n.isProbPlaceholder;
                    n.isLabelPlaceholder = !!n.isLabelPlaceholder;
                    n.isPathProbPlaceholder = !!n.isPathProbPlaceholder;
                    if (n.prob === undefined) n.prob = '';
                    if (n.label === undefined) n.label = '';
                    if (n.pathProb === undefined) n.pathProb = '';
                });
            }
        } else if (this.workingModule.type === 'vierfeldertafel') {
            this.ensureVfStudioProperties();
        } else if (this.workingModule.type === 'urne') {
            this.ensureUrneStudioProperties();
        } else if (this.workingModule.type === 'gluecksrad') {
            this.ensureGluecksradStudioProperties();
        } else if (this.workingModule.type === 'diagramm') {
            this.ensureDiagrammStudioProperties();
        } else if (this.workingModule.type === 'verteilung') {
            this.ensureVerteilungStudioProperties();
        }

        this.isStudioOpen = true;
    },

    /**
     * Öffnet das Studio für ein existierendes Modul zur Bearbeitung.
     */
    openStudioForEdit(target: any, module: any) {
        this.studioTarget = target;
        this.isNewModule = false;
        this.originalModuleRef = module;
        this.activeTreeLevel = 1;
        this.highlightedNodeId = null;
        this.highlightedPathId = null;
        this.activeTarget = null;
        this.activeVfTarget = null;
        this.activeKugelId = null;
        this.activeSectorId = null;
        this.activeDiagItemIdx = null;
        this.popoverPos = { x: 0, y: 0 };
        this.renderTrigger = 0;

        // Deep clone, damit "Abbrechen" das Original nicht verändert
        this.workingModule = JSON.parse(JSON.stringify(module));

        if (this.workingModule.data) {
            this.workingModule.data.show = true;
        }

        if (this.workingModule.type === 'baum') {
            if (!this.workingModule.data.height) {
                this.workingModule.data.height = this.studioTarget?.baum?.height || 7;
            }
            if (Array.isArray(this.workingModule.data?.nodes)) {
                this.workingModule.data.nodes.forEach((n: any) => {
                    n.isProbPlaceholder = !!n.isProbPlaceholder;
                    n.isLabelPlaceholder = !!n.isLabelPlaceholder;
                    n.isPathProbPlaceholder = !!n.isPathProbPlaceholder;
                    if (n.prob === undefined) n.prob = '';
                    if (n.label === undefined) n.label = '';
                    if (n.pathProb === undefined) n.pathProb = '';
                });
            }
        } else if (this.workingModule.type === 'vierfeldertafel') {
            this.ensureVfStudioProperties();
        } else if (this.workingModule.type === 'urne') {
            this.ensureUrneStudioProperties();
        } else if (this.workingModule.type === 'gluecksrad') {
            this.ensureGluecksradStudioProperties();
        } else if (this.workingModule.type === 'diagramm') {
            this.ensureDiagrammStudioProperties();
        } else if (this.workingModule.type === 'verteilung') {
            this.ensureVerteilungStudioProperties();
        }

        this.isStudioOpen = true;
    },

    /**
     * Schließt das Studio ohne Änderungen.
     */
    cancelAndClose() {
        this.isStudioOpen = false;
        this.workingModule = null;
        this.studioTarget = null;
        this.originalModuleRef = null;
        this.activeTreeLevel = 1;
        this.highlightedNodeId = null;
        this.highlightedPathId = null;
        this.activeTarget = null;
        this.activeVfTarget = null;
        this.activeKugelId = null;
        this.activeSectorId = null;
        this.popoverPos = { x: 0, y: 0 };
    },

    /**
     * Speichert das Arbeitsmodul in das Ziel-Objekt (Task/Subtask/SubSubtask).
     */
    saveAndClose() {
        if (!this.studioTarget || !this.workingModule) return;

        if (!this.workingModule.data) {
            this.workingModule.data = {};
        }
        this.workingModule.data.show = true;

        if (this.isNewModule) {
            const currentModules = Array.isArray(this.studioTarget.modules) 
                ? [...this.studioTarget.modules] 
                : [];
            const existingIdx = currentModules.findIndex((m: any) => m.id === this.workingModule.id);
            if (existingIdx !== -1) {
                currentModules[existingIdx] = this.workingModule;
            } else {
                currentModules.push(this.workingModule);
            }
            this.studioTarget.modules = currentModules;
        } else if (this.originalModuleRef) {
            // Daten im Originalobjekt aktualisieren
            this.originalModuleRef.data = JSON.parse(JSON.stringify(this.workingModule.data));
            if (Array.isArray(this.studioTarget.modules)) {
                this.studioTarget.modules = [...this.studioTarget.modules];
            }
        }

        // Kompatibilität mit Legacy-Knoten und Canvas-Rendering gewährleisten
        if (this.workingModule.type === 'baum') {
            const baumData = JSON.parse(JSON.stringify(this.workingModule.data));
            baumData.show = true;
            this.studioTarget.baum = baumData;
        } else if (this.workingModule.type === 'vierfeldertafel') {
            const vfData = JSON.parse(JSON.stringify(this.workingModule.data));
            vfData.show = true;
            this.studioTarget.vierfeldertafel = vfData;
        } else if (this.workingModule.type === 'urne') {
            const urneData = JSON.parse(JSON.stringify(this.workingModule.data));
            urneData.show = true;
            this.studioTarget.urne = urneData;
        } else if (this.workingModule.type === 'gluecksrad') {
            const gluecksradData = JSON.parse(JSON.stringify(this.workingModule.data));
            gluecksradData.show = true;
            this.studioTarget.gluecksrad = gluecksradData;
        } else if (this.workingModule.type === 'verteilung') {
            const verteilungData = JSON.parse(JSON.stringify(this.workingModule.data));
            verteilungData.show = true;
            this.studioTarget.verteilung = verteilungData;
        }

        this.cancelAndClose();
    },

    // ── Spezifische Helfer für Baumdiagramm ───────────────────────

    /**
     * Aktualisiert die Knotenstruktur des Baumdiagramms anhand von Stufen und Ästen.
     */
    applyTreeStructure() {
        if (!this.workingModule || this.workingModule.type !== 'baum') return;
        this.closePopover();
        const depth = this.workingModule.data.depth || 2;
        const branches = this.workingModule.data.branches || 2;
        this.workingModule.data.nodes = generateTreeNodes(depth, branches);
        if (this.activeTreeLevel !== 'paths' && this.activeTreeLevel > depth) {
            this.activeTreeLevel = 1;
        }
        this.renderTrigger++;
    },

    /**
     * Erzeugt das Live-SVG für das Baumdiagramm mit aktiver Hervorhebung.
     */
    getTreePreviewSvg(): string {
        const _t = this.renderTrigger;
        if (!this.workingModule || this.workingModule.type !== 'baum' || !this.workingModule.data) {
            return '';
        }
        return renderTreeSVG(
            this.workingModule.data, 
            this.highlightedNodeId, 
            this.highlightedPathId,
            this.activeTarget
        );
    },

    // ── Direct Manipulation (WYSIWYG) Helfer ───────────────────────

    /**
     * Behandelt Klicks auf das Live-SVG zur direkten Bearbeitung.
     */
    handleSvgClick(event: MouseEvent) {
        const target = event.target as Element | null;
        if (!target) return;

        // Klicks innerhalb des Popovers nicht abfangen
        if (target.closest('.studio-canvas-popover')) return;

        const edgeGroup = target.closest('[data-edge-id]');
        const nodeGroup = target.closest('[data-node-id]');
        const pathGroup = target.closest('[data-path-id]');

        if (edgeGroup) {
            const id = edgeGroup.getAttribute('data-edge-id');
            if (id) this.selectItem('edge', id, edgeGroup);
            return;
        }
        if (nodeGroup) {
            const id = nodeGroup.getAttribute('data-node-id');
            if (id) this.selectItem('node', id, nodeGroup);
            return;
        }
        if (pathGroup) {
            const id = pathGroup.getAttribute('data-path-id');
            if (id) this.selectItem('path', id, pathGroup);
            return;
        }

        // Klick auf den leeren Hintergrund schließt das Popover
        this.closePopover();
    },

    /**
     * Berechnet die Position des Popovers über dem selektierten Element und setzt die CSS-Variablen.
     */
    updatePopoverPosition() {
        if (!this.activeTarget) return;
        const container = document.querySelector('.studio-wysiwyg-container') as HTMLElement | null;
        const popEl = document.getElementById('studio-canvas-popover') as HTMLElement | null;
        if (!container || !popEl) return;

        const { type, id } = this.activeTarget;
        let selector = '';
        if (type === 'edge') selector = `[data-edge-id="${id}"]`;
        else if (type === 'node') selector = `[data-node-id="${id}"]`;
        else if (type === 'path') selector = `[data-path-id="${id}"]`;

        const groupEl = container.querySelector(selector);
        if (!groupEl) return;

        const anchorEl = groupEl.querySelector('.tree-anchor-target') || 
                         groupEl.querySelector('text, rect:not(.tree-hitbox), circle:not(.tree-hitbox), ellipse:not(.tree-hitbox)') || 
                         groupEl;

        const cRect = container.getBoundingClientRect();
        const aRect = anchorEl.getBoundingClientRect();

        const x = aRect.left + aRect.width / 2 - cRect.left;
        const y = aRect.top - cRect.top;

        // Sicherstellen, dass das Popover innerhalb des Containers bleibt
        const clampedX = Math.max(140, Math.min(cRect.width - 140, x));

        popEl.style.setProperty('--pop-x', `${Math.round(clampedX)}px`);
        popEl.style.setProperty('--pop-y', `${Math.round(y)}px`);

        // Falls zu nah am oberen Containerrand, nach unten klappen
        popEl.classList.toggle('popover-placement-bottom', y < 75);
    },

    /**
     * Wählt ein Element (Kante, Knoten, Pfadende) aus und positioniert das Popover darüber.
     */
    selectItem(type: 'edge' | 'node' | 'path', id: string, anchorEl?: Element | null) {
        this.activeTarget = { type, id };
        this.highlightedNodeId = null;
        this.highlightedPathId = null;
        this.touchRender();

        const syncAndFocus = () => {
            this.updatePopoverPosition();
            const popEl = document.getElementById('studio-canvas-popover');
            if (popEl) {
                const input = popEl.querySelector('input') as HTMLInputElement | null;
                if (input) {
                    input.focus();
                    input.select();
                }
            }
        };

        if (typeof (this as any).$nextTick === 'function') {
            (this as any).$nextTick(syncAndFocus);
        }
        setTimeout(syncAndFocus, 40);
    },

    /**
     * Schließt das schwebende Bearbeitungs-Popover.
     */
    closePopover() {
        this.activeTarget = null;
        this.touchRender();
    },

    /**
     * Liefert den Datenknoten des aktuell ausgewählten Elements.
     */
    getActiveNode(): any {
        if (!this.activeTarget || !this.workingModule?.data?.nodes) return null;
        return this.workingModule.data.nodes.find((n: any) => n.id === this.activeTarget?.id) || null;
    },

    toggleEdgePlaceholder() {
        const node = this.getActiveNode();
        if (node) {
            node.isProbPlaceholder = !node.isProbPlaceholder;
            this.touchRender();
            setTimeout(() => this.updatePopoverPosition(), 30);
        }
    },

    toggleNodeNegation() {
        const node = this.getActiveNode();
        if (node) {
            node.isNegated = !node.isNegated;
            this.touchRender();
            setTimeout(() => this.updatePopoverPosition(), 30);
        }
    },

    toggleNodePlaceholder() {
        const node = this.getActiveNode();
        if (node) {
            node.isLabelPlaceholder = !node.isLabelPlaceholder;
            this.touchRender();
            setTimeout(() => this.updatePopoverPosition(), 30);
        }
    },

    togglePathPlaceholder() {
        const node = this.getActiveNode();
        if (node) {
            node.isPathProbPlaceholder = !node.isPathProbPlaceholder;
            this.touchRender();
            setTimeout(() => this.updatePopoverPosition(), 30);
        }
    },

    /**
     * Berechnet die Pfadwahrscheinlichkeit für einen einzelnen Pfad.
     */
    calcSinglePath(leafId: string) {
        if (!this.workingModule?.data?.nodes) return;
        const leaf = this.workingModule.data.nodes.find((n: any) => n.id === leafId);
        if (!leaf) return;
        const parts = String(leaf.id).split('-');
        const pathProbs: string[] = [];
        let cur = '';
        for (const p of parts) {
            cur = cur ? `${cur}-${p}` : p;
            const node = this.workingModule.data.nodes.find((n: any) => n.id === cur);
            if (node && node.prob && node.prob.trim() !== '' && !node.isProbPlaceholder) {
                pathProbs.push(node.prob.trim());
            }
        }
        if (pathProbs.length === parts.length) {
            const calculated = this.computeProbabilityProduct(pathProbs);
            if (calculated) {
                leaf.pathProb = calculated;
                leaf.isPathProbPlaceholder = false;
                this.touchRender();
            }
        }
    },

    /**
     * Erstellt eine geordnete Liste aller interaktiven Elemente für Tab-Navigation.
     */
    getAllInteractiveItems(): Array<{ type: 'edge' | 'node' | 'path'; id: string }> {
        if (!this.workingModule?.data?.nodes) return [];
        const items: Array<{ type: 'edge' | 'node' | 'path'; id: string }> = [];
        const depth = parseInt(this.workingModule.data.depth as any) || 2;
        for (let l = 1; l <= depth; l++) {
            const nodes = this.getNodesForLevel(l);
            nodes.forEach((n: any) => {
                items.push({ type: 'edge', id: n.id });
                items.push({ type: 'node', id: n.id });
            });
        }
        if (this.workingModule.data.showPathProbabilities) {
            const leaves = this.getLeafNodes();
            leaves.forEach((leaf: any) => {
                items.push({ type: 'path', id: leaf.id });
            });
        }
        return items;
    },

    selectNextItem() {
        const items = this.getAllInteractiveItems();
        if (items.length === 0) return;
        if (!this.activeTarget) {
            this.selectItem(items[0].type, items[0].id);
            return;
        }
        const currentIndex = items.findIndex(
            it => it.type === this.activeTarget?.type && it.id === this.activeTarget?.id
        );
        const nextIndex = (currentIndex + 1) % items.length;
        const next = items[nextIndex];
        this.selectItem(next.type, next.id);
    },

    selectPrevItem() {
        const items = this.getAllInteractiveItems();
        if (items.length === 0) return;
        if (!this.activeTarget) {
            this.selectItem(items[items.length - 1].type, items[items.length - 1].id);
            return;
        }
        const currentIndex = items.findIndex(
            it => it.type === this.activeTarget?.type && it.id === this.activeTarget?.id
        );
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        const prev = items[prevIndex];
        this.selectItem(prev.type, prev.id);
    },

    /**
     * Liefert eine Liste der vorhandenen Stufen (z.B. [1, 2]).
     */
    getLevels(): number[] {
        if (!this.workingModule?.data) return [1, 2];
        const depth = Math.max(1, Math.min(3, parseInt(this.workingModule.data.depth as any) || 2));
        const levels: number[] = [];
        for (let i = 1; i <= depth; i++) {
            levels.push(i);
        }
        return levels;
    },

    /**
     * Liefert alle Knoten einer bestimmten Stufe.
     */
    getNodesForLevel(level: number): any[] {
        if (!this.workingModule?.data?.nodes) return [];
        return this.workingModule.data.nodes.filter((n: any) => n.level == level);
    },

    /**
     * Erzeugt eine verständliche hierarchische Beschreibung für einen Ast/Knoten.
     * Z.B. "Ast 1" (Stufe 1) oder "Nach \"Rot\" → Ast 2" (Stufe 2).
     */
    getNodeDescription(node: any): string {
        if (!this.workingModule?.data?.nodes) return `Knoten ${node.id}`;
        const parts = String(node.id).split('-');
        const branchIndex = parts[parts.length - 1];
        if (parts.length === 1) {
            return `Ast ${branchIndex}`;
        }
        const parentId = parts.slice(0, -1).join('-');
        const parent = this.workingModule.data.nodes.find((n: any) => n.id === parentId);
        let parentLabel = `Knoten ${parentId}`;
        if (parent?.label) {
            const clean = parent.label.trim();
            const labelText = parent.isNegated 
                ? `<span class="negate-char">${clean}</span>` 
                : clean;
            parentLabel = `"${labelText}"`;
        }
        return `Nach ${parentLabel} → Ast ${branchIndex}`;
    },

    /**
     * Liefert die Blattknoten (Endknoten der maximalen Tiefe) für die Pfadwahrscheinlichkeiten.
     */
    getLeafNodes(): any[] {
        if (!this.workingModule?.data?.nodes) return [];
        const depth = parseInt(this.workingModule.data.depth as any) || 2;
        return this.workingModule.data.nodes.filter((n: any) => n.level == depth);
    },

    /**
     * Rekonstruiert die gesamte Pfad-Sequenz für einen Endknoten mit HTML-Negationsüberstrich.
     */
    getPathSequenceHtml(leafNode: any): string {
        if (!this.workingModule?.data?.nodes) return '';
        const parts = String(leafNode.id).split('-');
        const labels: string[] = [];
        let cur = '';
        for (const p of parts) {
            cur = cur ? `${cur}-${p}` : p;
            const node = this.workingModule.data.nodes.find((n: any) => n.id === cur);
            if (!node) {
                labels.push(cur);
                continue;
            }
            if (node.isLabelPlaceholder) {
                labels.push('<span class="path-placeholder-symbol">[ &nbsp; ]</span>');
            } else {
                const text = node.label?.trim() ? node.label.trim() : `E${cur}`;
                if (node.isNegated) {
                    labels.push(`<span class="negate-char">${text}</span>`);
                } else {
                    labels.push(text);
                }
            }
        }
        return labels.join(' <span class="path-arrow">→</span> ');
    },

    /**
     * Plaintext-Version der Pfad-Sequenz.
     */
    getPathSequence(leafNode: any): string {
        if (!this.workingModule?.data?.nodes) return '';
        const parts = String(leafNode.id).split('-');
        const labels: string[] = [];
        let cur = '';
        for (const p of parts) {
            cur = cur ? `${cur}-${p}` : p;
            const node = this.workingModule.data.nodes.find((n: any) => n.id === cur);
            if (!node) {
                labels.push(cur);
                continue;
            }
            const text = node.label?.trim() ? node.label.trim() : `E${cur}`;
            if (node.isNegated) {
                labels.push(text.split('').map((c: string) => c + '\u0305').join(''));
            } else {
                labels.push(text);
            }
        }
        return labels.join(' → ');
    },

    /**
     * Überträgt die Werte der ersten Verzweigung dieser Stufe auf alle weiteren Verzweigungen.
     */
    applyLevelDefaults(level: number) {
        if (!this.workingModule?.data?.nodes) return;
        const levelNodes = this.workingModule.data.nodes.filter((n: any) => n.level == level);
        if (levelNodes.length === 0) return;

        const branches = parseInt(this.workingModule.data.branches as any) || 2;
        const templateNodes = levelNodes.slice(0, branches);

        levelNodes.forEach((node: any) => {
            const parts = String(node.id).split('-');
            const branchIdx = (parseInt(parts[parts.length - 1], 10) - 1) % branches;
            const template = templateNodes[branchIdx];
            if (template && node !== template) {
                node.prob = template.prob;
                node.label = template.label;
                node.isNegated = template.isNegated;
                node.isProbPlaceholder = !!template.isProbPlaceholder;
                node.isLabelPlaceholder = !!template.isLabelPlaceholder;
            }
        });
    },

    /**
     * Multipliziert Brüche oder Dezimalzahlen entlang eines Pfades und kürzt das Ergebnis.
     */
    computeProbabilityProduct(probs: string[]): string {
        let isFraction = true;
        let numProduct = 1;
        let denProduct = 1;
        let floatProduct = 1;

        for (const p of probs) {
            const clean = p.replace(/\s+/g, '');
            if (clean.includes('/')) {
                const [nStr, dStr] = clean.split('/');
                const n = parseFloat(nStr);
                const d = parseFloat(dStr);
                if (!isNaN(n) && !isNaN(d) && d !== 0) {
                    numProduct *= n;
                    denProduct *= d;
                    floatProduct *= (n / d);
                } else {
                    return '';
                }
            } else {
                const val = parseFloat(clean.replace(',', '.'));
                if (!isNaN(val)) {
                    isFraction = false;
                    floatProduct *= val;
                } else {
                    return '';
                }
            }
        }

        if (isFraction && denProduct !== 0 && Number.isInteger(numProduct) && Number.isInteger(denProduct)) {
            const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
            const common = Math.abs(gcd(numProduct, denProduct));
            const simpNum = numProduct / common;
            const simpDen = denProduct / common;
            return `${simpNum}/${simpDen}`;
        } else {
            const rounded = Math.round(floatProduct * 10000) / 10000;
            return rounded.toString().replace('.', ',');
        }
    },

    /**
     * Berechnet die Pfadwahrscheinlichkeiten für alle Endknoten automatisch.
     */
    calculatePathProbabilities() {
        if (!this.workingModule?.data?.nodes) return;
        const leaves = this.getLeafNodes();
        leaves.forEach((leaf: any) => {
            const parts = String(leaf.id).split('-');
            const pathProbs: string[] = [];
            let cur = '';
            for (const p of parts) {
                cur = cur ? `${cur}-${p}` : p;
                const node = this.workingModule.data.nodes.find((n: any) => n.id === cur);
                if (node && node.prob && node.prob.trim() !== '' && !node.isProbPlaceholder) {
                    pathProbs.push(node.prob.trim());
                }
            }
            if (pathProbs.length === parts.length) {
                const calculated = this.computeProbabilityProduct(pathProbs);
                if (calculated) {
                    leaf.pathProb = calculated;
                }
            }
        });
        this.workingModule.data.showPathProbabilities = true;
    },

    // ── Spezifische Helfer für 4-Feldertafel ───────────────────────

    ensureVfStudioProperties() {
        if (!this.workingModule || this.workingModule.type !== 'vierfeldertafel') return;
        if (!this.workingModule.data) this.workingModule.data = {};
        const d = this.workingModule.data;
        if (!Array.isArray(d.data) || d.data.length !== 3) {
            d.data = [['', '', ''], ['', '', ''], ['', '', '']];
        }
        if (!Array.isArray(d.printVisibility) || d.printVisibility.length !== 3) {
            d.printVisibility = [[true, true, true], [true, true, true], [true, true, true]];
        }
        if (!d.labels) {
            d.labels = { top1: '$A$', top2: '$\\overline{A}$', left1: '$B$', left2: '$\\overline{B}$' };
        }
        if (!d.rawLabels) {
            d.rawLabels = { top1: 'A', top2: 'A', left1: 'B', left2: 'B' };
        }
        if (!d.negated) {
            d.negated = { top1: false, top2: true, left1: false, left2: true };
        }
        if (!d.scale) {
            d.scale = 'normal';
        }
    },

    selectVfCell(r: number, c: number, event?: Event) {
        if (event) event.stopPropagation();
        this.activeVfTarget = { type: 'cell', r, c };
        this.touchRender();

        const focusInput = () => {
            this.updateVfPopoverPosition();
            const el = document.getElementById('studio-vf-cell-input') as HTMLInputElement | null;
            if (el) {
                el.focus();
                el.select();
            }
        };
        if (typeof this.$nextTick === 'function') this.$nextTick(focusInput);
        setTimeout(focusInput, 40);
    },

    selectVfLabel(key: 'top1' | 'top2' | 'left1' | 'left2', event?: Event) {
        if (event) event.stopPropagation();
        this.activeVfTarget = { type: 'label', key };
        this.touchRender();

        const focusInput = () => {
            this.updateVfPopoverPosition();
            const el = document.getElementById('studio-vf-label-input') as HTMLInputElement | null;
            if (el) {
                el.focus();
                el.select();
            }
        };
        if (typeof this.$nextTick === 'function') this.$nextTick(focusInput);
        setTimeout(focusInput, 40);
    },

    closeVfPopover() {
        this.activeVfTarget = null;
        this.touchRender();
    },

    handleVfCanvasClick(e: Event) {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest('#studio-vf-popover')) return;
        if (target.closest('.studio-vf-cell-interactive') || target.closest('.studio-vf-label-th')) return;
        this.closeVfPopover();
    },

    updateVfPopoverPosition() {
        if (!this.activeVfTarget) return;
        const container = document.querySelector('.studio-vf-container') as HTMLElement | null;
        const popover = document.getElementById('studio-vf-popover');
        if (!container || !popover) return;

        let targetEl: HTMLElement | null = null;
        if (this.activeVfTarget.type === 'cell') {
            targetEl = container.querySelector(`[data-vf-row="${this.activeVfTarget.r}"][data-vf-col="${this.activeVfTarget.c}"]`);
        } else if (this.activeVfTarget.type === 'label') {
            targetEl = container.querySelector(`[data-vf-label="${this.activeVfTarget.key}"]`);
        }

        if (!targetEl) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const centerX = targetRect.left + targetRect.width / 2 - containerRect.left;
        const topY = targetRect.top - containerRect.top;

        const clampedX = Math.max(140, Math.min(containerRect.width - 140, centerX));
        popover.style.setProperty('--vf-pop-x', `${Math.round(clampedX)}px`);
        popover.style.setProperty('--vf-pop-y', `${Math.round(topY)}px`);

        const placeBelow = topY < 90;
        popover.classList.toggle('popover-placement-bottom', placeBelow);
    },

    toggleVfCellVisibility() {
        if (!this.activeVfTarget || this.activeVfTarget.type !== 'cell') return;
        const { r, c } = this.activeVfTarget;
        if (this.workingModule?.data?.printVisibility) {
            this.workingModule.data.printVisibility[r][c] = !this.workingModule.data.printVisibility[r][c];
            this.touchRender();
            setTimeout(() => this.updateVfPopoverPosition(), 30);
        }
    },

    toggleVfLabelNegation() {
        if (!this.activeVfTarget || this.activeVfTarget.type !== 'label') return;
        const { key } = this.activeVfTarget;
        if (this.workingModule?.data?.negated) {
            this.workingModule.data.negated[key] = !this.workingModule.data.negated[key];
            this.updateVfLabel(key);
            this.touchRender();
            setTimeout(() => this.updateVfPopoverPosition(), 30);
        }
    },

    onVfLabelInput(key: 'top1' | 'top2' | 'left1' | 'left2') {
        if (!this.workingModule?.data) return;
        this.updateVfLabel(key);
    },

    updateVfLabel(key: 'top1' | 'top2' | 'left1' | 'left2') {
        const d = this.workingModule?.data;
        if (!d || !d.rawLabels || !d.labels || !d.negated) return;

        const raw = d.rawLabels[key] || '';
        const isNeg = !!d.negated[key];
        d.labels[key] = this.buildVierfelderLabel(raw, isNeg);

        // Auto-Kopplung Gegenereignis (wenn aktiviert)
        if (this.vfAutoPair) {
            if (key === 'top1') {
                d.rawLabels.top2 = raw;
                d.negated.top2 = !isNeg;
                d.labels.top2 = this.buildVierfelderLabel(raw, !isNeg);
            } else if (key === 'left1') {
                d.rawLabels.left2 = raw;
                d.negated.left2 = !isNeg;
                d.labels.left2 = this.buildVierfelderLabel(raw, !isNeg);
            }
        }
        this.touchRender();
    },

    getVfCellTitle(): string {
        if (!this.activeVfTarget || this.activeVfTarget.type !== 'cell') return 'Zelle';
        const { r, c } = this.activeVfTarget;
        const d = this.workingModule?.data;
        if (r === 2 && c === 2) return 'Gesamtsumme (Ω)';
        if (r === 2) {
            const colLabel = c === 0 ? d?.labels?.top1 : d?.labels?.top2;
            return `Spaltensumme (${colLabel || c + 1})`;
        }
        if (c === 2) {
            const rowLabel = r === 0 ? d?.labels?.left1 : d?.labels?.left2;
            return `Zeilensumme (${rowLabel || r + 1})`;
        }
        const rowLabel = r === 0 ? d?.labels?.left1 : d?.labels?.left2;
        const colLabel = c === 0 ? d?.labels?.top1 : d?.labels?.top2;
        return `Schnittmenge (${rowLabel || 'Z' + (r + 1)} ∩ ${colLabel || 'S' + (c + 1)})`;
    },

    getVfLabelTitle(): string {
        if (!this.activeVfTarget || this.activeVfTarget.type !== 'label') return 'Beschriftung';
        switch (this.activeVfTarget.key) {
            case 'top1': return 'Spalte 1 (Ereignis A)';
            case 'top2': return 'Spalte 2 (Gegenereignis)';
            case 'left1': return 'Zeile 1 (Ereignis B)';
            case 'left2': return 'Zeile 2 (Gegenereignis)';
            default: return 'Merkmal';
        }
    },

    selectNextVfCell() {
        if (!this.activeVfTarget || this.activeVfTarget.type !== 'cell') {
            this.selectVfCell(0, 0);
            return;
        }
        let { r, c } = this.activeVfTarget;
        c++;
        if (c > 2) {
            c = 0;
            r++;
            if (r > 2) r = 0;
        }
        this.selectVfCell(r, c);
    },

    selectPrevVfCell() {
        if (!this.activeVfTarget || this.activeVfTarget.type !== 'cell') {
            this.selectVfCell(2, 2);
            return;
        }
        let { r, c } = this.activeVfTarget;
        c--;
        if (c < 0) {
            c = 2;
            r--;
            if (r < 0) r = 2;
        }
        this.selectVfCell(r, c);
    },

    autofillVf() {
        const d = this.workingModule?.data;
        if (!d || !Array.isArray(d.data)) return;

        const parseLocalizedNumber = (val: any) => {
            if (val === '' || val == null) return null;
            const str = String(val).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
            const n = Number(str);
            return isNaN(n) ? null : n;
        };

        const matrix: (number | null)[][] = d.data.map((row: string[]) =>
            row.map((cell: string) => parseLocalizedNumber(cell))
        );

        let changed = true;
        let iters = 0;
        while (changed && iters < 12) {
            changed = false;
            iters++;
            for (let i = 0; i < 3; i++) {
                // Zeilen
                const r0 = matrix[i][0], r1 = matrix[i][1], r2 = matrix[i][2];
                if (r0 !== null && r1 !== null && r2 === null) { matrix[i][2] = r0 + r1; changed = true; }
                if (r0 !== null && r2 !== null && r1 === null) { matrix[i][1] = r2 - r0; changed = true; }
                if (r1 !== null && r2 !== null && r0 === null) { matrix[i][0] = r2 - r1; changed = true; }

                // Spalten
                const c0 = matrix[0][i], c1 = matrix[1][i], c2 = matrix[2][i];
                if (c0 !== null && c1 !== null && c2 === null) { matrix[2][i] = c0 + c1; changed = true; }
                if (c0 !== null && c2 !== null && c1 === null) { matrix[1][i] = c2 - c0; changed = true; }
                if (c1 !== null && c2 !== null && c0 === null) { matrix[0][i] = c2 - c1; changed = true; }
            }
        }

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (matrix[r][c] !== null) {
                    d.data[r][c] = String(Math.round((matrix[r][c] as number) * 100000) / 100000).replace('.', ',');
                }
            }
        }
        this.touchRender();
    },

    generateVfPuzzle() {
        this.autofillVf();
        const d = this.workingModule?.data;
        if (!d) return;

        const patterns = [
            [[0, 0], [0, 2], [1, 1], [2, 0]],
            [[0, 1], [1, 0], [2, 1], [2, 2]],
            [[0, 0], [1, 0], [1, 1], [2, 2]],
            [[0, 0], [0, 1], [1, 2], [2, 2]],
            [[0, 1], [0, 2], [1, 0], [2, 2]],
            [[0, 0], [1, 1], [1, 2], [2, 0]]
        ];
        const selected = patterns[Math.floor(Math.random() * patterns.length)];

        d.printVisibility = [
            [false, false, false],
            [false, false, false],
            [false, false, false]
        ];
        selected.forEach(([r, c]) => {
            d.printVisibility[r][c] = true;
        });
        this.touchRender();
    },

    setAllVfVisible(val: boolean) {
        const d = this.workingModule?.data;
        if (!d) return;
        d.printVisibility = [
            [val, val, val],
            [val, val, val],
            [val, val, val]
        ];
        this.touchRender();
    },

    setVfScale(scale: 'compact' | 'normal' | 'large') {
        if (!this.workingModule?.data) return;
        this.workingModule.data.scale = scale;
        this.touchRender();
    },

    getVfStudioStatusText(): string {
        const d = this.workingModule?.data;
        if (!d || !d.printVisibility) return '';
        let vis = 0;
        let blk = 0;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (d.printVisibility[r]?.[c]) vis++;
                else blk++;
            }
        }
        if (blk === 0) return 'Alle 9 Felder sichtbar';
        if (vis === 0) return 'Komplett leere Schülertabelle';
        return `${vis} sichtbar, ${blk} Lücken für Schüler`;
    },

    renderMath(text: any): string {
        if (!text && text !== 0) return '';
        const str = String(text);
        const win = window as any;
        if (typeof win.katex !== 'undefined') {
            return str.replace(/\$([^$]+?)\$/g, (match, math) => {
                try {
                    return win.katex.renderToString(math, { throwOnError: false, displayMode: false });
                } catch {
                    return match;
                }
            });
        }
        return str;
    },

    // ── Spezifische Helfer für Urnenmodell ────────────────────────

    ensureUrneStudioProperties() {
        if (!this.workingModule || this.workingModule.type !== 'urne') return;
        if (!this.workingModule.data) this.workingModule.data = {};
        const d = this.workingModule.data;
        if (!Array.isArray(d.kugeln)) {
            d.kugeln = [{ id: Date.now(), type: 'white', label: '' }];
        }
        if (!d.height) {
            d.height = 4.5;
        }
    },

    getUrnePreviewSvg(): string {
        this.renderTrigger;
        if (!this.workingModule || this.workingModule.type !== 'urne') return '';
        this.ensureUrneStudioProperties();
        return renderUrneSVG(this.workingModule.data, {
            interactive: true,
            activeBallId: this.activeKugelId
        });
    },

    getActiveKugel(): any | null {
        if (!this.workingModule || !this.workingModule.data || !Array.isArray(this.workingModule.data.kugeln)) return null;
        return this.workingModule.data.kugeln.find((k: any) => k.id === this.activeKugelId) || null;
    },

    selectKugel(id: number, event?: Event) {
        if (event) event.stopPropagation();
        this.activeKugelId = id;
        this.touchRender();

        const focusInput = () => {
            this.updateUrnePopoverPosition();
            const el = document.getElementById('studio-urne-label-input') as HTMLInputElement | null;
            if (el) {
                el.focus();
                el.select();
            }
        };
        if (typeof this.$nextTick === 'function') this.$nextTick(focusInput);
        setTimeout(focusInput, 40);
    },

    closeUrnePopover() {
        this.activeKugelId = null;
        this.touchRender();
    },

    handleUrneCanvasClick(e: Event) {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest('#studio-urne-popover')) return;

        const kugelEl = target.closest('[data-kugel-id]') as HTMLElement | null;
        if (kugelEl) {
            const rawId = kugelEl.getAttribute('data-kugel-id');
            if (rawId) {
                const kId = parseInt(rawId, 10);
                this.selectKugel(kId, e);
                return;
            }
        }
        this.closeUrnePopover();
    },

    updateUrnePopoverPosition() {
        if (this.activeKugelId === null || this.activeKugelId === undefined) return;
        const container = document.querySelector('.studio-urne-container') as HTMLElement | null;
        const popover = document.getElementById('studio-urne-popover');
        if (!container || !popover) return;

        const targetEl = container.querySelector(`[data-kugel-id="${this.activeKugelId}"]`);
        if (!targetEl) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const popX = Math.round(targetRect.left + targetRect.width / 2 - containerRect.left);
        let popY = Math.round(targetRect.top - containerRect.top);

        const placeBottom = popY < 130;
        if (placeBottom) {
            popY = Math.round(targetRect.bottom - containerRect.top);
        }

        popover.style.setProperty('--pop-x', `${popX}px`);
        popover.style.setProperty('--pop-y', `${popY}px`);
        if (placeBottom) {
            popover.classList.add('popover-placement-bottom');
        } else {
            popover.classList.remove('popover-placement-bottom');
        }
    },

    addQuickKugeln(count?: number, color?: string, label?: string) {
        if (!this.workingModule || this.workingModule.type !== 'urne') return;
        this.ensureUrneStudioProperties();
        const num = Math.max(1, count !== undefined ? count : (parseInt(this.quickKugelCount as any, 10) || 1));
        const col = color || this.quickKugelColor || 'white';
        const lbl = label !== undefined ? label : (this.quickKugelLabel || '');

        for (let i = 0; i < num; i++) {
            this.workingModule.data.kugeln.push({
                id: Date.now() + Math.floor(Math.random() * 100000) + i,
                type: col,
                label: lbl
            });
        }
        this.touchRender();
    },

    setKugelColor(col: string) {
        const k = this.getActiveKugel();
        if (k) {
            k.type = col;
            this.touchRender();
        }
    },

    removeActiveKugel() {
        if (!this.workingModule || this.activeKugelId === null) return;
        this.workingModule.data.kugeln = this.workingModule.data.kugeln.filter((k: any) => k.id !== this.activeKugelId);
        this.closeUrnePopover();
        this.touchRender();
    },

    removeKugelById(id: number) {
        if (!this.workingModule?.data?.kugeln) return;
        this.workingModule.data.kugeln = this.workingModule.data.kugeln.filter((k: any) => k.id !== id);
        if (this.activeKugelId === id) {
            this.closeUrnePopover();
        }
        this.touchRender();
    },

    selectNextKugel() {
        if (!this.workingModule?.data?.kugeln?.length) return;
        const list = this.workingModule.data.kugeln;
        const idx = list.findIndex((k: any) => k.id === this.activeKugelId);
        const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : list[0];
        this.selectKugel(next.id);
    },

    selectPrevKugel() {
        if (!this.workingModule?.data?.kugeln?.length) return;
        const list = this.workingModule.data.kugeln;
        const idx = list.findIndex((k: any) => k.id === this.activeKugelId);
        const prev = idx > 0 ? list[idx - 1] : list[list.length - 1];
        this.selectKugel(prev.id);
    },

    applyUrnePreset(preset: string) {
        if (!this.workingModule || this.workingModule.type !== 'urne') return;
        this.closeUrnePopover();
        const now = Date.now();
        let newKugeln: any[] = [];

        if (preset === 'mono') {
            // 4 Weiß, 4 Grau, 4 Schwarz
            ['white', 'grey', 'black'].forEach((color, cIdx) => {
                for (let i = 0; i < 4; i++) {
                    newKugeln.push({ id: now + cIdx * 10 + i, type: color, label: '' });
                }
            });
        } else if (preset === 'rgb') {
            // 3 Rot, 3 Grün, 3 Blau
            ['red', 'green', 'blue'].forEach((color, cIdx) => {
                for (let i = 0; i < 3; i++) {
                    newKugeln.push({ id: now + cIdx * 10 + i, type: color, label: '' });
                }
            });
        } else if (preset === 'ampel') {
            // 4 Rot, 2 Gelb, 4 Grün
            for (let i = 0; i < 4; i++) newKugeln.push({ id: now + i, type: 'red', label: '' });
            for (let i = 0; i < 2; i++) newKugeln.push({ id: now + 10 + i, type: 'yellow', label: '' });
            for (let i = 0; i < 4; i++) newKugeln.push({ id: now + 20 + i, type: 'green', label: '' });
        } else if (preset === 'two_colors') {
            // 4 Rot, 6 Blau
            for (let i = 0; i < 4; i++) newKugeln.push({ id: now + i, type: 'red', label: '' });
            for (let i = 0; i < 6; i++) newKugeln.push({ id: now + 10 + i, type: 'blue', label: '' });
        } else if (preset === 'numbered') {
            // 1 bis 10 nummeriert
            for (let i = 1; i <= 10; i++) {
                newKugeln.push({ id: now + i, type: 'white', label: String(i) });
            }
        } else if (preset === 'clear') {
            newKugeln = [];
        }

        this.workingModule.data.kugeln = newKugeln;
        this.touchRender();
    },

    shuffleUrneStudio() {
        if (!this.workingModule?.data?.kugeln) return;
        this.closeUrnePopover();
        const list = this.workingModule.data.kugeln;
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        this.touchRender();
    },

    sortUrneStudio() {
        if (!this.workingModule?.data?.kugeln) return;
        this.closeUrnePopover();
        const colorOrder: Record<string, number> = {
            'white': 1, 'grey': 2, 'black': 3, 'red': 4, 'yellow': 5, 'green': 6, 'blue': 7, 'dashed': 8
        };
        this.workingModule.data.kugeln.sort((a: any, b: any) => {
            const cA = colorOrder[a.type || 'white'] || 99;
            const cB = colorOrder[b.type || 'white'] || 99;
            if (cA !== cB) return cA - cB;
            return (a.label || '').localeCompare(b.label || '', undefined, { numeric: true });
        });
        this.touchRender();
    },

    setUrneHeight(h: number) {
        if (!this.workingModule?.data) return;
        this.workingModule.data.height = Math.max(2, Math.min(25, parseFloat(h as any) || 4.5));
        this.touchRender();
    },

    getUrneStudioStatusText(): string {
        if (!this.workingModule || !this.workingModule.data || !Array.isArray(this.workingModule.data.kugeln)) return '0 Kugeln';
        const balls = this.workingModule.data.kugeln;
        if (balls.length === 0) return 'Urne ist leer';
        const counts: Record<string, number> = {};
        balls.forEach((k: any) => {
            const t = (k.type || 'white').toLowerCase();
            counts[t] = (counts[t] || 0) + 1;
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
            .join(' ');
        return `${balls.length} ${balls.length === 1 ? 'Kugel' : 'Kugeln'} (${summary})`;
    },

    // ── Spezifische Helfer für Glücksrad ─────────────────────────

    ensureGluecksradStudioProperties() {
        if (!this.workingModule?.data) {
            this.workingModule.data = {};
        }
        const data = this.workingModule.data;
        if (data.height === undefined) data.height = 4.5;
        if (data.showPointer === undefined) data.showPointer = true;
        if (!Array.isArray(data.sektoren) || data.sektoren.length === 0) {
            data.sektoren = [
                { id: 1, type: 'white', label: '1', weight: 1 },
                { id: 2, type: 'grey', label: '2', weight: 1 },
                { id: 3, type: 'white', label: '3', weight: 1 },
                { id: 4, type: 'grey', label: '4', weight: 1 },
            ];
        }
        this.activeSectorId = null;
    },

    getGluecksradPreviewSvg(): string {
        if (!this.workingModule?.data) return '';
        // dependency on renderTrigger
        const _ = this.renderTrigger;
        return renderGluecksrad(this.workingModule.data, {
            interactive: true,
            activeSectorId: this.activeSectorId
        });
    },

    getActiveSector(): any {
        if (!this.workingModule?.data?.sektoren || !this.activeSectorId) return null;
        return this.workingModule.data.sektoren.find((s: any) => s.id === this.activeSectorId) || null;
    },

    selectSector(id: number, evt?: MouseEvent) {
        this.activeSectorId = id;
        this.touchRender();

        setTimeout(() => {
            let elem: Element | null = null;
            if (evt?.currentTarget) {
                elem = evt.currentTarget as Element;
            } else {
                elem = document.querySelector(`[data-sector-id="${id}"]`);
            }
            this.updateGluecksradPopoverPosition(elem);
        }, 10);
    },

    closeGluecksradPopover() {
        this.activeSectorId = null;
        this.touchRender();
    },

    handleGluecksradCanvasClick(evt: MouseEvent) {
        const target = evt.target as HTMLElement | SVGElement;
        const sectorElem = target.closest('[data-sector-id]');
        if (sectorElem) {
            const rawId = sectorElem.getAttribute('data-sector-id');
            const secId = rawId ? parseInt(rawId) : null;
            if (secId !== null && !isNaN(secId)) {
                this.selectSector(secId, evt);
                return;
            }
        }
        const popover = document.getElementById('studio-gluecksrad-popover');
        if (popover && popover.contains(target)) {
            return;
        }
        this.closeGluecksradPopover();
    },

    updateGluecksradPopoverPosition(elem?: Element | null) {
        const targetElem = elem || (this.activeSectorId ? document.querySelector(`[data-sector-id="${this.activeSectorId}"]`) : null);
        const container = document.querySelector('.studio-gluecksrad-container') as HTMLElement;
        const popover = document.getElementById('studio-gluecksrad-popover');

        if (!targetElem || !container || !popover) return;

        const targetRect = targetElem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        let posX = (targetRect.left + targetRect.right) / 2 - containerRect.left;
        let posY = (targetRect.top + targetRect.bottom) / 2 - containerRect.top;

        const popoverWidth = popover.offsetWidth || 300;
        const popoverHeight = popover.offsetHeight || 220;

        // Position popover slightly to the right of the sector
        posX += 40;
        posY -= popoverHeight / 2;

        if (posX + popoverWidth > containerRect.width - 15) {
            posX = (targetRect.left - containerRect.left) - popoverWidth - 20;
        }
        if (posX < 15) posX = 15;
        if (posY + popoverHeight > containerRect.height - 15) {
            posY = containerRect.height - popoverHeight - 15;
        }
        if (posY < 15) posY = 15;

        this.popoverPos = { x: Math.round(posX), y: Math.round(posY) };
    },

    setSectorColor(type: string) {
        const sector = this.getActiveSector();
        if (!sector) return;
        sector.type = type;
        this.touchRender();
    },

    setSectorWeight(w: number) {
        const sector = this.getActiveSector();
        if (!sector) return;
        sector.weight = Math.max(0.1, parseFloat(w as any) || 1);
        this.touchRender();
    },

    addSector(color?: string, label?: string, weight?: number) {
        if (!this.workingModule?.data) return;
        if (!Array.isArray(this.workingModule.data.sektoren)) {
            this.workingModule.data.sektoren = [];
        }
        const sectors = this.workingModule.data.sektoren;
        const newId = Date.now();
        const defaultLabel = (sectors.length + 1).toString();
        const newSector = {
            id: newId,
            type: color || 'white',
            label: label !== undefined ? label : defaultLabel,
            weight: weight !== undefined ? Math.max(0.1, weight) : 1
        };
        sectors.push(newSector);
        this.touchRender();
        this.selectSector(newId);
    },

    removeActiveSector() {
        if (!this.workingModule?.data?.sektoren || !this.activeSectorId) return;
        const sectors = this.workingModule.data.sektoren;
        if (sectors.length <= 1) {
            // Keep at least one sector
            sectors[0].label = '';
            sectors[0].type = 'white';
            sectors[0].weight = 1;
            this.touchRender();
            return;
        }
        const idx = sectors.findIndex((s: any) => s.id === this.activeSectorId);
        sectors.splice(idx, 1);
        if (sectors.length > 0) {
            const nextIdx = Math.min(idx, sectors.length - 1);
            this.selectSector(sectors[nextIdx].id);
        } else {
            this.closeGluecksradPopover();
        }
        this.touchRender();
    },

    selectNextSector() {
        if (!this.workingModule?.data?.sektoren || !this.activeSectorId) return;
        const sectors = this.workingModule.data.sektoren;
        const idx = sectors.findIndex((s: any) => s.id === this.activeSectorId);
        if (idx !== -1 && sectors.length > 1) {
            const nextIdx = (idx + 1) % sectors.length;
            this.selectSector(sectors[nextIdx].id);
        }
    },

    selectPrevSector() {
        if (!this.workingModule?.data?.sektoren || !this.activeSectorId) return;
        const sectors = this.workingModule.data.sektoren;
        const idx = sectors.findIndex((s: any) => s.id === this.activeSectorId);
        if (idx !== -1 && sectors.length > 1) {
            const prevIdx = (idx - 1 + sectors.length) % sectors.length;
            this.selectSector(sectors[prevIdx].id);
        }
    },

    applyGluecksradStudioPreset(presetType: string) {
        if (!this.workingModule?.data) return;
        this.closeGluecksradPopover();

        if (presetType === '4_equal') {
            this.workingModule.data.sektoren = [
                { id: Date.now() + 1, type: 'white', label: '1', weight: 1 },
                { id: Date.now() + 2, type: 'grey', label: '2', weight: 1 },
                { id: Date.now() + 3, type: 'white', label: '3', weight: 1 },
                { id: Date.now() + 4, type: 'grey', label: '4', weight: 1 }
            ];
        } else if (presetType === '6_equal') {
            const colors = ['white', 'grey', 'white', 'grey', 'white', 'grey'];
            this.workingModule.data.sektoren = Array.from({ length: 6 }, (_, i) => ({
                id: Date.now() + i + 1,
                type: colors[i],
                label: (i + 1).toString(),
                weight: 1
            }));
        } else if (presetType === '8_equal') {
            const colors = ['white', 'grey', 'white', 'grey', 'white', 'grey', 'white', 'grey'];
            this.workingModule.data.sektoren = Array.from({ length: 8 }, (_, i) => ({
                id: Date.now() + i + 1,
                type: colors[i],
                label: (i + 1).toString(),
                weight: 1
            }));
        } else if (presetType === '12_equal') {
            this.workingModule.data.sektoren = Array.from({ length: 12 }, (_, i) => ({
                id: Date.now() + i + 1,
                type: i % 2 === 0 ? 'white' : 'grey',
                label: (i + 1).toString(),
                weight: 1
            }));
        } else if (presetType === 'farben_4') {
            this.workingModule.data.sektoren = [
                { id: Date.now() + 1, type: 'red', label: 'Rot', weight: 1 },
                { id: Date.now() + 2, type: 'yellow', label: 'Gelb', weight: 1 },
                { id: Date.now() + 3, type: 'green', label: 'Grün', weight: 1 },
                { id: Date.now() + 4, type: 'blue', label: 'Blau', weight: 1 }
            ];
        } else if (presetType === 'unequal_half_quarter') {
            this.workingModule.data.sektoren = [
                { id: Date.now() + 1, type: 'red', label: '1/2', weight: 4 },
                { id: Date.now() + 2, type: 'yellow', label: '1/4', weight: 2 },
                { id: Date.now() + 3, type: 'blue', label: '1/8', weight: 1 },
                { id: Date.now() + 4, type: 'green', label: '1/8', weight: 1 }
            ];
        } else if (presetType === 'gewinnspiel') {
            this.workingModule.data.sektoren = [
                { id: Date.now() + 1, type: 'grey', label: '0 €', weight: 5 },
                { id: Date.now() + 2, type: 'yellow', label: '1 €', weight: 3 },
                { id: Date.now() + 3, type: 'green', label: '2 €', weight: 1 },
                { id: Date.now() + 4, type: 'red', label: '5 €', weight: 1 }
            ];
        } else if (presetType === 'clear') {
            this.workingModule.data.sektoren = [
                { id: Date.now() + 1, type: 'white', label: '', weight: 1 }
            ];
        }
        this.touchRender();
    },

    getGluecksradTotalWeight(): number {
        if (!this.workingModule?.data?.sektoren) return 1;
        return this.workingModule.data.sektoren.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 1), 0) || 1;
    },

    getGluecksradSectorAngle(sector: any): string {
        if (!sector) return '';
        const total = this.getGluecksradTotalWeight();
        const weight = parseFloat(sector.weight) || 1;
        const frac = weight / total;
        const deg = Math.round(frac * 360);
        const pct = Math.round(frac * 100);
        return `${deg}° (${pct}%)`;
    },

    toggleGluecksradPointer() {
        if (!this.workingModule?.data) return;
        this.workingModule.data.showPointer = !this.workingModule.data.showPointer;
        this.touchRender();
    },

    setGluecksradHeight(h: number) {
        if (!this.workingModule?.data) return;
        this.workingModule.data.height = Math.max(2, Math.min(25, parseFloat(h as any) || 4.5));
        this.touchRender();
    },

    getGluecksradStudioStatusText(): string {
        if (!this.workingModule?.data?.sektoren) return '0 Sektoren';
        const count = this.workingModule.data.sektoren.length;
        const totalW = this.getGluecksradTotalWeight();
        const pointerText = this.workingModule.data.showPointer ? 'mit Zeiger' : 'ohne Zeiger';
        return `${count} ${count === 1 ? 'Sektor' : 'Sektoren'} | Gesamtgewicht: ${totalW} | ${pointerText}`;
    },

    // ── Spezifische Helfer für Diagramme ─────────────────────────

    ensureDiagrammStudioProperties() {
        if (!this.workingModule?.data) {
            this.workingModule.data = {};
        }
        const data = this.workingModule.data;
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
        if (!Array.isArray(data.items)) {
            data.items = [
                { label: 'A', value: 4 },
                { label: 'B', value: 8 },
                { label: 'C', value: 6 },
                { label: 'D', value: 2 },
            ];
        }
        this.activeDiagItemIdx = null;
    },

    getDiagrammPreviewSvg(): string {
        if (!this.workingModule?.data) return '';
        const _ = this.renderTrigger;
        return renderDiagram(this.workingModule.data, {
            interactive: true,
            activeItemIdx: this.activeDiagItemIdx
        });
    },

    getActiveDiagItem(): any {
        if (!this.workingModule?.data?.items || this.activeDiagItemIdx === null) return null;
        return this.workingModule.data.items[this.activeDiagItemIdx] || null;
    },

    selectDiagItem(idx: number, evt?: MouseEvent) {
        this.activeDiagItemIdx = idx;
        this.touchRender();

        setTimeout(() => {
            let elem: Element | null = null;
            if (evt?.currentTarget) {
                elem = evt.currentTarget as Element;
            } else {
                elem = document.querySelector(`[data-item-idx="${idx}"]`);
            }
            this.updateDiagPopoverPosition(elem);
        }, 10);
    },

    closeDiagPopover() {
        this.activeDiagItemIdx = null;
        this.touchRender();
    },

    handleDiagCanvasClick(evt: MouseEvent) {
        const target = evt.target as HTMLElement | SVGElement;
        const itemElem = target.closest('[data-item-idx]');
        if (itemElem) {
            const rawIdx = itemElem.getAttribute('data-item-idx');
            const idx = rawIdx !== null ? parseInt(rawIdx, 10) : null;
            if (idx !== null && !isNaN(idx)) {
                this.selectDiagItem(idx, evt);
                return;
            }
        }
        const popover = document.getElementById('studio-diag-popover');
        if (popover && popover.contains(target)) {
            return;
        }
        this.closeDiagPopover();
    },

    updateDiagPopoverPosition(elem?: Element | null) {
        const targetElem = elem || (this.activeDiagItemIdx !== null ? document.querySelector(`[data-item-idx="${this.activeDiagItemIdx}"]`) : null);
        const container = document.querySelector('.studio-diag-container') as HTMLElement;
        const popover = document.getElementById('studio-diag-popover');

        if (!targetElem || !container || !popover) return;

        const targetRect = targetElem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        let x = (targetRect.left + targetRect.right) / 2 - containerRect.left;
        let y = targetRect.top - containerRect.top;

        const popoverWidth = popover.offsetWidth || 260;
        const popoverHeight = popover.offsetHeight || 180;

        // Horizontally center over item
        x = x - popoverWidth / 2;
        // Position above item
        y = y - popoverHeight - 12;

        // Flip below if too high
        if (y < 10) {
            y = targetRect.bottom - containerRect.top + 12;
        }

        // Horizontal clamp
        if (x + popoverWidth > containerRect.width - 15) {
            x = containerRect.width - popoverWidth - 15;
        }
        if (x < 15) {
            x = 15;
        }

        const finalX = Math.round(x);
        const finalY = Math.round(y);
        popover.style.setProperty('--pop-x', `${finalX}px`);
        popover.style.setProperty('--pop-y', `${finalY}px`);
        this.popoverPos = {
            x: finalX,
            y: finalY
        };
    },

    setDiagType(type: 'saeule' | 'balken' | 'stab' | 'linie') {
        if (!this.workingModule?.data) return;
        this.workingModule.data.type = type;
        this.touchRender();
    },

    setDiagMode(mode: 'show' | 'draw' | 'read') {
        if (!this.workingModule?.data) return;
        this.workingModule.data.mode = mode;
        this.touchRender();
    },

    setDiagFillType(fill: string) {
        if (!this.workingModule?.data) return;
        this.workingModule.data.fillType = fill;
        this.touchRender();
    },

    toggleDiagGrid() {
        if (!this.workingModule?.data) return;
        this.workingModule.data.showGrid = this.workingModule.data.showGrid === false;
        this.touchRender();
    },

    addDiagItem(label?: string, value?: number) {
        if (!this.workingModule?.data) return;
        if (!Array.isArray(this.workingModule.data.items)) {
            this.workingModule.data.items = [];
        }
        const items = this.workingModule.data.items;
        const defaultVal = value !== undefined ? value : Math.min(this.workingModule.data.yMax || 10, 5);
        const defaultLbl = label !== undefined ? label : `Kat ${items.length + 1}`;
        items.push({ label: defaultLbl, value: defaultVal });
        this.touchRender();
        this.selectDiagItem(items.length - 1);
    },

    removeActiveDiagItem() {
        if (!this.workingModule?.data?.items || this.activeDiagItemIdx === null) return;
        const items = this.workingModule.data.items;
        items.splice(this.activeDiagItemIdx, 1);
        if (items.length > 0) {
            const nextIdx = Math.min(this.activeDiagItemIdx, items.length - 1);
            this.selectDiagItem(nextIdx);
        } else {
            this.closeDiagPopover();
        }
        this.touchRender();
    },

    removeDiagItemByIdx(idx: number) {
        if (!this.workingModule?.data?.items) return;
        this.workingModule.data.items.splice(idx, 1);
        if (this.activeDiagItemIdx === idx) {
            this.closeDiagPopover();
        } else if (this.activeDiagItemIdx !== null && this.activeDiagItemIdx > idx) {
            this.activeDiagItemIdx--;
        }
        this.touchRender();
    },

    selectNextDiagItem() {
        if (!this.workingModule?.data?.items || this.activeDiagItemIdx === null) return;
        const items = this.workingModule.data.items;
        if (items.length > 1) {
            const next = (this.activeDiagItemIdx + 1) % items.length;
            this.selectDiagItem(next);
        }
    },

    selectPrevDiagItem() {
        if (!this.workingModule?.data?.items || this.activeDiagItemIdx === null) return;
        const items = this.workingModule.data.items;
        if (items.length > 1) {
            const prev = (this.activeDiagItemIdx - 1 + items.length) % items.length;
            this.selectDiagItem(prev);
        }
    },

    applyDiagrammStudioPreset(presetKey: string) {
        if (!this.workingModule?.data) return;
        this.closeDiagPopover();
        const data = this.workingModule.data;

        if (presetKey === 'notenspiegel') {
            data.type = 'saeule';
            data.title = 'Notenspiegel der Klassenarbeit';
            data.xAxisLabel = 'Note';
            data.yAxisLabel = 'Anzahl';
            data.yMax = 10;
            data.yStep = 1;
            data.showGrid = true;
            data.items = [
                { label: 'Note 1', value: 3 },
                { label: 'Note 2', value: 7 },
                { label: 'Note 3', value: 9 },
                { label: 'Note 4', value: 5 },
                { label: 'Note 5', value: 2 },
                { label: 'Note 6', value: 1 }
            ];
        } else if (presetKey === 'wuerfel') {
            data.type = 'saeule';
            data.title = 'Ergebnisse von 50 Würfelwürfen';
            data.xAxisLabel = 'Augenzahl';
            data.yAxisLabel = 'Häufigkeit';
            data.yMax = 15;
            data.yStep = 2;
            data.showGrid = true;
            data.items = [
                { label: '1', value: 8 },
                { label: '2', value: 9 },
                { label: '3', value: 7 },
                { label: '4', value: 11 },
                { label: '5', value: 10 },
                { label: '6', value: 5 }
            ];
        } else if (presetKey === 'wochentage') {
            data.type = 'linie';
            data.title = 'Temperaturverlauf um 12:00 Uhr (°C)';
            data.xAxisLabel = 'Wochentag';
            data.yAxisLabel = 'Temperatur (°C)';
            data.yMax = 25;
            data.yStep = 5;
            data.showGrid = true;
            data.items = [
                { label: 'Mo', value: 14 },
                { label: 'Di', value: 17 },
                { label: 'Mi', value: 16 },
                { label: 'Do', value: 21 },
                { label: 'Fr', value: 19 }
            ];
        } else if (presetKey === 'haustiere') {
            data.type = 'balken';
            data.title = 'Beliebteste Haustiere in Klasse 5b';
            data.xAxisLabel = 'Stimmen';
            data.yAxisLabel = 'Tierart';
            data.yMax = 12;
            data.yStep = 2;
            data.showGrid = true;
            data.items = [
                { label: 'Katze', value: 11 },
                { label: 'Hund', value: 9 },
                { label: 'Kaninchen', value: 5 },
                { label: 'Vogel', value: 3 },
                { label: 'Fische', value: 2 }
            ];
        } else if (presetKey === 'quartale') {
            data.type = 'saeule';
            data.title = 'Schul-Kiosk Umsatz (in Tsd. €)';
            data.xAxisLabel = 'Quartal';
            data.yAxisLabel = 'Umsatz (Tsd. €)';
            data.yMax = 8;
            data.yStep = 1;
            data.showGrid = true;
            data.items = [
                { label: 'Q1', value: 4 },
                { label: 'Q2', value: 6 },
                { label: 'Q3', value: 3 },
                { label: 'Q4', value: 7 }
            ];
        } else if (presetKey === 'clear') {
            data.title = '';
            data.xAxisLabel = '';
            data.yAxisLabel = '';
            data.items = [];
        }
        this.touchRender();
    },

    getDiagrammStudioStatusText(): string {
        if (!this.workingModule?.data?.items) return '0 Kategorien';
        const typeMap: Record<string, string> = {
            saeule: 'Säulendiagramm',
            balken: 'Balkendiagramm',
            stab: 'Stabdiagramm',
            linie: 'Liniendiagramm'
        };
        const count = this.workingModule.data.items.length;
        const typeName = typeMap[this.workingModule.data.type || 'saeule'] || 'Diagramm';
        const mode = this.workingModule.data.mode || 'show';
        const modeText = mode === 'draw' ? 'Einzeichnen' : mode === 'read' ? 'Ablesen' : 'Anzeigen';
        return `${typeName} | ${count} ${count === 1 ? 'Kategorie' : 'Kategorien'} | Modus: ${modeText}`;
    },

    // ── Spezifische Helfer für Wahrscheinlichkeitsverteilungen ──

    ensureVerteilungStudioProperties() {
        if (!this.workingModule?.data) {
            this.workingModule.data = {};
        }
        const data = this.workingModule.data;
        if (!data.type) data.type = 'binomial';
        if (data.n === undefined) data.n = 10;
        if (data.p === undefined) data.p = 0.5;
        if (data.mu === undefined) data.mu = 0;
        if (data.sigma === undefined) data.sigma = 1;
        if (!data.settings) data.settings = { width: 10, height: 6 };
        if (!data.markArea) data.markArea = { show: false, min: 2, max: 5 };
    },

    getVerteilungPreviewSvg(): string {
        if (!this.workingModule?.data) return '';
        const _ = this.renderTrigger;
        return renderVerteilungSVG(this.workingModule.data, {
            interactive: true
        });
    },

    setVerteilungType(type: 'binomial' | 'normal') {
        if (!this.workingModule?.data) return;
        this.workingModule.data.type = type;
        if (type === 'binomial') {
            const n = Math.round(Number(this.workingModule.data.n) || 10);
            const p = Number(this.workingModule.data.p) !== undefined ? Number(this.workingModule.data.p) : 0.5;
            const mu = n * p;
            const sigma = Math.sqrt(n * p * (1 - p));
            this.workingModule.data.markArea = {
                show: this.workingModule.data.markArea?.show || false,
                min: Math.max(0, Math.floor(mu - sigma)),
                max: Math.min(n, Math.ceil(mu + sigma))
            };
        } else {
            const mu = Number(this.workingModule.data.mu) || 0;
            const sigma = Number(this.workingModule.data.sigma) || 1;
            this.workingModule.data.markArea = {
                show: this.workingModule.data.markArea?.show || false,
                min: Number((mu - sigma).toFixed(2)),
                max: Number((mu + sigma).toFixed(2))
            };
        }
        this.touchRender();
    },

    setVerteilungN(n: any) {
        if (!this.workingModule?.data) return;
        const val = Math.max(1, Math.min(250, parseInt(n, 10) || 10));
        this.workingModule.data.n = val;
        if (this.workingModule.data.markArea) {
            if (this.workingModule.data.markArea.max > val) {
                this.workingModule.data.markArea.max = val;
            }
        }
        this.touchRender();
    },

    setVerteilungP(p: any) {
        if (!this.workingModule?.data) return;
        const val = Math.max(0, Math.min(1, parseFloat(p) || 0));
        this.workingModule.data.p = Number(val.toFixed(3));
        this.touchRender();
    },

    setVerteilungMu(mu: any) {
        if (!this.workingModule?.data) return;
        this.workingModule.data.mu = parseFloat(mu) || 0;
        this.touchRender();
    },

    setVerteilungSigma(sigma: any) {
        if (!this.workingModule?.data) return;
        const val = Math.max(0.01, parseFloat(sigma) || 1);
        this.workingModule.data.sigma = Number(val.toFixed(2));
        this.touchRender();
    },

    toggleVerteilungMarkArea() {
        if (!this.workingModule?.data) return;
        if (!this.workingModule.data.markArea) {
            this.workingModule.data.markArea = { show: true, min: 0, max: 5 };
        } else {
            this.workingModule.data.markArea.show = !this.workingModule.data.markArea.show;
        }
        this.touchRender();
    },

    setVerteilungMarkArea(min: any, max: any) {
        if (!this.workingModule?.data) return;
        if (!this.workingModule.data.markArea) {
            this.workingModule.data.markArea = { show: true, min: 0, max: 0 };
        }
        this.workingModule.data.markArea.show = true;
        this.workingModule.data.markArea.min = parseFloat(min) || 0;
        this.workingModule.data.markArea.max = parseFloat(max) || 0;
        this.touchRender();
    },

    applyVerteilungIntervalPreset(presetKey: string) {
        if (!this.workingModule?.data) return;
        const data = this.workingModule.data;
        const isBinomial = data.type !== 'normal';

        if (isBinomial) {
            const n = Math.round(Number(data.n) || 10);
            const p = Number(data.p) !== undefined ? Number(data.p) : 0.5;
            const mu = n * p;
            const sigma = Math.sqrt(n * p * (1 - p));

            let min = 0;
            let max = n;

            switch (presetKey) {
                case 'links':
                    min = 0;
                    max = Math.floor(mu);
                    break;
                case 'rechts':
                    min = Math.ceil(mu);
                    max = n;
                    break;
                case 'sigma1':
                    min = Math.max(0, Math.floor(mu - sigma));
                    max = Math.min(n, Math.ceil(mu + sigma));
                    break;
                case 'sigma2':
                    min = Math.max(0, Math.floor(mu - 2 * sigma));
                    max = Math.min(n, Math.ceil(mu + 2 * sigma));
                    break;
                case 'mode':
                    min = Math.round(mu);
                    max = Math.round(mu);
                    break;
            }
            this.setVerteilungMarkArea(min, max);
        } else {
            const mu = Number(data.mu) || 0;
            const sigma = Math.max(0.01, Number(data.sigma) || 1);

            let min = mu - sigma;
            let max = mu + sigma;

            switch (presetKey) {
                case 'sigma1':
                    min = Number((mu - sigma).toFixed(2));
                    max = Number((mu + sigma).toFixed(2));
                    break;
                case 'sigma2':
                    min = Number((mu - 2 * sigma).toFixed(2));
                    max = Number((mu + 2 * sigma).toFixed(2));
                    break;
                case 'sigma3':
                    min = Number((mu - 3 * sigma).toFixed(2));
                    max = Number((mu + 3 * sigma).toFixed(2));
                    break;
                case '90pct':
                    min = Number((mu - 1.645 * sigma).toFixed(2));
                    max = Number((mu + 1.645 * sigma).toFixed(2));
                    break;
                case '95pct':
                    min = Number((mu - 1.96 * sigma).toFixed(2));
                    max = Number((mu + 1.96 * sigma).toFixed(2));
                    break;
                case '99pct':
                    min = Number((mu - 2.576 * sigma).toFixed(2));
                    max = Number((mu + 2.576 * sigma).toFixed(2));
                    break;
                case 'links':
                    min = Number((mu - 4 * sigma).toFixed(2));
                    max = Number(mu.toFixed(2));
                    break;
                case 'rechts':
                    min = Number(mu.toFixed(2));
                    max = Number((mu + 4 * sigma).toFixed(2));
                    break;
            }
            this.setVerteilungMarkArea(min, max);
        }
    },

    applyVerteilungStudioPreset(presetKey: string) {
        if (!this.workingModule?.data) return;

        switch (presetKey) {
            case 'coin':
                this.workingModule.data.type = 'binomial';
                this.workingModule.data.n = 10;
                this.workingModule.data.p = 0.5;
                this.workingModule.data.markArea = { show: true, min: 4, max: 6 };
                break;
            case 'dice':
                this.workingModule.data.type = 'binomial';
                this.workingModule.data.n = 30;
                this.workingModule.data.p = 0.17;
                this.workingModule.data.markArea = { show: true, min: 3, max: 7 };
                break;
            case 'mc':
                this.workingModule.data.type = 'binomial';
                this.workingModule.data.n = 20;
                this.workingModule.data.p = 0.25;
                this.workingModule.data.markArea = { show: true, min: 0, max: 5 };
                break;
            case 'defect':
                this.workingModule.data.type = 'binomial';
                this.workingModule.data.n = 50;
                this.workingModule.data.p = 0.04;
                this.workingModule.data.markArea = { show: true, min: 0, max: 2 };
                break;
            case 'poll':
                this.workingModule.data.type = 'binomial';
                this.workingModule.data.n = 100;
                this.workingModule.data.p = 0.40;
                this.workingModule.data.markArea = { show: true, min: 35, max: 45 };
                break;
            case 'norm_std':
                this.workingModule.data.type = 'normal';
                this.workingModule.data.mu = 0;
                this.workingModule.data.sigma = 1;
                this.workingModule.data.markArea = { show: true, min: -1.96, max: 1.96 };
                break;
            case 'norm_iq':
                this.workingModule.data.type = 'normal';
                this.workingModule.data.mu = 100;
                this.workingModule.data.sigma = 15;
                this.workingModule.data.markArea = { show: true, min: 85, max: 115 };
                break;
            case 'norm_height':
                this.workingModule.data.type = 'normal';
                this.workingModule.data.mu = 175;
                this.workingModule.data.sigma = 7;
                this.workingModule.data.markArea = { show: true, min: 168, max: 182 };
                break;
            case 'norm_fill':
                this.workingModule.data.type = 'normal';
                this.workingModule.data.mu = 500;
                this.workingModule.data.sigma = 10;
                this.workingModule.data.markArea = { show: true, min: 480, max: 520 };
                break;
        }
        this.touchRender();
    },

    getVerteilungCalculatedProb(): string {
        if (!this.workingModule?.data) return '';
        const data = this.workingModule.data;
        const markArea = data.markArea;
        if (!markArea || !markArea.show) return '';

        const min = Number(markArea.min) || 0;
        const max = Number(markArea.max) || 0;

        if (data.type === 'normal') {
            const mu = Number(data.mu) || 0;
            const sigma = Math.max(0.01, Number(data.sigma) || 1);
            const prob = Math.max(0, calcNormalCDF(max, mu, sigma) - calcNormalCDF(min, mu, sigma));
            return `P(${min} ≤ X ≤ ${max}) ≈ ${(prob * 100).toFixed(2)}%`;
        } else {
            const n = Math.round(Number(data.n) || 10);
            const p = Number(data.p) !== undefined ? Number(data.p) : 0.5;
            let sum = 0;
            const minK = Math.max(0, Math.ceil(min));
            const maxK = Math.min(n, Math.floor(max));
            for (let k = minK; k <= maxK; k++) {
                sum += calcBinomialProb(n, k, p);
            }
            return `P(${min} ≤ X ≤ ${max}) = ${(sum * 100).toFixed(2)}%`;
        }
    },

    getVerteilungStatusText(): string {
        if (!this.workingModule?.data) return '';
        const data = this.workingModule.data;
        const markArea = data.markArea;
        const markText = (markArea && markArea.show) 
            ? ` | Intervall: [${markArea.min}, ${markArea.max}]` 
            : '';

        if (data.type === 'normal') {
            const mu = Number(data.mu) || 0;
            const sigma = Number(data.sigma) || 1;
            return `Normalverteilung N(μ=${mu}, σ=${sigma})${markText}`;
        } else {
            const n = data.n !== undefined ? data.n : 10;
            const p = data.p !== undefined ? data.p : 0.5;
            const mu = (n * p).toFixed(2);
            const sigma = Math.sqrt(n * p * (1 - p)).toFixed(2);
            return `Binomialverteilung B(n=${n}, p=${p}) | μ=${mu}, σ=${sigma}${markText}`;
        }
    },

    handleVerteilungCanvasClick(evt: MouseEvent) {
        const target = evt.target as HTMLElement | SVGElement;
        const barElem = target.closest('[data-k]');
        if (barElem && this.workingModule?.data?.type !== 'normal') {
            const rawK = barElem.getAttribute('data-k');
            if (rawK !== null) {
                const k = parseInt(rawK, 10);
                if (!isNaN(k)) {
                    if (!this.workingModule.data.markArea) {
                        this.workingModule.data.markArea = { show: true, min: k, max: k };
                    } else if (!this.workingModule.data.markArea.show) {
                        this.workingModule.data.markArea.show = true;
                        this.workingModule.data.markArea.min = k;
                        this.workingModule.data.markArea.max = k;
                    } else {
                        const currMin = this.workingModule.data.markArea.min;
                        const currMax = this.workingModule.data.markArea.max;
                        if (k < currMin) {
                            this.workingModule.data.markArea.min = k;
                        } else if (k > currMax) {
                            this.workingModule.data.markArea.max = k;
                        } else if (k === currMin && k === currMax) {
                            this.workingModule.data.markArea.show = false;
                        } else {
                            this.workingModule.data.markArea.max = k;
                        }
                    }
                    this.touchRender();
                }
            }
        }
    },

    // ── Allgemeine Anzeige-Helfer ────────────────────────────────

    getModuleTitle(): string {
        if (!this.workingModule) return '';
        const def = MODULE_REGISTRY[this.workingModule.type as ModuleType];
        return def?.name || this.workingModule.type;
    },

    getModuleIcon(): string {
        if (!this.workingModule) return '';
        const def = MODULE_REGISTRY[this.workingModule.type as ModuleType];
        return def?.icon || '🧩';
    },

    getModuleCategory(): string {
        if (!this.workingModule) return 'layout';
        const def = MODULE_REGISTRY[this.workingModule.type as ModuleType];
        return def?.category || 'layout';
    }
});
