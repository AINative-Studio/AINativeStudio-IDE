/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { timeout } from '../../../common/async.js';
import { Event } from '../../../common/event.js';
import { mapToString, setToString } from '../../../common/map.js';
import { basename } from '../../../common/path.js';
import { Promises } from '../../../node/pfs.js';
export class SQLiteStorageDatabase {
    static { this.IN_MEMORY_PATH = ':memory:'; }
    get onDidChangeItemsExternal() { return Event.None; } // since we are the only client, there can be no external changes
    static { this.BUSY_OPEN_TIMEOUT = 2000; } // timeout in ms to retry when opening DB fails with SQLITE_BUSY
    static { this.MAX_HOST_PARAMETERS = 256; } // maximum number of parameters within a statement
    constructor(path, options = Object.create(null)) {
        this.path = path;
        this.name = basename(this.path);
        this.logger = new SQLiteStorageDatabaseLogger(options.logging);
        this.whenConnected = this.connect(this.path);
    }
    async getItems() {
        const connection = await this.whenConnected;
        const items = new Map();
        const rows = await this.all(connection, 'SELECT * FROM ItemTable');
        rows.forEach(row => items.set(row.key, row.value));
        if (this.logger.isTracing) {
            this.logger.trace(`[storage ${this.name}] getItems(): ${items.size} rows`);
        }
        return items;
    }
    async updateItems(request) {
        const connection = await this.whenConnected;
        return this.doUpdateItems(connection, request);
    }
    doUpdateItems(connection, request) {
        if (this.logger.isTracing) {
            this.logger.trace(`[storage ${this.name}] updateItems(): insert(${request.insert ? mapToString(request.insert) : '0'}), delete(${request.delete ? setToString(request.delete) : '0'})`);
        }
        return this.transaction(connection, () => {
            const toInsert = request.insert;
            const toDelete = request.delete;
            // INSERT
            if (toInsert && toInsert.size > 0) {
                const keysValuesChunks = [];
                keysValuesChunks.push([]); // seed with initial empty chunk
                // Split key/values into chunks of SQLiteStorageDatabase.MAX_HOST_PARAMETERS
                // so that we can efficiently run the INSERT with as many HOST parameters as possible
                let currentChunkIndex = 0;
                toInsert.forEach((value, key) => {
                    let keyValueChunk = keysValuesChunks[currentChunkIndex];
                    if (keyValueChunk.length > SQLiteStorageDatabase.MAX_HOST_PARAMETERS) {
                        currentChunkIndex++;
                        keyValueChunk = [];
                        keysValuesChunks.push(keyValueChunk);
                    }
                    keyValueChunk.push(key, value);
                });
                keysValuesChunks.forEach(keysValuesChunk => {
                    this.prepare(connection, `INSERT INTO ItemTable VALUES ${new Array(keysValuesChunk.length / 2).fill('(?,?)').join(',')}`, stmt => stmt.run(keysValuesChunk), () => {
                        const keys = [];
                        let length = 0;
                        toInsert.forEach((value, key) => {
                            keys.push(key);
                            length += value.length;
                        });
                        return `Keys: ${keys.join(', ')} Length: ${length}`;
                    });
                });
            }
            // DELETE
            if (toDelete && toDelete.size) {
                const keysChunks = [];
                keysChunks.push([]); // seed with initial empty chunk
                // Split keys into chunks of SQLiteStorageDatabase.MAX_HOST_PARAMETERS
                // so that we can efficiently run the DELETE with as many HOST parameters
                // as possible
                let currentChunkIndex = 0;
                toDelete.forEach(key => {
                    let keyChunk = keysChunks[currentChunkIndex];
                    if (keyChunk.length > SQLiteStorageDatabase.MAX_HOST_PARAMETERS) {
                        currentChunkIndex++;
                        keyChunk = [];
                        keysChunks.push(keyChunk);
                    }
                    keyChunk.push(key);
                });
                keysChunks.forEach(keysChunk => {
                    this.prepare(connection, `DELETE FROM ItemTable WHERE key IN (${new Array(keysChunk.length).fill('?').join(',')})`, stmt => stmt.run(keysChunk), () => {
                        const keys = [];
                        toDelete.forEach(key => {
                            keys.push(key);
                        });
                        return `Keys: ${keys.join(', ')}`;
                    });
                });
            }
        });
    }
    async optimize() {
        this.logger.trace(`[storage ${this.name}] vacuum()`);
        const connection = await this.whenConnected;
        return this.exec(connection, 'VACUUM');
    }
    async close(recovery) {
        this.logger.trace(`[storage ${this.name}] close()`);
        const connection = await this.whenConnected;
        return this.doClose(connection, recovery);
    }
    doClose(connection, recovery) {
        return new Promise((resolve, reject) => {
            connection.db.close(closeError => {
                if (closeError) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] close(): ${closeError}`);
                }
                // Return early if this storage was created only in-memory
                // e.g. when running tests we do not need to backup.
                if (this.path === SQLiteStorageDatabase.IN_MEMORY_PATH) {
                    return resolve();
                }
                // If the DB closed successfully and we are not running in-memory
                // and the DB did not get errors during runtime, make a backup
                // of the DB so that we can use it as fallback in case the actual
                // DB becomes corrupt in the future.
                if (!connection.isErroneous && !connection.isInMemory) {
                    return this.backup().then(resolve, error => {
                        this.logger.error(`[storage ${this.name}] backup(): ${error}`);
                        return resolve(); // ignore failing backup
                    });
                }
                // Recovery: if we detected errors while using the DB or we are using
                // an inmemory DB (as a fallback to not being able to open the DB initially)
                // and we have a recovery function provided, we recreate the DB with this
                // data to recover all known data without loss if possible.
                if (typeof recovery === 'function') {
                    // Delete the existing DB. If the path does not exist or fails to
                    // be deleted, we do not try to recover anymore because we assume
                    // that the path is no longer writeable for us.
                    return fs.promises.unlink(this.path).then(() => {
                        // Re-open the DB fresh
                        return this.doConnect(this.path).then(recoveryConnection => {
                            const closeRecoveryConnection = () => {
                                return this.doClose(recoveryConnection, undefined /* do not attempt to recover again */);
                            };
                            // Store items
                            return this.doUpdateItems(recoveryConnection, { insert: recovery() }).then(() => closeRecoveryConnection(), error => {
                                // In case of an error updating items, still ensure to close the connection
                                // to prevent SQLITE_BUSY errors when the connection is reestablished
                                closeRecoveryConnection();
                                return Promise.reject(error);
                            });
                        });
                    }).then(resolve, reject);
                }
                // Finally without recovery we just reject
                return reject(closeError || new Error('Database has errors or is in-memory without recovery option'));
            });
        });
    }
    backup() {
        const backupPath = this.toBackupPath(this.path);
        return Promises.copy(this.path, backupPath, { preserveSymlinks: false });
    }
    toBackupPath(path) {
        return `${path}.backup`;
    }
    async checkIntegrity(full) {
        this.logger.trace(`[storage ${this.name}] checkIntegrity(full: ${full})`);
        const connection = await this.whenConnected;
        const row = await this.get(connection, full ? 'PRAGMA integrity_check' : 'PRAGMA quick_check');
        const integrity = full ? row['integrity_check'] : row['quick_check'];
        if (connection.isErroneous) {
            return `${integrity} (last error: ${connection.lastError})`;
        }
        if (connection.isInMemory) {
            return `${integrity} (in-memory!)`;
        }
        return integrity;
    }
    async connect(path, retryOnBusy = true) {
        this.logger.trace(`[storage ${this.name}] open(${path}, retryOnBusy: ${retryOnBusy})`);
        try {
            return await this.doConnect(path);
        }
        catch (error) {
            this.logger.error(`[storage ${this.name}] open(): Unable to open DB due to ${error}`);
            // SQLITE_BUSY should only arise if another process is locking the same DB we want
            // to open at that time. This typically never happens because a DB connection is
            // limited per window. However, in the event of a window reload, it may be possible
            // that the previous connection was not properly closed while the new connection is
            // already established.
            //
            // In this case we simply wait for some time and retry once to establish the connection.
            //
            if (error.code === 'SQLITE_BUSY' && retryOnBusy) {
                await timeout(SQLiteStorageDatabase.BUSY_OPEN_TIMEOUT);
                return this.connect(path, false /* not another retry */);
            }
            // Otherwise, best we can do is to recover from a backup if that exists, as such we
            // move the DB to a different filename and try to load from backup. If that fails,
            // a new empty DB is being created automatically.
            //
            // The final fallback is to use an in-memory DB which should only happen if the target
            // folder is really not writeable for us.
            //
            try {
                await fs.promises.unlink(path);
                try {
                    await Promises.rename(this.toBackupPath(path), path, false /* no retry */);
                }
                catch (error) {
                    // ignore
                }
                return await this.doConnect(path);
            }
            catch (error) {
                this.logger.error(`[storage ${this.name}] open(): Unable to use backup due to ${error}`);
                // In case of any error to open the DB, use an in-memory
                // DB so that we always have a valid DB to talk to.
                return this.doConnect(SQLiteStorageDatabase.IN_MEMORY_PATH);
            }
        }
    }
    handleSQLiteError(connection, msg) {
        connection.isErroneous = true;
        connection.lastError = msg;
        this.logger.error(msg);
    }
    doConnect(path) {
        return new Promise((resolve, reject) => {
            import('@vscode/sqlite3').then(sqlite3 => {
                const ctor = (this.logger.isTracing ? sqlite3.default.verbose().Database : sqlite3.default.Database);
                const connection = {
                    db: new ctor(path, (error) => {
                        if (error) {
                            return (connection.db && error.code !== 'SQLITE_CANTOPEN' /* https://github.com/TryGhost/node-sqlite3/issues/1617 */) ? connection.db.close(() => reject(error)) : reject(error);
                        }
                        // The following exec() statement serves two purposes:
                        // - create the DB if it does not exist yet
                        // - validate that the DB is not corrupt (the open() call does not throw otherwise)
                        return this.exec(connection, [
                            'PRAGMA user_version = 1;',
                            'CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)'
                        ].join('')).then(() => {
                            return resolve(connection);
                        }, error => {
                            return connection.db.close(() => reject(error));
                        });
                    }),
                    isInMemory: path === SQLiteStorageDatabase.IN_MEMORY_PATH
                };
                // Errors
                connection.db.on('error', error => this.handleSQLiteError(connection, `[storage ${this.name}] Error (event): ${error}`));
                // Tracing
                if (this.logger.isTracing) {
                    connection.db.on('trace', sql => this.logger.trace(`[storage ${this.name}] Trace (event): ${sql}`));
                }
            }, reject);
        });
    }
    exec(connection, sql) {
        return new Promise((resolve, reject) => {
            connection.db.exec(sql, error => {
                if (error) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] exec(): ${error}`);
                    return reject(error);
                }
                return resolve();
            });
        });
    }
    get(connection, sql) {
        return new Promise((resolve, reject) => {
            connection.db.get(sql, (error, row) => {
                if (error) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] get(): ${error}`);
                    return reject(error);
                }
                return resolve(row);
            });
        });
    }
    all(connection, sql) {
        return new Promise((resolve, reject) => {
            connection.db.all(sql, (error, rows) => {
                if (error) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] all(): ${error}`);
                    return reject(error);
                }
                return resolve(rows);
            });
        });
    }
    transaction(connection, transactions) {
        return new Promise((resolve, reject) => {
            connection.db.serialize(() => {
                connection.db.run('BEGIN TRANSACTION');
                transactions();
                connection.db.run('END TRANSACTION', error => {
                    if (error) {
                        this.handleSQLiteError(connection, `[storage ${this.name}] transaction(): ${error}`);
                        return reject(error);
                    }
                    return resolve();
                });
            });
        });
    }
    prepare(connection, sql, runCallback, errorDetails) {
        const stmt = connection.db.prepare(sql);
        const statementErrorListener = (error) => {
            this.handleSQLiteError(connection, `[storage ${this.name}] prepare(): ${error} (${sql}). Details: ${errorDetails()}`);
        };
        stmt.on('error', statementErrorListener);
        runCallback(stmt);
        stmt.finalize(error => {
            if (error) {
                statementErrorListener(error);
            }
            stmt.removeListener('error', statementErrorListener);
        });
    }
}
class SQLiteStorageDatabaseLogger {
    // to reduce lots of output, require an environment variable to enable tracing
    // this helps when running with --verbose normally where the storage tracing
    // might hide useful output to look at
    static { this.VSCODE_TRACE_STORAGE = 'VSCODE_TRACE_STORAGE'; }
    constructor(options) {
        if (options && typeof options.logTrace === 'function' && process.env[SQLiteStorageDatabaseLogger.VSCODE_TRACE_STORAGE]) {
            this.logTrace = options.logTrace;
        }
        if (options && typeof options.logError === 'function') {
            this.logError = options.logError;
        }
    }
    get isTracing() {
        return !!this.logTrace;
    }
    trace(msg) {
        this.logTrace?.(msg);
    }
    error(error) {
        this.logError?.(error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3N0b3JhZ2Uvbm9kZS9zdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBcUJoRCxNQUFNLE9BQU8scUJBQXFCO2FBRWpCLG1CQUFjLEdBQUcsVUFBVSxDQUFDO0lBRTVDLElBQUksd0JBQXdCLEtBQXNDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxpRUFBaUU7YUFFaEksc0JBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUMsZ0VBQWdFO2FBQzFGLHdCQUFtQixHQUFHLEdBQUcsQ0FBQyxHQUFDLGtEQUFrRDtJQVFyRyxZQUNrQixJQUFZLEVBQzdCLFVBQXlDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRDNDLFNBQUksR0FBSixJQUFJLENBQVE7UUFHN0IsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLGFBQWEs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