/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class MockLanguageModelToolsService {
    constructor() {
        this.onDidChangeTools = Event.None;
    }
    cancelToolCallsForRequest(requestId) {
    }
    registerToolData(toolData) {
        return Disposable.None;
    }
    resetToolAutoConfirmation() {
    }
    setToolAutoConfirmation(toolId, scope, autoConfirm) {
    }
    registerToolImplementation(name, tool) {
        return Disposable.None;
    }
    getTools() {
        return [];
    }
    getTool(id) {
        return undefined;
    }
    getToolByName(name) {
        return undefined;
    }
    async invokeTool(dto, countTokens, token) {
        return {
            content: [{ kind: 'text', value: 'result' }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrTGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBR2xGLE1BQU0sT0FBTyw2QkFBNkI7SUFHekM7UUFLQSxxQkFBZ0IsR0FBZ0IsS0FBSyxDQUFDLElBQUksQ0FBQztJQUwzQixDQUFDO0lBRWpCLHlCQUF5QixDQUFDLFNBQWlCO0lBQzNDLENBQUM7SUFJRCxnQkFBZ0IsQ0FBQyxRQUFtQjtRQUNuQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDeEIsQ0FBQztJQUVELHlCQUF5QjtJQUV6QixDQUFDO0lBRUQsdUJBQXVCLENBQUMsTUFBYyxFQUFFLEtBQThCLEVBQUUsV0FBcUI7SUFFN0YsQ0FBQztJQUVELDBCQUEwQixDQUFDLElBQVksRUFBRSxJQUFlO1FBQ3ZELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztJQUN4QixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELE9BQU8sQ0FBQyxFQUFVO1FBQ2pCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWTtRQUN6QixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFvQixFQUFFLFdBQWdDLEVBQUUsS0FBd0I7UUFDaEcsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUM7U0FDNUMsQ0FBQztJQUNILENBQUM7Q0FDRCJ9