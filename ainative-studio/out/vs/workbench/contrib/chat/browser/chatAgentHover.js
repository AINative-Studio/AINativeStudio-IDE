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
import * as dom from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FileAccess } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { getFullyQualifiedId, IChatAgentNameService, IChatAgentService } from '../common/chatAgents.js';
import { showExtensionsWithIdsCommandId } from '../../extensions/browser/extensionsActions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { verifiedPublisherIcon } from '../../../services/extensionManagement/common/extensionsIcons.js';
let ChatAgentHover = class ChatAgentHover extends Disposable {
    constructor(chatAgentService, extensionService, chatAgentNameService) {
        super();
        this.chatAgentService = chatAgentService;
        this.extensionService = extensionService;
        this.chatAgentNameService = chatAgentNameService;
        this._onDidChangeContents = this._register(new Emitter());
        this.onDidChangeContents = this._onDidChangeContents.event;
        const hoverElement = dom.h('.chat-agent-hover@root', [
            dom.h('.chat-agent-hover-header', [
                dom.h('.chat-agent-hover-icon@icon'),
                dom.h('.chat-agent-hover-details', [
                    dom.h('.chat-agent-hover-name@name'),
                    dom.h('.chat-agent-hover-extension', [
                        dom.h('.chat-agent-hover-extension-name@extensionName'),
                        dom.h('.chat-agent-hover-separator@separator'),
                        dom.h('.chat-agent-hover-publisher@publisher'),
                    ]),
                ]),
            ]),
            dom.h('.chat-agent-hover-warning@warning'),
            dom.h('span.chat-agent-hover-description@description'),
        ]);
        this.domNode = hoverElement.root;
        this.icon = hoverElement.icon;
        this.name = hoverElement.name;
        this.extensionName = hoverElement.extensionName;
        this.description = hoverElement.description;
        hoverElement.separator.textContent = '|';
        const verifiedBadge = dom.$('span.extension-verified-publisher', undefined, renderIcon(verifiedPublisherIcon));
        this.publisherName = dom.$('span.chat-agent-hover-publisher-name');
        dom.append(hoverElement.publisher, verifiedBadge, this.publisherName);
        hoverElement.warning.appendChild(renderIcon(Codicon.warning));
        hoverElement.warning.appendChild(dom.$('span', undefined, localize('reservedName', "This chat extension is using a reserved name.")));
    }
    setAgent(id) {
        const agent = this.chatAgentService.getAgent(id);
        if (agent.metadata.icon instanceof URI) {
            const avatarIcon = dom.$('img.icon');
            avatarIcon.src = FileAccess.uriToBrowserUri(agent.metadata.icon).toString(true);
            this.icon.replaceChildren(dom.$('.avatar', undefined, avatarIcon));
        }
        else if (agent.metadata.themeIcon) {
            const avatarIcon = dom.$(ThemeIcon.asCSSSelector(agent.metadata.themeIcon));
            this.icon.replaceChildren(dom.$('.avatar.codicon-avatar', undefined, avatarIcon));
        }
        this.domNode.classList.toggle('noExtensionName', !!agent.isDynamic);
        const isAllowed = this.chatAgentNameService.getAgentNameRestriction(agent);
        this.name.textContent = isAllowed ? `@${agent.name}` : getFullyQualifiedId(agent);
        this.extensionName.textContent = agent.extensionDisplayName;
        this.publisherName.textContent = agent.publisherDisplayName ?? agent.extensionPublisherId;
        let description = agent.description ?? '';
        if (description) {
            if (!description.match(/[\.\?\!] *$/)) {
                description += '.';
            }
        }
        this.description.textContent = description;
        this.domNode.classList.toggle('allowedName', isAllowed);
        this.domNode.classList.toggle('verifiedPublisher', false);
        if (!agent.isDynamic) {
            const cancel = this._register(new CancellationTokenSource());
            this.extensionService.getExtensions([{ id: agent.extensionId.value }], cancel.token).then(extensions => {
                cancel.dispose();
                const extension = extensions[0];
                if (extension?.publisherDomain?.verified) {
                    this.domNode.classList.toggle('verifiedPublisher', true);
                    this._onDidChangeContents.fire();
                }
            });
        }
    }
};
ChatAgentHover = __decorate([
    __param(0, IChatAgentService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IChatAgentNameService)
], ChatAgentHover);
export { ChatAgentHover };
export function getChatAgentHoverOptions(getAgent, commandService) {
    return {
        actions: [
            {
                commandId: showExtensionsWithIdsCommandId,
                label: localize('viewExtensionLabel', "View Extension"),
                run: () => {
                    const agent = getAgent();
                    if (agent) {
                        commandService.executeCommand(showExtensionsWithIdsCommandId, [agent.extensionId.value]);
                    }
                },
            }
        ]
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50SG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEFnZW50SG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBa0IscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN4SCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUVqRyxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEs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