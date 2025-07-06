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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLndvcmtlci5zdGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9lZGl0b3Iud29ya2VyLnN0YXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFrQixNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXpFOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUErQyxNQUFlO0lBQ2xGLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLEVBQUUsRUFBRTtRQUMxQixHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRO1lBQ3pCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbEMsQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFO2dCQUN6QixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUMsQ0FBQyxDQUFDO1FBQ0gsQ0FBQztLQUNELENBQUMsQ0FBQztJQUVILE9BQU87UUFDTixJQUFJLEVBQUUsSUFBYTtRQUNuQixlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQ3JCLE9BQU8sZUFBZSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNuRCxDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUMifQ==