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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUc3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFxQiwwQkFBMEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBcUMxRixNQUFNLEtBQVcsY0FBYyxDQVE5QjtBQVJELFdBQWlCLGNBQWM7SUFDOUIsU0FBZ0IsS0FBSyxDQUFDLE1BQXNCO1FBQzNDLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxhQUFhLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakUsS0FBSyxLQUFLLENBQUMsQ0FBQyxPQUFPLE9BQU8sTUFBTSxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkUsS0FBSyxVQUFVLENBQUMsQ0FBQyxPQUFPLFVBQVUsQ0FBQztRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQU5lLG9CQUFLLFFBTXBCLENBQUE7QUFDRixDQUFDLEVBUmdCLGNBQWMsS0FBZCxjQUFjLFFBUTlCO0FBa0JELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxHQUFRO0lBQy9DLE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUM7QUFDckUsQ0FBQztBQU9ELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxHQUFRO0lBQ3RELE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLEVBQUUsTUFBTSxLQUFLLFFBQVEsQ0FBQztBQUNyRyxDQUFDO0FBYUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLElBQThCO0lBQ3BFLE9BQU8sMEJBQTBCLENBQUMsSUFBSSxDQUFDLEtBQTBCLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBMEJELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FBNkIsNEJBQTRCLENBQUMsQ0FBQztBQWtCcEgsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFFBQTRCO0lBQzlELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbEMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxZQUFZLFFBQVEsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0FBQzdGLENBQUMifQ==