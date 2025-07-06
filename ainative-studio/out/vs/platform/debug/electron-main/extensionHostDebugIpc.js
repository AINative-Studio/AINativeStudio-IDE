/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createServer } from 'net';
import { ExtensionHostDebugBroadcastChannel } from '../common/extensionHostDebugIpc.js';
import { OPTIONS, parseArgs } from '../../environment/node/argv.js';
export class ElectronExtensionHostDebugBroadcastChannel extends ExtensionHostDebugBroadcastChannel {
    constructor(windowsMainService) {
        super();
        this.windowsMainService = windowsMainService;
    }
    call(ctx, command, arg) {
        if (command === 'openExtensionDevelopmentHostWindow') {
            return this.openExtensionDevelopmentHostWindow(arg[0], arg[1]);
        }
        else {
            return super.call(ctx, command, arg);
        }
    }
    async openExtensionDevelopmentHostWindow(args, debugRenderer) {
        const pargs = parseArgs(args, OPTIONS);
        pargs.debugRenderer = debugRenderer;
        const extDevPaths = pargs.extensionDevelopmentPath;
        if (!extDevPaths) {
            return { success: false };
        }
        const [codeWindow] = await this.windowsMainService.openExtensionDevelopmentHostWindow(extDevPaths, {
            context: 5 /* OpenContext.API */,
            cli: pargs,
            forceProfile: pargs.profile,
            forceTempProfile: pargs['profile-temp']
        });
        if (!debugRenderer) {
            return { success: true };
        }
        const win = codeWindow.win;
        if (!win) {
            return { success: true };
        }
        const debug = win.webContents.debugger;
        let listeners = debug.isAttached() ? Infinity : 0;
        const server = createServer(listener => {
            if (listeners++ === 0) {
                debug.attach();
            }
            let closed = false;
            const writeMessage = (message) => {
                if (!closed) { // in case sendCommand promises settle after closed
                    listener.write(JSON.stringify(message) + '\0'); // null-delimited, CDP-compatible
                }
            };
            const onMessage = (_event, method, params, sessionId) => writeMessage(({ method, params, sessionId }));
            win.on('close', () => {
                debug.removeListener('message', onMessage);
                listener.end();
                closed = true;
            });
            debug.addListener('message', onMessage);
            let buf = Buffer.alloc(0);
            listener.on('data', data => {
                buf = Buffer.concat([buf, data]);
                for (let delimiter = buf.indexOf(0); delimiter !== -1; delimiter = buf.indexOf(0)) {
                    let data;
                    try {
                        const contents = buf.slice(0, delimiter).toString('utf8');
                        buf = buf.slice(delimiter + 1);
                        data = JSON.parse(contents);
                    }
                    catch (e) {
                        console.error('error reading cdp line', e);
                    }
                    // depends on a new API for which electron.d.ts has not been updated:
                    // @ts-ignore
                    debug.sendCommand(data.method, data.params, data.sessionId)
                        .then((result) => writeMessage({ id: data.id, sessionId: data.sessionId, result }))
                        .catch((error) => writeMessage({ id: data.id, sessionId: data.sessionId, error: { code: 0, message: error.message } }));
                }
            });
            listener.on('error', err => {
                console.error('error on cdp pipe:', err);
            });
            listener.on('close', () => {
                closed = true;
                if (--listeners === 0) {
                    debug.detach();
                }
            });
        });
        await new Promise(r => server.listen(0, r));
        win.on('close', () => server.close());
        return { rendererDebugPort: server.address().port, success: true };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGVidWcvZWxlY3Ryb24tbWFpbi9leHRlbnNpb25Ib3N0RGVidWdJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLEtBQUssQ0FBQztBQUVoRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3BFLE1BQU0sT0FBTywwQ0FBcUQsU0FBUSxrQ0FBNEM7SUFFckgsWUFDUyxrQkFBdUM7UUFFL0MsS0FBSyxFQUFFLENBQUM7UUFGQSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO0lBR2hELENBQUM7SUFFUSxJQUFJLENBQUMsR0FBYSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQ3RELElBQUksT0FBTyxLQUFLLG9DQUFvQyxFQUFFLENBQUM7WUFDdEQsT0FBTyxJQUFJLENBQUMsa0NBQWtDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0NBQWtDLENBQUMsSUFBYyxFQUFFLGFBQXNCO1FBQ3RGLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdkMsS0FBSyxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFF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