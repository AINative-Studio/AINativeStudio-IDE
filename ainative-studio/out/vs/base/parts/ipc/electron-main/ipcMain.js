/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import electron from 'electron';
import { onUnexpectedError } from '../../../common/errors.js';
import { VSCODE_AUTHORITY } from '../../../common/network.js';
class ValidatedIpcMain {
    constructor() {
        // We need to keep a map of original listener to the wrapped variant in order
        // to properly implement `removeListener`. We use a `WeakMap` because we do
        // not want to prevent the `key` of the map to get garbage collected.
        this.mapListenerToWrapper = new WeakMap();
    }
    /**
     * Listens to `channel`, when a new message arrives `listener` would be called with
     * `listener(event, args...)`.
     */
    on(channel, listener) {
        // Remember the wrapped listener so that later we can
        // properly implement `removeListener`.
        const wrappedListener = (event, ...args) => {
            if (this.validateEvent(channel, event)) {
                listener(event, ...args);
            }
        };
        this.mapListenerToWrapper.set(listener, wrappedListener);
        electron.ipcMain.on(channel, wrappedListener);
        return this;
    }
    /**
     * Adds a one time `listener` function for the event. This `listener` is invoked
     * only the next time a message is sent to `channel`, after which it is removed.
     */
    once(channel, listener) {
        electron.ipcMain.once(channel, (event, ...args) => {
            if (this.validateEvent(channel, event)) {
                listener(event, ...args);
            }
        });
        return this;
    }
    /**
     * Adds a handler for an `invoke`able IPC. This handler will be called whenever a
     * renderer calls `ipcRenderer.invoke(channel, ...args)`.
     *
     * If `listener` returns a Promise, the eventual result of the promise will be
     * returned as a reply to the remote caller. Otherwise, the return value of the
     * listener will be used as the value of the reply.
     *
     * The `event` that is passed as the first argument to the handler is the same as
     * that passed to a regular event listener. It includes information about which
     * WebContents is the source of the invoke request.
     *
     * Errors thrown through `handle` in the main process are not transparent as they
     * are serialized and only the `message` property from the original error is
     * provided to the renderer process. Please refer to #24427 for details.
     */
    handle(channel, listener) {
        electron.ipcMain.handle(channel, (event, ...args) => {
            if (this.validateEvent(channel, event)) {
                return listener(event, ...args);
            }
            return Promise.reject(`Invalid channel '${channel}' or sender for ipcMain.handle() usage.`);
        });
        return this;
    }
    /**
     * Removes any handler for `channel`, if present.
     */
    removeHandler(channel) {
        electron.ipcMain.removeHandler(channel);
        return this;
    }
    /**
     * Removes the specified `listener` from the listener array for the specified
     * `channel`.
     */
    removeListener(channel, listener) {
        const wrappedListener = this.mapListenerToWrapper.get(listener);
        if (wrappedListener) {
            electron.ipcMain.removeListener(channel, wrappedListener);
            this.mapListenerToWrapper.delete(listener);
        }
        return this;
    }
    validateEvent(channel, event) {
        if (!channel || !channel.startsWith('vscode:')) {
            onUnexpectedError(`Refused to handle ipcMain event for channel '${channel}' because the channel is unknown.`);
            return false; // unexpected channel
        }
        const sender = event.senderFrame;
        const url = sender?.url;
        // `url` can be `undefined` when running tests from playwright https://github.com/microsoft/vscode/issues/147301
        // and `url` can be `about:blank` when reloading the window
        // from performance tab of devtools https://github.com/electron/electron/issues/39427.
        // It is fine to skip the checks in these cases.
        if (!url || url === 'about:blank') {
            return true;
        }
        let host = 'unknown';
        try {
            host = new URL(url).host;
        }
        catch (error) {
            onUnexpectedError(`Refused to handle ipcMain event for channel '${channel}' because of a malformed URL '${url}'.`);
            return false; // unexpected URL
        }
        if (host !== VSCODE_AUTHORITY) {
            onUnexpectedError(`Refused to handle ipcMain event for channel '${channel}' because of a bad origin of '${host}'.`);
            return false; // unexpected sender
        }
        if (sender?.parent !== null) {
            onUnexpectedError(`Refused to handle ipcMain event for channel '${channel}' because sender of origin '${host}' is not a main frame.`);
            return false; // unexpected frame
        }
        return true;
    }
}
/**
 * A drop-in replacement of `ipcMain` that validates the sender of a message
 * according to https://github.com/electron/electron/blob/main/docs/tutorial/security.md
 *
 * @deprecated direct use of Electron IPC is not encouraged. We have utilities in place
 * to create services on top of IPC, see `ProxyChannel` for more information.
 */
export const validatedIpcMain = new ValidatedIpcMain();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjTWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9lbGVjdHJvbi1tYWluL2lwY01haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSTlELE1BQU0sZ0JBQWdCO0lBQXRCO1FBRUMsNkVBQTZFO1FBQzdFLDJFQUEyRTtRQUMzRSxxRUFBcUU7UUFDcEQseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQW9DLENBQUM7SUE2SHpGLENBQUM7SUEzSEE7OztPQUdHO0lBQ0gsRUFBRSxDQUFDLE9BQWUsRUFBRSxRQUF5QjtRQUU1QyxxREFBcUQ7UUFDckQsdUNBQXVDO1FBQ3ZDLE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBNEIsRUFBRSxHQUFHLElBQVcsRUFBRSxFQUFFO1lBQ3hFLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUV6RCxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFOUMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBSSxDQUFDLE9BQWUsRUFBRSxRQUF5QjtR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