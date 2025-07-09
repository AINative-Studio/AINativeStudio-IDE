/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export class ExtensionHostDebugBroadcastChannel {
    constructor() {
        this._onCloseEmitter = new Emitter();
        this._onReloadEmitter = new Emitter();
        this._onTerminateEmitter = new Emitter();
        this._onAttachEmitter = new Emitter();
    }
    static { this.ChannelName = 'extensionhostdebugservice'; }
    call(ctx, command, arg) {
        switch (command) {
            case 'close':
                return Promise.resolve(this._onCloseEmitter.fire({ sessionId: arg[0] }));
            case 'reload':
                return Promise.resolve(this._onReloadEmitter.fire({ sessionId: arg[0] }));
            case 'terminate':
                return Promise.resolve(this._onTerminateEmitter.fire({ sessionId: arg[0] }));
            case 'attach':
                return Promise.resolve(this._onAttachEmitter.fire({ sessionId: arg[0], port: arg[1], subId: arg[2] }));
        }
        throw new Error('Method not implemented.');
    }
    listen(ctx, event, arg) {
        switch (event) {
            case 'close':
                return this._onCloseEmitter.event;
            case 'reload':
                return this._onReloadEmitter.event;
            case 'terminate':
                return this._onTerminateEmitter.event;
            case 'attach':
                return this._onAttachEmitter.event;
        }
        throw new Error('Method not implemented.');
    }
}
export class ExtensionHostDebugChannelClient extends Disposable {
    constructor(channel) {
        super();
        this.channel = channel;
    }
    reload(sessionId) {
        this.channel.call('reload', [sessionId]);
    }
    get onReload() {
        return this.channel.listen('reload');
    }
    close(sessionId) {
        this.channel.call('close', [sessionId]);
    }
    get onClose() {
        return this.channel.listen('close');
    }
    attachSession(sessionId, port, subId) {
        this.channel.call('attach', [sessionId, port, subId]);
    }
    get onAttachSession() {
        return this.channel.listen('attach');
    }
    terminateSession(sessionId, subId) {
        this.channel.call('terminate', [sessionId, subId]);
    }
    get onTerminateSession() {
        return this.channel.listen('terminate');
    }
    openExtensionDevelopmentHostWindow(args, debugRenderer) {
        return this.channel.call('openExtensionDevelopmentHostWindow', [args, debugRenderer]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RlYnVnL2NvbW1vbi9leHRlbnNpb25Ib3N0RGVidWdJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUkvRCxNQUFNLE9BQU8sa0NBQWtDO0lBQS9DO1FBSWtCLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXNCLENBQUM7UUFDcEQscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQXVCLENBQUM7UUFDdEQsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUM7UUFDNUQscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQXVCLENBQUM7SUE2QnhFLENBQUM7YUFsQ2dCLGdCQUFXLEdBQUcsMkJBQTJCLEFBQTlCLENBQStCO0lBTzFELElBQUksQ0FBQyxHQUFhLEVBQUUsT0FBZSxFQUFFLEdBQVM7UUFDN0MsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRSxLQUFLLFFBQVE7Z0JBQ1osT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNFLEtBQUssV0FBVztnQkFD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