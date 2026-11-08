/**
 * Word Add-in Service (Office.js Bridge)
 * Handles insertion of high-resolution graphics, tables, and math structures
 * directly into Microsoft Word at the current selection/cursor position.
 */

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
} from './mathRenderer';
import {
    generateExtremwertTaskText,
    generateRotationskoerperTaskText,
    solveSteckbrief
} from './taskFactory';

declare const Office: any;
declare const Word: any;

let isOfficeInitialized = false;

/** 1 cm entspricht 28.3464567 PostScript Points (pt) in Word */
const CM_TO_PT = 28.3464567;
/** 1 cm bei 96 DPI entspricht ~37.7952756 CSS-Pixeln */
const CM_TO_PX = 37.7952756;

export function initOffice(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof Office !== 'undefined' && Office.onReady) {
            Office.onReady((info: any) => {
                if (info && info.host === Office.HostType.Word) {
                    isOfficeInitialized = true;
                    console.log('✅ AufgabenBuilder Word Add-in erfolgreich initialisiert.');
                    resolve(true);
                } else {
                    console.log('ℹ️ Office.js geladen, aber nicht im Word-Host (Browser-Modus).');
                    resolve(false);
                }
            });
        } else {
            console.log('ℹ️ Office.js nicht vorhanden – Standalone Browser-Modus aktiv.');
            resolve(false);
        }
    });
}

export function isWordHost(): boolean {
    return isOfficeInitialized && typeof Word !== 'undefined' && !!Word.run;
}

/**
 * Parst Breite und Höhe (in cm) aus einem SVG-String oder nutzt übergebene Zielmaße.
 */
