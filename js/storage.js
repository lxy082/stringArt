const StringArtStorage = (() => {
    const DB_NAME = 'string_art_db'
    const STORE_NAME = 'string_art_records'
    const VERSION = 1

    function openDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, VERSION)

            request.onupgradeneeded = () => {
                const db = request.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
                    store.createIndex('createdAt', 'createdAt', { unique: false })
                }
            }

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async function saveRecord(record) {
        const db = await openDb()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            const store = tx.objectStore(STORE_NAME)
            const request = store.put(record)

            request.onsuccess = () => resolve(record)
            request.onerror = () => reject(request.error)
        })
    }

    async function listRecords() {
        const db = await openDb()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const store = tx.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onsuccess = () => resolve(request.result || [])
            request.onerror = () => reject(request.error)
        })
    }

    async function getRecord(id) {
        const db = await openDb()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const store = tx.objectStore(STORE_NAME)
            const request = store.get(id)

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async function deleteRecord(id) {
        const db = await openDb()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            const store = tx.objectStore(STORE_NAME)
            const request = store.delete(id)

            request.onsuccess = () => resolve(true)
            request.onerror = () => reject(request.error)
        })
    }

    return {
        saveRecord,
        listRecords,
        getRecord,
        deleteRecord
    }
})()
