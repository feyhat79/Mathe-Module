/**
 * Module Modal Component.
 *
 * Vereinfacht gegenüber alter Version: Nutzt die MODULE_REGISTRY statt
 * eines langen if/else-Blocks. Neues Modul wird in target.modules[] gepusht.
 */

import { MODULE_REGISTRY, ModuleType, CATEGORIES, CategoryId, getModulesByCategory } from '../config/moduleRegistry';
import { generateModuleId } from '../services/taskFactory';

const PREVIEW_SVGS: Record<string, string> = {
    // ── Zahlen & Algebra ─────────────────────────────────────────
    'table': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="15" y="15" width="110" height="50" rx="4" opacity="0.3"/>
        <line x1="15" y1="40" x2="125" y2="40" opacity="0.3"/>
        <line x1="42.5" y1="15" x2="42.5" y2="65" opacity="0.3"/>
        <line x1="70" y1="15" x2="70" y2="65" opacity="0.3"/>
        <line x1="97.5" y1="15" x2="97.5" y2="65" opacity="0.3"/>
        <circle cx="28.75" cy="27.5" r="4" fill="var(--accent)" fill-opacity="0.1" stroke="var(--accent)" stroke-width="1.5"/>
        <circle cx="28.75" cy="52.5" r="4" fill="var(--accent)" fill-opacity="0.1" stroke="var(--accent)" stroke-width="1.5"/>
    </svg>`,
    'lgs': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M 25,15 C 18,15 18,30 18,35 C 18,40 12,40 12,40 C 12,40 18,40 18,45 C 18,50 18,65 25,65" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        <line x1="35" y1="28" x2="65" y2="28" opacity="0.6" stroke-width="2"/>
        <line x1="72" y1="28" x2="80" y2="28" opacity="0.6" stroke-width="2"/>
        <line x1="88" y1="28" x2="115" y2="28" opacity="0.3" stroke-width="2"/>
        <line x1="35" y1="52" x2="55" y2="52" opacity="0.6" stroke-width="2"/>
        <line x1="62" y1="52" x2="70" y2="52" opacity="0.6" stroke-width="2"/>
        <line x1="78" y1="52" x2="105" y2="52" opacity="0.3" stroke-width="2"/>
    </svg>`,
    'dreisatz': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="35" y="10" width="70" height="60" rx="4" opacity="0.3"/>
        <line x1="35" y1="30" x2="105" y2="30" opacity="0.3"/>
        <line x1="35" y1="50" x2="105" y2="50" opacity="0.3"/>
        <line x1="70" y1="10" x2="70" y2="70" opacity="0.3"/>
        <path d="M 27,20 C 20,20 20,40 27,40" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 24,37 L 27,40 L 30,37" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 113,40 C 120,40 120,60 113,60" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 110,57 L 113,60 L 116,57" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    'zahlenstrahl': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="15" y1="40" x2="125" y2="40" stroke-linecap="round"/>
        <path d="M 120,35 L 125,40 L 120,45" stroke-linecap="round"/>
        <line x1="20" y1="33" x2="20" y2="47"/>
        <line x1="45" y1="35" x2="45" y2="45"/>
        <line x1="70" y1="33" x2="70" y2="47" stroke="var(--accent)" stroke-width="2"/>
        <line x1="95" y1="35" x2="95" y2="45"/>
        <line x1="120" y1="33" x2="120" y2="47"/>
        <circle cx="95" cy="40" r="3.5" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,
    'bruch': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="70" cy="40" r="28" opacity="0.3"/>
        <line x1="70" y1="12" x2="70" y2="68" opacity="0.3"/>
        <line x1="42" y1="40" x2="98" y2="40" opacity="0.3"/>
        <line x1="50.2" y1="20.2" x2="89.8" y2="59.8" opacity="0.3"/>
        <line x1="50.2" y1="59.8" x2="89.8" y2="20.2" opacity="0.3"/>
        <path d="M 70,40 L 70,12 A 28,28 0 0,1 98,40 Z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5"/>
        <path d="M 70,40 L 98,40 A 28,28 0 0,1 89.8,59.8 Z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5"/>
    </svg>`,

    // ── Funktionen & Analysis ────────────────────────────────────
    'analysis_riemann': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="20" y1="65" x2="125" y2="65" opacity="0.3"/>
        <line x1="30" y1="10" x2="30" y2="70" opacity="0.3"/>
        <path d="M 35,60 C 55,20 85,15 115,25" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <rect x="45" y="47" width="20" height="18" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1"/>
        <rect x="65" y="30" width="20" height="35" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1"/>
        <rect x="85" y="21" width="20" height="44" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1"/>
    </svg>`,
    'analysis_flaechen': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="20" y1="65" x2="125" y2="65" opacity="0.3"/>
        <line x1="30" y1="10" x2="30" y2="70" opacity="0.3"/>
        <path d="M 30,55 C 50,55 70,25 90,20 C 110,15 120,40 125,50" stroke="currentColor" stroke-width="1.5"/>
        <path d="M 50,65 L 50,47 C 60,40 70,25 90,20 L 90,65 Z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2,2"/>
    </svg>`,
    'analysis_tangente': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="20" y1="65" x2="125" y2="65" opacity="0.3"/>
        <path d="M 30,55 Q 70,20 120,15" stroke="currentColor" opacity="0.4"/>
        <line x1="40" y1="52" x2="110" y2="24" stroke="var(--accent)" stroke-width="1.5"/>
        <path d="M 75,38 L 95,38 L 95,30" stroke="var(--accent)" stroke-width="1.5" fill="none"/>
        <circle cx="75" cy="38" r="2.5" fill="var(--accent)"/>
    </svg>`,
    'analysis_kurve': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="20" y1="45" x2="125" y2="45" opacity="0.3"/>
        <line x1="30" y1="10" x2="30" y2="70" opacity="0.3"/>
        <path d="M 35,60 C 55,20 75,15 95,55 C 105,75 115,40 125,20" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="53" cy="27" r="3" fill="var(--accent)" stroke="var(--accent)"/>
        <circle cx="91" cy="51" r="3" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,
    'analysis_steckbrief': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="20" y1="65" x2="125" y2="65" opacity="0.3"/>
        <line x1="30" y1="10" x2="30" y2="70" opacity="0.3"/>
        <path d="M 35,60 C 55,20 85,15 115,55" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.5"/>
        <path d="M 35,60 C 55,20 85,15 115,55" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="55" cy="28" r="3.5" fill="var(--accent)" stroke="var(--accent)"/>
        <circle cx="85" cy="20" r="3.5" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,
    'analysis_puzzle': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <!-- Links: Mini-Graph -->
        <rect x="15" y="15" width="40" height="40" rx="3" stroke-width="1" opacity="0.3"/>
        <line x1="15" y1="35" x2="55" y2="35" opacity="0.2"/>
        <line x1="35" y1="15" x2="35" y2="55" opacity="0.2"/>
        <path d="M 20,45 Q 35,15 50,25" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="35" cy="30" r="2.5" fill="var(--accent)"/>

        <!-- Rechts: Gleichungs-Karten (gestapelt) -->
        <rect x="85" y="15" width="40" height="18" rx="2" stroke-width="1" opacity="0.4"/>
        <rect x="85" y="38" width="40" height="18" rx="2" stroke="var(--accent)" stroke-width="1.5"/>
        <text x="91" y="50" font-family="sans-serif" font-size="8" font-weight="bold" fill="var(--accent)" stroke="none">f(x)=x²</text>

        <!-- Verbindungslinie dazwischen (Zuordnung) -->
        <path d="M 58,35 Q 70,35 82,44" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3,3" stroke-linecap="round"/>
        <circle cx="58" cy="35" r="2" fill="var(--accent)"/>
        <circle cx="82" cy="44" r="2" fill="var(--accent)"/>
    </svg>`,
    'analysis_rotationskoerper': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="15" y1="40" x2="125" y2="40" opacity="0.3"/>
        <line x1="30" y1="10" x2="30" y2="70" opacity="0.3"/>
        <!-- Rotationskoerper Outline (Vasengaenge) -->
        <path d="M 40,25 C 60,25 70,18 90,18 C 105,18 115,22 120,25" stroke="currentColor" stroke-width="1.5"/>
        <path d="M 40,55 C 60,55 70,62 90,62 C 105,62 115,58 120,55" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" opacity="0.6"/>
        <!-- Ellipsen fuer 3D-Look -->
        <ellipse cx="40" cy="40" rx="3" ry="15" stroke="var(--accent)" stroke-width="1.5" fill="var(--accent)" fill-opacity="0.1"/>
        <ellipse cx="120" cy="40" rx="3" ry="15" stroke="var(--accent)" stroke-width="1.5" fill="var(--accent)" fill-opacity="0.1"/>
        <ellipse cx="80" cy="40" rx="2.5" ry="19.5" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2,2" opacity="0.7"/>
        <!-- Rotationspfeil -->
        <path d="M 125,32 A 4,4 0 1,1 125,48" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 122,46 L 125,48 L 127,45" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,
    'analysis_extremwert': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="15" y1="65" x2="125" y2="65" opacity="0.3"/>
        <line x1="70" y1="10" x2="70" y2="70" opacity="0.3"/>
        <!-- Parabel-Kurve -->
        <path d="M 35,65 Q 70,15 105,65" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Optimales schattiertes Rechteck darunter -->
        <rect x="52" y="36" width="36" height="29" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2,2"/>
        <circle cx="88" cy="36" r="3" fill="var(--accent)" stroke="var(--accent)"/>
        <!-- Bemaßung 2x -->
        <line x1="52" y1="71" x2="88" y2="71" stroke="var(--accent)" stroke-width="1" opacity="0.6"/>
        <path d="M 52,69 L 52,73 M 88,69 L 88,73" stroke="var(--accent)" opacity="0.6"/>
        <text x="70" y="78" font-family="sans-serif" font-size="7" font-weight="bold" fill="var(--accent)" text-anchor="middle" stroke="none">2x</text>
    </svg>`,

    // ── Geometrie ────────────────────────────────────────────────
    'geometry': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="15" y1="40" x2="125" y2="40" opacity="0.3"/>
        <line x1="70" y1="10" x2="70" y2="70" opacity="0.3"/>
        <polygon points="40,55 90,55 75,25" stroke="var(--accent)" fill="var(--accent)" fill-opacity="0.1" stroke-width="1.5"/>
        <circle cx="105" cy="25" r="10" stroke="currentColor" opacity="0.6"/>
    </svg>`,
    'geometry3d': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="70" y1="40" x2="70" y2="10"/>
        <line x1="70" y1="40" x2="120" y2="55"/>
        <line x1="70" y1="40" x2="30" y2="65"/>
        <line x1="70" y1="40" x2="95" y2="22" stroke="var(--accent)" stroke-width="2"/>
        <polygon points="95,22 90,26 92,21" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,

    'strahlensatz': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="25" y1="55" x2="115" y2="20" stroke-linecap="round"/>
        <line x1="25" y1="55" x2="115" y2="60" stroke-linecap="round"/>
        <line x1="65" y1="35" x2="65" y2="53" stroke="var(--accent)" stroke-width="1.8"/>
        <line x1="95" y1="24" x2="95" y2="57" stroke="var(--accent)" stroke-width="1.8"/>
        <circle cx="25" cy="55" r="2.5" fill="currentColor"/>
    </svg>`,
    'koordinatensystem': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="25" y="15" width="90" height="50" rx="3" stroke-dasharray="2,2" opacity="0.2"/>
        <line x1="25" y1="65" x2="120" y2="65"/>
        <line x1="25" y1="15" x2="25" y2="65"/>
        <path d="M 117,62 L 120,65 L 117,68"/>
        <path d="M 22,18 L 25,15 L 28,18"/>
        <circle cx="65" cy="35" r="3" fill="var(--accent)" stroke="var(--accent)"/>
        <line x1="85" y1="47" x2="91" y2="53" stroke="var(--accent)" stroke-width="2"/>
        <line x1="91" y1="47" x2="85" y2="53" stroke="var(--accent)" stroke-width="2"/>
    </svg>`,

    // ── Daten & Zufall ───────────────────────────────────────────
    'verteilung': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="15" y1="65" x2="125" y2="65" opacity="0.3"/>
        <path d="M 20,65 C 50,65 55,20 70,20 C 85,20 90,65 120,65" stroke="currentColor" stroke-width="1.5"/>
        <path d="M 60,65 C 62,45 65,22 70,20 C 75,20 78,45 80,65 Z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2,2"/>
    </svg>`,
    'baum': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="35" cy="40" r="3" fill="currentColor"/>
        <line x1="35" y1="40" x2="70" y2="22"/>
        <line x1="35" y1="40" x2="70" y2="58"/>
        <line x1="70" y1="22" x2="105" y2="12" stroke="var(--accent)"/>
        <line x1="70" y1="22" x2="105" y2="32"/>
        <line x1="70" y1="58" x2="105" y2="48"/>
        <line x1="70" y1="58" x2="105" y2="68" stroke="var(--accent)"/>
        <circle cx="70" cy="22" r="2.5" fill="currentColor"/>
        <circle cx="70" cy="58" r="2.5" fill="currentColor"/>
        <circle cx="105" cy="12" r="2" fill="var(--accent)" stroke="var(--accent)"/>
        <circle cx="105" cy="68" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,
    'urne': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M 45,15 L 45,25 C 45,35 35,45 35,60 C 35,68 45,70 70,70 C 95,70 105,68 105,60 C 105,45 95,35 95,25 L 95,15" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <circle cx="55" cy="58" r="6" fill="currentColor" opacity="0.3"/>
        <circle cx="65" cy="48" r="6" fill="var(--accent)" fill-opacity="0.2" stroke="var(--accent)"/>
        <circle cx="78" cy="56" r="6" fill="currentColor" opacity="0.3"/>
        <circle cx="85" cy="46" r="6" fill="var(--accent)" fill-opacity="0.2" stroke="var(--accent)"/>
        <circle cx="70" cy="61" r="6" fill="currentColor" opacity="0.3"/>
    </svg>`,
    'gluecksrad': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="65" cy="40" r="28"/>
        <line x1="65" y1="12" x2="65" y2="68"/>
        <line x1="37" y1="40" x2="93" y2="40"/>
        <path d="M 65,40 L 65,12 A 28,28 0 0,1 93,40 Z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5"/>
        <path d="M 106,40 L 98,36 L 98,44 Z" fill="var(--accent)" stroke="var(--accent)"/>
    </svg>`,
    'vierfeldertafel': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="25" y="15" width="90" height="50" rx="4" opacity="0.3"/>
        <line x1="25" y1="31.6" x2="115" y2="31.6" opacity="0.3"/>
        <line x1="25" y1="48.3" x2="115" y2="48.3" opacity="0.3"/>
        <line x1="55" y1="15" x2="55" y2="65" opacity="0.3"/>
        <line x1="85" y1="15" x2="85" y2="65" opacity="0.3"/>
        <rect x="56" y="32.6" width="28" height="14.7" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1"/>
    </svg>`,
    'diagramm': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="20" y1="65" x2="120" y2="65"/>
        <line x1="25" y1="15" x2="25" y2="65" opacity="0.3"/>
        <rect x="35" y="40" width="18" height="25" rx="1" fill="currentColor" opacity="0.3"/>
        <rect x="61" y="25" width="18" height="40" rx="1" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5"/>
        <rect x="87" y="48" width="18" height="17" rx="1" fill="currentColor" opacity="0.3"/>
    </svg>`,

    // ── Layout & Struktur ────────────────────────────────────────
    'mcq': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="25" y="18" width="10" height="10" rx="2" stroke="var(--accent)" stroke-width="1.8"/>
        <path d="M 27,23 L 29,25 L 33,20" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="45" y1="23" x2="115" y2="23" opacity="0.6" stroke-width="2"/>
        <rect x="25" y="35" width="10" height="10" rx="2"/>
        <line x1="45" y1="40" x2="105" y2="40" opacity="0.3" stroke-width="2"/>
        <rect x="25" y="52" width="10" height="10" rx="2"/>
        <line x1="45" y1="57" x2="110" y2="57" opacity="0.3" stroke-width="2"/>
    </svg>`,
    'trueFalse': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="70" y1="20" x2="70" y2="60" stroke-width="2"/>
        <line x1="50" y1="60" x2="90" y2="60"/>
        <line x1="40" y1="25" x2="100" y2="35" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        <line x1="32" y1="48" x2="48" y2="48"/>
        <line x1="92" y1="58" x2="108" y2="58"/>
        <line x1="40" y1="25" x2="32" y2="48" opacity="0.5"/>
        <line x1="40" y1="25" x2="48" y2="48" opacity="0.5"/>
        <line x1="100" y1="35" x2="92" y2="58" opacity="0.5"/>
        <line x1="100" y1="35" x2="108" y2="58" opacity="0.5"/>
    </svg>`,
    'matching': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="20" y="15" width="30" height="12" rx="2" opacity="0.4"/>
        <rect x="20" y="34" width="30" height="12" rx="2" stroke="var(--accent)" stroke-width="1.5"/>
        <rect x="20" y="53" width="30" height="12" rx="2" opacity="0.4"/>
        <rect x="90" y="15" width="30" height="12" rx="2" stroke="var(--accent)" stroke-width="1.5"/>
        <rect x="90" y="34" width="30" height="12" rx="2" opacity="0.4"/>
        <rect x="90" y="53" width="30" height="12" rx="2" opacity="0.4"/>
        <path d="M 50,40 Q 70,30 90,21" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3,3" stroke-linecap="round"/>
        <circle cx="50" cy="40" r="2.5" fill="var(--accent)"/>
        <circle cx="90" cy="21" r="2.5" fill="var(--accent)"/>
    </svg>`,
    'image': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="25" y="15" width="90" height="50" rx="4" stroke-width="1.8"/>
        <path d="M 25,55 L 50,30 L 75,50 L 95,35 L 115,55" fill="var(--accent)" fill-opacity="0.1" stroke="currentColor"/>
        <circle cx="85" cy="28" r="4.5" fill="var(--accent)" fill-opacity="0.2" stroke="var(--accent)"/>
    </svg>`,
    'zusatz': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="35" y="12" width="70" height="56" rx="3" stroke-width="1" opacity="0.4"/>
        <line x1="45" y1="22" x2="95" y2="22" opacity="0.3"/>
        <line x1="45" y1="30" x2="85" y2="30" opacity="0.3"/>
        <rect x="42" y="38" width="56" height="20" rx="2" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="2,2"/>
        <line x1="48" y1="48" x2="92" y2="48" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
    'lueckentext': `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="25" y1="20" x2="115" y2="20" stroke-width="2" opacity="0.6"/>
        <line x1="25" y1="32" x2="50" y2="32" stroke-width="2" opacity="0.6"/>
        <rect x="56" y="24" width="36" height="13" rx="6" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3,2" fill="var(--accent)" fill-opacity="0.05"/>
        <line x1="98" y1="32" x2="115" y2="32" stroke-width="2" opacity="0.6"/>
        <line x1="25" y1="44" x2="80" y2="44" stroke-width="2" opacity="0.6"/>
        <line x1="25" y1="56" x2="105" y2="56" stroke-width="2" opacity="0.6"/>
    </svg>`,
};

