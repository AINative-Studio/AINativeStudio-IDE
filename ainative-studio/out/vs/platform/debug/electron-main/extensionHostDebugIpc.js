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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RlYnVnL2VsZWN0cm9uLW1haW4vZXh0ZW5zaW9uSG9zdERlYnVnSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFFaEQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdwRSxNQUFNLE9BQU8sMENBQXFELFNBQVEsa0NBQTRDO0lBRXJILFlBQ1Msa0JBQXVDO1FBRS9DLEtBQUssRUFBRSxDQUFDO1FBRkEsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtJQUdoRCxDQUFDO0lBRVEsSUFBSSxDQUFDLEdBQWEsRUFBRSxPQUFlLEVBQUUsR0FBUztRQUN0RCxJQUFJLE9BQU8sS0FBSyxvQ0FBb0MsRUFBRSxDQUFDO1lBQ3RELE9BQU8sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGtDQUFrQyxDQUFDLElBQWMsRUFBRSxhQUFzQjtRQUN0RixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBRXBDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQztRQUNuRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUMzQixDQUFDO1FBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGtDQUFrQyxDQUFDLFdBQVcsRUFBRTtZQUNsRyxPQUFPLHlCQUFpQjtZQUN4QixHQUFHLEVBQUUsS0FBSztZQUNWLFlBQVksRUFBRSxLQUFLLENBQUMsT0FBTztZQUMzQixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDO1NBQ3ZDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzFCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1FBRXZDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3RDLElBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoQixDQUFDO1lBRUQsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQ25CLE1BQU0sWUFBWSxHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLG1EQUFtRDtvQkFDakUsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsaUNBQWlDO2dCQUNsRixDQUFDO1lBQ0YsQ0FBQyxDQUFDO1lBRUYsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFzQixFQUFFLE1BQWMsRUFBRSxNQUFlLEVBQUUsU0FBa0IsRUFBRSxFQUFFLENBQ2pHLFlBQVksQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFL0MsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNwQixLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNmLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDZixDQUFDLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRXhDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsUUFBUSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLEtBQUssSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkYsSUFBSSxJQUFtRCxDQUFDO29CQUN4RCxJQUFJLENBQUM7d0JBQ0osTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUMxRCxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQy9CLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM3QixDQUFDO29CQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDNUMsQ0FBQztvQkFFRCxxRUFBcUU7b0JBQ3JFLGFBQWE7b0JBQ2IsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQzt5QkFDekQsSUFBSSxDQUFDLENBQUMsTUFBYyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO3lCQUMxRixLQUFLLENBQUMsQ0FBQyxLQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDakksQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDMUMsQ0FBQyxDQUFDLENBQUM7WUFFSCxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ3pCLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLFNBQVMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdkIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXRDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRyxNQUFNLENBQUMsT0FBTyxFQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDckYsQ0FBQztDQUNEIn0=