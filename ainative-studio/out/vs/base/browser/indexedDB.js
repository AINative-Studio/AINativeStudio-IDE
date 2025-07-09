/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toErrorMessage } from '../common/errorMessage.js';
import { ErrorNoTelemetry, getErrorMessage } from '../common/errors.js';
import { mark } from '../common/performance.js';
class MissingStoresError extends Error {
    constructor(db) {
        super('Missing stores');
        this.db = db;
    }
}
export class DBClosedError extends Error {
    constructor(dbName) {
        super(`IndexedDB database '${dbName}' is closed.`);
        this.code = 'DBClosed';
    }
}
export class IndexedDB {
    static async create(name, version, stores) {
        const database = await IndexedDB.openDatabase(name, version, stores);
        return new IndexedDB(database, name);
    }
    static async openDatabase(name, version, stores) {
        mark(`code/willOpenDatabase/${name}`);
        try {
            return await IndexedDB.doOpenDatabase(name, version, stores);
        }
        catch (err) {
            if (err instanceof MissingStoresError) {
                console.info(`Attempting to recreate the IndexedDB once.`, name);
                try {
                    // Try to delete the db
                    await IndexedDB.deleteDatabase(err.db);
                }
                catch (error) {
                    console.error(`Error while deleting the IndexedDB`, getErrorMessage(error));
                    throw error;
                }
                return await IndexedDB.doOpenDatabase(name, version, stores);
            }
            throw err;
        }
        finally {
            mark(`code/didOpenDatabase/${name}`);
        }
    }
    static doOpenDatabase(name, version, stores) {
        return new Promise((c, e) => {
            const request = indexedDB.open(name, version);
            request.onerror = () => e(request.error);
            request.onsuccess = () => {
                const db = request.result;
                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        console.error(`Error while opening IndexedDB. Could not find '${store}'' object store`);
                        e(new MissingStoresError(db));
                        return;
                    }
                }
                c(db);
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store);
                    }
                }
            };
        });
    }
    static deleteDatabase(database) {
        return new Promise((c, e) => {
            // Close any opened connections
            database.close();
            // Delete the db
            const deleteRequest = indexedDB.deleteDatabase(database.name);
            deleteRequest.onerror = (err) => e(deleteRequest.error);
            deleteRequest.onsuccess = () => c();
        });
    }
    constructor(database, name) {
        this.name = name;
        this.database = null;
        this.pendingTransactions = [];
        this.database = database;
    }
    hasPendingTransactions() {
        return this.pendingTransactions.length > 0;
    }
    close() {
        if (this.pendingTransactions.length) {
            this.pendingTransactions.splice(0, this.pendingTransactions.length).forEach(transaction => transaction.abort());
        }
        this.database?.close();
        this.database = null;
    }
    async runInTransaction(store, transactionMode, dbRequestFn) {
        if (!this.database) {
            throw new DBClosedError(this.name);
        }
        const transaction = this.database.transaction(store, transactionMode);
        this.pendingTransactions.push(transaction);
        return new Promise((c, e) => {
            transaction.oncomplete = () => {
                if (Array.isArray(request)) {
                    c(request.map(r => r.result));
                }
                else {
                    c(request.result);
                }
            };
            transaction.onerror = () => e(transaction.error ? ErrorNoTelemetry.fromError(transaction.error) : new ErrorNoTelemetry('unknown error'));
            transaction.onabort = () => e(transaction.error ? ErrorNoTelemetry.fromError(transaction.error) : new ErrorNoTelemetry('unknown error'));
            const request = dbRequestFn(transaction.objectStore(store));
        }).finally(() => this.pendingTransactions.splice(this.pendingTransactions.indexOf(transaction), 1));
    }
    async getKeyValues(store, isValid) {
        if (!this.database) {
            throw new DBClosedError(this.name);
        }
        const transaction = this.database.transaction(store, 'readonly');
        this.pendingTransactions.push(transaction);
        return new Promise(resolve => {
            const items = new Map();
            const objectStore = transaction.objectStore(store);
            // Open a IndexedDB Cursor to iterate over key/values
            const cursor = objectStore.openCursor();
            if (!cursor) {
                return resolve(items); // this means the `ItemTable` was empty
            }
            // Iterate over rows of `ItemTable` until the end
            cursor.onsuccess = () => {
                if (cursor.result) {
                    // Keep cursor key/value in our map
                    if (isValid(cursor.result.value)) {
                        items.set(cursor.result.key.toString(), cursor.result.value);
                    }
                    // Advance cursor to next row
                    cursor.result.continue();
                }
                else {
                    resolve(items); // reached end of table
                }
            };
            // Error handlers
            const onError = (error) => {
                console.error(`IndexedDB getKeyValues(): ${toErrorMessage(error, true)}`);
                resolve(items);
            };
            cursor.onerror = () => onError(cursor.error);
            transaction.onerror = () => onError(transaction.error);
        }).finally(() => this.pendingTransactions.splice(this.pendingTransactions.indexOf(transaction), 1));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9pbmRleGVkREIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFaEQsTUFBTSxrQkFBbUIsU0FBUSxLQUFLO0lBQ3JDLFlBQXFCLEVBQWU7UUFDbkMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFESixPQUFFLEdBQUYsRUFBRSxDQUFhO0lBRXBDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFjLFNBQVEsS0FBSztJQUV2QyxZQUFZLE1BQWM7UUFDekIsS0FBSyxDQUFDLHVCQUF1QixNQUFNLGNBQWMsQ0FBQyxDQUFDO1FBRjNDLFNBQUksR0FBRyxVQUFVLENBQUM7SUFHM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFNBQVM7SUFFckIsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBWSxFQUFFLE9BQTJCLEVBQUUsTUFBZ0I7UUFDOUUsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckUsT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQVksRUFBRSxPQUEyQixFQUFFLE1BQWdCO1FBQzVGLElBQUksQ0FBQyx5QkFBeUIsSUFB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