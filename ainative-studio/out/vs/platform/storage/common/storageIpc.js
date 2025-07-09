/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
class BaseStorageDatabaseClient extends Disposable {
    constructor(channel, profile, workspace) {
        super();
        this.channel = channel;
        this.profile = profile;
        this.workspace = workspace;
    }
    async getItems() {
        const serializableRequest = { profile: this.profile, workspace: this.workspace };
        const items = await this.channel.call('getItems', serializableRequest);
        return new Map(items);
    }
    updateItems(request) {
        const serializableRequest = { profile: this.profile, workspace: this.workspace };
        if (request.insert) {
            serializableRequest.insert = Array.from(request.insert.entries());
        }
        if (request.delete) {
            serializableRequest.delete = Array.from(request.delete.values());
        }
        return this.channel.call('updateItems', serializableRequest);
    }
    optimize() {
        const serializableRequest = { profile: this.profile, workspace: this.workspace };
        return this.channel.call('optimize', serializableRequest);
    }
}
class BaseProfileAwareStorageDatabaseClient extends BaseStorageDatabaseClient {
    constructor(channel, profile) {
        super(channel, profile, undefined);
        this._onDidChangeItemsExternal = this._register(new Emitter());
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.channel.listen('onDidChangeStorage', { profile: this.profile })((e) => this.onDidChangeStorage(e)));
    }
    onDidChangeStorage(e) {
        if (Array.isArray(e.changed) || Array.isArray(e.deleted)) {
            this._onDidChangeItemsExternal.fire({
                changed: e.changed ? new Map(e.changed) : undefined,
                deleted: e.deleted ? new Set(e.deleted) : undefined
            });
        }
    }
}
export class ApplicationStorageDatabaseClient extends BaseProfileAwareStorageDatabaseClient {
    constructor(channel) {
        super(channel, undefined);
    }
    async close() {
        // The application storage database is shared across all instances so
        // we do not close it from the window. However we dispose the
        // listener for external changes because we no longer interested in it.
        this.dispose();
    }
}
export class ProfileStorageDatabaseClient extends BaseProfileAwareStorageDatabaseClient {
    constructor(channel, profile) {
        super(channel, profile);
    }
    async close() {
        // The profile storage database is shared across all instances of
        // the same profile so we do not close it from the window.
        // However we dispose the listener for external changes because
        // we no longer interested in it.
        this.dispose();
    }
}
export class WorkspaceStorageDatabaseClient extends BaseStorageDatabaseClient {
    constructor(channel, workspace) {
        super(channel, undefined, workspace);
        this.onDidChangeItemsExternal = Event.None; // unsupported for workspace storage because we only ever write from one window
    }
    async close() {
        // The workspace storage database is only used in this instance
        // but we do not need to close it from here, the main process
        // can take care of that.
        this.dispose();
    }
}
export class StorageClient {
    constructor(channel) {
        this.channel = channel;
    }
    isUsed(path) {
        const serializableRequest = { payload: path, profile: undefined, workspace: undefined };
        return this.channel.call('isUsed', serializableRequest);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL2NvbW1vbi9zdG9yYWdlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBMEMvRCxNQUFlLHlCQUEwQixTQUFRLFVBQVU7SUFJMUQsWUFDVyxPQUFpQixFQUNqQixPQUE2QyxFQUM3QyxTQUE4QztRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUpFLFlBQU8sR0FBUCxPQUFPLENBQVU7UUFDakIsWUFBTyxHQUFQLE9BQU8sQ0FBc0M7UUFDN0MsY0FBUyxHQUFULFNBQVMsQ0FBcUM7SUFHekQsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRO1FBQ2IsTUFBTSxtQkFBbUIsR0FBb0MsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2xILE1BQU0sS0FBSyxHQUFXLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFL0UsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRUQsV0FBVyxDQUFDLE9BQXVCO1FBQ2xDLE1BQU0sbUJBQW1CLEdBQStCLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUU3RyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixtQkFBbUIsQ0FB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