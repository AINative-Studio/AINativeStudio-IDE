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
import './media/chatConfirmationWidget.css';
import { Button, ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Action } from '../../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IHostService } from '../../../../services/host/browser/host.js';
let BaseChatConfirmationWidget = class BaseChatConfirmationWidget extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidChangeHeight() { return this._onDidChangeHeight.event; }
    get domNode() {
        return this._domNode;
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    constructor(title, buttons, expandableMessage, instantiationService, contextMenuService, _configurationService, _hostService) {
        super();
        this.instantiationService = instantiationService;
        this._configurationService = _configurationService;
        this._hostService = _hostService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        const elements = dom.h('.chat-confirmation-widget@root', [
            dom.h('.chat-confirmation-widget-expando@expando'),
            dom.h('.chat-confirmation-widget-title@title'),
            dom.h('.chat-confirmation-widget-message@message'),
            dom.h('.chat-confirmation-buttons-container@buttonsContainer'),
        ]);
        this._domNode = elements.root;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        if (expandableMessage) {
            const expanded = observableValue(this, false);
            const btn = this._register(new Button(elements.expando, {}));
            this._register(autorun(r => {
                const value = expanded.read(r);
                btn.icon = value ? Codicon.chevronDown : Codicon.chevronRight;
                elements.message.classList.toggle('hidden', !value);
                this._onDidChangeHeight.fire();
            }));
            this._register(btn.onDidClick(() => {
                const value = expanded.get();
                expanded.set(!value, undefined);
            }));
        }
        const renderedTitle = this._register(this.markdownRenderer.render(new MarkdownString(title, { supportThemeIcons: true }), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        }));
        elements.title.append(renderedTitle.element);
        this.messageElement = elements.message;
        buttons.forEach(buttonData => {
            const buttonOptions = { ...defaultButtonStyles, secondary: buttonData.isSecondary, title: buttonData.tooltip };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(elements.buttonsContainer, {
                    ...buttonOptions,
                    contextMenuProvider: contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map(action => this._register(new Action(action.label, action.label, undefined, true, () => {
                        this._onDidClick.fire(action);
                        return Promise.resolve();
                    }))),
                });
            }
            else {
                button = new Button(elements.buttonsContainer, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
        });
    }
    renderMessage(element) {
        this.messageElement.append(element);
        if (this._configurationService.getValue('chat.focusWindowOnConfirmation')) {
            const targetWindow = dom.getWindow(element);
            if (!targetWindow.document.hasFocus()) {
                this._hostService.focus(targetWindow, { force: true /* Application may not be active */ });
            }
        }
    }
};
BaseChatConfirmationWidget = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IHostService)
], BaseChatConfirmationWidget);
let ChatConfirmationWidget = class ChatConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title, message, buttons, instantiationService, contextMenuService, configurationService, hostService) {
        super(title, buttons, false, instantiationService, contextMenuService, configurationService, hostService);
        this.message = message;
        const renderedMessage = this._register(this.markdownRenderer.render(typeof this.message === 'string' ? new MarkdownString(this.message) : this.message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element);
    }
};
ChatConfirmationWidget = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IHostService)
], ChatConfirmationWidget);
export { ChatConfirmationWidget };
let ChatCustomConfirmationWidget = class ChatCustomConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title, messageElement, messageElementIsExpandable, buttons, instantiationService, contextMenuService, configurationService, hostService) {
        super(title, buttons, messageElementIsExpandable, instantiationService, contextMenuService, configurationService, hostService);
        this.renderMessage(messageElement);
    }
};
ChatCustomConfirmationWidget = __decorate([
    __param(4, IInstantiationService),
    __param(5, IContextMenuService),
    __param(6, IConfigurationService),
    __param(7, IHostService)
], ChatCustomConfirmationWidget);
export { ChatCustomConfirmationWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29uZmlybWF0aW9uV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUEyQixNQUFNLGlEQUFpRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNySCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFB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