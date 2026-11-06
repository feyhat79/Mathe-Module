import { documentBuilder } from './state';
import { moduleModal } from './components/moduleModal';
import { moduleStudio } from './components/moduleStudio';
import { sidebar } from './components/sidebar';
import { onboarding } from './components/onboarding';

declare const Alpine: any;

document.addEventListener('alpine:init', () => {
    // Register the state component
    Alpine.data('builder', documentBuilder);
    Alpine.data('moduleModal', moduleModal);
    Alpine.data('moduleStudio', moduleStudio);
    // Inline-Variante für die rechte Inspector-Sidebar: gleiche Logik, aber ohne Modal-Listener
    Alpine.data('moduleStudioInline', () => {
        const studio = moduleStudio();
        studio.init = () => {};
        return studio;
    });
    Alpine.data('sidebar', sidebar);
    Alpine.data('onboarding', onboarding);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('App ready');
});
