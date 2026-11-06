const dbName = "MathBuilderDB";
const storeName = "documents";
const dbVersion = 1;

export const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
        request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });
};

export const dbGet = async (key: string): Promise<any> => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn("IndexedDB get failed, falling back to localStorage", err);
        const item = localStorage.getItem(key);
        try {
            return item ? JSON.parse(item) : null;
        } catch {
            return item;
        }
    }
};

export const dbSet = async (key: string, val: any): Promise<void> => {
    try {
        const db = await getDB();
        // Alpine.js-Reaktivitätsobjekte (Proxies) bereinigen, um DataCloneError zu verhindern
        const cleanVal = val && typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val;
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const request = store.put(cleanVal, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn("IndexedDB set failed, falling back to localStorage", err);
        try {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        } catch (e) {
            console.error("Autosave fallback to localStorage failed (quota exceeded)", e);
        }
    }
};
