/**
 * Word Add-in Service (Office.js Bridge)
 * Handles insertion of vector SVGs, tables, and math structures directly
 * into Microsoft Word at the current selection/cursor position.
 */

import { renderTreeSVG, renderUrneSVG, renderGluecksrad, renderVerteilungSVG, renderZahlenstrahl, renderStrahlensatz, renderBruch, renderDiagram, renderKoordinatensystem } from './mathRenderer';

declare const Office: any;
declare const Word: any;
declare const katex: any;

let isOfficeInitialized = false;

export function initOffice(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof Office !== 'undefined' && Office.onReady) {
            Office.onReady((info: any) => {
                if (info && info.host === Office.HostType.Word) {
                    isOfficeInitialized = true;
                    console.log("✅ AufgabenBuilder Word Add-in erfolgreich initialisiert.");
                    resolve(true);
                } else {
                    console.log("ℹ️ Office.js geladen, aber nicht im Word-Host (Browser-Modus).");
                    resolve(false);
                }
            });
        } else {
            console.log("ℹ️ Office.js nicht vorhanden – Standalone Browser-Modus aktiv.");
            resolve(false);
        }
    });
}

export function isWordHost(): boolean {
    return isOfficeInitialized && typeof Word !== 'undefined' && !!Word.run;
}

/**
 * Fügt einen SVG-Vektor-String direkt an der Cursorposition in Word ein.
 */
export async function insertSvg(svgString: string): Promise<{ success: boolean; mode: 'word' | 'clipboard' }> {
    // Sicherstellen, dass das SVG saubere XML-Attribute hat
    let cleanSvg = svgString.trim();
    if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    if (isWordHost()) {
        try {
            await Word.run(async (context: any) => {
                const range = context.document.getSelection();
                range.insertSvg(cleanSvg, Word.InsertLocation.replace);
                await context.sync();
            });
            return { success: true, mode: 'word' };
        } catch (err) {
            console.error("Fehler beim Einfügen von SVG in Word:", err);
            // Fallback auf Zwischenablage bei Fehlern
            await copyToClipboard(cleanSvg);
            return { success: true, mode: 'clipboard' };
        }
    } else {
        // Im normalen Web-Browser: In die Zwischenablage kopieren
        await copyToClipboard(cleanSvg);
        return { success: true, mode: 'clipboard' };
    }
}

/**
 * Fügt formatiertes HTML (z. B. eine formatierte Tabelle) an der Cursorposition in Word ein.
 */
export async function insertHtml(htmlString: string): Promise<{ success: boolean; mode: 'word' | 'clipboard' }> {
    const styledHtml = `
    <html>
    <head>
    <style>
        body { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 11pt; color: #1e293b; }
        table { border-collapse: collapse; margin: 8px 0; }
        th, td { border: 1px solid #94a3b8; padding: 6px 12px; text-align: center; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .cloze-box { border: 1.5px dashed #94a3b8; width: 40px; height: 18px; display: inline-block; }
    </style>
    </head>
    <body>
        ${htmlString}
    </body>
    </html>`;

    if (isWordHost()) {
        try {
            await Word.run(async (context: any) => {
                const range = context.document.getSelection();
                range.insertHtml(styledHtml, Word.InsertLocation.replace);
                await context.sync();
            });
            return { success: true, mode: 'word' };
        } catch (err) {
            console.error("Fehler beim Einfügen von HTML in Word:", err);
            await copyToClipboard(htmlString);
            return { success: true, mode: 'clipboard' };
        }
    } else {
        await copyToClipboard(htmlString);
        return { success: true, mode: 'clipboard' };
    }
}

async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
    }
}

/**
 * Haupt-Dispatcher: Erzeugt aus einem Modul (Typ & Daten) das passende SVG oder HTML
 * und fügt es an der Cursorposition in Word ein.
 */