function parseSvgPhysicalDimensions(
    svgString: string,
    targetWidthCm?: number,
    targetHeightCm?: number
): { widthCm: number; heightCm: number; aspect: number } {
    let wCm = targetWidthCm && targetWidthCm > 0 ? targetWidthCm : 0;
    let hCm = targetHeightCm && targetHeightCm > 0 ? targetHeightCm : 0;

    // Versuche viewBox auszulesen für das Seitenverhältnis
    let vbAspect = 4 / 3;
    const vbMatch = svgString.match(/viewBox=["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\s*["']/i);
    if (vbMatch) {
        const vbW = parseFloat(vbMatch[3]);
        const vbH = parseFloat(vbMatch[4]);
        if (vbW > 0 && vbH > 0) {
            vbAspect = vbW / vbH;
        }
    }

    if (!wCm) {
        const wCmMatch = svgString.match(/\bwidth=["']\s*([\d.]+)\s*cm\s*["']/i);
        const wPxMatch = svgString.match(/\bwidth=["']\s*([\d.]+)\s*(?:px)?\s*["']/i);
        if (wCmMatch) wCm = parseFloat(wCmMatch[1]);
        else if (wPxMatch && !svgString.includes('width="100%"')) {
            const px = parseFloat(wPxMatch[1]);
            if (px > 0 && px < 2000) wCm = Math.min(16, Math.max(4, px / CM_TO_PX));
        }
    }

    if (!hCm) {
        const hCmMatch = svgString.match(/\bheight=["']\s*([\d.]+)\s*cm\s*["']/i);
        const hPxMatch = svgString.match(/\bheight=["']\s*([\d.]+)\s*(?:px)?\s*["']/i);
        if (hCmMatch) hCm = parseFloat(hCmMatch[1]);
        else if (hPxMatch && !svgString.includes('height="100%"')) {
            const px = parseFloat(hPxMatch[1]);
            if (px > 0 && px < 2000) hCm = Math.min(14, Math.max(3, px / CM_TO_PX));
        }
    }

    if (wCm && !hCm) {
        hCm = Math.round((wCm / vbAspect) * 10) / 10;
    } else if (!wCm && hCm) {
        wCm = Math.round(hCm * vbAspect * 10) / 10;
    } else if (!wCm && !hCm) {
        wCm = 8.5;
        hCm = Math.round((wCm / vbAspect) * 10) / 10;
    }

    return {
        widthCm: wCm,
        heightCm: hCm,
        aspect: wCm / (hCm || 1)
    };
}

/**
 * Rendert einen SVG-String auf ein hochauflösendes Offscreen-Canvas (300+ DPI)
 * und gibt den Base64-PNG-String (ohne Data-URL-Prefix) sowie die Zielgröße in Word-Points zurück.
 */
export async function svgToBase64Png(
    svgString: string,
    targetWidthCm?: number,
    targetHeightCm?: number,
    scale = 4
): Promise<{ base64: string; dataUrl: string; blob: Blob | null; widthPt: number; heightPt: number }> {
    const { widthCm, heightCm } = parseSvgPhysicalDimensions(svgString, targetWidthCm, targetHeightCm);
    const widthPt = Math.round(widthCm * CM_TO_PT * 10) / 10;
    const heightPt = Math.round(heightCm * CM_TO_PT * 10) / 10;

    const basePxW = Math.max(200, Math.round(widthCm * CM_TO_PX));
    const basePxH = Math.max(150, Math.round(heightCm * CM_TO_PX));

    let cleanSvg = svgString.trim();
    if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!cleanSvg.includes('xmlns:xlink=')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Explizite Pixel-Dimensionen im Root-SVG setzen, damit Image() zuverlässig skaliert
    if (/width=["'][^"']*["']/i.test(cleanSvg)) {
        cleanSvg = cleanSvg.replace(/width=["'][^"']*["']/i, `width="${basePxW}"`);
    } else {
        cleanSvg = cleanSvg.replace('<svg', `<svg width="${basePxW}"`);
    }
    if (/height=["'][^"']*["']/i.test(cleanSvg)) {
        cleanSvg = cleanSvg.replace(/height=["'][^"']*["']/i, `height="${basePxH}"`);
    } else {
        cleanSvg = cleanSvg.replace('<svg', `<svg height="${basePxH}"`);
    }

    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = basePxW * scale;
                canvas.height = basePxH * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Canvas 2D Context nicht verfügbar'));
                    return;
                }
                // Weißer Hintergrund für sauberen Druck und Kontrast in Word
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                const dataUrl = canvas.toDataURL('image/png');
                const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

                canvas.toBlob((blob) => {
                    resolve({ base64, dataUrl, blob, widthPt, heightPt });
                }, 'image/png');
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

/**
 * Extrahiert ein JSXGraph-Board (.jxgbox) inklusive aller HTML-Text-Labels (.JXGtext)
 * als vollständiges, eigenständiges SVG.
 */
export function extractJxgBoxSvg(jxgBoxEl: HTMLElement | null): string | null {
    if (!jxgBoxEl) return null;
    const svgEl = jxgBoxEl.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return null;

    const svgRect = svgEl.getBoundingClientRect();
    const w = Math.max(100, Math.round(svgRect.width || jxgBoxEl.clientWidth || 320));
    const h = Math.max(80, Math.round(svgRect.height || jxgBoxEl.clientHeight || 240));

    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', `${w}`);
    svgClone.setAttribute('height', `${h}`);
    if (!svgClone.getAttribute('viewBox')) {
        svgClone.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    svgClone.style.overflow = 'hidden';

    // Weißes Hintergrund-Rechteck als unterste Ebene einfügen
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', `${w}`);
    bgRect.setAttribute('height', `${h}`);
    bgRect.setAttribute('fill', '#ffffff');
    svgClone.insertBefore(bgRect, svgClone.firstChild);

    // Alle sichtbaren .JXGtext HTML-Overlays von JSXGraph als SVG <text> einbetten
    const textDivs = jxgBoxEl.querySelectorAll('.JXGtext');
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('class', 'jxg-exported-labels');

    textDivs.forEach((node) => {
        const el = node as HTMLElement;
        if (el.classList.contains('JXG_navigation') || el.closest('.JXG_navigation')) return;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
            return;
        }

        const rawText = (el.textContent || '').trim();
        if (!rawText) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const x = rect.left - svgRect.left;
        const y = rect.top - svgRect.top + rect.height * 0.78;

        // Nicht außerhalb des sichtbaren Bereichs zeichnen
        if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return;

        const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        svgText.setAttribute('x', `${Math.round(x * 10) / 10}`);
        svgText.setAttribute('y', `${Math.round(y * 10) / 10}`);
        svgText.setAttribute('fill', style.color || '#0f172a');
        svgText.setAttribute('font-family', 'Calibri, Arial, sans-serif');
        svgText.setAttribute('font-size', style.fontSize || '12px');
        if (style.fontWeight && style.fontWeight !== '400' && style.fontWeight !== 'normal') {
            svgText.setAttribute('font-weight', style.fontWeight);
        }
        // Weißer Halo um Beschriftungen für optimale Lesbarkeit auf Gitterlinien
        svgText.setAttribute('paint-order', 'stroke');
        svgText.setAttribute('stroke', '#ffffff');
        svgText.setAttribute('stroke-width', '3px');
        svgText.setAttribute('stroke-linecap', 'round');
        svgText.setAttribute('stroke-linejoin', 'round');
        svgText.textContent = rawText;

        textGroup.appendChild(svgText);
    });

    svgClone.appendChild(textGroup);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgClone);
}

/**
 * Fügt ein SVG als gestochen scharfes Bild (300+ DPI PNG mit exakten cm-Druckmaßen)
 * direkt an der Cursorposition in Word ein.
 */
export async function insertSvg(
    svgString: string,
    widthCm?: number,
    heightCm?: number
): Promise<{ success: boolean; mode: 'word' | 'clipboard' }> {
    try {
        const { base64, blob, widthPt, heightPt } = await svgToBase64Png(svgString, widthCm, heightCm);

        if (isWordHost()) {
            try {
                await Word.run(async (context: any) => {
                    const range = context.document.getSelection();
                    const pic = range.insertInlinePictureFromBase64(base64, Word.InsertLocation.replace);
                    pic.width = widthPt;
                    pic.height = heightPt;
                    await context.sync();
                });
                return { success: true, mode: 'word' };
            } catch (wordErr) {
                console.error('Fehler beim Einfügen des Bildes in Word:', wordErr);
                await copyImageOrTextToClipboard(blob, svgString);
                return { success: true, mode: 'clipboard' };
            }
        } else {
            await copyImageOrTextToClipboard(blob, svgString);
            return { success: true, mode: 'clipboard' };
        }
    } catch (err) {
        console.error('Fehler bei der SVG-zu-PNG-Konvertierung:', err);
        await copyToClipboard(svgString);
        return { success: false, mode: 'clipboard' };
    }
}

/**
 * Fügt formatiertes HTML (z. B. eine formatierte Tabelle oder Aufgabenbeschreibung)
 * an der Cursorposition in Word ein.
 */
export async function insertHtml(htmlString: string): Promise<{ success: boolean; mode: 'word' | 'clipboard' }> {
    const styledHtml = wrapWordHtml(htmlString);

    if (isWordHost()) {
        try {
            await Word.run(async (context: any) => {
                const range = context.document.getSelection();
                range.insertHtml(styledHtml, Word.InsertLocation.replace);
                await context.sync();
            });
            return { success: true, mode: 'word' };
        } catch (err) {
            console.error('Fehler beim Einfügen von HTML in Word:', err);
            await copyToClipboard(htmlString);
            return { success: true, mode: 'clipboard' };
        }
    } else {
        await copyToClipboard(htmlString);
        return { success: true, mode: 'clipboard' };
    }
}

function wrapWordHtml(innerHtml: string): string {
    return `
    <html>
    <head>
    <style>
        body { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.35; }
        p { margin: 4pt 0; }
        ul { margin: 4pt 0 6pt 18pt; padding: 0; }
        li { margin: 2pt 0; }
        table { border-collapse: collapse; margin: 6pt 0; }
        th, td { border: 1px solid #64748b; padding: 5px 10px; text-align: center; font-family: 'Calibri', sans-serif; font-size: 11pt; }
        th { background-color: #f1f5f9; font-weight: bold; }
    </style>
    </head>
    <body>
        ${innerHtml}
    </body>
    </html>`;
}

/**
 * Wandelt LaTeX-Ausdrücke ($...$, $$...$$) und Markdown (**...**) in sauberes,
 * direkt von Microsoft Word darstellbares HTML/Unicode um.
 */
export function formatMathTextForWord(text: string): string {
    if (!text) return '';

    const convertLatexSnippet = (latex: string, isBlock: boolean): string => {
        let s = latex.trim();

        // \text{...} und \mathbf{...}
        s = s.replace(/\\text\{([^}]*)\}/g, '$1');
        s = s.replace(/\\mathbf\{([^}]*)\}/g, '<strong>$1</strong>');

        // Brüche \frac{a}{b}
        s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');

        // Wurzeln \sqrt[3]{x} und \sqrt{x}
        s = s.replace(/\\sqrt\[3\]\{([^{}]+)\}/g, '∛($1)');
        s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

        // Klammern
        s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
        s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');

        // Mathematische Symbole
        s = s.replace(/\\cdot/g, '·');
        s = s.replace(/\\times/g, '×');
        s = s.replace(/\\pi\b/g, 'π');
        s = s.replace(/\\implies/g, '⇒');
        s = s.replace(/\\approx/g, '≈');
        s = s.replace(/\\le\b|\\leq\b/g, '≤');
        s = s.replace(/\\ge\b|\\geq\b/g, '≥');
        s = s.replace(/\\neq\b/g, '≠');
        s = s.replace(/\\infty\b/g, '∞');
        s = s.replace(/\\sin\b/g, 'sin');
        s = s.replace(/\\cos\b/g, 'cos');
        s = s.replace(/\\tan\b/g, 'tan');

        // Potenzen ^{...} und ^n
        s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
        s = s.replace(/\^([0-9a-zA-Z+-])/g, '<sup>$1</sup>');

        // Indizes _{...} und _n
        s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
        s = s.replace(/_([0-9a-zA-Z+-])/g, '<sub>$1</sub>');

        if (isBlock) {
            return `<p style="text-align: center; margin: 6pt 0; font-family: 'Cambria Math', 'Calibri', serif; font-size: 11.5pt;"><strong>${s}</strong></p>`;
        }
        return `<span style="font-family: 'Cambria Math', 'Calibri', serif;">${s}</span>`;
    };

    let out = text;
    // Markdown Fettdruck **...**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Block-Mathe $$...$$
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => convertLatexSnippet(m, true));
    // Inline-Mathe $...$
    out = out.replace(/\$([^$]+?)\$/g, (_, m) => convertLatexSnippet(m, false));

    return out;
}

/**
 * Kombinierte Einfüge-Funktion für Analysis-Module, die sowohl Text/Bedingungen
 * als auch eine Grafik (und optional eine Musterlösung) in einem Schritt in Word einfügen.
 */
async function insertCompositeAnalysisIntoWord(options: {
    topHtml?: string;
    svgString?: string | null;
    widthCm?: number;
    heightCm?: number;
    bottomHtml?: string;
}): Promise<{ success: boolean; mode: 'word' | 'clipboard' }> {
    const { topHtml, svgString, widthCm, heightCm, bottomHtml } = options;

    let pngData: { base64: string; dataUrl: string; blob: Blob | null; widthPt: number; heightPt: number } | null = null;
    if (svgString) {
        pngData = await svgToBase64Png(svgString, widthCm, heightCm);
    }

    if (isWordHost()) {
        try {
            await Word.run(async (context: any) => {
                let cursorRange = context.document.getSelection();
                let hasInsertedFirst = false;

                if (topHtml && topHtml.trim() !== '') {
                    cursorRange = cursorRange.insertHtml(wrapWordHtml(topHtml), Word.InsertLocation.replace);
                    hasInsertedFirst = true;
                }

                if (pngData) {
                    const loc = hasInsertedFirst ? Word.InsertLocation.after : Word.InsertLocation.replace;
                    const pic = cursorRange.insertInlinePictureFromBase64(pngData.base64, loc);
                    pic.width = pngData.widthPt;
                    pic.height = pngData.heightPt;
                    cursorRange = pic.getRange();
                    hasInsertedFirst = true;
                }

                if (bottomHtml && bottomHtml.trim() !== '') {
                    const loc = hasInsertedFirst ? Word.InsertLocation.after : Word.InsertLocation.replace;
                    cursorRange.insertHtml(wrapWordHtml(bottomHtml), loc);
                }

                await context.sync();
            });
            return { success: true, mode: 'word' };
        } catch (err) {
            console.error('Fehler beim kombinierten Einfügen in Word:', err);
            if (pngData?.blob) {
                await copyImageOrTextToClipboard(pngData.blob, topHtml || '');
            } else if (topHtml) {
                await copyToClipboard(topHtml);
            }
            return { success: true, mode: 'clipboard' };
        }
    } else {
        if (pngData?.blob) {
            await copyImageOrTextToClipboard(pngData.blob, topHtml || '');
        } else if (topHtml || bottomHtml) {
            await copyToClipboard((topHtml || '') + '\n' + (bottomHtml || ''));
        }
        return { success: true, mode: 'clipboard' };
    }
}

async function copyImageOrTextToClipboard(blob: Blob | null, fallbackText: string): Promise<void> {
    try {
        if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            return;
        }
    } catch (e) {
        console.warn('Bild-Zwischenablage nicht möglich, nutze Text-Fallback:', e);
    }
    await copyToClipboard(fallbackText);
}

async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
    }
}

/**
 * Erzeugt den HTML-Block für die textuellen Bedingungen einer Steckbriefaufgabe.
 */
function buildSteckbriefConditionsHtml(d: any): string {
    const degText = d.degree === 2 ? '2. Grades (Parabel)' : d.degree === 4 ? '4. Grades' : '3. Grades';
    const symText =
        d.symmetry === 'achsensymmetrisch'
            ? ', die achsensymmetrisch zur y-Achse ist'
            : d.symmetry === 'punktsymmetrisch'
            ? ', die punktsymmetrisch zum Ursprung ist'
            : '';

    const items = (d.conditions || [])
        .map((cond: any) => {
            const x = cond.x ?? '0';
            const y = cond.y ?? '0';
            switch (cond.type) {
                case 'point':
                    return `<li>Der Graph verläuft durch den Punkt <strong>P(${x} | ${y})</strong>.</li>`;
                case 'extreme':
                    return y !== '' && y !== undefined
                        ? `<li>Der Graph hat einen Extrempunkt bei <strong>E(${x} | ${y})</strong>.</li>`
                        : `<li>Der Graph hat an der Stelle <strong>x = ${x}</strong> einen Extrempunkt.</li>`;
                case 'inflection':
                    return y !== '' && y !== undefined
                        ? `<li>Der Graph hat einen Wendepunkt bei <strong>W(${x} | ${y})</strong>.</li>`
                        : `<li>Der Graph hat an der Stelle <strong>x = ${x}</strong> einen Wendepunkt.</li>`;
                case 'saddle':
                    return y !== '' && y !== undefined
                        ? `<li>Der Graph hat einen Sattelpunkt bei <strong>S(${x} | ${y})</strong>.</li>`
                        : `<li>Der Graph hat an der Stelle <strong>x = ${x}</strong> einen Sattelpunkt.</li>`;
                case 'slope':
                    return `<li>Der Graph hat an der Stelle <strong>x = ${x}</strong> die Steigung <strong>m = ${y}</strong>.</li>`;
                case 'yIntercept':
                    return `<li>Der Graph schneidet die y-Achse bei <strong>y<sub>0</sub> = ${y}</strong>.</li>`;
                case 'curvature':
                    return `<li>Der Graph hat an der Stelle <strong>x = ${x}</strong> die Krümmung <strong>f''(${x}) = ${y}</strong>.</li>`;
                default:
                    return '';
            }
        })
        .join('');

    return `
        <p>Bestimme die Gleichung einer ganzrationalen Funktion ${degText}${symText}. Der Graph erfüllt folgende Bedingungen:</p>
        <ul>${items}</ul>
    `;
}

/**
 * Erzeugt den HTML-Block für die Lösung einer Steckbriefaufgabe (Funktionsgleichung + LGS).
 */
function buildSteckbriefSolutionHtml(d: any): string {
    const sol = solveSteckbrief(d);
    if (!sol || sol.status !== 'solved') return '';

    const stepsHtml = (sol.lgsStepsText || [])
        .map((step: string) => `<li>${formatMathTextForWord('$' + step + '$')}</li>`)
        .join('');

    return `
        <div style="margin-top: 8pt; padding: 6pt 10pt; border-left: 3px solid #10b981; background-color: #f8fafc;">
            <p><strong>Lösung (Steckbriefaufgabe):</strong></p>
            ${stepsHtml ? `<ul>${stepsHtml}</ul>` : ''}
            <p><strong>Gesuchte Funktion:</strong> ${formatMathTextForWord('$' + sol.formulaDisplay + '$')}</p>
        </div>
    `;
}

/**
 * Fügt ein komplettes Zuordnungspuzzle (analysis_puzzle) inklusive aller Mini-Graphen,
 * Funktionsgleichungen, Zuordnungstabelle und Begründungsfeld in Word ein.
 */
async function insertPuzzleIntoWord(d: any): Promise<{ success: boolean; mode: 'word' | 'clipboard'; message: string }> {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const functions = Array.isArray(d.functions) ? d.functions : [];
    const shuffled = Array.isArray(d.shuffledIndices) && d.shuffledIndices.length === functions.length
        ? d.shuffledIndices
        : functions.map((_: any, i: number) => i);

    const isGraphToEq = d.mode === 'graph_to_equation';
    const leftIsGraph = isGraphToEq || d.typeF === 'graph';
    const rightIsGraph = !isGraphToEq && d.typeFPrime === 'graph';

    const introText = isGraphToEq
        ? 'Ordne den Graphen der Funktionen (I, II, …) die passenden Funktionsgleichungen (A, B, …) zu.'
        : 'Ordne den Ausgangsfunktionen (I, II, …) die passenden Ableitungsfunktionen (A, B, …) zu.';

    const leftHeading = isGraphToEq ? 'Funktionsgraphen' : 'Ausgangsfunktionen f(x)';
    const rightHeading = isGraphToEq ? 'Funktionsgleichungen' : "Ableitungsfunktionen f'(x)";

    // Mini-Graphen aus der Live-Vorschau extrahieren
    const leftPngs: Array<{ base64: string; widthPt: number; heightPt: number } | null> = [];
    const rightPngs: Array<{ base64: string; widthPt: number; heightPt: number } | null> = [];

    for (let i = 0; i < functions.length; i++) {
        if (leftIsGraph) {
            const box = document.getElementById(`word-puzzle-f-${i}`);
            const svg = extractJxgBoxSvg(box);
            if (svg) {
                const png = await svgToBase64Png(svg, 5.2, 3.8, 3);
                leftPngs.push({ base64: png.base64, widthPt: png.widthPt, heightPt: png.heightPt });
            } else {
                leftPngs.push(null);
            }
        } else {
            leftPngs.push(null);
        }

        if (rightIsGraph) {
            const box = document.getElementById(`word-puzzle-fp-${i}`);
            const svg = extractJxgBoxSvg(box);
            if (svg) {
                const png = await svgToBase64Png(svg, 5.2, 3.8, 3);
                rightPngs.push({ base64: png.base64, widthPt: png.widthPt, heightPt: png.heightPt });
            } else {
                rightPngs.push(null);
            }
        } else {
            rightPngs.push(null);
        }
    }

    const formatExpr = (expr: string) =>
        formatMathTextForWord('$' + (expr || '').replace(/\*/g, ' \\cdot ') + '$');

    // Antworttabelle + optionales Begründungsfeld als HTML
    const headerCells = functions
        .map((_: any, i: number) => `<th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 14px;">${roman[i] || i + 1}</th>`)
        .join('');
    const answerCells = functions
        .map(() => `<td style="border: 1px solid #64748b; padding: 10px 14px;">&nbsp;&nbsp;&nbsp;&nbsp;</td>`)
        .join('');

    let justHtml = '';
    if (d.showJustification) {
        if (d.justificationInTable) {
            const reasonCells = functions
                .map(() => `<td style="border: 1px solid #64748b; padding: 18px 10px;">&nbsp;</td>`)
                .join('');
            justHtml = `<tr><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px; text-align: left;">Begründung:</th>${reasonCells}</tr>`;
        }
    }

    const bottomTableHtml = `
        <table style="border-collapse: collapse; width: 100%; margin-top: 10pt; font-family: Calibri, sans-serif; font-size: 11pt;">
            <thead>
                <tr>
                    <th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px; text-align: left;">${isGraphToEq ? 'Graph:' : 'Funktion:'}</th>
                    ${headerCells}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px; text-align: left;">${isGraphToEq ? 'Gleichung:' : 'Ableitung:'}</th>
                    ${answerCells}
                </tr>
                ${justHtml}
            </tbody>
        </table>
        ${
            d.showJustification && !d.justificationInTable
                ? `<p style="margin-top: 8pt;"><strong>Begründung:</strong></p><p style="border-bottom: 1px dotted #94a3b8; height: 18pt;">&nbsp;</p><p style="border-bottom: 1px dotted #94a3b8; height: 18pt;">&nbsp;</p>`
                : ''
        }
    `;

    if (isWordHost()) {
        try {
            await Word.run(async (context: any) => {
                const sel = context.document.getSelection();
                const introRange = sel.insertHtml(
                    wrapWordHtml(`<p><strong>Zuordnungsaufgabe:</strong> ${introText}</p>`),
                    Word.InsertLocation.replace
                );

                // Erstelle eine 2-spaltige Word-Tabelle für (I, II, III) vs. (A, B, C)
                const rowCount = functions.length + 1;
                const wordTable = introRange.insertTable(rowCount, 2, Word.InsertLocation.after);
                wordTable.getCell(0, 0).body.insertText(leftHeading, Word.InsertLocation.replace);
                wordTable.getCell(0, 1).body.insertText(rightHeading, Word.InsertLocation.replace);

                for (let i = 0; i < functions.length; i++) {
                    const fn = functions[i];
                    const shIdx = shuffled[i] ?? i;
                    const targetFn = functions[shIdx] || fn;

                    const leftCell = wordTable.getCell(i + 1, 0).body;
                    leftCell.clear();
                    const leftLabel = leftCell.insertParagraph(`${roman[i] || i + 1}) `, Word.InsertLocation.start);
                    leftLabel.font.bold = true;

                    if (leftIsGraph && leftPngs[i]) {
                        const pic = leftLabel.insertInlinePictureFromBase64(leftPngs[i]!.base64, Word.InsertLocation.end);
                        pic.width = leftPngs[i]!.widthPt;
                        pic.height = leftPngs[i]!.heightPt;
                    } else {
                        leftLabel.insertHtml(
                            `<span><strong>${roman[i] || i + 1})</strong> f(x) = ${formatExpr(fn.expr)}</span>`,
                            Word.InsertLocation.replace
                        );
                    }

                    const rightCell = wordTable.getCell(i + 1, 1).body;
                    rightCell.clear();
                    const rightLabel = rightCell.insertParagraph(`${letters[i] || i + 1}) `, Word.InsertLocation.start);
                    rightLabel.font.bold = true;

                    if (rightIsGraph && rightPngs[i]) {
                        const pic = rightLabel.insertInlinePictureFromBase64(rightPngs[i]!.base64, Word.InsertLocation.end);
                        pic.width = rightPngs[i]!.widthPt;
                        pic.height = rightPngs[i]!.heightPt;
                    } else {
                        const eqPrefix = isGraphToEq ? 'f(x) = ' : "f'(x) = ";
                        const exprStr = isGraphToEq ? targetFn.expr : targetFn.exprFPrime;
                        rightLabel.insertHtml(
                            `<span><strong>${letters[i] || i + 1})</strong> ${eqPrefix}${formatExpr(exprStr)}</span>`,
                            Word.InsertLocation.replace
                        );
                    }
                }

                // Antworttabelle unterhalb der Zuordnungstabelle einfügen
                wordTable.getRange().insertHtml(wrapWordHtml(bottomTableHtml), Word.InsertLocation.after);
                await context.sync();
            });
            return { success: true, mode: 'word', message: 'Zuordnungspuzzle an Cursorposition eingefügt!' };
        } catch (err) {
            console.error('Fehler beim Einfügen des Puzzles in Word:', err);
            await copyToClipboard(bottomTableHtml);
            return { success: true, mode: 'clipboard', message: 'Zuordnungspuzzle in Zwischenablage kopiert!' };
        }
    } else {
        await copyToClipboard(bottomTableHtml);
        return { success: true, mode: 'clipboard', message: 'Zuordnungspuzzle in Zwischenablage kopiert (Browser-Modus)!' };
    }
}

/**
 * Haupt-Dispatcher: Erzeugt aus einem Modul (Typ & Daten) das passende hochauflösende Bild
 * und/oder formatierte HTML und fügt es an der Cursorposition in Word ein.
 */
export async function insertModuleIntoWord(mod: {
    type: string;
    data: any;
}): Promise<{ success: boolean; mode: 'word' | 'clipboard'; message: string }> {
    if (!mod || !mod.type || !mod.data) {
        return { success: false, mode: 'word', message: 'Ungültiges Modul.' };
    }

    const type = mod.type;
    const d = mod.data;

    switch (type) {
        // ── ANALYSIS MODULE (JSXGraph + Mathematische Texte) ────
        case 'analysis_kurve': {
            const jxgBox = document.getElementById('word-jxg-board') as HTMLElement | null;
            const svgString = extractJxgBoxSvg(jxgBox);
            if (!svgString) {
                return { success: false, mode: 'word', message: 'Vorschau-Graph noch nicht bereit.' };
            }
            const w = parseFloat(d.settings?.width) || 10;
            const h = parseFloat(d.settings?.height) || 8;
            const res = await insertSvg(svgString, w, h);
            return {
                ...res,
                message: res.mode === 'word'
                    ? 'Funktionsgraph an Cursorposition eingefügt!'
                    : 'Funktionsgraph in die Zwischenablage kopiert (Strg+V)!'
            };
        }

        case 'analysis_riemann': {
            const jxgBox = document.getElementById('word-jxg-board') as HTMLElement | null;
            const svgString = extractJxgBoxSvg(jxgBox);
            if (!svgString) {
                return { success: false, mode: 'word', message: 'Riemann-Graph noch nicht bereit.' };
            }
            const w = parseFloat(d.settings?.width) || 9;
            const h = parseFloat(d.settings?.height) || 7;
            const res = await insertSvg(svgString, w, h);
            return {
                ...res,
                message: res.mode === 'word'
                    ? 'Riemann-Summe an Cursorposition eingefügt!'
                    : 'Riemann-Summe in die Zwischenablage kopiert (Strg+V)!'
            };
        }

        case 'analysis_rotationskoerper': {
            const jxgBox = document.getElementById('word-jxg-board') as HTMLElement | null;
            const svgString = extractJxgBoxSvg(jxgBox);
            const w = parseFloat(d.settings?.width) || 8;
            const h = parseFloat(d.settings?.height) || 6;

            const topHtml = d.includeTaskText !== false
                ? `<p>${formatMathTextForWord(generateRotationskoerperTaskText(d))}</p>`
                : '';

            const res = await insertCompositeAnalysisIntoWord({
                topHtml,
                svgString,
                widthCm: w,
                heightCm: h
            });
            return {
                ...res,
                message: res.mode === 'word'
                    ? 'Rotationskörper an Cursorposition eingefügt!'
                    : 'Rotationskörper in die Zwischenablage kopiert (Strg+V)!'
            };
        }

        case 'analysis_extremwert': {
            const includeText = d.includeTaskText !== false;
            const includeSketch = d.includeSketch !== false;
            const includeSol = !!d.includeSolution;

            const topHtml = includeText
                ? `<p>${formatMathTextForWord(generateExtremwertTaskText(d))}</p>`
                : '';

            let svgString: string | null = null;
            if (includeSketch) {
                const jxgBox = document.getElementById('word-jxg-board') as HTMLElement | null;
                svgString = extractJxgBoxSvg(jxgBox);
            }

            let bottomHtml = '';
            if (includeSol && d._lastRenderedSolutionRaw) {
                bottomHtml = formatMathTextForWord(d._lastRenderedSolutionRaw);
            }

            const w = parseFloat(d.settings?.width) || 7;
            const h = parseFloat(d.settings?.height) || 5;

            const res = await insertCompositeAnalysisIntoWord({
                topHtml,
                svgString,
                widthCm: w,
                heightCm: h,
                bottomHtml
            });
            return {
                ...res,
                message: res.mode === 'word'
                    ? 'Extremwertaufgabe an Cursorposition eingefügt!'
                    : 'Extremwertaufgabe in die Zwischenablage kopiert (Strg+V)!'
            };
        }

        case 'analysis_steckbrief': {
            const topHtml = d.showTextual !== false ? buildSteckbriefConditionsHtml(d) : '';
            let svgString: string | null = null;
            if (d.showGraph !== false) {
                const jxgBox = document.getElementById('word-jxg-board') as HTMLElement | null;
                svgString = extractJxgBoxSvg(jxgBox);
            }
            const bottomHtml = d.includeSolution ? buildSteckbriefSolutionHtml(d) : '';

            if (!topHtml && !svgString && !bottomHtml) {
                return {
                    success: false,
                    mode: 'word',
                    message: 'Bitte mindestens Text, Graph oder Lösung aktivieren.'
                };
            }

            const w = parseFloat(d.settings?.width) || 7;
            const h = parseFloat(d.settings?.height) || 6;

            const res = await insertCompositeAnalysisIntoWord({
                topHtml,
                svgString,
                widthCm: w,
                heightCm: h,
                bottomHtml
            });
            return {
                ...res,
                message: res.mode === 'word'
                    ? 'Steckbriefaufgabe an Cursorposition eingefügt!'
                    : 'Steckbriefaufgabe in die Zwischenablage kopiert (Strg+V)!'
            };
        }

        case 'analysis_puzzle': {
            return await insertPuzzleIntoWord(d);
        }

        // ── STOCHASTIK ─────────────────────────────────────────
        case 'baum': {
            const h = parseFloat(d.height) || 7;
            const w = Math.round(h * 1.6 * 10) / 10;
            const inner = renderTreeSVG(d);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="${w}cm" height="${h}cm" style="font-family: Arial, sans-serif;">${inner}</svg>`;
            const res = await insertSvg(svg, w, h);
            return { ...res, message: 'Baumdiagramm an Cursorposition eingefügt!' };
        }

        case 'urne': {
            const h = parseFloat(d.height) || 4.5;
            const svg = renderUrneSVG(d);
            const res = await insertSvg(svg, undefined, h);
            return { ...res, message: 'Urne an Cursorposition eingefügt!' };
        }

        case 'gluecksrad': {
            const h = parseFloat(d.height) || 4.5;
            const svg = renderGluecksrad(d);
            const res = await insertSvg(svg, h, h);
            return { ...res, message: 'Glücksrad an Cursorposition eingefügt!' };
        }

        case 'verteilung': {
            const w = parseFloat(d.settings?.width) || 10;
            const h = parseFloat(d.settings?.height) || 6;
            const svg = renderVerteilungSVG(d);
            const res = await insertSvg(svg, w, h);
            return { ...res, message: 'Wahrscheinlichkeitsverteilung eingefügt!' };
        }

        case 'diagramm': {
            const w = parseFloat(d.width) || 10;
            const h = parseFloat(d.height) || 5;
            const svg = renderDiagram(d);
            const res = await insertSvg(svg, w, h);
            return { ...res, message: 'Diagramm an Cursorposition eingefügt!' };
        }

        case 'vierfeldertafel': {
            const top1 = d.labels?.top1 || 'A';
            const top2 = d.labels?.top2 || 'Ā';
            const left1 = d.labels?.left1 || 'B';
            const left2 = d.labels?.left2 || 'B̄';

            const cell = (r: number, c: number) => {
                const vis = d.printVisibility && d.printVisibility[r] && d.printVisibility[r][c];
                const val = d.data && d.data[r] ? d.data[r][c] : '';
                return vis ? (val || '–') : '<span style="color:#94a3b8;">&nbsp;&nbsp;&nbsp;&nbsp;</span>';
            };

            const html = `
            <table style="border-collapse: collapse; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #f8fafc;"></th>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #f1f5f9; font-weight: bold;">${top1}</th>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #f1f5f9; font-weight: bold;">${top2}</th>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #e2e8f0; font-weight: bold;">Summe</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #f1f5f9; font-weight: bold;">${left1}</th>
                        <td style="border: 1px solid #64748b; padding: 6px 14px;">${cell(0, 0)}</td>
                        <td style="border: 1px solid #64748b; padding: 6px 14px;">${cell(0, 1)}</td>
                        <td style="border: 1px solid #64748b; padding: 6px 14px; background: #f8fafc; font-weight: bold;">${cell(0, 2)}</td>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #f1f5f9; font-weight: bold;">${left2}</th>
                        <td style="border: 1px solid #64748b; padding: 6px 14px;">${cell(1, 0)}</td>
                        <td style="border: 1px solid #64748b; padding: 6px 14px;">${cell(1, 1)}</td>
                        <td style="border: 1px solid #64748b; padding: 6px 14px; background: #f8fafc; font-weight: bold;">${cell(1, 2)}</td>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #64748b; padding: 6px 14px; background: #e2e8f0; font-weight: bold;">Summe</th>
                        <td style="border: 1px solid #64748b; padding: 6px 14px; background: #f8fafc; font-weight: bold;">${cell(2, 0)}</td>
                        <td style="border: 1px solid #64748b; padding: 6px 14px; background: #f8fafc; font-weight: bold;">${cell(2, 1)}</td>
                        <td style="border: 2px solid #334155; padding: 6px 14px; background: #f1f5f9; font-weight: bold;">${cell(2, 2)}</td>
                    </tr>
                </tbody>
            </table>`;
            const res = await insertHtml(html);
            return { ...res, message: '4-Felder-Tafel an Cursorposition eingefügt!' };
        }

        // ── ZAHLEN & ALGEBRA ───────────────────────────────────
        case 'zahlenstrahl': {
            const h = parseFloat(d.height) || 2.5;
            const svg = renderZahlenstrahl(d);
            const res = await insertSvg(svg, 13, h);
            return { ...res, message: 'Zahlenstrahl an Cursorposition eingefügt!' };
        }

        case 'bruch': {
            const w = parseFloat(d.width) || 4;
            const h = parseFloat(d.height) || 4;
            const svg = renderBruch(d);
            const res = await insertSvg(svg, w, h);
            return { ...res, message: 'Bruchdarstellung eingefügt!' };
        }

        case 'table': {
            const xHeader = d.xValues || 'x';
            const yHeader = d.yValues || 'y';
            const row0 = Array.isArray(d.data?.[0]) ? d.data[0] : [];
            const row1 = Array.isArray(d.data?.[1]) ? d.data[1] : [];
            const xRow = row0.map((v: any) => `<td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">${v ?? ''}</td>`).join('');
            const yRow = row1.map((v: any) => `<td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">${v ?? ''}</td>`).join('');
            const html = `
            <table style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 11pt; margin: 8px 0;">
                <tr><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px;">${xHeader}</th>${xRow}</tr>
                <tr><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px;">${yHeader}</th>${yRow}</tr>
            </table>`;
            const res = await insertHtml(html);
            return { ...res, message: 'Wertetabelle an Cursorposition eingefügt!' };
        }

        case 'dreisatz': {
            const h1 = d.headers && d.headers[0] ? d.headers[0] : 'Größe 1';
            const h2 = d.headers && d.headers[1] ? d.headers[1] : 'Größe 2';
            const rows = (d.data || []).map((row: any, idx: number) => {
                const v1 = d.printVisibility?.data?.[idx]?.[0] !== false ? (row[0] || '') : '';
                const v2 = d.printVisibility?.data?.[idx]?.[1] !== false ? (row[1] || '') : '';
                return `<tr><td style="border: 1px solid #94a3b8; padding: 6px 12px; text-align: center;">${v1}</td><td style="border: 1px solid #94a3b8; padding: 6px 12px; text-align: center;">${v2}</td></tr>`;
            }).join('');
            const html = `
            <table style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 11pt; margin: 8px 0;">
                <thead><tr><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 14px;">${h1}</th><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 14px;">${h2}</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
            const res = await insertHtml(html);
            return { ...res, message: 'Dreisatz an Cursorposition eingefügt!' };
        }

        case 'lgs': {
            const rows = (d.matrix || []).map((row: any) => {
                const vars = ['x', 'y', 'z'];
                const parts = row.slice(0, row.length - 1).map((val: any, j: number) => `${val !== undefined ? val : ''}${vars[j] || ''}`).join(' + ');
                const resVal = row[row.length - 1] !== undefined ? row[row.length - 1] : '';
                return `<tr><td style="padding: 2px 6px;">${parts}</td><td style="padding: 2px 4px;">=</td><td style="padding: 2px 6px;">${resVal}</td></tr>`;
            }).join('');
            const html = `
            <div style="font-family: Calibri, sans-serif; font-size: 11pt; display: inline-flex; align-items: center; margin: 8px 0;">
                <span style="font-size: 24pt; font-weight: 300; margin-right: 4px;">{</span>
                <table style="border-collapse: collapse; border: none;">${rows}</table>
            </div>`;
            const res = await insertHtml(html);
            return { ...res, message: 'LGS an Cursorposition eingefügt!' };
        }

        // ── GEOMETRIE ──────────────────────────────────────────
        case 'koordinatensystem': {
            const w = parseFloat(d.width) || 8;
            const h = parseFloat(d.height) || 6;
            const svg = renderKoordinatensystem(d);
            const res = await insertSvg(svg, w, h);
            return { ...res, message: 'Koordinatensystem an Cursorposition eingefügt!' };
        }

        case 'strahlensatz': {
            const h = parseFloat(d.height) || 6;
            const svg = renderStrahlensatz(d);
            const res = await insertSvg(svg, undefined, h);
            return { ...res, message: 'Strahlensatz-Figur an Cursorposition eingefügt!' };
        }

        case 'geometry':
        case 'geometry3d': {
            const jxgBox = document.getElementById('word-jxg-board') as HTMLElement | null;
            const svgString = extractJxgBoxSvg(jxgBox);
            if (svgString) {
                const w = parseFloat(d.settings?.width) || 8;
                const h = parseFloat(d.settings?.height) || 6;
                const res = await insertSvg(svgString, w, h);
                return { ...res, message: 'Geometrie-Grafik an Cursorposition eingefügt!' };
            }
            return { success: false, mode: 'word', message: 'Vorschau-Graph noch nicht bereit.' };
        }

        // ── LAYOUT & STRUKTUR ──────────────────────────────────
        case 'mcq': {
            const items = (d.options || []).map((o: any) => `
                <div style="margin: 4px 0; font-family: Calibri, sans-serif; font-size: 11pt; display: flex; align-items: center;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #334155; margin-right: 8px;">□</span>
                    <span>${o.text || ''}</span>
                </div>
            `).join('');
            const html = `<div>${items}</div>`;
            const res = await insertHtml(html);
            return { ...res, message: 'Multiple Choice an Cursorposition eingefügt!' };
        }

        case 'trueFalse': {
            const justRow = d.showJustification ? `<tr><td colspan="3" style="border: 1px solid #94a3b8; padding: 8px 12px; height: ${(d.spaceHeight || 3)}cm; vertical-align: top; color: #64748b;">Begründung:</td></tr>` : '';
            const html = `
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; font-family: Calibri, sans-serif; font-size: 11pt; margin: 8px 0;">
                <thead>
                    <tr><th style="border: 1px solid #64748b; background: #f1f5f9; text-align: left; padding: 6px 10px;">Aussage</th><th style="border: 1px solid #64748b; width: 60px; text-align: center; background: #f1f5f9;">wahr</th><th style="border: 1px solid #64748b; width: 60px; text-align: center; background: #f1f5f9;">falsch</th></tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #94a3b8; padding: 8px 10px; height: 35px;"></td><td style="border: 1px solid #94a3b8; text-align: center;"></td><td style="border: 1px solid #94a3b8; text-align: center;"></td></tr>
                    ${justRow}
                </tbody>
            </table>`;
            const res = await insertHtml(html);
            return { ...res, message: 'Wahr/Falsch-Matrix an Cursorposition eingefügt!' };
        }

        case 'matching': {
            const leftRows = (d.leftItems || []).map((item: any, i: number) => `
                <div style="border: 1px solid #64748b; border-radius: 9999px; padding: 6px 14px; margin-bottom: 8px; text-align: center;">${item.text || `Begriff ${i + 1}`}</div>
            `).join('');
            const rightRows = (d.rightItems || []).map((item: any, i: number) => `
                <div style="border: 1px solid #64748b; border-radius: 9999px; padding: 6px 14px; margin-bottom: 8px; text-align: center;">${item.text || `Zuordnung ${i + 1}`}</div>
            `).join('');
            const html = `
            <table style="border-collapse: collapse; border: none; width: 100%; max-width: 480px; font-family: Calibri, sans-serif; font-size: 11pt; margin: 10px 0;">
                <tr>
                    <td style="border: none; width: 45%; vertical-align: top;">${leftRows}</td>
                    <td style="border: none; width: 10%;"></td>
                    <td style="border: none; width: 45%; vertical-align: top;">${rightRows}</td>
                </tr>
            </table>`;
            const res = await insertHtml(html);
            return { ...res, message: 'Zuordnungsaufgabe an Cursorposition eingefügt!' };
        }

        case 'zusatz': {
            const text = d.text || '[Zur Kontrolle: ...]';
            const html = `<p style="font-family: Calibri, sans-serif; font-size: 10pt; font-style: italic; color: #475569; margin: 4px 0;">${text}</p>`;
            const res = await insertHtml(html);
            return { ...res, message: 'Zusatztext an Cursorposition eingefügt!' };
        }

        default: {
            return { success: false, mode: 'word', message: `Modultyp ${type} wird vorbereitet.` };
        }
    }
}
