/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class TestSecretStorageService {
    constructor() {
        this._storage = new Map();
        this._onDidChangeSecretEmitter = new Emitter();
        this.onDidChangeSecret = this._onDidChangeSecretEmitter.event;
        this.type = 'in-memory';
    }
    async get(key) {
        return this._storage.get(key);
    }
    async set(key, value) {
        this._storage.set(key, value);
        this._onDidChangeSecretEmitter.fire(key);
    }
    async delete(key) {
        this._storage.delete(key);
        this._onDidChangeSecretEmitter.fire(key);
    }
    // Helper method for tests to clear all secrets
    clear() {
        this._storage.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlY3JldFN0b3JhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NlY3JldHMvdGVzdC9jb21tb24vdGVzdFNlY3JldFN0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUczRCxNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBR2tCLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUNyQyw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFDO1FBQzFELHNCQUFpQixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFFbEUsU0FBSSxHQUFHLFdBQW9CLENBQUM7SUFvQjdCLENBQUM7SUFsQkEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFXO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBVztRQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCwrQ0FBK0M7SUFDL0MsS0FBSztRQUNKLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdkIsQ0FBQztDQUNEIn0=