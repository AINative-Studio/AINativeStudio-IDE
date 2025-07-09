/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import { ExtHostNotebookEditor } from './extHostNotebookEditor.js';
export class ExtHostNotebookRenderers {
    constructor(mainContext, _extHostNotebook) {
        this._extHostNotebook = _extHostNotebook;
        this._rendererMessageEmitters = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadNotebookRenderers);
    }
    $postRendererMessage(editorId, rendererId, message) {
        const editor = this._extHostNotebook.getEditorById(editorId);
        this._rendererMessageEmitters.get(rendererId)?.fire({ editor: editor.apiEditor, message });
    }
    createRendererMessaging(manifest, rendererId) {
        if (!manifest.contributes?.notebookRenderer?.some(r => r.id === rendererId)) {
            throw new Error(`Extensions may only call createRendererMessaging() for renderers they contribute (got ${rendererId})`);
        }
        const messaging = {
            onDidReceiveMessage: (listener, thisArg, disposables) => {
                return this.getOrCreateEmitterFor(rendererId).event(listener, thisArg, disposables);
            },
            postMessage: (message, editorOrAlias) => {
                if (ExtHostNotebookEditor.apiEditorsToExtHost.has(message)) { // back compat for swapped args
                    [message, editorOrAlias] = [editorOrAlias, message];
                }
                const extHostEditor = editorOrAlias && ExtHostNotebookEditor.apiEditorsToExtHost.get(editorOrAlias);
                return this.proxy.$postMessage(extHostEditor?.id, rendererId, message);
            },
        };
        return messaging;
    }
    getOrCreateEmitterFor(rendererId) {
        let emitter = this._rendererMessageEmitters.get(rendererId);
        if (emitter) {
            return emitter;
        }
        emitter = new Emitter({
            onDidRemoveLastListener: () => {
                emitter?.dispose();
                this._rendererMessageEmitters.delete(rendererId);
            }
        });
        this._rendererMessageEmitters.set(rendererId, emitter);
        return emitter;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rUmVuZGVyZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va1JlbmRlcmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsT0FBTyxFQUErQyxXQUFXLEVBQW9DLE1BQU0sdUJBQXVCLENBQUM7QUFFbkksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFJbkUsTUFBTSxPQUFPLHdCQUF3QjtJQUlwQyxZQUFZLFdBQXlCLEVBQW1CLGdCQUEyQztRQUEzQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTJCO1FBSGxGLDZCQUF3QixHQUFHLElBQUksR0FBRyxFQUFxRixDQUFDO1FBSXhJLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRU0sb0JBQW9CLENBQUMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLE9BQWdCO1FBQ2pGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFTSx1QkFBdUIsQ0FBQyxRQUErQixFQUFFLFVBQWtCO1FBQ2pGLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM3RSxNQUFNLElBQUksS0FBSyxDQUFDLHlGQUF5RixVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3pILENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBcUM7WUFDbkQsbUJBQW1CLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUN2RCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNyRixDQUFDO1lBQ0QsV0FBVyxFQUFFLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxFQUFFO2dCQUN2QyxJQUFJLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCO29CQUM1RixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDckQsQ0FBQztnQkFFRCxNQUFNLGFBQWEsR0FBRyxhQUFhLElBQUkscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNwRyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3hFLENBQUM7U0FDRCxDQUFDO1FBRUYsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLHFCQUFxQixDQUFDLFVBQWtCO1FBQy9DLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7WUFDckIsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO2dCQUM3QixPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbEQsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXZELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7Q0FDRCJ9