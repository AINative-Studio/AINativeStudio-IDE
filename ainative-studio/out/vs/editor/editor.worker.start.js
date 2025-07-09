/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { initialize } from '../base/common/worker/webWorkerBootstrap.js';
import { EditorWorker } from './common/services/editorWebWorker.js';
import { EditorWorkerHost } from './common/services/editorWorkerHost.js';
/**
 * Used by `monaco-editor` to hook up web worker rpc.
 * @skipMangle
 * @internal
 */
export function start(client) {
    const webWorkerServer = initialize(() => new EditorWorker(client));
    const editorWorkerHost = EditorWorkerHost.getChannel(webWorkerServer);
    const host = new Proxy({}, {
        get(target, prop, receiver) {
            if (typeof prop !== 'string') {
                throw new Error(`Not supported`);
            }
            return (...args) => {
                return editorWorkerHost.$fhr(prop, args);
            };
        }
    });
    return {
        host: host,
        getMirrorModels: () => {
            return webWorkerServer.requestHandler.getModels();
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLndvcmtlci5zdGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvZWRpdG9yLndvcmtlci5zdGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBa0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV6RTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBK0MsTUFBZTtJQUNsRixNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNuRSxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN0RSxNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUU7UUFDMUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUTtZQUN6QixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2xDLENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtnQkFDekIsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLENBQUMsQ0FBQztRQUNILENBQUM7S0FDRCxDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ04sSUFBSSxFQUFFLElBQWE7UUFDbkIsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUNyQixPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbkQsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDIn0=