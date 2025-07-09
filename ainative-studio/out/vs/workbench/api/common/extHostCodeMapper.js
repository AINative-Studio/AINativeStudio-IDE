/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extHostProtocol from './extHost.protocol.js';
import { NotebookEdit, TextEdit } from './extHostTypeConverters.js';
import { URI } from '../../../base/common/uri.js';
import { asArray } from '../../../base/common/arrays.js';
export class ExtHostCodeMapper {
    static { this._providerHandlePool = 0; }
    constructor(mainContext) {
        this.providers = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadCodeMapper);
    }
    async $mapCode(handle, internalRequest, token) {
        // Received request to map code from the main thread
        const provider = this.providers.get(handle);
        if (!provider) {
            throw new Error(`Received request to map code for unknown provider handle ${handle}`);
        }
        // Construct a response object to pass to the provider
        const stream = {
            textEdit: (target, edits) => {
                edits = asArray(edits);
                this._proxy.$handleProgress(internalRequest.requestId, {
                    uri: target,
                    edits: edits.map(TextEdit.from)
                });
            },
            notebookEdit: (target, edits) => {
                edits = asArray(edits);
                this._proxy.$handleProgress(internalRequest.requestId, {
                    uri: target,
                    edits: edits.map(NotebookEdit.from)
                });
            }
        };
        const request = {
            location: internalRequest.location,
            chatRequestId: internalRequest.chatRequestId,
            codeBlocks: internalRequest.codeBlocks.map(block => {
                return {
                    code: block.code,
                    resource: URI.revive(block.resource),
                    markdownBeforeBlock: block.markdownBeforeBlock
                };
            })
        };
        const result = await provider.provideMappedEdits(request, stream, token);
        return result ?? null;
    }
    registerMappedEditsProvider(extension, provider) {
        const handle = ExtHostCodeMapper._providerHandlePool++;
        this._proxy.$registerCodeMapperProvider(handle, extension.displayName ?? extension.name);
        this.providers.set(handle, provider);
        return {
            dispose: () => {
                return this._proxy.$unregisterCodeMapperProvider(handle);
            }
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvZGVNYXBwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENvZGVNYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFekQsTUFBTSxPQUFPLGlCQUFpQjthQUVkLHdCQUFtQixHQUFXLENBQUMsQUFBWixDQUFhO0lBSS9DLFlBQ0MsV0FBeUM7UUFIekIsY0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFDO1FBSzNFLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBYyxFQUFFLGVBQXNELEVBQUUsS0FBd0I7UUFDOUcsb0RBQW9EO1FBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxNQUFNLE1BQU0sR0FBcUM7WUFDaEQsUUFBUSxFQUFFLENBQUMsTUFBa0IsRUFBRSxLQUEwQyxFQUFFLEVBQUU7Z0JBQzVFLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUU7b0JBQ3RELEdBQUcsRUFBRSxNQUFNO29CQUNYLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7aUJBQy9CLENBQUMsQ0FBQztZQUNKLENBQUM7WUFDRCxZQUFZLEVBQUUsQ0FBQyxNQUFrQixFQUFFLEtBQWtELEVBQUUsRUFBRTtnQkFDeEYsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRTtvQkFDdEQsR0FBRyxFQUFFLE1BQU07b0JBQ1gsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztpQkFDbkMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztTQUNELENBQUM7UUFFRixNQUFNLE9BQU8sR0FBOEI7WUFDMUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRO1lBQ2xDLGFBQWEsRUFBRSxlQUFlLENBQUMsYUFBYTtZQUM1QyxVQUFVLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2xELE9BQU87b0JBQ04sSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO29CQUNoQixRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO29CQUNwQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsbUJBQW1CO2lCQUM5QyxDQUFDO1lBQ0gsQ0FBQyxDQUFDO1NBQ0YsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekUsT0FBTyxNQUFNLElBQUksSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxTQUFnQyxFQUFFLFFBQXFDO1FBQ2xHLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRCxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUMifQ==