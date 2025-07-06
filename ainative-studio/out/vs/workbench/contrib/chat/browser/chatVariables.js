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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxtQkFBbUIsRUFBc0IsTUFBTSw4QkFBOEIsQ0FBQztBQUV2SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQUdoQyxZQUNzQyxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDbkIsb0JBQTJDO1FBRjlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDMUMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUVwRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsTUFBMEIsRUFBRSx3QkFBaUU7UUFDN0csSUFBSSxpQkFBaUIsR0FBZ0MsRUFBRSxDQUFDO1FBRXhELE1BQU0sQ0FBQyxLQUFLO2FB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