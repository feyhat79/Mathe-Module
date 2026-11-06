/**
 * Onboarding Tour Component using Alpine.js.
 * Glides smoothly between targeted elements with premium animations.
 * Supports global tour and module-specific micro-tours.
 */

export interface TourStep {
    target: string;
    title: string;
    description: string;
    position: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const GLOBAL_STEPS: TourStep[] = [
    {
        target: '.builder-sidebar',
        title: 'Sidebar (Kommandozentrale) 🗺️',
        description: 'Hier verwalten Sie Ihre Aufgaben, wechseln das Design und laden oder speichern Ihre persönliche Aufgabensammlung.',
        position: 'right'
    },
    {
        target: '.app-header',
        title: 'Klausuren-Steuerung 💾',
        description: 'Speichern und laden Sie Ihre Entwürfe als JSON-Dateien. Per "Drucken" erzeugen Sie direkt das fertige A4-PDF für den Unterricht.',
        position: 'bottom'
    },
    {
        target: '.canvas-area',
        title: 'Echtzeit-Druckvorschau 🖨️',
        description: 'Hier sehen Sie die exakte, pixelgenaue A4-Ansicht des Klausurzettels für Ihre Schüler. Keine Überraschungen beim Ausdrucken!',
        position: 'left'
    },
    {
        target: '.task-management .btn-primary',
        title: 'Erste Aufgabe erstellen ➕',
        description: 'Starten Sie hier! Fügen Sie eine neue Aufgabe hinzu und bestücken Sie sie mit mathematischen Modulen (Tabellen, MCQ, Geometrie).',
        position: 'right'
    }
];

const LGS_STEPS: TourStep[] = [
    {
        target: '.select-lgs-dim',
        title: 'Dimension festlegen 📊',
        description: 'Wählen Sie hier, ob Sie ein 2x2 Gleichungssystem (zwei Variablen) oder ein 3x3 System (drei Variablen) erstellen möchten.',
        position: 'bottom'
    },
    {
        target: '.segmented-control',
        title: 'Erstellungsmodus wählen ⚙️',
        description: 'Nutzen Sie den **Auto-Generator**, um ausgehend von ganzzahligen Wunschlösungen die Gleichungen automatisch zu erzeugen, oder tragen Sie Koeffizienten im **Manuell**-Modus selbst ein.',
        position: 'bottom'
    },
    {
        target: '.input-lgs-vars',
        title: 'Variablennamen 🔤',
        description: 'Geben Sie die Namen der gesuchten Variablen mit Komma getrennt ein (z. B. x, y für 2x2). Diese werden automatisch in den Termen beschriftet.',
        position: 'bottom'
    },
    {
        target: '.lgs-generate-section',
        title: 'Auto-Generator 🎲',
        description: 'Geben Sie die gewünschte ganzzahlige Lösung ein und klicken Sie auf **Gleichungen erzeugen**. Der AufgabenBuilder rechnet rückwärts und generiert eine Aufgabe mit garantiert schönen Ganzzahlen!',
        position: 'bottom'
    },
    {
        target: '.lgs-manual-section',
        title: 'Manuelle Eingabe ✏️',
        description: 'Tragen Sie die Koeffizienten und Absolutglieder der Gleichungen (z.B. ax + by = d) direkt in das übersichtliche Gitter ein.',
        position: 'bottom'
    }
];

const TABLE_STEPS: TourStep[] = [
    {
        target: '.table-meta-inputs',
        title: 'Tabellen-Beschriftung 🏷️',
        description: 'Geben Sie den Zeilen Namen. Standardmäßig sind das x für die Argumente und f(x) für die Funktionswerte.',
        position: 'bottom'
    },
    {
        target: '.table-autofill-section',
        title: 'Formel-Autofill 🧮',
        description: 'Sparen Sie Zeit! Tippen Sie eine Funktion ein (z. B. `x^2 - 3`) und klicken Sie auf **Berechnen**. Die Tabelle wird automatisch basierend auf Ihren x-Werten ausgefüllt.',
        position: 'bottom'
    },
    {
        target: '.table-values-scroll',
        title: 'Werte bearbeiten ✍️',
        description: 'Sie können jeden Tabelleneintrag direkt editieren. Löschen Sie Werte, um ein Lückentext-Rätsel für Schüler zu erstellen!',
        position: 'bottom'
    },
    {
        target: '.table-actions',
        title: 'Spaltenzahl anpassen ➕/➖',
        description: 'Fügen Sie über das Plus-Symbol neue Tabellenspalten hinzu oder entfernen Sie die letzte Spalte über das Minus-Symbol.',
        position: 'bottom'
    }
];

const GEOMETRY_STEPS: TourStep[] = [
    {
        target: '.geometry-settings-bar',
        title: 'Koordinatensystem einstellen 📐',
        description: 'Aktivieren oder deaktivieren Sie die Achsenbeschriftung und das Gitternetz. Legen Sie hier den Wertebereich für die X- und Y-Achse genau fest.',
        position: 'bottom'
    },
    {
        target: '.geometry-size-bar',
        title: 'Papiergröße festlegen 📏',
        description: 'Bestimmen Sie die gedruckte Breite und Höhe der Zeichnung auf dem A4-Blatt (in Zentimetern).',
        position: 'bottom'
    },
    {
        target: '.geometry-dropdowns-row',
        title: 'Geometrische Objekte 🛠️',
        description: 'Plotten Sie Funktionen oder fügen Sie Punkte, Strecken, Geraden, Vektoren, Kreise, Vielecke, Winkel und Textboxen hinzu.',
        position: 'bottom'
    },
    {
        target: '.geometry-elements-list',
        title: 'Elemente feineinstellen ⚙️',
        description: 'Alle platzierten Objekte erscheinen in dieser Liste. Bearbeiten Sie Namen, Koordinaten, Bezeichner oder löschen Sie einzelne Elemente.',
        position: 'bottom'
    }
];

const URNE_STEPS: TourStep[] = [
    {
        target: '.image-grid-settings',
        title: 'Größe & Reihenfolge 📐',
        description: 'Passen Sie die Anzeigehöhe der Urne an. Mischen Sie die Kugelreihenfolge zufällig oder fügen Sie eine einzelne Kugel hinzu.',
        position: 'bottom'
    },
    {
        target: '.urne-generator-row',
        title: 'Massen-Generator 🪄',
        description: 'Fügen Sie viele Kugeln auf einmal hinzu! Wählen Sie die Anzahl, die Farbe/Musterung (z.B. gestrichelt) und ein Label (z.B. A, B oder Ziffern).',
        position: 'bottom'
    },
    {
        target: '.tree-nodes-list',
        title: 'Kugel-Liste verwalten 🔴',
        description: 'Hier konfigurieren Sie jede Kugel der Urne einzeln: Ändern Sie Typ und Beschriftung oder löschen Sie einzelne Kugeln.',
        position: 'bottom'
    }
];

export const onboarding = (): any => ({
    isActive: false,
    currentStep: 0,
    steps: GLOBAL_STEPS,
    cutoutStyle: '',
    cardStyle: '',
    activeContainer: null as HTMLElement | null,

    init() {
        // Listen for manual tour start events
        window.addEventListener('start-onboarding-tour', (e: CustomEvent) => {
            const detail = e?.detail || {};
            const type = typeof detail === 'string' ? detail : detail.type;
            const container = detail.container || null;
            this.startTour(type, container);
        });

        // Trigger tour automatically on first visit
        setTimeout(() => {
            if (!localStorage.getItem('onboarding_completed')) {
                this.startTour();
            }
        }, 1200);

        // Recalculate cutout and card positioning on window resize/scroll to keep alignment perfect
        window.addEventListener('resize', () => {
            if (this.isActive) this.updatePositioning();
        });
        window.addEventListener('scroll', () => {
            if (this.isActive) this.updatePositioning();
        });
    },

    startTour(category?: string, container?: HTMLElement | null) {
        this.currentStep = 0;
        this.activeContainer = container || null;

        if (category === 'lgs') {
            this.steps = LGS_STEPS;
        } else if (category === 'table') {
            this.steps = TABLE_STEPS;
        } else if (category === 'geometry') {
            this.steps = GEOMETRY_STEPS;
        } else if (category === 'urne') {
            this.steps = URNE_STEPS;
        } else {
            this.steps = GLOBAL_STEPS;
            this.activeContainer = null; // Global steps are document-wide
        }

        this.isActive = true;
        this.updatePositioning();
    },

    endTour() {
        this.isActive = false;
        if (this.steps === GLOBAL_STEPS) {
            localStorage.setItem('onboarding_completed', 'true');
        }
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updatePositioning();
        } else {
            this.endTour();
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updatePositioning();
        }
    },

    get currentStepData(): TourStep {
        return this.steps[this.currentStep];
    },

    updatePositioning() {
        this.$nextTick(() => {
            const step = this.currentStepData;
            
            // Try scoped element lookup first, fallback to document global lookup
            let el: Element | null = null;
            if (this.activeContainer) {
                el = this.activeContainer.querySelector(step.target);
            }
            if (!el) {
                el = document.querySelector(step.target);
            }

            if (!el) {
                // Fallback to center if element is not found/visible
                this.cutoutStyle = 'display: none;';
                this.cardStyle = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 340px;
                    z-index: 100001;
                `;
                return;
            }

            const rect = el.getBoundingClientRect();
            
            // 1. Cutout Box Shadow positioning
            this.cutoutStyle = `
                position: absolute;
                top: ${rect.top + window.scrollY}px;
                left: ${rect.left + window.scrollX}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border-radius: var(--radius-md, 8px);
                box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.65);
                z-index: 100000;
                pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            // 2. Info Card Positioning
            const cardWidth = 320;
            const cardHeight = 160;
            let top = 0;
            let left = 0;

            if (step.position === 'right') {
                top = rect.top + rect.height / 2 - cardHeight / 2;
                left = rect.left + rect.width + 16;
            } else if (step.position === 'left') {
                top = rect.top + rect.height / 2 - cardHeight / 2;
                left = rect.left - cardWidth - 16;
            } else if (step.position === 'bottom') {
                top = rect.top + rect.height + 16;
                left = rect.left + rect.width / 2 - cardWidth / 2;
            } else if (step.position === 'top') {
                top = rect.top - cardHeight - 16;
                left = rect.left + rect.width / 2 - cardWidth / 2;
            } else {
                // center
                top = window.innerHeight / 2 - cardHeight / 2;
                left = window.innerWidth / 2 - cardWidth / 2;
            }

            // Keep within viewport boundaries
            left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
            top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, top));

            this.cardStyle = `
                position: absolute;
                top: ${top + window.scrollY}px;
                left: ${left + window.scrollX}px;
                width: ${cardWidth}px;
                z-index: 100001;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;
        });
    }
});
