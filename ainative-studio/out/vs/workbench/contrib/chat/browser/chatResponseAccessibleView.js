/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { isResponseVM } from '../common/chatViewModel.js';
import { IChatWidgetService } from './chat.js';
export class ChatResponseAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'panelChat';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ChatContextKeys.inChatSession;
    }
    getProvider(accessor) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatInputFocused = widget.hasInputFocus();
        if (chatInputFocused) {
            widget.focusLastMessage();
        }
        const verifiedWidget = widget;
        const focusedItem = verifiedWidget.getFocus();
        if (!focusedItem) {
            return;
        }
        return new ChatResponseAccessibleProvider(verifiedWidget, focusedItem, chatInputFocused);
    }
}
class ChatResponseAccessibleProvider extends Disposable {
    constructor(_widget, item, _chatInputFocused) {
        super();
        this._widget = _widget;
        this._chatInputFocused = _chatInputFocused;
        this.id = "panelChat" /* AccessibleViewProviderId.PanelChat */;
        this.verbositySettingKey = "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._focusedItem = item;
    }
    provideContent() {
        return this._getContent(this._focusedItem);
    }
    _getContent(item) {
        let responseContent = isResponseVM(item) ? item.response.toString() : '';
        if (!responseContent && 'errorDetails' in item && item.errorDetails) {
            responseContent = item.errorDetails.message;
        }
        return renderMarkdownAsPlaintext(new MarkdownString(responseContent), true);
    }
    onClose() {
        this._widget.reveal(this._focusedItem);
        if (this._chatInputFocused) {
            this._widget.focusInput();
        }
        else {
            this._widget.focus(this._focusedItem);
        }
    }
    provideNextContent() {
        const next = this._widget.getSibling(this._focusedItem, 'next');
        if (next) {
            this._focusedItem = next;
            return this._getContent(next);
        }
        return;
    }
    providePreviousContent() {
        const previous = this._widget.getSibling(this._focusedItem, 'previous');
        if (previous) {
            this._focusedItem = previous;
            return this._getContent(previous);
        }
        return;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlc3BvbnNlQWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRSZXNwb25zZUFjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFLbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQTZCLGtCQUFrQixFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRTFFLE1BQU0sT0FBTywwQkFBMEI7SUFBdkM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLFdBQVcsQ0FBQztRQUNuQixTQUFJLHdDQUEyQjtRQUMvQixTQUFJLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQztJQXFCL0MsQ0FBQztJQXBCQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztRQUMvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2hELElBQUksZ0JBQWdCLEVBQUUsQ0FB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