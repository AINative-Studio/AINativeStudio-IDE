/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IMcpService } from './mcpTypes.js';
export var McpContextKeys;
(function (McpContextKeys) {
    McpContextKeys.serverCount = new RawContextKey('mcp.serverCount', undefined, { type: 'number', description: localize('mcp.serverCount.description', "Context key that has the number of registered MCP servers") });
    McpContextKeys.hasUnknownTools = new RawContextKey('mcp.hasUnknownTools', undefined, { type: 'boolean', description: localize('mcp.hasUnknownTools.description', "Indicates whether there are MCP servers with unknown tools.") });
    /**
     * A context key that indicates whether there are any servers with errors.
     *
     * @type {boolean}
     * @default undefined
     * @description This key is used to track the presence of servers with errors in the MCP context.
     */
    McpContextKeys.hasServersWithErrors = new RawContextKey('mcp.hasServersWithErrors', undefined, { type: 'boolean', description: localize('mcp.hasServersWithErrors.description', "Indicates whether there are any MCP servers with errors.") });
    McpContextKeys.toolsCount = new RawContextKey('mcp.toolsCount', undefined, { type: 'number', description: localize('mcp.toolsCount.description', "Context key that has the number of registered MCP tools") });
})(McpContextKeys || (McpContextKeys = {}));
let McpContextKeysController = class McpContextKeysController extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.contextKey'; }
    constructor(mcpService, contextKeyService) {
        super();
        const ctxServerCount = McpContextKeys.serverCount.bindTo(contextKeyService);
        const ctxToolsCount = McpContextKeys.toolsCount.bindTo(contextKeyService);
        const ctxHasUnknownTools = McpContextKeys.hasUnknownTools.bindTo(contextKeyService);
        this._store.add(bindContextKey(McpContextKeys.hasServersWithErrors, contextKeyService, r => mcpService.servers.read(r).some(c => c.connectionState.read(r).state === 3 /* McpConnectionState.Kind.Error */)));
        this._store.add(autorun(r => {
            const servers = mcpService.servers.read(r);
            const serverTools = servers.map(s => s.tools.read(r));
            ctxServerCount.set(servers.length);
            ctxToolsCount.set(serverTools.reduce((count, tools) => count + tools.length, 0));
            ctxHasUnknownTools.set(mcpService.lazyCollectionState.read(r) !== 2 /* LazyCollectionState.AllKnown */ || servers.some(s => {
                if (s.trusted.read(r) === false) {
                    return false;
                }
                const toolState = s.toolsState.read(r);
                return toolState === 0 /* McpServerToolsState.Unknown */ || toolState === 2 /* McpServerToolsState.RefreshingFromUnknown */;
            }));
        }));
    }
};
McpContextKeysController = __decorate([
    __param(0, IMcpService),
    __param(1, IContextKeyService)
], McpContextKeysController);
export { McpContextKeysController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29udGV4dEtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcENvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFFbkcsT0FBTyxFQUF1QixXQUFXLEVBQTJDLE1BQU0sZUFBZSxDQUFDO0FBRzFHLE1BQU0sS0FBVyxjQUFjLENBYTlCO0FBYkQsV0FBaUIsY0FBYztJQUVqQiwwQkFBVyxHQUFHLElBQUksYUFBYSxDQUFTLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwyREFBMkQsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3TSw4QkFBZSxHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSw2REFBNkQsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxTzs7Ozs7O09BTUc7SUFDVSxtQ0FBb0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSwwQkFBMEIsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVB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