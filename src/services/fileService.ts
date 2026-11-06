import { migrateAndEnsureGetters } from './taskFactory';

/**
 * Exports the state as a JSON file
 */
export function exportAsJSON(state: any) {
    const data = {
        meta: state.meta,
        tasks: state.tasks,
        version: '1.2'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.meta.titel || 'Klassenarbeit'}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Imports the state from a JSON file
 */
export function importFromJSON(state: any, event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.meta && data.tasks) {
                state.meta = { ...state.meta, ...data.meta };
                state.tasks = data.tasks.map((t: any) => migrateAndEnsureGetters(t));
                state.saveMessage = 'Erfolgreich geladen!';
                setTimeout(() => state.saveMessage = '', 3000);
            } else {
                alert("Ungültiges Dateiformat!");
            }
        } catch (err) {
            console.error("Import failed:", err);
            alert("Fehler beim Einlesen der Datei.");
        }
    };
    reader.readAsText(file);
}

/**
 * Loads a file via File System Access API or Fallback
 */
export async function loadFile(state: any) {
    const win = window as any;
    if ('showOpenFilePicker' in win) {
        try {
            const [handle] = await win.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });
            state.fileHandle = handle;
            const file = await handle.getFile();
            const content = await file.text();
            const data = JSON.parse(content);

            if (data.meta && data.tasks) {
                state.meta = { ...state.meta, ...data.meta };
                state.tasks = data.tasks.map((t: any) => migrateAndEnsureGetters(t));
                state.saveMessage = 'Datei erfolgreich geöffnet!';
                setTimeout(() => state.saveMessage = '', 3000);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Loading failed:", err);
                alert("Fehler beim Laden der Datei.");
            }
        }
    } else {
        // Fallback for browsers without File System Access API
        state.$refs.fileInput.click();
    }
}

/**
 * Saves state to file using File System Access API or fallback
 */
export async function saveFile(state: any) {
    const data = {
        meta: state.meta,
        tasks: state.tasks,
        version: '1.2'
    };

    const win = window as any;
    if ('showSaveFilePicker' in win) {
        try {
            // If no handle exists, ask for location
            if (!state.fileHandle) {
                state.fileHandle = await win.showSaveFilePicker({
                    suggestedName: `${state.meta.titel || 'Klassenarbeit'}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
            }

            const writable = await state.fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            state.saveMessage = 'Datei gespeichert!';
            setTimeout(() => state.saveMessage = '', 3000);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Saving failed:", err);
                alert("Fehler beim Speichern der Datei.");
            }
        }
    } else {
        // Fallback
        state.exportAsJSON();
    }
}

/**
 * Forces a "Save As" dialog to create a copy
 */
export async function saveFileAs(state: any) {
    const oldHandle = state.fileHandle;
    state.fileHandle = null;
    try {
        await state.saveFile();
    } catch (err: any) {
        if (err.name === 'AbortError') {
            state.fileHandle = oldHandle;
        } else {
            console.error("SaveAs failed:", err);
            state.fileHandle = oldHandle;
        }
    }
}
