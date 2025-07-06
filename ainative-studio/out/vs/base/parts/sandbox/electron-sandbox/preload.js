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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9zYW5kYm94L2VsZWN0cm9uLXNhbmRib3gvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsMENBQTBDO0FBRTFDLENBQUM7SUFFQSxNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBSS9FLG1CQUFtQjtJQUVuQixTQUFTLFdBQVcsQ0FBQyxPQUFlO1FBQ25DLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsR0FBVztRQUM3QixLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsWUFBWTtJQUVaLCtCQUErQjtJQUUvQixJQUFJLGFBQWEsR0FBc0MsU0FBUyxDQUFDO0lBRWpFLE1BQU0sb0JBQW9CLEdBQW1DLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDeEUsTUFB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