class ShuleOfflineSync {
  constructor() {
    this.dbName = 'ShuleOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.initDB();
    this.initNetworkListener();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('records')) {
          db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) await this.initDB();
    return this.db;
  }

  // Save record locally first (Offline-First)
  async saveLocalRecord(record, apiEndpoint) {
    const db = await this.ensureDB();
    
    // 1. Save to local records store
    await new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      tx.objectStore('records').put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // 2. Add to sync queue to push when online
    await new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      tx.objectStore('syncQueue').add({ record, apiEndpoint, timestamp: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    if (navigator.onLine) {
      this.syncWithServer();
    }
  }

  initNetworkListener() {
    window.addEventListener('online', () => {
      console.log('Internet connection resumed. Synchronizing offline queue...');
      showToast('Internet resumed — syncing offline records with server...', 'info');
      this.syncWithServer();
    });
  }

  async syncWithServer() {
    const db = await this.ensureDB();
    const queueItems = await new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const request = tx.objectStore('syncQueue').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!queueItems || queueItems.length === 0) return;

    let syncedCount = 0;
    for (const item of queueItems) {
      try {
        const response = await fetch(item.apiEndpoint || '/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.record)
        });

        if (response.ok) {
          // Remove from sync queue upon successful sync
          const tx = db.transaction('syncQueue', 'readwrite');
          tx.objectStore('syncQueue').delete(item.id);
          syncedCount++;
        }
      } catch (err) {
        console.warn('Sync failed for item, will retry later:', err);
        break; // Stop syncing if connection drops again
      }
    }

    if (syncedCount > 0) {
      showToast(`Successfully synchronized ${syncedCount} offline record(s) with server!`, 'success');
    }
  }
}

window.shuleSync = new ShuleOfflineSync();
