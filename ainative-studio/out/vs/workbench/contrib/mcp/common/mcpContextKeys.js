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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29udGV4dEtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BDb250ZXh0S2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBRW5HLE9BQU8sRUFBdUIsV0FBVyxFQUEyQyxNQUFNLGVBQWUsQ0FBQztBQUcxRyxNQUFNLEtBQVcsY0FBYyxDQWE5QjtBQWJELFdBQWlCLGNBQWM7SUFFakIsMEJBQVcsR0FBRyxJQUFJLGFBQWEsQ0FBUyxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsMkRBQTJELENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN00sOEJBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsNkRBQTZELENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMU87Ozs7OztPQU1HO0lBQ1UsbUNBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVUsMEJBQTBCLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxF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