export async function insertModuleIntoWord(mod: { type: string; data: any }): Promise<{ success: boolean; mode: 'word' | 'clipboard'; message: string }> {
    if (!mod || !mod.type || !mod.data) {
        return { success: false, mode: 'word', message: 'Ungültiges Modul.' };
    }

    const type = mod.type;
    const d = mod.data;

    switch (type) {
        // ── STOCHASTIK ─────────────────────────────────────────
        case 'baum': {
            const h = d.height || 7;
            const w = Math.round(h * 1.6 * 10) / 10;
            const inner = renderTreeSVG(d);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="${w}cm" height="${h}cm" style="font-family: Arial, sans-serif;">${inner}</svg>`;
            const res = await insertSvg(svg);
            return { ...res, message: 'Baumdiagramm an Cursorposition eingefügt!' };
        }

        case 'urne': {
            const svg = renderUrneSVG(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Urne an Cursorposition eingefügt!' };
        }

        case 'gluecksrad': {
            const svg = renderGluecksrad(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Glücksrad an Cursorposition eingefügt!' };
        }

        case 'verteilung': {
            const svg = renderVerteilungSVG(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Wahrscheinlichkeitsverteilung eingefügt!' };
        }

        case 'diagramm': {
            const svg = renderDiagram(d);
            const res = await insertSvg(svg);
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
            const svg = renderZahlenstrahl(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Zahlenstrahl an Cursorposition eingefügt!' };
        }

        case 'bruch': {
            const svg = renderBruch(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Bruchdarstellung eingefügt!' };
        }

        case 'table': {
            const xVals = d.xValues || [];
            const yVals = d.yValues || [];
            const xRow = xVals.map((v: any) => `<td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">${v || ''}</td>`).join('');
            const yRow = yVals.map((v: any) => `<td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">${v || ''}</td>`).join('');
            const html = `
            <table style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 11pt; margin: 8px 0;">
                <tr><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px;">x</th>${xRow}</tr>
                <tr><th style="border: 1px solid #64748b; background: #f1f5f9; padding: 6px 12px;">y</th>${yRow}</tr>
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
            const rows = (d.matrix || []).map((row: any, i: number) => {
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
            const svg = renderKoordinatensystem(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Koordinatensystem an Cursorposition eingefügt!' };
        }

        case 'strahlensatz': {
            const svg = renderStrahlensatz(d);
            const res = await insertSvg(svg);
            return { ...res, message: 'Strahlensatz-Figur an Cursorposition eingefügt!' };
        }

        // ── LAYOUT & STRUKTUR ──────────────────────────────────
        case 'mcq': {
            const items = (d.options || []).map((o: any) => `
                <div style="margin: 4px 0; font-family: Calibri, sans-serif; font-size: 11pt; display: flex; align-items: center;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #334155; margin-right: 8px;"></span>
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
                <div style="border: 1px solid #64748b; border-radius: 9999px; padding: 6px 14px; margin-bottom: 8px; text-align: center;">${item.text || `Begriff ${i+1}`}</div>
            `).join('');
            const rightRows = (d.rightItems || []).map((item: any, i: number) => `
                <div style="border: 1px solid #64748b; border-radius: 9999px; padding: 6px 14px; margin-bottom: 8px; text-align: center;">${item.text || `Zuordnung ${i+1}`}</div>
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

        // ── JSXGRAPH PLOTS (Funktionsplotter, Geometrie 2D & 3D) ──
        case 'analysis_kurve':
        case 'analysis_riemann':
        case 'analysis_rotationskoerper':
        case 'analysis_extremwert':
        case 'analysis_steckbrief':
        case 'analysis_puzzle':
        case 'geometry':
        case 'geometry3d': {
            // Aus dem DOM das gerenderte JSXGraph-SVG abgreifen
            const container = document.querySelector('.word-preview-container .jxgbox svg') as SVGSVGElement | null;
            if (container) {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(container);
                const res = await insertSvg(svgString);
                return { ...res, message: 'Grafik an Cursorposition eingefügt!' };
            } else {
                return { success: false, mode: 'word', message: 'Vorschau-Graph noch nicht bereit.' };
            }
        }

        default: {
            return { success: false, mode: 'word', message: `Modultyp ${type} wird vorbereitet.` };
        }
    }
}
