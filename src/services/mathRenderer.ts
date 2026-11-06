/**
 * Math & Rendering Service
 * Handles advanced SVG generation and chart rendering for various math tasks.
 */

import { BaumData, UrneData } from '../types/models';

declare const JXG: any;

export const renderVerteilung = (target: any): void => {
    if (!target || !target.verteilung || !target.verteilung.show) return;

    const boardId = 'distbox-' + target.id;
    const container = document.getElementById(boardId);
    if (!container) return;

    // Cleanup existing board
    if (container.hasChildNodes()) {
        const oldBoardId = container.getAttribute('data-jxg-id');
        if (oldBoardId && JXG.boards && JXG.boards[oldBoardId]) {
            JXG.JSXGraph.freeBoard(JXG.boards[oldBoardId]);
            delete JXG.boards[oldBoardId];
        }
        container.innerHTML = '';
    }

    const type = target.verteilung.type;
    const n = parseFloat(target.verteilung.n) || 10;
    const p = parseFloat(target.verteilung.p) || 0.5;
    const mu = parseFloat(target.verteilung.mu) || 0;
    const sigma = parseFloat(target.verteilung.sigma) || 1;

    let yMax = 0.5;
    let bbox: [number, number, number, number];
    if (type === 'binomial') {
        const peakProb = 1 / Math.sqrt(2 * Math.PI * n * p * (1 - p));
        yMax = Math.max(0.1, (peakProb || 0.1) * 1.3);
        // Increased left margin to prevent clipping of labels like "0.02"
        const xMarginLeft = Math.max(1.5, n * 0.15);
        bbox = [-xMarginLeft, yMax, n + (n * 0.05), -yMax * 0.15];
    } else {
        const peakProb = 1 / (sigma * Math.sqrt(2 * Math.PI));
        yMax = Math.max(0.1, (peakProb || 0.1) * 1.3);
        const xMarginLeft = Math.max(1.5, sigma * 1.0);
        bbox = [mu - 4 * sigma - xMarginLeft, yMax, mu + 4 * sigma + (sigma * 0.5), -yMax * 0.15];
    }

    const board = JXG.JSXGraph.initBoard(boardId, {
        boundingbox: bbox,
        axis: false,
        showCopyright: false,
        showNavigation: false
    });
    
    // Explicitly create axes to ensure labels are visible and correctly placed
    board.create('axis', [[0, 0], [1, 0]], { 
        name: 'k', withLabel: true, 
        label: { position: 'rt', offset: [-15, 20], fontSize: 12 },
        ticks: {
            insertLabels: true,
            generateLabel: (v: number) => v < 0 ? "" : v,
            label: { fontSize: 10 }
        }
    });
    board.create('axis', [[0, 0], [0, 1]], { 
        name: 'P', withLabel: true, 
        label: { position: 'rt', offset: [20, -10], fontSize: 12 },
        ticks: {
            insertLabels: true,
            generateLabel: (v: number) => v < 0 ? "" : v,
            label: { offset: [-5, 0], anchorX: 'right', fontSize: 10 }
        }
    });

    container.setAttribute('data-jxg-id', board.id);

    const mark = target.verteilung.markArea || { show: false, min: 0, max: 0 };

    if (type === 'binomial') {
        const xData: number[] = [];
        const yData: number[] = [];
        const colors: string[] = [];
        
        // Stable binomial calculation using relative probabilities to avoid overflow/underflow
        const k_peak = Math.floor((n + 1) * p);
        const probs = new Array(n + 1);
        probs[k_peak] = 1.0; // Start with 1.0 at peak (relative)
        
        // Go down from peak
        for (let k = k_peak; k > 0; k--) {
            probs[k-1] = probs[k] * (k * (1 - p)) / ((n - k + 1) * p);
            if (probs[k-1] < 1e-20) break; // Optimization for tails
        }
        // Go up from peak
        for (let k = k_peak; k < n; k++) {
            probs[k+1] = probs[k] * ((n - k) * p) / ((k + 1) * (1 - p));
            if (probs[k+1] < 1e-20) break;
        }
        
        // Normalize so sum is 1 (or close to it)
        // Actually, we know the sum should be 1, but we need the absolute scale.
        // Better: calculate one absolute value and scale others.
        // But n! is too large. Let's use the log-Gamma function for the peak value.
        const logFactorial = (val: number): number => {
            if (val < 2) return 0;
            // Stirling's approximation for large val
            return val * Math.log(val) - val + 0.5 * Math.log(2 * Math.PI * val);
        };
        const logPeakProb = logFactorial(n) - logFactorial(k_peak) - logFactorial(n - k_peak) 
                            + k_peak * Math.log(p) + (n - k_peak) * Math.log(1 - p);
        const absolutePeakProb = Math.exp(logPeakProb);
        
        for (let k = 0; k <= n; k++) {
            const prob = (probs[k] || 0) * absolutePeakProb;
            if (prob < 1e-6 && (k < k_peak - 10 * Math.sqrt(n*p*(1-p)) || k > k_peak + 10 * Math.sqrt(n*p*(1-p)))) continue;
            
            xData.push(k);
            yData.push(prob);

            if (mark.show && k >= Number(mark.min) && k <= Number(mark.max)) {
                colors.push('#312e81'); // Darker Indigo
            } else {
                colors.push('#94a3b8'); // Darker Slate
            }
        }
        
        board.create('chart', [xData, yData], {
            chartStyle: 'bar',
            width: 0.8,
            colors: colors,
            fillOpacity: 1.0,
            strokeWidth: 0.5,
            strokeColor: '#1e293b'
        });
    } else if (type === 'normal') {
        const curve = board.create('functiongraph', [(x: number) => {
            return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
        }], {
            strokeWidth: 2,
            strokeColor: '#0f172a'
        });

        if (mark.show) {
            board.create('integral', [[Number(mark.min), Number(mark.max)], curve], {
                color: '#4f46e5',
                fillOpacity: 0.3,
                label: { visible: false }
            });
        }
    }
};

// ── Mathematische Helfer für Verteilungen ────────────────────────────

export const calcLogFactorial = (k: number): number => {
    if (k <= 1) return 0;
    if (k < 30) {
        let sum = 0;
        for (let i = 2; i <= k; i++) sum += Math.log(i);
        return sum;
    }
    return k * Math.log(k) - k + 0.5 * Math.log(2 * Math.PI * k) + 1 / (12 * k);
};

export const calcBinomialProb = (n: number, k: number, p: number): number => {
    if (k < 0 || k > n) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    const lnP = calcLogFactorial(n) - calcLogFactorial(k) - calcLogFactorial(n - k)
        + k * Math.log(p) + (n - k) * Math.log(1 - p);
    return Math.exp(lnP);
};

export const calcErf = (x: number): number => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
};

export const calcNormalPDF = (x: number, mu: number, sigma: number): number => {
    if (sigma <= 0) return 0;
    const z = (x - mu) / sigma;
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
};

export const calcNormalCDF = (x: number, mu: number, sigma: number): number => {
    if (sigma <= 0) return x < mu ? 0 : 1;
    return 0.5 * (1 + calcErf((x - mu) / (sigma * Math.SQRT2)));
};

const formatVerteilungNum = (v: number): string => {
    if (Math.abs(v - Math.round(v)) < 1e-4) return Math.round(v).toString();
    return Number(v.toFixed(3)).toString();
};

const getNiceStep = (maxVal: number): { step: number; max: number } => {
    if (maxVal <= 0.05) return { step: 0.01, max: 0.05 };
    if (maxVal <= 0.1) return { step: 0.02, max: Math.ceil(maxVal / 0.02) * 0.02 };
    if (maxVal <= 0.25) return { step: 0.05, max: Math.ceil(maxVal / 0.05) * 0.05 };
    if (maxVal <= 0.5) return { step: 0.1, max: Math.ceil(maxVal / 0.1) * 0.1 };
    if (maxVal <= 1) return { step: 0.2, max: Math.ceil(maxVal / 0.2) * 0.2 };
    const power = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const rel = maxVal / power;
    let stepUnit = 1;
    if (rel <= 2) stepUnit = 0.5;
    else if (rel <= 5) stepUnit = 1;
    else stepUnit = 2;
    const step = stepUnit * power;
    return { step, max: Math.ceil(maxVal / step) * step };
};

/**
 * Reiner SVG-Renderer für Wahrscheinlichkeitsverteilungen (Binomial & Normal).
 * Vollständig unabhängig von JSXGraph, 100% responsiv & print-kompatibel.
 */
