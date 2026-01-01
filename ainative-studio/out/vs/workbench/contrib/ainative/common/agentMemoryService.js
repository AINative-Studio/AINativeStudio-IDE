/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AgentMemoryService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IAINativeAuthService } from './ainativeAuthService.js';
export const IAgentMemoryService = createDecorator('agentMemoryService');
/**
 * Agent Memory Service Implementation
 */
let AgentMemoryService = class AgentMemoryService extends Disposable {
    static { AgentMemoryService_1 = this; }
    static { this.API_BASE = 'https://api.ainative.studio/v1'; }
    constructor(_authService) {
        super();
        this._authService = _authService;
        this._onDidStoreMemory = this._register(new Emitter());
        this.onDidStoreMemory = this._onDidStoreMemory.event;
    }
    /**
     * Store memory with metadata
     */
    async storeMemory(content, role, metadata) {
        const token = this._authService.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        const enhancedMetadata = {
            ...metadata,
            source: 'ainative-ide',
            timestamp: new Date().toISOString()
        };
        const response = await fetch(`${AgentMemoryService_1.API_BASE}/memory/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content,
                role,
                metadata: enhancedMetadata
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to store memory: ${response.statusText}`);
        }
        // Fire event
        this._onDidStoreMemory.fire({ content, role, metadata: enhancedMetadata });
    }
    /**
     * Search memory semantically
     */
    async searchMemory(query, limit = 10) {
        const token = this._authService.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        const response = await fetch(`${AgentMemoryService_1.API_BASE}/memory/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query, limit })
        });
        if (!response.ok) {
            throw new Error(`Failed to search memory: ${response.statusText}`);
        }
        const data = await response.json();
        return data.results;
    }
    /**
     * Get context window for session
     */
    async getContext(sessionId, maxTokens = 4000) {
        const token = this._authService.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        const response = await fetch(`${AgentMemoryService_1.API_BASE}/memory/context?session_id=${sessionId}&max_tokens=${maxTokens}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to get context: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
};
AgentMemoryService = AgentMemoryService_1 = __decorate([
    __param(0, IAINativeAuthService)
], AgentMemoryService);
export { AgentMemoryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRNZW1vcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vYWdlbnRNZW1vcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVoRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUEyRTlGOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVOzthQUd6QixhQUFRLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW9DO0lBS3BFLFlBQ3VCLFlBQW1EO1FBRXpFLEtBQUssRUFBRSxDQUFDO1FBRitCLGlCQUFZLEdBQVosWUFBWSxDQUFzQjtRQUp6RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQztRQUN2RSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0lBTXpELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBZSxFQUFFLElBQXFDLEVBQUUsUUFBeUI7UUFDbEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQW1CO1lBQ3hDLEdBQUcsUUFBUTtZQUNYLE1BQU0sRUFBRSxjQUFjO1lBQ3RCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtTQUNuQyxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxvQkFBa0IsQ0FBQyxRQUFRLGVBQWUsRUFBRTtZQUMzRSxNQUFNLEVBQUUsTUFBTTtZQUNkLE9BQU8sRUFBRTtnQkFDUixjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyxlQUFlLEVBQUUsVUFBVSxLQUFLLEVBQUU7YUFDbEM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDcEIsT0FBTztnQkFDUCxJQUFJO2dCQUNKLFFBQVEsRUFBRSxnQkFBZ0I7YUFDMUIsQ0FBQztTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELGFBQWE7UUFDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBYSxFQUFFLEtBQUssR0FBRyxFQUFFO1FBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLG9CQUFrQixDQUFDLFFBQVEsZ0JBQWdCLEVBQUU7WUFDNUUsTUFBTSxFQUFFLE1BQU07WUFDZCxPQUFPLEVBQUU7Z0JBQ1IsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsZUFBZSxFQUFFLFVBQVUsS0FBSyxFQUFFO2FBQ2xDO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBaUIsRUFBRSxTQUFTLEdBQUcsSUFBSTtRQUNuRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQzNCLEdBQUcsb0JBQWtCLENBQUMsUUFBUSw4QkFBOEIsU0FBUyxlQUFlLFNBQVMsRUFBRSxFQUMvRjtZQUNDLE9BQU8sRUFBRTtnQkFDUixlQUFlLEVBQUUsVUFBVSxLQUFLLEVBQUU7YUFDbEM7U0FDRCxDQUNELENBQUM7UUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7O0FBcEdXLGtCQUFrQjtJQVM1QixXQUFBLG9CQUFvQixDQUFBO0dBVFYsa0JBQWtCLENBcUc5QiJ9