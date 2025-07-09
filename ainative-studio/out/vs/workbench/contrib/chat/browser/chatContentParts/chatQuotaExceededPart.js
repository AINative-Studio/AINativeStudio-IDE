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
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable, textLinkForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { IChatWidgetService } from '../chat.js';
const $ = dom.$;
/**
 * Once the sign up button is clicked, and the retry button has been shown, it should be shown every time.
 */
let shouldShowRetryButton = false;
/**
 * Once the 'retry' button is clicked, the wait warning should be shown every time.
 */
let shouldShowWaitWarning = false;
let ChatQuotaExceededPart = class ChatQuotaExceededPart extends Disposable {
    constructor(element, renderer, chatWidgetService, commandService, telemetryService) {
        super();
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const errorDetails = element.errorDetails;
        assertType(!!errorDetails, 'errorDetails');
        this.domNode = $('.chat-quota-error-widget');
        const icon = dom.append(this.domNode, $('span'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
        const messageContainer = dom.append(this.domNode, $('.chat-quota-error-message'));
        const markdownContent = renderer.render(new MarkdownString(errorDetails.message));
        dom.append(messageContainer, markdownContent.element);
        const button1 = this._register(new Button(messageContainer, { ...defaultButtonStyles, supportIcons: true }));
        button1.label = localize('upgradeToCopilotPro', "Upgrade to Copilot Pro");
        button1.element.classList.add('chat-quota-error-button');
        let hasAddedWaitWarning = false;
        const addWaitWarningIfNeeded = () => {
            if (!shouldShowWaitWarning || hasAddedWaitWarning) {
                return;
            }
            hasAddedWaitWarning = true;
            dom.append(messageContainer, $('.chat-quota-wait-warning', undefined, localize('waitWarning', "Signing up may take a few minutes to take effect.")));
        };
        let hasAddedRetryButton = false;
        const addRetryButtonIfNeeded = () => {
            if (!shouldShowRetryButton || hasAddedRetryButton) {
                return;
            }
            hasAddedRetryButton = true;
            const button2 = this._register(new Button(messageContainer, {
                buttonBackground: undefined,
                buttonForeground: asCssVariable(textLinkForeground)
            }));
            button2.element.classList.add('chat-quota-error-secondary-button');
            button2.label = localize('signedUpClickToContinue', "Signed up? Click to retry.");
            this._onDidChangeHeight.fire();
            this._register(button2.onDidClick(() => {
                const widget = chatWidgetService.getWidgetBySessionId(element.sessionId);
                if (!widget) {
                    return;
                }
                widget.rerunLastRequest();
                shouldShowWaitWarning = true;
                addWaitWarningIfNeeded();
            }));
        };
        this._register(button1.onDidClick(async () => {
            const commandId = 'workbench.action.chat.upgradePlan';
            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-response' });
            await commandService.executeCommand(commandId);
            shouldShowRetryButton = true;
            addRetryButtonIfNeeded();
        }));
        addRetryButtonIfNeeded();
        addWaitWarningIfNeeded();
    }
    hasSameContent(other) {
        // Not currently used
        return true;
    }
};
ChatQuotaExceededPart = __decorate([
    __param(2, IChatWidgetService),
    __param(3, ICommandService),
    __param(4, ITelemetryService)
], ChatQuotaExceededPart);
export { ChatQuotaExceededPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1b3RhRXhjZWVkZWRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRRdW90YUV4Y2VlZGVkUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUV6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUUxRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFHaEQsTUFBTSxDQUFDLEdBQUcsR0FB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