export const renderVerteilungSVG = (
    data: any, 
    options?: { interactive?: boolean; activeK?: number | null }
): string => {
    if (!data) return '<svg viewBox="0 0 800 450" class="verteilung-svg"></svg>';

    const type = data.type === 'normal' ? 'normal' : 'binomial';
    const isBinomial = type === 'binomial';
    const width = 800;
    const height = 450;
    const padLeft = 70;
    const padRight = 35;
    const padTop = 55;
    const padBottom = 55;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const markArea = data.markArea || { show: false, min: 0, max: 0 };
    const showMark = !!markArea.show;
    const markMin = markArea.min !== undefined ? Number(markArea.min) : 0;
    const markMax = markArea.max !== undefined ? Number(markArea.max) : 0;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="verteilung-svg" xmlns="http://www.w3.org/2000/svg">`;

    if (isBinomial) {
        const n = Math.max(1, Math.min(250, Math.round(Number(data.n) || 10)));
        const p = Math.max(0, Math.min(1, Number(data.p) !== undefined ? Number(data.p) : 0.5));
        const mu = n * p;
        const sigma = Math.sqrt(n * p * (1 - p));

        // Alle Wahrscheinlichkeiten vorberechnen
        const probs: number[] = new Array(n + 1);
        for (let k = 0; k <= n; k++) {
            probs[k] = calcBinomialProb(n, k, p);
        }

        // Anzeigebereich ermitteln
        let kStart = 0;
        let kEnd = n;
        if (n > 25) {
            let kLo = Math.max(0, Math.floor(mu - 3.5 * sigma - 0.5));
            let kHi = Math.min(n, Math.ceil(mu + 3.5 * sigma + 0.5));
            if (showMark) {
                if (!isNaN(markMin)) kLo = Math.min(kLo, Math.max(0, Math.floor(markMin)));
                if (!isNaN(markMax)) kHi = Math.max(kHi, Math.min(n, Math.ceil(markMax)));
            }
            kStart = kLo;
            kEnd = kHi;
        }
        const count = kEnd - kStart + 1;

        // Maximalen Wert im Anzeigebereich für Y-Achsen-Skala bestimmen
        let maxP = 0.001;
        for (let k = kStart; k <= kEnd; k++) {
            if (probs[k] > maxP) maxP = probs[k];
        }
        const { step: yStep, max: yMax } = getNiceStep(maxP * 1.15);

        // Summe für markierten Bereich
        let sumP = 0;
        if (showMark) {
            const minK = Math.max(0, Math.ceil(markMin));
            const maxK = Math.min(n, Math.floor(markMax));
            for (let k = minK; k <= maxK; k++) {
                sumP += probs[k];
            }
        }

        // ── Header / Didaktische Formelzeile ──
        svg += `<text class="verteilung-title-text" x="${padLeft}" y="32">X ~ B(n = ${n}, p = ${formatVerteilungNum(p)})</text>`;
        svg += `<text class="verteilung-sub-text" x="${padLeft + 270}" y="32">μ = ${formatVerteilungNum(mu)}, σ = ${formatVerteilungNum(sigma)}</text>`;
        if (showMark) {
            svg += `<text class="verteilung-marked-text" x="${width - padRight}" y="32" text-anchor="end">P(${formatVerteilungNum(markMin)} ≤ X ≤ ${formatVerteilungNum(markMax)}) = ${(sumP * 100).toFixed(1)}%</text>`;
        }

        // ── Horizontale Gitterlinien & Y-Ticks ──
        for (let yVal = 0; yVal <= yMax + 0.0001; yVal += yStep) {
            const yPos = padTop + plotH - (yVal / yMax) * plotH;
            svg += `<line class="verteilung-grid-line" x1="${padLeft}" y1="${yPos}" x2="${padLeft + plotW}" y2="${yPos}" />`;
            svg += `<text class="verteilung-tick-text" x="${padLeft - 8}" y="${yPos + 4}" text-anchor="end">${(yVal * 100).toFixed(0)}%</text>`;
        }

        // ── Achsen ──
        // X-Achse
        const yBase = padTop + plotH;
        svg += `<line class="verteilung-axis" x1="${padLeft}" y1="${yBase}" x2="${padLeft + plotW + 15}" y2="${yBase}" />`;
        svg += `<polygon class="verteilung-axis-arrow" points="${padLeft + plotW + 15},${yBase} ${padLeft + plotW + 7},${yBase - 4} ${padLeft + plotW + 7},${yBase + 4}" />`;
        svg += `<text class="verteilung-axis-label" x="${padLeft + plotW + 20}" y="${yBase + 5}">k</text>`;

        // Y-Achse
        svg += `<line class="verteilung-axis" x1="${padLeft}" y1="${yBase}" x2="${padLeft}" y2="${padTop - 15}" />`;
        svg += `<polygon class="verteilung-axis-arrow" points="${padLeft},${padTop - 15} ${padLeft - 4},${padTop - 7} ${padLeft + 4},${padTop - 7}" />`;
        svg += `<text class="verteilung-axis-label" x="${padLeft - 8}" y="${padTop - 20}" text-anchor="end">P(X = k)</text>`;

        // ── Säulen (Bars) ──
        const colWidth = plotW / count;
        const barWidth = Math.max(3, Math.min(45, colWidth * 0.72));

        // Schrittweite für X-Achsen-Beschriftungen
        let labelStep = 1;
        if (count > 40) labelStep = 5;
        else if (count > 20) labelStep = 2;

        for (let k = kStart; k <= kEnd; k++) {
            const prob = probs[k];
            const barH = (prob / yMax) * plotH;
            const xCenter = padLeft + (k - kStart + 0.5) * colWidth;
            const xBar = xCenter - barWidth / 2;
            const yBar = yBase - barH;

            const isMarked = showMark && k >= markMin && k <= markMax;
            const barClass = isMarked 
                ? 'verteilung-bar verteilung-bar-marked' 
                : 'verteilung-bar verteilung-bar-unmarked';

            const interactiveAttrs = options?.interactive ? ` data-k="${k}"` : '';

            svg += `<rect class="${barClass}" x="${xBar}" y="${yBar}" width="${barWidth}" height="${barH}" rx="2"${interactiveAttrs}><title>k = ${k}: P(X = ${k}) = ${(prob * 100).toFixed(2)}%</title></rect>`;

            // X-Achsen Tick & Beschriftung
            if (k % labelStep === 0 || k === kStart || k === kEnd) {
                svg += `<line class="verteilung-tick-line" x1="${xCenter}" y1="${yBase}" x2="${xCenter}" y2="${yBase + 5}" />`;
                svg += `<text class="verteilung-tick-text" x="${xCenter}" y="${yBase + 18}" text-anchor="middle">${k}</text>`;
            }
        }
    } else {
        // ── Normalverteilung N(mu, sigma^2) ──
        const mu = Number(data.mu) !== undefined && !isNaN(Number(data.mu)) ? Number(data.mu) : 0;
        const sigma = Math.max(0.001, Number(data.sigma) !== undefined && !isNaN(Number(data.sigma)) ? Number(data.sigma) : 1);

        let xMin = mu - 3.8 * sigma;
        let xMax = mu + 3.8 * sigma;
        if (showMark) {
            if (!isNaN(markMin)) xMin = Math.min(xMin, markMin - 0.4 * sigma);
            if (!isNaN(markMax)) xMax = Math.max(xMax, markMax + 0.4 * sigma);
        }

        const peakY = calcNormalPDF(mu, mu, sigma);
        const { step: yStep, max: yMax } = getNiceStep(peakY * 1.15);

        // Integral-Wahrscheinlichkeit
        let probNorm = 0;
        if (showMark) {
            probNorm = Math.max(0, calcNormalCDF(markMax, mu, sigma) - calcNormalCDF(markMin, mu, sigma));
        }

        // ── Header ──
        svg += `<text class="verteilung-title-text" x="${padLeft}" y="32">X ~ N(μ = ${formatVerteilungNum(mu)}, σ² = ${formatVerteilungNum(sigma * sigma)})</text>`;
        svg += `<text class="verteilung-sub-text" x="${padLeft + 270}" y="32">σ = ${formatVerteilungNum(sigma)}</text>`;
        if (showMark) {
            svg += `<text class="verteilung-marked-text" x="${width - padRight}" y="32" text-anchor="end">P(${formatVerteilungNum(markMin)} ≤ X ≤ ${formatVerteilungNum(markMax)}) ≈ ${(probNorm * 100).toFixed(1)}%</text>`;
        }

        // ── Horizontale Gitterlinien & Y-Ticks ──
        for (let yVal = 0; yVal <= yMax + 0.0001; yVal += yStep) {
            const yPos = padTop + plotH - (yVal / yMax) * plotH;
            svg += `<line class="verteilung-grid-line" x1="${padLeft}" y1="${yPos}" x2="${padLeft + plotW}" y2="${yPos}" />`;
            svg += `<text class="verteilung-tick-text" x="${padLeft - 8}" y="${yPos + 4}" text-anchor="end">${formatVerteilungNum(yVal)}</text>`;
        }

        // Hilfsfunktionen für Koordinaten
        const getXCoord = (x: number) => padLeft + ((x - xMin) / (xMax - xMin)) * plotW;
        const getYCoord = (y: number) => padTop + plotH - (y / yMax) * plotH;

        const yBase = padTop + plotH;

        // ── Markierte Integralfläche ──
        if (showMark && markMin < markMax) {
            const a = Math.max(xMin, markMin);
            const b = Math.min(xMax, markMax);
            if (a < b) {
                const sampleSteps = 70;
                const step = (b - a) / sampleSteps;
                let pathD = `M ${getXCoord(a)} ${yBase}`;
                for (let i = 0; i <= sampleSteps; i++) {
                    const cx = a + i * step;
                    const cy = calcNormalPDF(cx, mu, sigma);
                    pathD += ` L ${getXCoord(cx)} ${getYCoord(cy)}`;
                }
                pathD += ` L ${getXCoord(b)} ${yBase} Z`;
                svg += `<path class="verteilung-normal-integral" d="${pathD}" />`;

                // Begrenzungslinien
                svg += `<line class="verteilung-boundary-line" x1="${getXCoord(a)}" y1="${yBase}" x2="${getXCoord(a)}" y2="${getYCoord(calcNormalPDF(a, mu, sigma))}" />`;
                svg += `<line class="verteilung-boundary-line" x1="${getXCoord(b)}" y1="${yBase}" x2="${getXCoord(b)}" y2="${getYCoord(calcNormalPDF(b, mu, sigma))}" />`;
            }
        }

        // ── Gaußsche Glockenkurve ──
        const curveSteps = 140;
        const curveStep = (xMax - xMin) / curveSteps;
        let curveD = '';
        for (let i = 0; i <= curveSteps; i++) {
            const cx = xMin + i * curveStep;
            const cy = calcNormalPDF(cx, mu, sigma);
            const px = getXCoord(cx);
            const py = getYCoord(cy);
            curveD += (i === 0 ? 'M ' : ' L ') + `${px} ${py}`;
        }
        svg += `<path class="verteilung-normal-curve" d="${curveD}" />`;

        // ── Wendepunkte (μ - σ, μ + σ) ──
        const wendeY = peakY * Math.exp(-0.5);
        const wendeYCoord = getYCoord(wendeY);
        const wendeX1 = getXCoord(mu - sigma);
        const wendeX2 = getXCoord(mu + sigma);
        if (mu - sigma >= xMin && mu - sigma <= xMax) {
            svg += `<line class="verteilung-inflection-line" x1="${wendeX1}" y1="${yBase}" x2="${wendeX1}" y2="${wendeYCoord}" />`;
        }
        if (mu + sigma >= xMin && mu + sigma <= xMax) {
            svg += `<line class="verteilung-inflection-line" x1="${wendeX2}" y1="${yBase}" x2="${wendeX2}" y2="${wendeYCoord}" />`;
        }

        // ── Achsen ──
        // X-Achse
        svg += `<line class="verteilung-axis" x1="${padLeft}" y1="${yBase}" x2="${padLeft + plotW + 15}" y2="${yBase}" />`;
        svg += `<polygon class="verteilung-axis-arrow" points="${padLeft + plotW + 15},${yBase} ${padLeft + plotW + 7},${yBase - 4} ${padLeft + plotW + 7},${yBase + 4}" />`;
        svg += `<text class="verteilung-axis-label" x="${padLeft + plotW + 20}" y="${yBase + 5}">x</text>`;

        // Y-Achse
        svg += `<line class="verteilung-axis" x1="${padLeft}" y1="${yBase}" x2="${padLeft}" y2="${padTop - 15}" />`;
        svg += `<polygon class="verteilung-axis-arrow" points="${padLeft},${padTop - 15} ${padLeft - 4},${padTop - 7} ${padLeft + 4},${padTop - 7}" />`;
        svg += `<text class="verteilung-axis-label" x="${padLeft - 8}" y="${padTop - 20}" text-anchor="end">f(x)</text>`;

        // ── X-Achsen Ticks (μ, μ ± k*σ) ──
        const xTicks = [
            { val: mu, label: 'μ' },
            { val: mu - sigma, label: 'μ-σ' },
            { val: mu + sigma, label: 'μ+σ' },
            { val: mu - 2 * sigma, label: 'μ-2σ' },
            { val: mu + 2 * sigma, label: 'μ+2σ' },
            { val: mu - 3 * sigma, label: 'μ-3σ' },
            { val: mu + 3 * sigma, label: 'μ+3σ' },
        ];
        xTicks.forEach(t => {
            if (t.val >= xMin && t.val <= xMax) {
                const tx = getXCoord(t.val);
                svg += `<line class="verteilung-tick-line" x1="${tx}" y1="${yBase}" x2="${tx}" y2="${yBase + 5}" />`;
                svg += `<text class="verteilung-tick-text" x="${tx}" y="${yBase + 18}" text-anchor="middle">${formatVerteilungNum(t.val)}</text>`;
                svg += `<text class="verteilung-sigma-label" x="${tx}" y="${yBase + 30}" text-anchor="middle">${t.label}</text>`;
            }
        });
    }

    svg += '</svg>';
    return svg;
};

export interface TreeEdge {
    nodeId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    probText: string;
    probX: number;
    probY: number;
    isPlaceholder?: boolean;
}

export interface TreeLabel {
    id: string;
    x: number;
    y: number;
    text: string;
    isNegated: boolean;
    level?: number;
    isPlaceholder?: boolean;
    isLeaf?: boolean;
    pathProb?: string;
    isPathProbPlaceholder?: boolean;
}

export interface TreeLayout {
    edges: TreeEdge[];
    labels: TreeLabel[];
}

export const getTreeLayout = (baum: BaumData): TreeLayout => {
    if (!baum || !baum.nodes || baum.nodes.length === 0) return { edges: [], labels: [] };

    const showPaths = !!baum.showPathProbabilities;
    const width = showPaths ? 780 : 960;
    const height = 600;
    const edges: TreeEdge[] = [];
    const labels: TreeLabel[] = [];
    const depth = parseInt(baum.depth as any) || 2;
    const dx = width / (depth + 1);

    interface PositionNode {
        id: string;
        x: number;
        y: number;
    }

    let previousLevelNodes: PositionNode[] = [{ id: 'root', x: 40, y: height / 2 }];

    for (let l = 1; l <= depth; l++) {
        const currentLevelNodes = baum.nodes.filter(n => n.level == l);
        if (currentLevelNodes.length === 0) break;

        const currentX = 40 + l * dx;
        const yStep = height / (currentLevelNodes.length + 1);
        const nextPrevLevel: PositionNode[] = [];

        currentLevelNodes.forEach((node, index) => {
            const y = yStep * (index + 1);

            // Vaterknoten finden
            const parts = node.id.split('-');
            parts.pop();
            const parentId = parts.length > 0 ? parts.join('-') : 'root';
            const parent = previousLevelNodes.find(p => p.id === parentId) || { x: 40, y: height / 2 };

            // Ast zeichnen
            edges.push({
                nodeId: node.id,
                x1: parent.x, y1: parent.y,
                x2: currentX, y2: y,
                probText: node.prob || '',
                probX: (parent.x + currentX) / 2,
                probY: (parent.y + y) / 2 - 15, // Leicht über dem Strich
                isPlaceholder: !!node.isProbPlaceholder || node.prob === '?' || node.prob === '___'
            });

            // Ergebnis (Label) zeichnen
            labels.push({ 
                id: node.id,
                x: currentX, 
                y: y, 
                text: node.label || '', 
                isNegated: !!node.isNegated, 
                level: l,
                isPlaceholder: !!node.isLabelPlaceholder || node.label === '?' || node.label === '___',
                isLeaf: l === depth,
                pathProb: node.pathProb || '',
                isPathProbPlaceholder: !!node.isPathProbPlaceholder
            });
            nextPrevLevel.push({ id: node.id, x: currentX, y: y });
        });
        previousLevelNodes = nextPrevLevel;
    }
    return { edges, labels };
};

export const renderTreeSVG = (
    baum: BaumData, 
    highlightedNodeId?: string | null, 
    highlightedPathId?: string | null,
    activeTarget?: { type: 'edge' | 'node' | 'path'; id: string } | null
): string => {
    const layout = getTreeLayout(baum);
    let svg = '';

    // Äste (Edges)
    layout.edges.forEach(edge => {
        const isSelected = activeTarget?.type === 'edge' && activeTarget.id === edge.nodeId;
        const isDirectHighlight = !!(highlightedNodeId && edge.nodeId === highlightedNodeId) || isSelected;
        const isPathHighlight = !!(highlightedPathId && (highlightedPathId === edge.nodeId || highlightedPathId.startsWith(edge.nodeId + '-')));
        const isHighlighted = isDirectHighlight || isPathHighlight;

        const defaultStroke = baum.colorNodes ? '#475569' : '#000';
        const highlightColor = isSelected ? '#4f46e5' : (isPathHighlight ? '#059669' : '#2563eb');
        const haloColor = isSelected ? '#818cf8' : (isPathHighlight ? '#34d399' : '#60a5fa');

        let haloSvg = '';
        if (isHighlighted) {
            haloSvg = `<line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="${haloColor}" stroke-width="${isSelected ? '10' : '8'}" stroke-linecap="round" opacity="${isSelected ? '0.6' : '0.4'}" />`;
        }

        const edgeStroke = isHighlighted ? highlightColor : defaultStroke;
        const edgeWidth = isHighlighted ? '3.5' : '2';

        svg += `<g class="tree-interactive-edge" data-edge-id="${edge.nodeId}">
            <!-- Hitbox für leichtes Anklicken -->
            <line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="transparent" stroke-width="26" class="tree-hitbox" />
            ${haloSvg}
            <line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="${edgeStroke}" stroke-width="${edgeWidth}" />`;

        if (edge.isPlaceholder) {
            // Lücke / Schüler-Platzhalter
            const rectStroke = isHighlighted ? highlightColor : '#64748b';
            const rectFill = isHighlighted ? (isSelected ? '#eef2ff' : (isPathHighlight ? '#ecfdf5' : '#eff6ff')) : '#ffffff';
            svg += `
                <rect class="tree-anchor-target" x="${edge.probX - 34}" y="${edge.probY - 17}" width="68" height="34" rx="5" fill="${rectFill}" stroke="${rectStroke}" stroke-width="${isHighlighted ? 2.5 : 1.5}" stroke-dasharray="3,3" />
            </g>`;
        } else if (edge.probText.trim() !== '') {
            const textColor = isHighlighted ? (isSelected ? '#1e1b4b' : (isPathHighlight ? '#065f46' : '#1e40af')) : '#334155';
            const textBg = isHighlighted ? `<rect x="${edge.probX - 32}" y="${edge.probY - 17}" width="64" height="28" rx="6" fill="${isSelected ? '#eef2ff' : (isPathHighlight ? '#ecfdf5' : '#eff6ff')}" stroke="${highlightColor}" stroke-width="${isSelected ? 2 : 1.5}" />` : '';
            const caret = isSelected ? `<line x1="${edge.probX + Math.min(26, edge.probText.length * 6 + 4)}" y1="${edge.probY - 8}" x2="${edge.probX + Math.min(26, edge.probText.length * 6 + 4)}" y2="${edge.probY + 8}" stroke="#2563eb" stroke-width="2.5" class="tree-blinking-cursor" />` : '';
            svg += `
                ${textBg}
                <text class="tree-anchor-target" x="${edge.probX}" y="${edge.probY}" fill="${textColor}" font-size="21" text-anchor="middle" font-weight="${isHighlighted ? 'bold' : '600'}" font-style="italic" font-family="sans-serif">${edge.probText}</text>
                ${caret}
            </g>`;
        } else {
            // Leerer Ast: Bei Auswahl aktiver blinkender Cursor im Eingabefeld, sonst subtiler Punkt
            if (isSelected) {
                svg += `
                    <g class="tree-active-caret-group tree-anchor-target">
                        <rect x="${edge.probX - 22}" y="${edge.probY - 15}" width="44" height="30" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5" />
                        <line x1="${edge.probX}" y1="${edge.probY - 8}" x2="${edge.probX}" y2="${edge.probY + 8}" stroke="#2563eb" stroke-width="2.5" class="tree-blinking-cursor" />
                    </g>
                </g>`;
            } else {
                svg += `
                    <circle class="tree-anchor-target" cx="${edge.probX}" cy="${edge.probY}" r="5" fill="none" stroke="${defaultStroke}" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.35" class="empty-prob-hint" />
                </g>`;
            }
        }
    });

    // Knoten (Labels) & Pfadwahrscheinlichkeiten
    layout.labels.forEach(label => {
        const rx = Math.max(36, (label.text?.length || 1) * 8 + 14);
        const ry = 25;

        const isSelected = activeTarget?.type === 'node' && activeTarget.id === label.id;
        const isDirectHighlight = !!(highlightedNodeId && label.id === highlightedNodeId) || isSelected;
        const isPathHighlight = !!(highlightedPathId && (highlightedPathId === label.id || highlightedPathId.startsWith(label.id + '-')));
        const isHighlighted = isDirectHighlight || isPathHighlight;
        const highlightColor = isSelected ? '#4f46e5' : (isPathHighlight ? '#059669' : '#2563eb');
        const haloColor = isSelected ? '#818cf8' : (isPathHighlight ? '#34d399' : '#60a5fa');

        let nodeHalo = '';
        if (isHighlighted) {
            nodeHalo = `<ellipse cx="${label.x}" cy="${label.y}" rx="${rx + (isSelected ? 8 : 6)}" ry="${ry + (isSelected ? 8 : 6)}" fill="none" stroke="${haloColor}" stroke-width="${isSelected ? '4' : '3'}" opacity="${isSelected ? '0.7' : '0.5'}" stroke-dasharray="${isSelected ? 'none' : '3,2'}" />`;
        }

        svg += `<g class="tree-interactive-node" data-node-id="${label.id}">
            <!-- Hitbox für leichtes Anklicken -->
            <ellipse cx="${label.x}" cy="${label.y}" rx="${rx + 12}" ry="${ry + 12}" fill="transparent" class="tree-hitbox" />
            ${nodeHalo}`;

        // Fall 1: Knoten ist als Lücke (Platzhalter) markiert
        if (label.isPlaceholder) {
            const rectStroke = isHighlighted ? highlightColor : '#64748b';
            const rectFill = isHighlighted ? (isSelected ? '#eef2ff' : (isPathHighlight ? '#ecfdf5' : '#eff6ff')) : '#ffffff';
            svg += `
                <ellipse class="tree-anchor-target" cx="${label.x}" cy="${label.y}" rx="38" ry="26" fill="${rectFill}" stroke="${rectStroke}" stroke-width="${isHighlighted ? 2.5 : 1.75}" stroke-dasharray="4,3" />
            </g>`;
        } 
        // Fall 2: Knoten hat regulären Text
        else if (label.text && label.text.trim() !== '') {
            let fill = '#fff';
            let stroke = isHighlighted ? highlightColor : '#000';
            const strokeWidth = isHighlighted ? '3' : '2';
            
            if (baum.colorNodes) {
                if (label.level === 1) {
                    fill = '#dbeafe';
                    stroke = isHighlighted ? highlightColor : '#2563eb';
                } else if (label.level === 2) {
                    fill = '#d1fae5';
                    stroke = isHighlighted ? highlightColor : '#059669';
                } else if (label.level === 3) {
                    fill = '#f3e8ff';
                    stroke = isHighlighted ? highlightColor : '#7c3aed';
                }
            }

            // Negierungsstrich (echte Vektorlinie über dem Text)
            let overbarSvg = '';
            if (label.isNegated) {
                const textLen = Math.max(1, label.text.length);
                const barWidth = Math.max(18, textLen * 14 + 4);
                const x1 = label.x - barWidth / 2;
                const x2 = label.x + barWidth / 2;
                const barY = label.y - 14;
                overbarSvg = `<line x1="${x1}" y1="${barY}" x2="${x2}" y2="${barY}" stroke="#000000" stroke-width="2.5" stroke-linecap="round" />`;
            }

            const caret = isSelected ? `<line x1="${label.x + Math.min(rx - 6, label.text.length * 7 + 4)}" y1="${label.y - 10}" x2="${label.x + Math.min(rx - 6, label.text.length * 7 + 4)}" y2="${label.y + 10}" stroke="#2563eb" stroke-width="2.5" class="tree-blinking-cursor" />` : '';
            
            svg += `
                <ellipse class="tree-anchor-target" cx="${label.x}" cy="${label.y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
                <text x="${label.x}" y="${label.y}" fill="#000" font-size="22" font-weight="bold" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">${label.text}</text>
                ${overbarSvg}
                ${caret}
            </g>`;
        }
        // Fall 3: Leerer Knoten (noch nicht beschriftet)
        else {
            let caretSvg = '';
            if (isSelected) {
                caretSvg = `<line x1="${label.x}" y1="${label.y - 9}" x2="${label.x}" y2="${label.y + 9}" stroke="#2563eb" stroke-width="2.5" class="tree-blinking-cursor" />`;
            }
            svg += `
                <ellipse class="tree-anchor-target" cx="${label.x}" cy="${label.y}" rx="${rx}" ry="${ry}" fill="${isSelected ? '#eff6ff' : '#ffffff'}" stroke="${isHighlighted ? highlightColor : '#94a3b8'}" stroke-width="${isSelected ? '2.5' : '2'}" stroke-dasharray="${isSelected ? 'none' : '3,3'}" />
                ${isSelected ? caretSvg : `<text x="${label.x}" y="${label.y}" fill="#94a3b8" font-size="18" font-weight="normal" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">?</text>`}
            </g>`;
        }

        // Pfadwahrscheinlichkeiten am Pfadende (Blattknoten)
        if (baum.showPathProbabilities && label.isLeaf) {
            const startX = label.x + rx + 6;
            const endX = startX + 26;
            const isSelected = activeTarget?.type === 'path' && activeTarget.id === label.id;
            const isLeafPathHighlight = !!(highlightedPathId && label.id === highlightedPathId) || isSelected;

            const pathLineColor = isSelected ? '#4f46e5' : (isLeafPathHighlight ? '#059669' : '#94a3b8');
            const pathLineWidth = isLeafPathHighlight ? '2.5' : '1.5';

            svg += `<g class="tree-interactive-path" data-path-id="${label.id}">
                <!-- Hitbox -->
                <rect x="${endX}" y="${label.y - 24}" width="100" height="48" fill="transparent" class="tree-hitbox" />
                <line x1="${startX}" y1="${label.y}" x2="${endX}" y2="${label.y}" stroke="${pathLineColor}" stroke-width="${pathLineWidth}" stroke-dasharray="2,2" />`;

            if (isLeafPathHighlight) {
                svg += `<rect x="${endX + 2}" y="${label.y - 23}" width="96" height="46" rx="8" fill="${isSelected ? '#eef2ff' : '#ecfdf5'}" stroke="${isSelected ? '#6366f1' : '#10b981'}" stroke-width="1.5" />`;
            }

            if (label.isPathProbPlaceholder) {
                // Pfad-Wahrscheinlichkeit als großzügige Lücke für Schüler (ohne "P=")
                svg += `
                    <rect class="tree-anchor-target" x="${endX + 6}" y="${label.y - 20}" width="88" height="40" rx="5" fill="#ffffff" stroke="${isLeafPathHighlight ? pathLineColor : '#64748b'}" stroke-width="${isLeafPathHighlight ? 2.5 : 1.5}" stroke-dasharray="3,3" />
                </g>`;
            } else if (label.pathProb && label.pathProb.trim() !== '') {
                // Ohne "P =", direkt der Wert nach dem Strich
                const cleanProb = label.pathProb.replace(/^P\s*=\s*/i, '').trim();
                const caret = isSelected ? `<line x1="${endX + 16 + Math.min(60, cleanProb.length * 10)}" y1="${label.y - 9}" x2="${endX + 16 + Math.min(60, cleanProb.length * 10)}" y2="${label.y + 9}" stroke="#2563eb" stroke-width="2.5" class="tree-blinking-cursor" />` : '';
                svg += `
                    <text class="tree-anchor-target" x="${endX + 12}" y="${label.y}" fill="${isSelected ? '#1e1b4b' : (isLeafPathHighlight ? '#065f46' : '#1e293b')}" font-size="21" font-weight="${isLeafPathHighlight ? 'bold' : '600'}" dominant-baseline="central" font-family="sans-serif">${cleanProb}</text>
                    ${caret}
                </g>`;
            } else {
                // Standard-Lücke wenn leer (ohne "P=")
                const caret = isSelected ? `<line x1="${endX + 50}" y1="${label.y - 9}" x2="${endX + 50}" y2="${label.y + 9}" stroke="#2563eb" stroke-width="2.5" class="tree-blinking-cursor" />` : '';
                svg += `
                    <rect class="tree-anchor-target" x="${endX + 6}" y="${label.y - 20}" width="88" height="40" rx="5" fill="#ffffff" stroke="${isSelected ? pathLineColor : '#cbd5e1'}" stroke-width="${isSelected ? 2 : 1.5}" stroke-dasharray="3,3" />
                    ${caret}
                </g>`;
            }
        }
    });

    return svg;
};

export const renderUrneSVG = (urne: UrneData, options?: { interactive?: boolean; activeBallId?: number | null }): string => {
    if (!urne || !urne.kugeln) return '';
    const balls = urne.kugeln;

    const ballsPerRow = 4;
    const totalRows = Math.max(2, Math.ceil(balls.length / ballsPerRow));
    const vHeight = Math.max(150, totalRows * 35 + 80);

    // Slightly wider viewBox to allow for the beaker shape and scale ticks
    let svgStr = `<svg viewBox="0 0 260 ${vHeight}" class="urne-svg ${options?.interactive ? 'urne-interactive-svg' : ''}" preserveAspectRatio="xMidYMid meet">`;

    // 1. Add SVG gradients for 3D glossy spheres and drop shadow filters
    svgStr += `<defs>
        <!-- Pearlescent White Ball Gradient -->
        <radialGradient id="urn-ball-white" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="55%" stop-color="#f8fafc" />
            <stop offset="100%" stop-color="#cbd5e1" />
        </radialGradient>
        <!-- Soft Slate-Grey Ball Gradient -->
        <radialGradient id="urn-ball-grey" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#f8fafc" />
            <stop offset="55%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#64748b" />
        </radialGradient>
        <!-- Glossy Graphite-Black Ball Gradient -->
        <radialGradient id="urn-ball-black" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#64748b" />
            <stop offset="55%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#090d16" />
        </radialGradient>
        <!-- Warm 3D Red Ball Gradient (from image) -->
        <radialGradient id="urn-ball-red" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#fda4af" />
            <stop offset="55%" stop-color="#f43f5e" />
            <stop offset="100%" stop-color="#9f1239" />
        </radialGradient>
        <!-- Vibrant 3D Blue Ball Gradient (from image) -->
        <radialGradient id="urn-ball-blue" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#bfdbfe" />
            <stop offset="55%" stop-color="#3b82f6" />
            <stop offset="100%" stop-color="#1e3a8a" />
        </radialGradient>
        <!-- Vibrant 3D Green Ball Gradient (from image) -->
        <radialGradient id="urn-ball-green" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#bbf7d0" />
            <stop offset="55%" stop-color="#22c55e" />
            <stop offset="100%" stop-color="#14532d" />
        </radialGradient>
        <!-- Vibrant 3D Yellow Ball Gradient -->
        <radialGradient id="urn-ball-yellow" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="55%" stop-color="#eab308" />
            <stop offset="100%" stop-color="#854d0e" />
        </radialGradient>
        <!-- Soft drop shadow for layered depth -->
        <filter id="urn-ball-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.12" />
        </filter>
    </defs>`;
    // 2. Terracotta Clay Ginger Jar Silhouette Path (Optimized wide neck & wider bottom side walls for maximum clearance)
    let d = `M 70 25 `; // Start top-left flared opening
    d += `C 70 25, 85 38, 85 45 `; // Neck left (wider opening at x=85)
    d += `C 85 55, 20 70, 20 95 `; // Shoulder left
    d += `L 20 ${vHeight - 40} `; // Straight vertical side wall down (Guarantees x=20 width at the bottom!)
    d += `Q 20 ${vHeight - 10}, 50 ${vHeight - 10} `; // Bottom-left rounded corner
    d += `L 210 ${vHeight - 10} `; // Stable bottom base
    d += `Q 240 ${vHeight - 10}, 240 ${vHeight - 40} `; // Bottom-right rounded corner
    d += `L 240 95 `; // Straight vertical side wall up
    d += `C 240 70, 175 55, 175 45 `; // Shoulder right
    d += `C 175 38, 190 25, 190 25`; // Neck right and top-right flared opening

    // Render clay vase body with warm sand/terracotta color from the image
    svgStr += `<path d="${d}" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />`;

    // 3D Hollow opening ellipse at the rim (wider, matching neck width, shaded darker inside)
    svgStr += `<ellipse cx="130" cy="25" rx="60" ry="12" fill="#e2e8f0" stroke="#1e293b" stroke-width="4.5" />`;

    // 3. Ball Arrangement Calculation (Group into rows and center each row perfectly)
    const r = 20;
    const spacing = 38; // Snug vertical/horizontal spacing
    const rows: any[][] = [];
    let currentRow: any[] = [];
    let expectFour = true;

    balls.forEach(ball => {
        const limit = expectFour ? 4 : 3;
        currentRow.push(ball);
        if (currentRow.length >= limit) {
            rows.push(currentRow);
            currentRow = [];
            expectFour = !expectFour;
        }
    });
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    const ballsArr: Array<{ ball: any; cx: number; cy: number }> = [];
    const startY = vHeight - 35;

    // Distribute balls in centered rows
    rows.forEach((row, yRow) => {
        const N = row.length;
        // Center the row by offsetting the start X based on number of balls
        const rowStartX = 130 - ((N - 1) * spacing) / 2;
        const cy = startY - yRow * 32;

        row.forEach((ball, colIndex) => {
            const cx = rowStartX + colIndex * spacing;
            ballsArr.push({ ball, cx, cy });
        });
    });

    const isInteractive = options?.interactive === true;

    // Render balls from top to bottom (reverse stack order for natural overlapping)
    ballsArr.slice().reverse().forEach(({ ball, cx, cy }) => {
        let fill = 'url(#urn-ball-white)';
        let stroke = '#475569';
        let strokeDash = '';
        let textColor = '#0f172a';

        const typeLower = (ball.type || '').toLowerCase();

        if (typeLower === 'black' || typeLower === 'schwarz') {
            fill = 'url(#urn-ball-black)';
            stroke = '#090d16';
            textColor = '#ffffff';
        } else if (typeLower === 'dashed' || typeLower === 'gestrichelt') {
            strokeDash = 'stroke-dasharray="4,3"';
        } else if (typeLower === 'grey' || typeLower === 'grau') {
            fill = 'url(#urn-ball-grey)';
            stroke = '#475569';
            textColor = '#0f172a';
        } else if (typeLower === 'red' || typeLower === 'rot') {
            fill = 'url(#urn-ball-red)';
            stroke = '#881337';
            textColor = '#ffffff';
        } else if (typeLower === 'blue' || typeLower === 'blau') {
            fill = 'url(#urn-ball-blue)';
            stroke = '#1e3a8a';
            textColor = '#ffffff';
        } else if (typeLower === 'green' || typeLower === 'grün') {
            fill = 'url(#urn-ball-green)';
            stroke = '#14532d';
            textColor = '#ffffff';
        } else if (typeLower === 'yellow' || typeLower === 'gelb') {
            fill = 'url(#urn-ball-yellow)';
            stroke = '#854d0e';
            textColor = '#713f12';
        }

        const isActive = options?.activeBallId !== undefined && options?.activeBallId !== null && options.activeBallId === ball.id;
        const groupClasses = [
            'urne-ball-group',
            isInteractive ? 'urne-interactive-ball' : '',
            isActive ? 'is-active-ball' : '',
        ].filter(Boolean).join(' ');

        svgStr += `<g class="${groupClasses}" data-kugel-id="${ball.id}">`;

        // Render glossy 3D ball with premium drop shadow
        svgStr += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" ${strokeDash} filter="url(#urn-ball-shadow)" />`;
        
        // Active selection pulsing ring
        if (isActive) {
            svgStr += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="3 2" class="urne-active-selection-ring" />`;
        }

        if (ball.label) {
            // Render high-readability text label using Outfit/Inter
            svgStr += `<text x="${cx}" y="${cy}" fill="${textColor}" font-size="17" font-weight="700" text-anchor="middle" dominant-baseline="central" font-family="Outfit, Inter, sans-serif">${ball.label}</text>`;
        }

        svgStr += `</g>`;
    });

    svgStr += '</svg>';
    return svgStr;
};

export const renderZahlenstrahl = (config: any): string => {
    const min = parseFloat(config?.min !== undefined ? config.min : -5);
    const max = parseFloat(config?.max !== undefined ? config.max : 5);
    let step = parseFloat(config?.step !== undefined ? config.step : 1);
    let subdivisions = parseInt(config?.subdivisions !== undefined ? config.subdivisions : 4);
    
    if (isNaN(min) || isNaN(max) || isNaN(step) || max <= min || step <= 0) {
        return '<div class="text-red-500 p-2 text-sm">Ungültige Zahlenstrahl-Konfiguration</div>';
    }
    if (isNaN(subdivisions) || subdivisions < 1) {
        subdivisions = 1;
    }
    
    const range = max - min;
    let minorStep = step / subdivisions;
    
    // Schutz vor zu vielen Teilstrichen (Browser-Absturz)
    if (range / minorStep > 200) {
        subdivisions = 1;
        minorStep = step;
        if (range / step > 100) {
            step = range / 10;
            minorStep = step;
        }
    }
    
    const width = 800;
    const height = 80;
    const paddingLeft = 50;
    const paddingRight = 50;
    const axisY = 35;
    const usableWidth = width - paddingLeft - paddingRight;
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="w-full h-full text-gray-900" xmlns="http://www.w3.org/2000/svg">`;
    
    // Hauptachse
    const axisStartX = paddingLeft - 20;
    const axisEndX = width - paddingRight + 20;
    svg += `<line x1="${axisStartX}" y1="${axisY}" x2="${axisEndX}" y2="${axisY}" stroke="currentColor" stroke-width="1.5" />`;
    
    // Achsenpfeil
    svg += `<polygon points="${axisEndX},${axisY - 4} ${axisEndX + 10},${axisY} ${axisEndX},${axisY + 4}" fill="currentColor" />`;
    
    // Teilstriche und Beschriftung zeichnen
    let current = min;
    const tolerance = 1e-9;
    
    while (current <= max + tolerance) {
        const x = paddingLeft + ((current - min) / range) * usableWidth;
        
        // Bestimmen, ob es ein Haupt- oder Zwischenschritt ist
        const index = Math.round((current - min) / minorStep);
        const isMajor = (index % subdivisions) === 0;
        
        const tickHeight = isMajor ? 14 : 8;
        const y1 = axisY - tickHeight / 2;
        const y2 = axisY + tickHeight / 2;
        
        // Teilstrich (Hauptstriche etwas dicker)
        const strokeWidth = isMajor ? 1.8 : 1.2;
        svg += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="currentColor" stroke-width="${strokeWidth}" />`;
        
        // Nur Hauptschritte beschriften
        if (isMajor) {
            const label = Math.round(current * 100) / 100;
            const isInteger = Math.abs(current - Math.round(current)) < tolerance;
            svg += `<text x="${x}" y="${axisY + 24}" font-family="Outfit, Inter, sans-serif" font-size="12" font-weight="${isInteger ? '600' : 'normal'}" text-anchor="middle" fill="currentColor">${label}</text>`;
        }
        
        current += minorStep;
        current = Math.round(current * 1e7) / 1e7;
    }
    
    svg += `</svg>`;
    return svg;
};


export const renderStrahlensatz = (config: any): string => {
    const type = config?.type || 'v-figur';
    const showPoints = config?.showPoints !== undefined ? config.showPoints : true;
    const showLabels = config?.showLabels !== undefined ? config.showLabels : true;

    // Punktbeschriftungen
    const sLabel = config?.vertexLabel || 'S';
    const aLabel = config?.ptALabel || 'A';
    const bLabel = config?.ptBLabel || 'B';
    const aPrLabel = config?.ptAprimeLabel || "A'";
    const bPrLabel = config?.ptBprimeLabel || "B'";

    // Streckenbeschriftungen
    const lSA = config?.labelSA || 'a';
    const lAB = config?.labelAB || 'b';
    const lSApr = config?.labelSAprime || 'c';
    const lAPrBPr = config?.labelAprimeBprime || 'd';
    const lAAPr = config?.labelAAprime || 'x';
    const lBBPr = config?.labelBBprime || 'y';

    const width = 500;
    const height = 240;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="w-full h-full text-gray-900 dark:text-gray-100" xmlns="http://www.w3.org/2000/svg">`;

    // Hilfsfunktion zum Zeichnen eines Punkts mit Label
    const drawPoint = (cx: number, cy: number, label: string, dx: number, dy: number, anchor: string = 'middle') => {
        let pSvg = '';
        if (showPoints) {
            pSvg += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="currentColor" />`;
            pSvg += `<circle cx="${cx}" cy="${cy}" r="1.5" fill="#fff" />`;
        }
        if (showPoints && label) {
            pSvg += `<text x="${cx + dx}" y="${cy + dy}" font-family="Outfit, Inter, sans-serif" font-size="12" font-weight="700" text-anchor="${anchor}" fill="currentColor">${label}</text>`;
        }
        return pSvg;
    };

    // Hilfsfunktion zum Zeichnen einer Streckenbeschriftung
    const drawSegmentLabel = (x: number, y: number, text: string) => {
        if (!showLabels || !text || text.trim() === '') return '';
        return `<g>
            <rect x="${x - 14}" y="${y - 8}" width="28" height="16" fill="var(--ui-card-bg, #ffffff)" rx="3" opacity="0.85" />
            <text x="${x}" y="${y + 4}" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" font-style="italic" text-anchor="middle" fill="currentColor">${text}</text>
        </g>`;
    };

    const isColored = !!config?.colorSegments;
    const colorUpper = isColored ? '#10b981' : 'currentColor';
    const colorLower = isColored ? '#8b5cf6' : 'currentColor';
    const colorInner = isColored ? '#3b82f6' : 'currentColor';
    const colorOuter = isColored ? '#ef4444' : 'currentColor';

    if (type === 'v-figur') {
        // Koordinaten
        const Sx = 50, Sy = 120;
        const Ax = 280, Ay = 50;
        const Bx = 440, By = 10;
        const AxPr = 280, AyPr = 190;
        const BxPr = 440, ByPr = 230;

        // Strahlen
        svg += `<line x1="${Sx}" y1="${Sy}" x2="470" y2="5" stroke="${colorUpper}" stroke-width="1.8" stroke-linecap="round" />`;
        svg += `<line x1="${Sx}" y1="${Sy}" x2="470" y2="235" stroke="${colorLower}" stroke-width="1.8" stroke-linecap="round" />`;

        // Parallelen
        svg += `<line x1="${Ax}" y1="${Ay}" x2="${AxPr}" y2="${AyPr}" stroke="${colorInner}" stroke-width="1.8" stroke-linecap="round" />`;
        svg += `<line x1="${Bx}" y1="${By}" x2="${BxPr}" y2="${ByPr}" stroke="${colorOuter}" stroke-width="1.8" stroke-linecap="round" />`;

        // Punkte
        svg += drawPoint(Sx, Sy, sLabel, -12, 4, 'end');
        svg += drawPoint(Ax, Ay, aLabel, 0, -10);
        svg += drawPoint(Bx, By, bLabel, 0, -10);
        svg += drawPoint(AxPr, AyPr, aPrLabel, 0, 18);
        svg += drawPoint(BxPr, ByPr, bPrLabel, 0, 18);

        // Streckenbeschriftungen
        svg += drawSegmentLabel(165, 74, lSA);
        svg += drawSegmentLabel(360, 20, lAB);
        svg += drawSegmentLabel(165, 168, lSApr);
        svg += drawSegmentLabel(360, 222, lAPrBPr);
        svg += drawSegmentLabel(262, 124, lAAPr);
        svg += drawSegmentLabel(456, 124, lBBPr);

    } else {
        // X-Figur
        // Koordinaten
        const Sx = 250, Sy = 120;
        const Ax = 90, Ay = 50;
        const BxPr = 410, ByPr = 190;
        const AxPr = 90, AyPr = 190;
        const Bx = 410, By = 50;

        // Geraden
        svg += `<line x1="${Ax}" y1="${Ay}" x2="${BxPr}" y2="${ByPr}" stroke="${colorUpper}" stroke-width="1.8" stroke-linecap="round" />`;
        svg += `<line x1="${AxPr}" y1="${AyPr}" x2="${Bx}" y2="${By}" stroke="${colorLower}" stroke-width="1.8" stroke-linecap="round" />`;

        // Parallelen
        svg += `<line x1="${Ax}" y1="${Ay}" x2="${AxPr}" y2="${AyPr}" stroke="${colorInner}" stroke-width="1.8" stroke-linecap="round" />`;
        svg += `<line x1="${Bx}" y1="${By}" x2="${BxPr}" y2="${ByPr}" stroke="${colorOuter}" stroke-width="1.8" stroke-linecap="round" />`;

        // Punkte
        svg += drawPoint(Sx, Sy, sLabel, 0, -10);
        svg += drawPoint(Ax, Ay, aLabel, -10, -5, 'end');
        svg += drawPoint(Bx, By, bLabel, 10, -5, 'start');
        svg += drawPoint(AxPr, AyPr, aPrLabel, -10, 14, 'end');
        svg += drawPoint(BxPr, ByPr, bPrLabel, 10, 14, 'start');

        // Streckenbeschriftungen
        svg += drawSegmentLabel(160, 68, lSA);
        svg += drawSegmentLabel(340, 172, lAB); // Im X-Fall ist SA/SB' die gleiche Linie, wir mappen sie logisch
        svg += drawSegmentLabel(160, 172, lSApr);
        svg += drawSegmentLabel(340, 68, lAPrBPr);
        svg += drawSegmentLabel(72, 124, lAAPr);
        svg += drawSegmentLabel(428, 124, lBBPr);
    }

    svg += `</svg>`;
    return svg;
};

export const renderGluecksrad = (config: any, options?: { interactive?: boolean; activeSectorId?: number | null }): string => {
    if (!config) return '';
    const showPointer = config.showPointer !== undefined ? config.showPointer : true;
    const sectors = config.sektoren || [];
    const interactive = !!options?.interactive;
    const activeSectorId = options?.activeSectorId ?? null;

    const width = 240;
    const vHeight = 250;
    const cx = 120;
    const cy = 138;
    const R = 95;

    const getSectorColors = (type: string) => {
        let fill = '#ffffff';
        let strokeDash = '';
        let textColor = 'currentColor';
        let needsLabelBg = false;

        switch (type) {
            case 'black':
                fill = '#000000';
                textColor = '#ffffff';
                break;
            case 'grey':
                fill = '#cbd5e1';
                break;
            case 'striped':
                fill = 'url(#striped-pattern)';
                needsLabelBg = true;
                break;
            case 'dashed':
                strokeDash = 'stroke-dasharray="6,4"';
                needsLabelBg = true;
                break;
            case 'red':
                fill = '#ef4444';
                textColor = '#ffffff';
                break;
            case 'blue':
                fill = '#3b82f6';
                textColor = '#ffffff';
                break;
            case 'green':
                fill = '#22c55e';
                textColor = '#ffffff';
                break;
            case 'yellow':
                fill = '#eab308';
                textColor = '#000000';
                break;
            case 'orange':
                fill = '#f97316';
                textColor = '#ffffff';
                break;
            case 'purple':
                fill = '#a855f7';
                textColor = '#ffffff';
                break;
            case 'white':
            default:
                fill = '#ffffff';
                textColor = '#000000';
                break;
        }
        return { fill, strokeDash, textColor, needsLabelBg };
    };

    let svg = `<svg viewBox="0 0 ${width} ${vHeight}" class="${interactive ? 'gluecksrad-interactive-svg' : ''}" style="height: 100%; max-width: 100%; overflow: visible;" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
        <pattern id="striped-pattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="2.5" />
        </pattern>
    </defs>`;

    if (sectors.length === 0) {
        svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="currentColor" stroke-width="3" />`;
        if (showPointer) {
            svg += `<polygon points="112,10 128,10 120,48" fill="#ef4444" stroke="#b91c1c" stroke-width="2" stroke-linejoin="round" />`;
            svg += `<circle cx="120" cy="18" r="3" fill="#ffffff" />`;
        }
        svg += `</svg>`;
        return svg;
    }

    const totalWeight = sectors.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 1), 0);

    if (totalWeight <= 0) {
        svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="currentColor" stroke-width="3" />`;
        if (showPointer) {
            svg += `<polygon points="112,10 128,10 120,48" fill="#ef4444" stroke="#b91c1c" stroke-width="2" stroke-linejoin="round" />`;
            svg += `<circle cx="120" cy="18" r="3" fill="#ffffff" />`;
        }
        svg += `</svg>`;
        return svg;
    }

    // If there is only one sector, draw full circle
    if (sectors.length === 1) {
        const sector = sectors[0];
        const isActive = activeSectorId === sector.id;
        const { fill, strokeDash } = getSectorColors(sector.type);
        const interactiveClass = interactive ? 'gluecksrad-interactive-sector' : '';
        const activeClass = isActive ? 'is-active-sector' : '';

        svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}" stroke="currentColor" stroke-width="3" ${strokeDash} class="gluecksrad-sector ${interactiveClass} ${activeClass}" data-sector-id="${sector.id}" />`;
        if (isActive) {
            svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#2563eb" stroke-width="4.5" class="gluecksrad-active-outline" />`;
        }
        if (sector.label) {
            svg += `<circle cx="${cx}" cy="${cy}" r="14" fill="#ffffff" opacity="0.95" stroke="currentColor" stroke-width="1" />`;
            svg += `<text x="${cx}" y="${cy}" fill="#000000" font-family="Outfit, Inter, sans-serif" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="central">${sector.label}</text>`;
        }
    } else {
        // Draw multiple sectors
        let currentAngle = -Math.PI / 2; // Start at the top center (-90 degrees)
        let activeOverlayPath = '';

        sectors.forEach((sector: any) => {
            const weight = parseFloat(sector.weight) || 1;
            const angleDelta = (weight / totalWeight) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angleDelta;
            const isActive = activeSectorId === sector.id;

            const { fill, strokeDash, textColor, needsLabelBg } = getSectorColors(sector.type);

            const x1 = cx + R * Math.cos(startAngle);
            const y1 = cy + R * Math.sin(startAngle);
            const x2 = cx + R * Math.cos(endAngle);
            const y2 = cy + R * Math.sin(endAngle);

            const largeArcFlag = angleDelta > Math.PI ? 1 : 0;
            const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            const interactiveClass = interactive ? 'gluecksrad-interactive-sector' : '';
            const activeClass = isActive ? 'is-active-sector' : '';

            svg += `<path d="${pathD}" fill="${fill}" stroke="currentColor" stroke-width="2.5" ${strokeDash} class="gluecksrad-sector ${interactiveClass} ${activeClass}" data-sector-id="${sector.id}" />`;

            if (isActive) {
                activeOverlayPath = `<path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="4.5" class="gluecksrad-active-outline" />`;
            }

            // Draw Label
            if (sector.label) {
                const midAngle = startAngle + angleDelta / 2;
                const labelR = R * 0.62;
                const labelX = cx + labelR * Math.cos(midAngle);
                const labelY = cy + labelR * Math.sin(midAngle);

                if (needsLabelBg || sector.type === 'striped' || sector.type === 'black') {
                    svg += `<circle cx="${labelX}" cy="${labelY}" r="12" fill="#ffffff" opacity="0.95" stroke="currentColor" stroke-width="1" />`;
                    svg += `<text x="${labelX}" y="${labelY}" fill="#000000" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="central">${sector.label}</text>`;
                } else {
                    svg += `<text x="${labelX}" y="${labelY}" fill="${textColor}" font-family="Outfit, Inter, sans-serif" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="central">${sector.label}</text>`;
                }
            }

            currentAngle = endAngle;
        });

        // Re-draw active outline on top
        if (activeOverlayPath) {
            svg += activeOverlayPath;
        }

        // Re-draw outer border on top for perfect circle outline
        svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="currentColor" stroke-width="3" />`;
    }

    // Draw Pointer at the top pointing down
    if (showPointer) {
        svg += `<polygon points="112,10 128,10 120,48" fill="#ef4444" stroke="#b91c1c" stroke-width="2" stroke-linejoin="round" />`;
        svg += `<circle cx="120" cy="18" r="3" fill="#ffffff" />`;
    }

    svg += `</svg>`;
    return svg;
};

export const renderBruch = (config: any): string => {
    if (!config) return '';
    
    const type = config.type || 'kreis';
    const numerator = Math.max(0, parseInt(config.numerator) || 0);
    const denominator = Math.max(1, parseInt(config.denominator) || 1);
    const fillType = config.fillType || 'grey';
    const mode = config.mode || 'determine';
    const shapeType = config.shapeType || 'circle';

    const getFillColor = (isFilled: boolean): string => {
        if (!isFilled) return '#ffffff';
        if (mode === 'color') return '#3b82f6';
        
        switch (fillType) {
            case 'primary': return '#3b82f6';
            case 'grey': return '#cbd5e1';
            case 'black': return '#0f172a';
            case 'striped': return 'url(#striped-pattern-bruch)';
            case 'red': return '#ef4444';
            case 'blue': return '#3b82f6';
            case 'green': return '#22c55e';
            case 'yellow': return '#eab308';
            case 'orange': return '#f97316';
            default: return '#cbd5e1';
        }
    };

    let svg = '';

    if (type === 'kreis') {
        const width = 200;
        const height = 200;
        const cx = 100;
        const cy = 100;
        const R = 85;

        svg += `<svg viewBox="0 0 ${width} ${height}" class="bruch-svg bruch-kreis-svg" xmlns="http://www.w3.org/2000/svg">`;
        
        // Defs für Schraffurmuster
        svg += `<defs>
            <pattern id="striped-pattern-bruch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" class="bruch-stripe-line" stroke="currentColor" stroke-width="1.5" />
            </pattern>
        </defs>`;

        if (denominator === 1) {
            // Spezialfall: Ganzer Kreis
            const isFilled = numerator >= 1;
            svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${getFillColor(isFilled)}" class="bruch-outline" stroke="currentColor" stroke-width="2" />`;
        } else {
            // Kuchenstücke zeichnen
            for (let i = 0; i < denominator; i++) {
                const angle1 = -Math.PI / 2 + (i * 2 * Math.PI) / denominator;
                const angle2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / denominator;

                const x1 = cx + R * Math.cos(angle1);
                const y1 = cy + R * Math.sin(angle1);
                const x2 = cx + R * Math.cos(angle2);
                const y2 = cy + R * Math.sin(angle2);

                const isFilled = i < numerator;

                // Pfad für ein Tortenstück
                const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
                svg += `<path d="${pathD}" fill="${getFillColor(isFilled)}" class="bruch-slice" stroke="currentColor" stroke-width="1.5" />`;
            }
            
            // Re-draw outer border on top for perfect circle outline
            svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="bruch-outline-overlay" stroke="currentColor" stroke-width="2" />`;
        }
        svg += `</svg>`;
    } else if (type === 'balken') {
        const width = 500;
        const height = 100;
        const marginX = 10;
        const marginY = 10;
        const blockW = (width - 2 * marginX) / denominator;
        const blockH = height - 2 * marginY;

        svg += `<svg viewBox="0 0 ${width} ${height}" class="bruch-svg bruch-balken-svg" xmlns="http://www.w3.org/2000/svg">`;
        
        // Defs für Schraffurmuster
        svg += `<defs>
            <pattern id="striped-pattern-bruch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" class="bruch-stripe-line" stroke="currentColor" stroke-width="1.5" />
            </pattern>
        </defs>`;

        for (let i = 0; i < denominator; i++) {
            const x = marginX + i * blockW;
            const y = marginY;
            const isFilled = i < numerator;

            svg += `<rect x="${x}" y="${y}" width="${blockW}" height="${blockH}" fill="${getFillColor(isFilled)}" class="bruch-bar-segment" stroke="currentColor" stroke-width="1.2" />`;
        }

        // Dickerer Rahmen außen herum
        svg += `<rect x="${marginX}" y="${marginY}" width="${width - 2 * marginX}" height="${blockH}" fill="none" class="bruch-outline" stroke="currentColor" stroke-width="2" />`;
        
        svg += `</svg>`;
    } else if (type === 'menge') {
        const width = 500;
        const height = 150;
        
        // Bestimmen der Spalten und Zeilen für das Raster
        let cols = Math.min(denominator, 10);
        if (denominator > 10 && denominator <= 12) {
            cols = 6;
        } else if (denominator > 12 && denominator <= 16) {
            cols = 8;
        } else if (denominator > 16 && denominator <= 20) {
            cols = 10;
        }
        
        const rows = Math.ceil(denominator / cols);
        const dx = width / (cols + 1);
        const dy = height / (rows + 1);
        const size = Math.min(22, dx * 0.4, dy * 0.4);

        svg += `<svg viewBox="0 0 ${width} ${height}" class="bruch-svg bruch-menge-svg" xmlns="http://www.w3.org/2000/svg">`;
        
        // Defs für Schraffurmuster
        svg += `<defs>
            <pattern id="striped-pattern-bruch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" class="bruch-stripe-line" stroke="currentColor" stroke-width="1.5" />
            </pattern>
        </defs>`;

        for (let i = 0; i < denominator; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const cx = (c + 1) * dx;
            const cy = (r + 1) * dy;
            const isFilled = i < numerator;

            if (shapeType === 'circle') {
                svg += `<circle cx="${cx}" cy="${cy}" r="${size}" fill="${getFillColor(isFilled)}" class="bruch-symbol" stroke="currentColor" stroke-width="1.8" />`;
            } else if (shapeType === 'square') {
                const sHalf = size;
                svg += `<rect x="${cx - sHalf}" y="${cy - sHalf}" width="${2 * sHalf}" height="${2 * sHalf}" rx="3" fill="${getFillColor(isFilled)}" class="bruch-symbol" stroke="currentColor" stroke-width="1.8" />`;
            } else if (shapeType === 'star') {
                // Dynamischer 5-zackiger Stern
                const points: string[] = [];
                for (let j = 0; j < 10; j++) {
                    const angle = -Math.PI / 2 + (j * Math.PI) / 5;
                    const rCurr = j % 2 === 0 ? size : size * 0.4;
                    const sx = cx + rCurr * Math.cos(angle);
                    const sy = cy + rCurr * Math.sin(angle);
                    points.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
                }
                svg += `<polygon points="${points.join(' ')}" fill="${getFillColor(isFilled)}" class="bruch-symbol" stroke="currentColor" stroke-width="1.8" />`;
            }
        }
        svg += `</svg>`;
    }

    return svg;
};

export const renderDiagram = (config: any, options?: { interactive?: boolean; activeItemIdx?: number | null }): string => {
    if (!config) return '';

    const type = config.type || 'saeule';
    const title = config.title || '';
    const xAxisLabel = config.xAxisLabel || '';
    const yAxisLabel = config.yAxisLabel || '';
    const yMax = Math.max(1, parseFloat(config.yMax) || 10);
    const yStep = Math.max(0.1, parseFloat(config.yStep) || 2);
    const showGrid = config.showGrid !== false;
    const mode = config.mode || 'show';
    const fillType = config.fillType || 'grey';
    const items = config.items || [];
    const isInteractive = !!options?.interactive;
    const activeItemIdx = options?.activeItemIdx ?? null;

    // Füllungsklasse für die Diagramm-Elemente
    let fillClass = 'diag-unfilled';
    if (mode === 'draw') {
        fillClass = 'diag-solution-fill';
    } else {
        fillClass = `diag-filled diag-fill-${fillType}`;
    }

    let svg = '';
    const width = 500;
    const height = 250;

    svg += `<svg viewBox="0 0 ${width} ${height}" class="diag-svg diag-${type}-svg ${isInteractive ? 'diag-interactive-svg' : ''}" xmlns="http://www.w3.org/2000/svg">`;

    // Defs für Schraffur und andere Muster
    svg += `<defs>
        <pattern id="striped-pattern-diag" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" class="diag-stripe-line" stroke="currentColor" stroke-width="1.5" />
        </pattern>
    </defs>`;

    // Diagramm-Titel rendern
    if (title) {
        svg += `<text x="${width / 2}" y="20" class="diag-title" font-family="Outfit, Inter, sans-serif" font-size="14" font-weight="700" text-anchor="middle">${title}</text>`;
    }

    if (type === 'balken') {
        // Horizontales Balkendiagramm: Y-Achse hat Kategorien, X-Achse hat Werte
        const plotLeft = 85;
        const plotRight = 470;
        const plotTop = 40;
        const plotBottom = 200;
        const plotWidth = 360;
        const plotHeight = 150;

        // X-Achse (Werte) von plotLeft bis plotRight
        svg += `<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" class="diag-axis" stroke="currentColor" stroke-width="2" />`;
        // Pfeil für X-Achse
        svg += `<polygon points="${plotRight},${plotBottom} ${plotRight - 10},${plotBottom - 4} ${plotRight - 10},${plotBottom + 4}" fill="currentColor" />`;
        // X-Achse Beschriftung
        if (xAxisLabel) {
            svg += `<text x="${plotRight}" y="${plotBottom + 35}" class="diag-axis-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" text-anchor="end">${xAxisLabel}</text>`;
        }

        // Y-Achse (Kategorien) von plotBottom bis plotTop
        svg += `<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotLeft}" y2="${plotTop - 10}" class="diag-axis" stroke="currentColor" stroke-width="2" />`;
        // Pfeil für Y-Achse
        svg += `<polygon points="${plotLeft},${plotTop - 10} ${plotLeft - 4},${plotTop} ${plotLeft + 4},${plotTop}" fill="currentColor" />`;
        // Y-Achse Beschriftung
        if (yAxisLabel) {
            svg += `<text x="${plotLeft - 10}" y="${plotTop - 15}" class="diag-axis-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" text-anchor="end">${yAxisLabel}</text>`;
        }

        // X-Rasterlinien & Labels (Werte)
        const numTicks = Math.floor(yMax / yStep);
        for (let i = 0; i <= numTicks; i++) {
            const val = i * yStep;
            if (val > yMax) break;
            const cx = plotLeft + (val / yMax) * plotWidth;

            // Rasterlinie
            if (showGrid && val > 0) {
                svg += `<line x1="${cx}" y1="${plotTop}" x2="${cx}" y2="${plotBottom}" class="diag-grid-line" stroke="#cbd5e1" stroke-dasharray="3" stroke-width="1" />`;
            }

            // Tick Mark
            svg += `<line x1="${cx}" y1="${plotBottom}" x2="${cx}" y2="${plotBottom + 4}" class="diag-tick" stroke="currentColor" stroke-width="1.5" />`;

            // Label
            svg += `<text x="${cx}" y="${plotBottom + 18}" class="diag-label" font-family="Outfit, Inter, sans-serif" font-size="11" text-anchor="middle">${val}</text>`;
        }

        // Kategorien (Y-Achse) & Balken
        if (items.length > 0) {
            const rowHeight = plotHeight / items.length;
            items.forEach((item: any, i: number) => {
                const cy = plotTop + (i + 0.5) * rowHeight;
                const itemVal = Math.max(0, parseFloat(item.value) || 0);

                // Kategorie-Label links neben der Y-Achse
                const truncatedLabel = item.label.length > 12 ? item.label.slice(0, 10) + '..' : item.label;
                svg += `<text x="${plotLeft - 10}" y="${cy}" class="diag-label" font-family="Outfit, Inter, sans-serif" font-size="11" text-anchor="end" dominant-baseline="central" title="${item.label}">${truncatedLabel}</text>`;

                // Balkenbreite berechnen
                const rectW = (itemVal / yMax) * plotWidth;
                const barHeight = Math.min(25, rowHeight * 0.6);
                const rectY = cy - barHeight / 2;

                const isItemActive = activeItemIdx === i;
                const interactiveClass = isInteractive ? 'diag-interactive-item' : '';
                const activeClass = isItemActive ? 'is-active-diag-item' : '';

                // Balken zeichnen
                svg += `<rect x="${plotLeft}" y="${rectY}" width="${rectW}" height="${barHeight}" class="${fillClass} diag-bar ${interactiveClass} ${activeClass}" stroke="currentColor" stroke-width="1.5" data-item-idx="${i}" />`;
                if (isItemActive) {
                    svg += `<rect x="${plotLeft}" y="${rectY}" width="${rectW}" height="${barHeight}" fill="none" stroke="#2563eb" stroke-width="3" class="diag-active-outline" />`;
                }
            });
        }

    } else {
        // Vertikale Diagramme (Säule, Stab, Linie)
        const plotLeft = 60;
        const plotRight = 470;
        const plotTop = 50;
        const plotBottom = 200;
        const plotWidth = 390;
        const plotHeight = 150;

        // X-Achse (Kategorien)
        svg += `<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" class="diag-axis" stroke="currentColor" stroke-width="2" />`;
        // Pfeil für X-Achse
        svg += `<polygon points="${plotRight},${plotBottom} ${plotRight - 10},${plotBottom - 4} ${plotRight - 10},${plotBottom + 4}" fill="currentColor" />`;
        if (xAxisLabel) {
            svg += `<text x="${plotRight}" y="${plotBottom + 35}" class="diag-axis-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" text-anchor="end">${xAxisLabel}</text>`;
        }

        // Y-Achse (Werte)
        svg += `<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotLeft}" y2="${plotTop - 10}" class="diag-axis" stroke="currentColor" stroke-width="2" />`;
        // Pfeil für Y-Achse
        svg += `<polygon points="${plotLeft},${plotTop - 10} ${plotLeft - 4},${plotTop} ${plotLeft + 4},${plotTop}" fill="currentColor" />`;
        if (yAxisLabel) {
            svg += `<text x="${plotLeft - 10}" y="${plotTop - 15}" class="diag-axis-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" text-anchor="end">${yAxisLabel}</text>`;
        }

        // Y-Rasterlinien & Labels (Werte)
        const numTicks = Math.floor(yMax / yStep);
        for (let i = 0; i <= numTicks; i++) {
            const val = i * yStep;
            if (val > yMax) break;
            const cy = plotBottom - (val / yMax) * plotHeight;

            // Rasterlinie
            if (showGrid && val > 0) {
                svg += `<line x1="${plotLeft}" y1="${cy}" x2="${plotRight - 20}" y2="${cy}" class="diag-grid-line" stroke="#cbd5e1" stroke-dasharray="3" stroke-width="1" />`;
            }

            // Tick Mark
            svg += `<line x1="${plotLeft - 4}" y1="${cy}" x2="${plotLeft}" y2="${cy}" class="diag-tick" stroke="currentColor" stroke-width="1.5" />`;

            // Label
            svg += `<text x="${plotLeft - 8}" y="${cy}" class="diag-label" font-family="Outfit, Inter, sans-serif" font-size="11" text-anchor="end" dominant-baseline="central">${val}</text>`;
        }

        // X-Kategorien zeichnen
        if (items.length > 0) {
            const colWidth = plotWidth / items.length;
            const points: string[] = [];

            items.forEach((item: any, i: number) => {
                const cx = plotLeft + (i + 0.5) * colWidth;
                const itemVal = Math.max(0, parseFloat(item.value) || 0);
                const valueY = plotBottom - (itemVal / yMax) * plotHeight;

                // X-Kategorie-Label
                const truncatedLabel = item.label.length > 12 ? item.label.slice(0, 10) + '..' : item.label;
                svg += `<text x="${cx}" y="${plotBottom + 18}" class="diag-label" font-family="Outfit, Inter, sans-serif" font-size="11" text-anchor="middle" title="${item.label}">${truncatedLabel}</text>`;

                const isItemActive = activeItemIdx === i;
                const interactiveClass = isInteractive ? 'diag-interactive-item' : '';
                const activeClass = isItemActive ? 'is-active-diag-item' : '';

                if (type === 'saeule') {
                    // Säulendiagramm
                    const barWidth = Math.min(35, colWidth * 0.6);
                    const rectX = cx - barWidth / 2;
                    const rectH = (itemVal / yMax) * plotHeight;
                    svg += `<rect x="${rectX}" y="${valueY}" width="${barWidth}" height="${rectH}" class="${fillClass} diag-bar ${interactiveClass} ${activeClass}" stroke="currentColor" stroke-width="1.5" data-item-idx="${i}" />`;
                    if (isItemActive) {
                        svg += `<rect x="${rectX}" y="${valueY}" width="${barWidth}" height="${rectH}" fill="none" stroke="#2563eb" stroke-width="3" class="diag-active-outline" />`;
                    }

                } else if (type === 'stab') {
                    // Stabdiagramm
                    svg += `<g class="diag-stick-group ${interactiveClass} ${activeClass}" data-item-idx="${i}">`;
                    svg += `<line x1="${cx}" y1="${plotBottom}" x2="${cx}" y2="${valueY}" class="diag-stick" stroke="${isItemActive ? '#2563eb' : 'currentColor'}" stroke-width="${isItemActive ? 3.5 : 2.5}" />`;
                    svg += `<circle cx="${cx}" cy="${valueY}" r="${isItemActive ? 7 : 5}" class="${fillClass} diag-stick-circle" stroke="${isItemActive ? '#2563eb' : 'currentColor'}" stroke-width="${isItemActive ? 2.5 : 1.8}" />`;
                    svg += `</g>`;

                } else if (type === 'linie') {
                    // Liniendiagramm
                    points.push(`${cx.toFixed(1)},${valueY.toFixed(1)}`);
                    svg += `<circle cx="${cx}" cy="${valueY}" r="${isItemActive ? 7 : 5}" class="${fillClass} diag-point ${interactiveClass} ${activeClass}" stroke="${isItemActive ? '#2563eb' : 'currentColor'}" stroke-width="${isItemActive ? 2.5 : 1.8}" data-item-idx="${i}" />`;
                }
            });

            // Liniendiagramm: Verbindungslinien zeichnen
            if (type === 'linie' && points.length > 1) {
                const isDraw = mode === 'draw';
                const strokeDash = isDraw ? 'stroke-dasharray="3"' : '';
                const strokeClass = isDraw ? 'diag-solution-line' : 'diag-line';
                svg += `<polyline points="${points.join(' ')}" fill="none" class="${strokeClass}" stroke="currentColor" stroke-width="2" ${strokeDash} />`;
            }
        }
    }

    svg += `</svg>`;
    return svg;
};

export const renderKoordinatensystem = (config: any): string => {
    if (!config) return '';

    const xMin = parseFloat(config.xMin) !== undefined && !isNaN(parseFloat(config.xMin)) ? parseFloat(config.xMin) : 0;
    const xMax = parseFloat(config.xMax) !== undefined && !isNaN(parseFloat(config.xMax)) ? parseFloat(config.xMax) : 6;
    const yMin = parseFloat(config.yMin) !== undefined && !isNaN(parseFloat(config.yMin)) ? parseFloat(config.yMin) : 0;
    const yMax = parseFloat(config.yMax) !== undefined && !isNaN(parseFloat(config.yMax)) ? parseFloat(config.yMax) : 5;
    const xStep = Math.max(0.1, parseFloat(config.xStep) || 1);
    const yStep = Math.max(0.1, parseFloat(config.yStep) || 1);
    const showGrid = config.showGrid !== false;
    const connectPoints = config.connectPoints === true;
    const closeShape = config.closeShape === true;
    const mode = config.mode || 'show';
    const points = config.points || [];

    const dx = xMax - xMin;
    const dy = yMax - yMin;
    const safeDx = dx <= 0 ? 1 : dx;
    const safeDy = dy <= 0 ? 1 : dy;

    const plotLeft = 45;
    const plotWidth = 380;
    const plotRight = plotLeft + plotWidth;

    // Proportional height
    const plotHeight = Math.round(plotWidth * (safeDy / safeDx));
    const plotTop = 40;
    const plotBottom = plotTop + plotHeight;

    const viewBoxWidth = plotRight + 45;
    const viewBoxHeight = plotBottom + 40;

    let svg = `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" class="koord-svg" xmlns="http://www.w3.org/2000/svg">`;

    // 1. Grid (Hilfsgitter)
    if (showGrid) {
        // Vertical grid lines
        for (let x = xMin; x <= xMax; x += xStep) {
            const px = plotLeft + ((x - xMin) / safeDx) * plotWidth;
            svg += `<line x1="${px}" y1="${plotTop}" x2="${px}" y2="${plotBottom}" class="koord-grid-line" stroke="#cbd5e1" stroke-dasharray="2 2" stroke-width="0.8" />`;
        }
        // Horizontal grid lines
        for (let y = yMin; y <= yMax; y += yStep) {
            const py = plotBottom - ((y - yMin) / safeDy) * plotHeight;
            svg += `<line x1="${plotLeft}" y1="${py}" x2="${plotRight}" y2="${py}" class="koord-grid-line" stroke="#cbd5e1" stroke-dasharray="2 2" stroke-width="0.8" />`;
        }
    }

    // Determine axes positions (default to origin if within bounds, otherwise border)
    let yAxisPos = plotBottom; // X-axis pixel position
    if (yMin <= 0 && yMax >= 0) {
        yAxisPos = plotBottom - ((0 - yMin) / safeDy) * plotHeight;
    }

    let xAxisPos = plotLeft; // Y-axis pixel position
    if (xMin <= 0 && xMax >= 0) {
        xAxisPos = plotLeft + ((0 - xMin) / safeDx) * plotWidth;
    }

    // 2. Axes Lines & Arrows
    const arrowWidth = 4;

    // X-Axis (Horizontal)
    svg += `<line x1="${plotLeft}" y1="${yAxisPos}" x2="${plotRight + 15}" y2="${yAxisPos}" class="koord-axis" stroke="currentColor" stroke-width="1.8" />`;
    // X-Axis Arrow
    svg += `<polygon points="${plotRight + 15},${yAxisPos} ${plotRight + 5},${yAxisPos - arrowWidth} ${plotRight + 5},${yAxisPos + arrowWidth}" fill="currentColor" />`;
    // X-Axis Label
    svg += `<text x="${plotRight + 15}" y="${yAxisPos + 18}" class="koord-axis-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" text-anchor="end">x</text>`;

    // Y-Axis (Vertical)
    svg += `<line x1="${xAxisPos}" y1="${plotBottom}" x2="${xAxisPos}" y2="${plotTop - 15}" class="koord-axis" stroke="currentColor" stroke-width="1.8" />`;
    // Y-Axis Arrow
    svg += `<polygon points="${xAxisPos},${plotTop - 15} ${xAxisPos - arrowWidth},${plotTop - 5} ${xAxisPos + arrowWidth},${plotTop - 5}" fill="currentColor" />`;
    // Y-Axis Label
    svg += `<text x="${xAxisPos - 12}" y="${plotTop - 10}" class="koord-axis-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600" text-anchor="start">y</text>`;

    // 3. Ticks and Numbers
    // X-Ticks
    for (let x = xMin; x <= xMax; x += xStep) {
        if (Math.abs(x) < 1e-9 && xAxisPos !== plotLeft) continue; // Skip zero if Y-axis is at 0
        const px = plotLeft + ((x - xMin) / safeDx) * plotWidth;
        // Tick mark
        svg += `<line x1="${px}" y1="${yAxisPos - 4}" x2="${px}" y2="${yAxisPos + 4}" class="koord-tick" stroke="currentColor" stroke-width="1.5" />`;
        // Label
        const labelVal = Number(x.toFixed(2)).toString();
        svg += `<text x="${px}" y="${yAxisPos + 16}" class="koord-label" font-family="Outfit, Inter, sans-serif" font-size="10" text-anchor="middle">${labelVal}</text>`;
    }

    // Y-Ticks
    for (let y = yMin; y <= yMax; y += yStep) {
        if (Math.abs(y) < 1e-9 && yAxisPos !== plotBottom) continue; // Skip zero if X-axis is at 0
        const py = plotBottom - ((y - yMin) / safeDy) * plotHeight;
        // Tick mark
        svg += `<line x1="${xAxisPos - 4}" y1="${py}" x2="${xAxisPos + 4}" y2="${py}" class="koord-tick" stroke="currentColor" stroke-width="1.5" />`;
        // Label
        const labelVal = Number(y.toFixed(2)).toString();
        svg += `<text x="${xAxisPos - 8}" y="${py}" class="koord-label" font-family="Outfit, Inter, sans-serif" font-size="10" text-anchor="end" dominant-baseline="central">${labelVal}</text>`;
    }

    // Origin Zero label (if axes cross inside)
    if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
        svg += `<text x="${xAxisPos - 8}" y="${yAxisPos + 14}" class="koord-label koord-origin-label" font-family="Outfit, Inter, sans-serif" font-size="10" text-anchor="end">0</text>`;
    }

    // 4. Points & Connections
    if (points.length > 0) {
        const isDrawMode = mode === 'draw';
        const pointClass = isDrawMode ? 'koord-solution-point' : 'koord-point';
        const lineClass = isDrawMode ? 'koord-solution-line' : 'koord-line';
        const textClass = isDrawMode ? 'koord-solution-text' : 'koord-text';

        const ptPixels = points.map((pt: any) => {
            const xVal = parseFloat(pt.x) || 0;
            const yVal = parseFloat(pt.y) || 0;
            return {
                label: pt.label || '',
                x: plotLeft + ((xVal - xMin) / safeDx) * plotWidth,
                y: plotBottom - ((yVal - yMin) / safeDy) * plotHeight
            };
        });

        // Draw connections (polygons/lines)
        if (connectPoints && ptPixels.length > 1) {
            const pointsStr = ptPixels.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            if (closeShape) {
                const fillVal = config.colorShape ? 'rgba(79, 70, 229, 0.15)' : 'none';
                const strokeVal = config.colorShape ? '#4f46e5' : 'currentColor';
                svg += `<polygon points="${pointsStr}" class="${lineClass} koord-shape" fill="${fillVal}" stroke="${strokeVal}" stroke-width="2" />`;
            } else {
                const strokeVal = config.colorShape ? '#4f46e5' : 'currentColor';
                svg += `<polyline points="${pointsStr}" class="${lineClass} koord-polyline" fill="none" stroke="${strokeVal}" stroke-width="2" />`;
            }
        }

        // Draw points and labels
        ptPixels.forEach((pt: any, idx: number) => {
            const pointFill = config.colorShape ? '#0ea5e9' : 'currentColor';
            const strokeVal = config.colorShape ? '#0284c7' : 'currentColor';
            svg += `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${pointFill}" class="${pointClass}" stroke="${strokeVal}" stroke-width="1.5" />`;
            
            if (pt.label) {
                const textFill = config.colorShape ? '#4f46e5' : 'currentColor';
                svg += `<text x="${pt.x + 8}" y="${pt.y - 6}" fill="${textFill}" class="${textClass} koord-point-label" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="600">${pt.label}</text>`;
            }
        });
    }

    svg += `</svg>`;
    return svg;
};


