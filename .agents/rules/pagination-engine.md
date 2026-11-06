# PAGINATION & PRINT-PARITY REGELN

Dieses Projekt nutzt eine präzise Pagination-Engine, um 1:1 Parität zwischen der Browser-Ansicht und dem PDF-Druck zu garantieren. Jede Änderung an der Architektur MUSS folgende Regeln strikt einhalten:

## 1. KONSTANTEN-SYNCHRONITÄT
Die Maße für A4-Seiten sind in `state.js` (`_doPaginate`) und `print.css` (@media print) fest definiert.
- **Top Margin:** 15mm (57px)
- **Bottom Margin:** 20mm (76px)
- **Content Height:** 989px (1122px Gesamthöhe - Margins)
- **Gaps:** Der graue Abstand im Builder (40px) dient nur der visuellen Trennung und darf die Inhaltsberechnung nicht verfälschen.

## 2. DAS SANDWICH-MODELL (VISUAL PAGE PREVIEW)
Die virtuellen Blätter im Builder werden über ein Overlay gesteuert:
- `.a4-page`: Muss `isolation: isolate` und einen stacking context (`z-index: 0`) haben.
- `#page-breaks-overlay`: Liegt auf `z-index: 0`.
- **Inhalt:** Alle direkten Kinder von `.a4-page` (außer dem Overlay) MÜSSEN auf `z-index: 1` gehoben werden, um über den virtuellen Blättern zu liegen.

## 3. PRINT-PARITY LOGIK
Die Parität zwischen Builder und Druck wird NICHT durch das Kopieren von Margins erreicht, sondern durch koordinierte Seitenumbrüche:
- **Koppelung:** Wenn die Engine einen Block verschiebt, setzt sie die Klasse `.print-break-before` in `state.js`.
- **Druck-Erzwingung:** In `print.css` muss `.print-break-before` zwingend `break-before: page !important;` auslösen.
- **Keine manuellen Print-Shifts:** In `print.css` müssen alle dynamischen `--page-push` Werte auf 0 gesetzt oder ignoriert werden (`margin-top: 0 !important`), da der Browser den Umbruch physisch vollzieht.

## 4. ATOMIC BLOCKS
Alle pädagogischen Einheiten (Aufgaben, Header, Divider) müssen die Klasse `.atomic-block` tragen. Nur so kann die Engine ihre Höhe korrekt messen und Umbrüche an sinnvollen Stellen (Orphan Prevention) berechnen.
