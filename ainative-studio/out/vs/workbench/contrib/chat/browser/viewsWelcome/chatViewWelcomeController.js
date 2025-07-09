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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { chatViewsWelcomeRegistry } from './chatViewsWelcome.js';
const $ = dom.$;
let ChatViewWelcomeController = class ChatViewWelcomeController extends Disposable {
    constructor(container, delegate, location, contextKeyService, instantiationService) {
        super();
        this.container = container;
        this.delegate = delegate;
        this.location = location;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.enabled = false;
        this.enabledDisposables = this._register(new DisposableStore());
        this.renderDisposables = this._register(new DisposableStore());
        this.element = dom.append(this.container, dom.$('.chat-view-welcome'));
        this._register(Event.runAndSubscribe(delegate.onDidChangeViewWelcomeState, () => this.update()));
        this._register(chatViewsWelcomeRegistry.onDidChange(() => this.update(true)));
    }
    update(force) {
        const enabled = this.delegate.shouldShowWelcome();
        if (this.enabled === enabled && !force) {
            return;
        }
        this.enabled = enabled;
        this.enabledDisposables.clear();
        if (!enabled) {
            this.container.classList.toggle('chat-view-welcome-visible', false);
            this.renderDisposables.clear();
            return;
        }
        const descriptors = chatViewsWelcomeRegistry.get();
        if (descriptors.length) {
            this.render(descriptors);
            const descriptorKeys = new Set(descriptors.flatMap(d => d.when.keys()));
            this.enabledDisposables.add(this.contextKeyService.onDidChangeContext(e => {
                if (e.affectsSome(descriptorKeys)) {
                    this.render(descriptors);
                }
            }));
        }
    }
    render(descriptors) {
        this.renderDisposables.clear();
        dom.clearNode(this.element);
        const matchingDescriptors = descriptors.filter(descriptor => this.contextKeyService.contextMatchesRules(descriptor.when));
        let enabledDescriptor;
        for (const descriptor of matchingDescriptors) {
            if (typeof descriptor.content === 'function') {
                enabledDescriptor = descriptor; // when multiple descriptors match, prefer a "core" one over a "descriptive" one
                break;
            }
        }
        enabledDescriptor = enabledDescriptor ?? matchingDescriptors.at(0);
        if (enabledDescriptor) {
            const content = {
                icon: enabledDescriptor.icon,
                title: enabledDescriptor.title,
                message: enabledDescriptor.content
            };
            const welcomeView = this.renderDisposables.add(this.instantiationService.createInstance(ChatViewWelcomePart, content, { firstLinkToButton: true, location: this.location }));
            this.element.appendChild(welcomeView.element);
            this.container.classList.toggle('chat-view-welcome-visible', true);
        }
        else {
            this.container.classList.toggle('chat-view-welcome-visible', false);
        }
    }
};
ChatViewWelcomeController = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], ChatViewWelcomeController);
export { ChatViewWelcomeController };
let ChatViewWelcomePart = class ChatViewWelcomePart extends Disposable {
    constructor(content, options, openerService, instantiationService, logService, chatAgentService) {
        super();
        this.content = content;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.element = dom.$('.chat-welcome-view');
        try {
            const renderer = this.instantiationService.createInstance(MarkdownRenderer, {});
            // Icon
            const icon = dom.append(this.element, $('.chat-welcome-view-icon'));
            if (content.icon) {
                icon.appendChild(renderIcon(content.icon));
            }
            // Title
            const title = dom.append(this.element, $('.chat-welcome-view-title'));
            title.textContent = content.title;
            // Preview indicator
            if (typeof content.message !== 'function' && options?.isWidgetAgentWelcomeViewContent) {
                const container = dom.append(this.element, $('.chat-welcome-view-indicator-container'));
                dom.append(container, $('.chat-welcome-view-subtitle', undefined, localize('agentModeSubtitle', "Agent Mode")));
            }
            // Message
            const message = dom.append(this.element, $('.chat-welcome-view-message'));
            if (typeof content.message === 'function') {
                dom.append(message, content.message(this._register(new DisposableStore())));
            }
            else {
                const messageResult = this._register(renderer.render(content.message));
                const firstLink = options?.firstLinkToButton ? messageResult.element.querySelector('a') : undefined;
                if (firstLink) {
                    const target = firstLink.getAttribute('data-href');
                    const button = this._register(new Button(firstLink.parentElement, defaultButtonStyles));
                    button.label = firstLink.textContent ?? '';
                    if (target) {
                        this._register(button.onDidClick(() => {
                            this.openerService.open(target, { allowCommands: true });
                        }));
                    }
                    firstLink.replaceWith(button.element);
                }
                dom.append(message, messageResult.element);
            }
            // Tips
            if (content.tips) {
                const tips = dom.append(this.element, $('.chat-welcome-view-tips'));
                const tipsResult = this._register(renderer.render(content.tips));
                tips.appendChild(tipsResult.element);
            }
        }
        catch (err) {
            this.logService.error('Failed to render chat view welcome content', err);
        }
    }
};
ChatViewWelcomePart = __decorate([
    __param(2, IOpenerService),
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IChatAgentService)
], ChatViewWelcomePart);
export { ChatViewWelcomePart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdXZWxjb21lQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvdmlld3NXZWxjb21lL2NoYXRWaWV3V2VsY29tZUNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXRGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRS9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBK0IsTUFBTSx1QkFBdUIsQ0FBQztBQUU5RixNQUFNLENB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