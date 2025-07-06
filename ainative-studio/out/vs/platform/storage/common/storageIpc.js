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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvY29tbW9uL3N0b3JhZ2VJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUEwQy9ELE1BQWUseUJBQTBCLFNBQVEsVUFBVTtJQUkxRCxZQUNXLE9BQWlCLEVBQ2pCLE9BQTZDLEVBQzdDLFNBQThDO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBSkUsWUFBTyxHQUFQLE9BQU8sQ0FBVTtRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFzQztRQUM3QyxjQUFTLEdBQVQsU0FBUyxDQUFxQztJQUd6RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDYixNQUFNLG1CQUFtQixHQUFvQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEgsTUFBTSxLQUFLLEdBQVcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUUvRSxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBdUI7UUFDbEMsTUFBTSxtQkFBbUIsR0FBK0IsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRTdHLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLG1CQUFtQixDQUFD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