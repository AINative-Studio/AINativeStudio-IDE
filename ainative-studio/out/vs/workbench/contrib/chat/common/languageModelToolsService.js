/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../../base/common/network.js';
import { stringifyPromptElementJSON } from './tools/promptTsxTypes.js';
export var ToolDataSource;
(function (ToolDataSource) {
    function toKey(source) {
        switch (source.type) {
            case 'extension': return `extension:${source.extensionId.value}`;
            case 'mcp': return `mcp:${source.collectionId}:${source.definitionId}`;
            case 'internal': return 'internal';
        }
    }
    ToolDataSource.toKey = toKey;
})(ToolDataSource || (ToolDataSource = {}));
export function isToolInvocationContext(obj) {
    return typeof obj === 'object' && typeof obj.sessionId === 'string';
}
export function isToolResultInputOutputDetails(obj) {
    return typeof obj === 'object' && typeof obj?.input === 'string' && typeof obj?.output === 'string';
}
export function stringifyPromptTsxPart(part) {
    return stringifyPromptElementJSON(part.value);
}
export const ILanguageModelToolsService = createDecorator('ILanguageModelToolsService');
export function createToolInputUri(toolOrId) {
    if (typeof toolOrId !== 'string') {
        toolOrId = toolOrId.id;
    }
    return URI.from({ scheme: Schemas.inMemory, path: `/lm/tool/${toolOrId}/tool_input.json` });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVsVG9vbHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBUWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBcUIsMEJBQTBCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQXFDMUYsTUFBTSxLQUFXLGNBQWMsQ0FROUI7QUFSRCxXQUFpQixjQUFjO0lBQzlCLFNBQWdCLEtBQUssQ0FBQyxNQUFzQjtRQUMzQyxRQUFRLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sYUFBYSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pFLEtBQUssS0FBSyxDQUFDLENBQUMsT0FBTyxPQUFPLE1BQU0sQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZFLEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxVQUFVLENBQUM7UUFDcEMsQ0FBQztJQUNGLENBQUM7SUFOZSxvQkFBSyxRQU1wQixDQUFBO0FBQ0YsQ0FBQyxFQVJnQixjQUFjLEtBQWQsY0FBYyxRQVE5QjtBQWtCRCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsR0FBUTtJQUMvQyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDO0FBQ3JFLENBQUM7QUFPRCxNQUFNLFVBQVUsOEJBQThCLENBQUMsR0FBUTtJQUN0RCxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sR0FBRyxFQUFFLE1BQU0sS0FBSyxRQUFRLENBQUM7QUFDckcsQ0FBQztBQWFELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxJQUE4QjtJQUNwRSxPQUFPLDBCQUEwQixDQUFDLElBQUksQ0FBQyxLQUEwQixDQUFDLENBQUM7QUFDcEUsQ0FBQztBQTBCRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDRCQUE0QixDQUFDLENBQUM7QUFrQnBILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxRQUE0QjtJQUM5RCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBWSxRQUFRLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUM3RixDQUFDIn0=