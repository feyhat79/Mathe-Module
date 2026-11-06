/**
 * DOM-based Pagination Engine (Accumulated Shift)
 * 
 * Reliably prevents atomic blocks from crossing page boundaries.
 * Uses recursive offset calculation to handle arbitrary nesting.
 */

export interface PaginationContext {
    _paginationTimer?: any;
    _isPaginating?: boolean;
}

export const calculatePagination = (ctx: PaginationContext): void => {
    clearTimeout(ctx._paginationTimer);
    ctx._paginationTimer = setTimeout(() => {
        _doPaginate(ctx);
    }, 150);
};

export const _doPaginate = (ctx: PaginationContext): void => {
    const container = document.getElementById('main-canvas');
    if (!container) return;

    ctx._isPaginating = true;

    // --- Absolute Konstanten des A4-Layouts ---
    const MARGIN_TOP = 57;              // 15mm Padding oben
    const MARGIN_BOTTOM = 76;           // 20mm Padding unten
    const PRINT_SAFETY_BUFFER = 16;     // ~4.2mm Sicherheitspuffer gegen Browser-Druck-Rundungsdifferenzen
    const PAGE_HEIGHT = 1122;           // 297mm in Pixeln
    const GAP = 40;                     // Grauer Abstand zwischen den Seiten

    const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - PRINT_SAFETY_BUFFER; // 973px
    const TOTAL_PAGE_STEP = PAGE_HEIGHT + GAP;                                             // exakt 1162px

    const overlay = document.getElementById('page-breaks-overlay');
    const rawBlocks = Array.from(container.querySelectorAll('.atomic-block')) as HTMLElement[];

    // 1. Reset aller bisherigen Umbrüche auf allen potenziellen Blöcken
    rawBlocks.forEach(b => {
        b.style.setProperty('--page-push', '0px');
        b.classList.remove('print-break-before', 'is-page-pushed');
    });

    // Nur sichtbare Top-Level Atomic-Blocks berücksichtigen (keine ausgeblendeten oder verschachtelten Blöcke)
    const allBlocks = rawBlocks.filter(b => {
        if (b.offsetParent === null) return false;
        if (b.classList.contains('is-empty-print-hide')) return false;
        if (b.parentElement?.closest('.atomic-block')) return false;
        return true;
    });

    if (overlay) overlay.innerHTML = '';

    if (allBlocks.length === 0) {
        ctx._isPaginating = false;
        return;
    }

    // 2. Linearer Pass anhand der physischen DOM-Positionen
    for (let i = 0; i < allBlocks.length; i++) {
        const block = allBlocks[i];
        const containerRect = container.getBoundingClientRect();

        // Genaue Messung im DOM (berücksichtigt alle vorherigen Pushes direkt,
        // da der Browser nach jedem setProperty neu berechnet)
        const rect = block.getBoundingClientRect();
        const topInContainer = rect.top - containerRect.top;
        const height = rect.height;
        const bottomInContainer = topInContainer + height;

        // Auf welcher visuellen Seite beginnt das Element aktuell physisch?
        const visualStartPage = Math.floor(Math.max(0, topInContainer) / TOTAL_PAGE_STEP);

        // Die nutzbare Content-Area dieser physischen Seite
        const contentStart = (visualStartPage * TOTAL_PAGE_STEP) + MARGIN_TOP;
        const contentEnd = contentStart + CONTENT_HEIGHT;

        // Fällt es oben in den Margin/Gap-Bereich dieser Seite?
        const fallsInTopGap = topInContainer < contentStart - 1;

        // Manuell erzwungener Seitenumbruch oder bereits über Seite hinaus?
        const isManualBreak = block.classList.contains('manual-page-break') || block.closest('.has-manual-break') !== null;
        const spillsOverBottom = bottomInContainer > contentEnd + 1;
        const needsBreak = (isManualBreak && topInContainer > contentStart + 10) || spillsOverBottom;

        if (fallsInTopGap || needsBreak) {
            // Ziel-Seite bestimmen
            let targetPageIndex = visualStartPage;
            if (fallsInTopGap && !needsBreak) {
                targetPageIndex = visualStartPage; // Element leicht nach unten schieben
            } else if (needsBreak) {
                targetPageIndex = visualStartPage + 1; // Element komplett auf nächste Seite pushen
            }

            // Orphan Prevention: Halte Header, Kontext und erste Teilaufgabe zusammen
            let groupStartIdx = i;
            for (let j = i - 1; j >= 0; j--) {
                const prev = allBlocks[j];
                const isKeepable = prev.classList.contains('header-row') ||
                    prev.classList.contains('subtask-header-row') ||
                    prev.classList.contains('task-context') ||
                    prev.classList.contains('section-divider-print');

                if (!isKeepable) break;

                const prevRect = prev.getBoundingClientRect();
                const prevTop = prevRect.top - containerRect.top;
                const prevPage = Math.floor(Math.max(0, prevTop) / TOTAL_PAGE_STEP);

                // Nur zusammenhalten, wenn prev auf derselben Seite liegt
                if (prevPage !== visualStartPage) break;

                groupStartIdx = j;
            }

            // Verhindere Endlos-Leerseiten: Wenn der Gruppen-Anführer bereits ganz oben auf der aktuellen Seite steht,
            // darf nicht die gesamte Gruppe weitergeschoben werden, sondern nur das überlaufende Element selbst.
            if (groupStartIdx < i) {
                const candidateRect = allBlocks[groupStartIdx].getBoundingClientRect();
                const candidateTop = candidateRect.top - containerRect.top;
                if (candidateTop <= contentStart + 24) {
                    groupStartIdx = i;
                }
            }

            const leader = allBlocks[groupStartIdx];
            const leaderRect = leader.getBoundingClientRect();
            const leaderTopInContainer = leaderRect.top - containerRect.top;

            // Ziel-Koordinate im DOM berechnen
            const targetDomY = (targetPageIndex * TOTAL_PAGE_STEP) + MARGIN_TOP;

            // Wie viel müssen wir zusätzlich schieben?
            const deltaPush = targetDomY - leaderTopInContainer;

            if (deltaPush > 0) {
                const existingPush = parseFloat(leader.style.getPropertyValue('--page-push')) || 0;
                let totalPush = existingPush + deltaPush;

                leader.classList.add('is-page-pushed');
                leader.style.setProperty('--page-push', totalPush + 'px');

                // Prüfen, ob in einem Mehrspalten-Grid das linke Nachbar-Element in derselben Zeile bereits umgebrochen hat
                const multiColGrid = leader.closest('.subtasks-list.cols-2, .subtasks-list.cols-3');
                let sameGridRowAlreadyBroken = false;
                if (multiColGrid && groupStartIdx > 0) {
                    const prevBlock = allBlocks[groupStartIdx - 1];
                    if (prevBlock.closest('.subtasks-list') === multiColGrid && prevBlock.classList.contains('print-break-before')) {
                        const prevRectAfter = prevBlock.getBoundingClientRect();
                        const prevTopAfter = prevRectAfter.top - container.getBoundingClientRect().top;
                        if (Math.abs(prevTopAfter - targetDomY) < 8) {
                            sameGridRowAlreadyBroken = true;
                        }
                    }
                }

                if (!sameGridRowAlreadyBroken) {
                    leader.classList.add('print-break-before');
                }

                // --- MARGIN COLLAPSE KOMPENSATION ---
                const cRectAfter = container.getBoundingClientRect();
                const afterPushRect = leader.getBoundingClientRect();
                const afterPushTop = afterPushRect.top - cRectAfter.top;

                if (afterPushTop < targetDomY - 1) {
                    const marginCollapseLoss = targetDomY - afterPushTop;
                    totalPush += marginCollapseLoss;
                    leader.style.setProperty('--page-push', totalPush + 'px');
                }
            }
        }
    }

    // 3. Visuelle A4-Seiten zeichnen
    if (overlay) {
        overlay.innerHTML = '';
        const finalContainerRect = container.getBoundingClientRect();

        let maxBottom = PAGE_HEIGHT;
        if (allBlocks.length > 0) {
            const lastBlock = allBlocks[allBlocks.length - 1];
            const lastRect = lastBlock.getBoundingClientRect();
            maxBottom = lastRect.bottom - finalContainerRect.top;
        }

        const totalPages = Math.max(1, Math.ceil(maxBottom / TOTAL_PAGE_STEP));

        for (let p = 0; p < totalPages; p++) {
            const pageBg = document.createElement('div');
            pageBg.className = 'virtual-a4-page';
            pageBg.style.top = (p * TOTAL_PAGE_STEP) + 'px';
            overlay.appendChild(pageBg);
        }

        container.style.minHeight = ((totalPages * TOTAL_PAGE_STEP) - GAP) + 'px';
    }

    requestAnimationFrame(() => {
        ctx._isPaginating = false;
    });
};