export const moduleModal = (): any => ({
    isModuleModalOpen: false,
    moduleTarget: null as any,
    categories: CATEGORIES,
    activeCategory: 'algebra' as CategoryId,

    init() {
        window.addEventListener('open-module-modal', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.moduleTarget = customEvent.detail.target;
            this.isModuleModalOpen = true;
            // Reset active tab to first category when opening modal
            this.activeCategory = 'algebra';
        });
    },

    closeModuleModal() {
        this.isModuleModalOpen = false;
        this.moduleTarget = null;
    },

    getModulePreviewSvg(type: string): string {
        return PREVIEW_SVGS[type] || `<svg viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="15" y="15" width="110" height="50" rx="4" opacity="0.3"/></svg>`;
    },

    /**
     * Fügt ein neues Modul in das modules[]-Array des Ziels ein.
     * Lookup erfolgt über die MODULE_REGISTRY.
     */
    addModule(moduleType: string) {
        if (!this.moduleTarget) return;

        const def = MODULE_REGISTRY[moduleType as ModuleType];
        if (!def) {
            console.warn(`Unbekannter Modultyp: ${moduleType}`);
            return;
        }

        // Sicherstellen, dass modules[] existiert (Fallback für alte Objekte)
        const currentModules = Array.isArray(this.moduleTarget.modules) ? [...this.moduleTarget.modules] : [];

        const newModule = {
            id: generateModuleId(),
            type: moduleType,
            data: def.defaultData(),
        };

        currentModules.push(newModule);

        // Durch Neuzuweisung wird die Alpine.js-Reaktivität zuverlässig getriggert (insb. bei tief verschachtelten Unteraufgaben)
        this.moduleTarget.modules = currentModules;

        if (moduleType === 'analysis_extremwert') {
            const defaultText = "Ein Landwirt besitzt ein Grundstück an einem geradlinigen Flussufer. Er möchte eine rechteckige Wiese einzäunen, wobei die dem Fluss zugewandte Seite keinen Zaun benötigt. Es stehen insgesamt **120** m Zaun zur Verfügung. Bestimme die Abmessungen der Wiese, sodass die Weidefläche maximal wird, und berechne diesen maximalen Flächeninhalt.";
            if (this.moduleTarget.context !== undefined) {
                if (!this.moduleTarget.context || this.moduleTarget.context.trim() === "") {
                    this.moduleTarget.context = defaultText;
                }
            } else {
                if (!this.moduleTarget.text || this.moduleTarget.text.trim() === "") {
                    this.moduleTarget.text = defaultText;
                }
            }
        } else if (moduleType === 'analysis_puzzle') {
            const defaultText = "Ordne die Graphen der Funktionen (I bis III) den Graphen ihrer Ableitungsfunktionen (A bis C) zu.";
            if (this.moduleTarget.context !== undefined) {
                if (!this.moduleTarget.context || this.moduleTarget.context.trim() === "") {
                    this.moduleTarget.context = defaultText;
                }
            } else {
                if (!this.moduleTarget.text || this.moduleTarget.text.trim() === "") {
                    this.moduleTarget.text = defaultText;
                }
            }
        } else if (moduleType === 'analysis_rotationskoerper') {
            const defaultText = "Der Graph der Funktion $f(x) = \\sqrt{x}$ rotiert im Intervall $[0; 4]$ um die x-Achse. Bestimme das Volumen des entstehenden Rotationskörpers.";
            if (this.moduleTarget.context !== undefined) {
                if (!this.moduleTarget.context || this.moduleTarget.context.trim() === "") {
                    this.moduleTarget.context = defaultText;
                }
            } else {
                if (!this.moduleTarget.text || this.moduleTarget.text.trim() === "") {
                    this.moduleTarget.text = defaultText;
                }
            }
        }

        // Notify Inspector to automatically select the newly added module (if it has an Inspector panel)
        window.dispatchEvent(new CustomEvent('module-added-to-canvas', {
            detail: {
                target: this.moduleTarget,
                module: newModule
            }
        }));

        this.closeModuleModal();
    },

    /**
     * Entfernt ein Modul aus dem modules[]-Array anhand seiner ID.
     */
    removeModule(moduleId: string) {
        if (!this.moduleTarget || !Array.isArray(this.moduleTarget.modules)) return;
        this.moduleTarget.modules = this.moduleTarget.modules.filter((m: any) => m.id !== moduleId);
    },

    setActiveCategory(categoryId: CategoryId) {
        this.activeCategory = categoryId;
    },

    getFilteredModules() {
        return getModulesByCategory(this.activeCategory);
    },
});
