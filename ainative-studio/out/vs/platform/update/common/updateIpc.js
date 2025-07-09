/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { State } from './update.js';
export class UpdateChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        switch (event) {
            case 'onStateChange': return this.service.onStateChange;
        }
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, arg) {
        switch (command) {
            case 'checkForUpdates': return this.service.checkForUpdates(arg);
            case 'downloadUpdate': return this.service.downloadUpdate();
            case 'applyUpdate': return this.service.applyUpdate();
            case 'quitAndInstall': return this.service.quitAndInstall();
            case '_getInitialState': return Promise.resolve(this.service.state);
            case 'isLatestVersion': return this.service.isLatestVersion();
            case '_applySpecificUpdate': return this.service._applySpecificUpdate(arg);
        }
        throw new Error(`Call not found: ${command}`);
    }
}
export class UpdateChannelClient {
    get state() { return this._state; }
    set state(state) {
        this._state = state;
        this._onStateChange.fire(state);
    }
    constructor(channel) {
        this.channel = channel;
        this.disposables = new DisposableStore();
        this._onStateChange = new Emitter();
        this.onStateChange = this._onStateChange.event;
        this._state = State.Uninitialized;
        this.disposables.add(this.channel.listen('onStateChange')(state => this.state = state));
        this.channel.call('_getInitialState').then(state => this.state = state);
    }
    checkForUpdates(explicit) {
        return this.channel.call('checkForUpdates', explicit);
    }
    downloadUpdate() {
        return this.channel.call('downloadUpdate');
    }
    applyUpdate() {
        return this.channel.call('applyUpdate');
    }
    quitAndInstall() {
        return this.channel.call('quitAndInstall');
    }
    isLatestVersion() {
        return this.channel.call('isLatestVersion');
    }
    _applySpecificUpdate(packagePath) {
        return this.channel.call('_applySpecificUpdate', packagePath);
    }
    dispose() {
        this.disposables.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS9jb21tb24vdXBkYXRlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsT0FBTyxFQUFrQixLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFcEQsTUFBTSxPQUFPLGFBQWE7SUFFekIsWUFBb0IsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFBSSxDQUFDO0lBRWhELE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYTtRQUMvQixRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxlQUFlLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQ3pELENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBVSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQzFDLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakUsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM1RCxLQUFLLGFBQWEsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0RCxLQUFLLGdCQUFnQixDQUFD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