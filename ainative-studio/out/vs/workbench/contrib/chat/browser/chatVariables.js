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
import { coalesce } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ChatRequestDynamicVariablePart, ChatRequestToolPart } from '../common/chatParserTypes.js';
import { ChatAgentLocation, ChatConfiguration } from '../common/constants.js';
import { IChatWidgetService, showChatView, showEditsView } from './chat.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';
let ChatVariablesService = class ChatVariablesService {
    constructor(chatWidgetService, viewsService, configurationService) {
        this.chatWidgetService = chatWidgetService;
        this.viewsService = viewsService;
        this.configurationService = configurationService;
    }
    resolveVariables(prompt, attachedContextVariables) {
        let resolvedVariables = [];
        prompt.parts
            .forEach((part, i) => {
            if (part instanceof ChatRequestDynamicVariablePart || part instanceof ChatRequestToolPart) {
                resolvedVariables[i] = part.toVariableEntry();
            }
        });
        // Make array not sparse
        resolvedVariables = coalesce(resolvedVariables);
        // "reverse", high index first so that replacement is simple
        resolvedVariables.sort((a, b) => b.range.start - a.range.start);
        if (attachedContextVariables) {
            // attachments not in the prompt
            resolvedVariables.push(...attachedContextVariables);
        }
        return {
            variables: resolvedVariables,
        };
    }
    getDynamicVariables(sessionId) {
        // This is slightly wrong... the parser pulls dynamic references from the input widget, but there is no guarantee that message came from the input here.
        // Need to ...
        // - Parser takes list of dynamic references (annoying)
        // - Or the parser is known to implicitly act on the input widget, and we need to call it before calling the chat service (maybe incompatible with the future, but easy)
        const widget = this.chatWidgetService.getWidgetBySessionId(sessionId);
        if (!widget || !widget.viewModel || !widget.supportsFileReferences) {
            return [];
        }
        const model = widget.getContrib(ChatDynamicVariableModel.ID);
        if (!model) {
            return [];
        }
        return model.variables;
    }
    async attachContext(name, value, location) {
        if (location !== ChatAgentLocation.Panel && location !== ChatAgentLocation.EditingSession) {
            return;
        }
        const unifiedViewEnabled = !!this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
        const widget = location === ChatAgentLocation.EditingSession && !unifiedViewEnabled
            ? await showEditsView(this.viewsService)
            : (this.chatWidgetService.lastFocusedWidget ?? await showChatView(this.viewsService));
        if (!widget || !widget.viewModel) {
            return;
        }
        const key = name.toLowerCase();
        if (key === 'file' && typeof value !== 'string') {
            const uri = URI.isUri(value) ? value : value.uri;
            const range = 'range' in value ? value.range : undefined;
            await widget.attachmentModel.addFile(uri, range);
            return;
        }
        if (key === 'folder' && URI.isUri(value)) {
            widget.attachmentModel.addFolder(value);
            return;
        }
    }
};
ChatVariablesService = __decorate([
    __param(0, IChatWidgetService),
    __param(1, IViewsService),
    __param(2, IConfigurationService)
], ChatVariablesService);
export { ChatVariablesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUvRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsbUJBQW1CLEVBQXNCLE1BQU0sOEJBQThCLENBQUM7QUFFdkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdEUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFHaEMsWUFDc0MsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ25CLG9CQUEyQztRQUY5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzFDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFFcEYsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQTBCLEVBQUUsd0JBQWlFO1FBQzdHLElBQUksaUJBQWlCLEdBQWdDLEVBQUUsQ0FBQztRQUV4RCxNQUFNLENBQUMsS0FBSzth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