import { Task } from '../types/models';

export const sidebar = (): any => ({
    collectionFileHandle: null as any,
    collectionTasks: [] as Task[],
    collectionSearchQuery: '',
    expandedCollectionTaskId: null as number | null,

    init() {
        window.addEventListener('save-task-to-collection', async (e: Event) => {
            const customEvent = e as CustomEvent;
            await this.saveTaskToCollection(customEvent.detail.task);
        });
    },

    async loadOrCreateCollection() {
        const win = window as any;
        if (!('showOpenFilePicker' in win)) {
            alert("Ihr Browser unterstützt die File System Access API leider nicht. Bitte nutzen Sie Chrome, Edge oder Opera.");
            return;
        }
        try {
            const [handle] = await win.showOpenFilePicker({
                types: [{
                    description: 'Math Builder Aufgabensammlung (JSON)',
                    accept: { 'application/json': ['.json'] }
                }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            this.collectionFileHandle = handle;
            const file = await handle.getFile();
            const text = await file.text();
            
            let data: any;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = null;
            }

            if (data && data.fileType === 'math-builder-collection' && Array.isArray(data.tasks)) {
                this.collectionTasks = data.tasks;
            } else {
                if (confirm("Die ausgewählte Datei scheint keine gültige Math Builder Sammlung zu sein. Möchten Sie sie überschreiben und als neue Sammlung initialisieren?")) {
                    this.collectionTasks = [];
                    await this.saveCollection();
                } else {
                    this.collectionFileHandle = null;
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert("Fehler beim Laden der Sammlung: " + err.message);
            }
        }
    },

    closeCollection() {
        this.collectionFileHandle = null;
        this.collectionTasks = [];
        this.collectionSearchQuery = '';
        this.expandedCollectionTaskId = null;
    },

    async createNewCollection() {
        const win = window as any;
        if (!('showSaveFilePicker' in win)) {
            alert("Ihr Browser unterstützt die File System Access API leider nicht. Bitte nutzen Sie Chrome, Edge oder Opera.");
            return;
        }
        try {
            const handle = await win.showSaveFilePicker({
                suggestedName: 'aufgabensammlung.json',
                types: [{
                    description: 'Math Builder Aufgabensammlung (JSON)',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            this.collectionFileHandle = handle;
            this.collectionTasks = [];
            await this.saveCollection();
            
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Sammlung erstellt!' } }));
        } catch (err: any) {
            if (err.name !== 'AbortError') console.error(err);
        }
    },

    async saveCollection() {
        if (!this.collectionFileHandle) return;
        try {
            const data = {
                fileType: 'math-builder-collection',
                version: '1.0',
                tasks: this.collectionTasks
            };
            const writable = await this.collectionFileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch (err: any) {
            console.error(err);
            alert("Speichern der Sammlung fehlgeschlagen: " + err.message);
        }
    },

    async saveTaskToCollection(task: Task) {
        if (!this.collectionFileHandle) {
            alert("Bitte lade oder erstelle zuerst eine Aufgabensammlung in der rechten Sidebar!");
            return;
        }
        const defaultTitle = task.context ? task.context.substring(0, 30).trim() + '...' : 'Neue Aufgabe';
        const title = prompt("Unter welchem Namen soll diese Aufgabe in deiner Sammlung auf der Festplatte gespeichert werden?", defaultTitle);
        if (title === null) return; // Abbruch durch Nutzer

        const taskCopy = JSON.parse(JSON.stringify(task));
        taskCopy.id = Date.now();
        taskCopy.collectionTitle = title.trim() || defaultTitle;

        this.collectionTasks.push(taskCopy);
        await this.saveCollection();

        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'In Sammlung gesichert!' } }));
    },

    importTaskFromCollection(task: Task) {
        window.dispatchEvent(new CustomEvent('import-task', { detail: { task } }));
    },

    async removeTaskFromCollection(taskId: number) {
        if (!confirm("Möchten Sie diese Aufgabe wirklich dauerhaft aus Ihrer Sammlung auf der Festplatte löschen?")) return;
        this.collectionTasks = this.collectionTasks.filter(t => t.id !== taskId);
        await this.saveCollection();
    },

    getFilteredCollection() {
        if (!this.collectionSearchQuery) return this.collectionTasks;
        const query = this.collectionSearchQuery.toLowerCase().trim();
        return this.collectionTasks.filter(t => {
            const titleMatch = (t.collectionTitle || '').toLowerCase().includes(query);
            const contextMatch = (t.context || '').toLowerCase().includes(query);
            const subtaskMatch = t.subtasks && t.subtasks.some(s => (s.text || '').toLowerCase().includes(query));
            return titleMatch || contextMatch || subtaskMatch;
        });
    },

    getTaskModules(task: Task) {
        const modules: string[] = [];
        if (task.table?.show) modules.push('📊 Tabelle');
        if (task.geometry?.show) modules.push('📐 Geo');
        if (task.geometry3d?.show || (task.subtasks && task.subtasks.some(s => s.geometry3d?.show))) modules.push('🧊 3D-Geo');

        let mcq = false, tf = false, match = false, karo = false, cloze = false, dist = task.verteilung?.show;
        if (task.subtasks) {
            task.subtasks.forEach(s => {
                if (s.mcq?.show) mcq = true;
                if (s.trueFalse?.show) tf = true;
                if (s.matching?.show) match = true;
                if (s.spaceType === 'karo') karo = true;
                if (s.lueckentext?.show) cloze = true;
                if (s.verteilung?.show) dist = true;
                if (s.image?.show) modules.push('🖼️ Bild');
            });
        }

        if (dist) modules.push('📊 Verteilung');
        if (mcq) modules.push('☑️ MCQ');
        if (tf) modules.push('⚖️ W/F');
        if (match) modules.push('🔗 Zuordnung');
        if (cloze) modules.push('🔤 Lücke');
        if (karo) modules.push('📝 Karo');
        if (task.baum?.show || (task.subtasks && task.subtasks.some(s => s.baum?.show))) modules.push('🌳 Baum');
        if (task.urne?.show || (task.subtasks && task.subtasks.some(s => s.urne?.show))) modules.push('🎲 Urne');
        if (task.vierfeldertafel?.show || (task.subtasks && task.subtasks.some(s => s.vierfeldertafel?.show))) modules.push('▦ 4-Felder');

        if (modules.length === 0) modules.push('📝 Text');
        return modules;
    },

    getBadgeColorClass(modName: string) {
        if (modName.includes('Tabelle') || modName.includes('Verteilung')) return 'table';
        if (modName.includes('Geo')) return 'geo';
        if (modName.includes('MCQ')) return 'mcq';
        if (modName.includes('W/F')) return 'tf';
        if (modName.includes('Zuordnung')) return 'matching';
        if (modName.includes('Lücke')) return 'cloze';
        if (modName.includes('Karo')) return 'karo';
        if (modName.includes('Bild')) return 'image';
        if (modName.includes('Baum')) return 'matching'; 
        if (modName.includes('Urne')) return 'geo'; 
        if (modName.includes('4-Felder')) return 'table';
        return 'text';
    },

    getTaskPoints(task: Task) {
        if (!task.subtasks) return 0;
        return task.subtasks.reduce((sum, sub) => {
            if (sub.subSubtasks && sub.subSubtasks.length > 0) {
                return sum + sub.subSubtasks.reduce((subSum, subSub) => subSum + (parseFloat(subSub.points as any) || 0), 0);
            }
            return sum + (parseFloat(sub.points as any) || 0);
        }, 0);
    }
});
