"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
(function () {
    const { ipcRenderer, webFrame, contextBridge, webUtils } = require('electron');
    //#region Utilities
    function validateIPC(channel) {
        if (!channel || !channel.startsWith('vscode:')) {
            throw new Error(`Unsupported event IPC channel '${channel}'`);
        }
        return true;
    }
    function parseArgv(key) {
        for (const arg of process.argv) {
            if (arg.indexOf(`--${key}=`) === 0) {
                return arg.split('=')[1];
            }
        }
        return undefined;
    }
    //#endregion
    //#region Resolve Configuration
    let configuration = undefined;
    const resolveConfiguration = (async () => {
        const windowConfigIpcChannel = parseArgv('vscode-window-config');
        if (!windowConfigIpcChannel) {
            throw new Error('Preload: did not find expected vscode-window-config in renderer process arguments list.');
        }
        try {
            validateIPC(windowConfigIpcChannel);
            // Resolve configuration from electron-main
            const resolvedConfiguration = configuration = await ipcRenderer.invoke(windowConfigIpcChannel);
            // Apply `userEnv` directly
            Object.assign(process.env, resolvedConfiguration.userEnv);
            // Apply zoom level early before even building the
            // window DOM elements to avoid UI flicker. We always
            // have to set the zoom level from within the window
            // because Chrome has it's own way of remembering zoom
            // settings per origin (if vscode-file:// is used) and
            // we want to ensure that the user configuration wins.
            webFrame.setZoomLevel(resolvedConfiguration.zoomLevel ?? 0);
            return resolvedConfiguration;
        }
        catch (error) {
            throw new Error(`Preload: unable to fetch vscode-window-config: ${error}`);
        }
    })();
    //#endregion
    //#region Resolve Shell Environment
    /**
     * If VSCode is not run from a terminal, we should resolve additional
     * shell specific environment from the OS shell to ensure we are seeing
     * all development related environment variables. We do this from the
     * main process because it may involve spawning a shell.
     */
    const resolveShellEnv = (async () => {
        // Resolve `userEnv` from configuration and
        // `shellEnv` from the main side
        const [userEnv, shellEnv] = await Promise.all([
            (async () => (await resolveConfiguration).userEnv)(),
            ipcRenderer.invoke('vscode:fetchShellEnv')
        ]);
        return { ...process.env, ...shellEnv, ...userEnv };
    })();
    //#endregion
    //#region Globals Definition
    // #######################################################################
    // ###                                                                 ###
    // ###       !!! DO NOT USE GET/SET PROPERTIES ANYWHERE HERE !!!       ###
    // ###       !!!  UNLESS THE ACCESS IS WITHOUT SIDE EFFECTS  !!!       ###
    // ###       (https://github.com/electron/electron/issues/25516)       ###
    // ###                                                                 ###
    // #######################################################################
    const globals = {
        /**
         * A minimal set of methods exposed from Electron's `ipcRenderer`
         * to support communication to main process.
         */
        ipcRenderer: {
            send(channel, ...args) {
                if (validateIPC(channel)) {
                    ipcRenderer.send(channel, ...args);
                }
            },
            invoke(channel, ...args) {
                validateIPC(channel);
                return ipcRenderer.invoke(channel, ...args);
            },
            on(channel, listener) {
                validateIPC(channel);
                ipcRenderer.on(channel, listener);
                return this;
            },
            once(channel, listener) {
                validateIPC(channel);
                ipcRenderer.once(channel, listener);
                return this;
            },
            removeListener(channel, listener) {
                validateIPC(channel);
                ipcRenderer.removeListener(channel, listener);
                return this;
            }
        },
        ipcMessagePort: {
            acquire(responseChannel, nonce) {
                if (validateIPC(responseChannel)) {
                    const responseListener = (e, responseNonce) => {
                        // validate that the nonce from the response is the same
                        // as when requested. and if so, use `postMessage` to
                        // send the `MessagePort` safely over, even when context
                        // isolation is enabled
                        if (nonce === responseNonce) {
                            ipcRenderer.off(responseChannel, responseListener);
                            window.postMessage(nonce, '*', e.ports);
                        }
                    };
                    // handle reply from main
                    ipcRenderer.on(responseChannel, responseListener);
                }
            }
        },
        /**
         * Support for subset of methods of Electron's `webFrame` type.
         */
        webFrame: {
            setZoomLevel(level) {
                if (typeof level === 'number') {
                    webFrame.setZoomLevel(level);
                }
            }
        },
        /**
         * Support for subset of Electron's `webUtils` type.
         */
        webUtils: {
            getPathForFile(file) {
                return webUtils.getPathForFile(file);
            }
        },
        /**
         * Support for a subset of access to node.js global `process`.
         *
         * Note: when `sandbox` is enabled, the only properties available
         * are https://github.com/electron/electron/blob/master/docs/api/process.md#sandbox
         */
        process: {
            get platform() { return process.platform; },
            get arch() { return process.arch; },
            get env() { return { ...process.env }; },
            get versions() { return process.versions; },
            get type() { return 'renderer'; },
            get execPath() { return process.execPath; },
            cwd() {
                return process.env['VSCODE_CWD'] || process.execPath.substr(0, process.execPath.lastIndexOf(process.platform === 'win32' ? '\\' : '/'));
            },
            shellEnv() {
                return resolveShellEnv;
            },
            getProcessMemoryInfo() {
                return process.getProcessMemoryInfo();
            },
            on(type, callback) {
                process.on(type, callback);
            }
        },
        /**
         * Some information about the context we are running in.
         */
        context: {
            /**
             * A configuration object made accessible from the main side
             * to configure the sandbox browser window.
             *
             * Note: intentionally not using a getter here because the
             * actual value will be set after `resolveConfiguration`
             * has finished.
             */
            configuration() {
                return configuration;
            },
            /**
             * Allows to await the resolution of the configuration object.
             */
            async resolveConfiguration() {
                return resolveConfiguration;
            }
        }
    };
    // Use `contextBridge` APIs to expose globals to VSCode
    // only if context isolation is enabled, otherwise just
    // add to the DOM global.
    if (process.contextIsolated) {
        try {
            contextBridge.exposeInMainWorld('vscode', globals);
        }
        catch (error) {
            console.error(error);
        }
    }
    else {
        window.vscode = globals;
    }
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3NhbmRib3gvZWxlY3Ryb24tc2FuZGJveC9wcmVsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRztBQUVoRywwQ0FBMEM7QUFFMUMsQ0FBQztJQUVBLE1BQU0sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFJL0UsbUJBQW1CO0lBRW5CLFNBQVMsV0FBVyxDQUFDLE9BQWU7UUFDbkMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxHQUFXO1FBQzdCLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxZQUFZO0lBRVosK0JBQStCO0lBRS9CLElBQUksYUFBYSxHQUFzQyxTQUFTLENBQUM7SUFFakUsTUFBTSxvQkFBb0IsR0FBbUMsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUN4RSxNQUFNLHNC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