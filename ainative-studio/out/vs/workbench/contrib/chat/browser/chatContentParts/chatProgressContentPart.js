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
import { $, append } from '../../../../../base/browser/dom.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { InlineAnchorWidget } from '../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
let ChatProgressContentPart = class ChatProgressContentPart extends Disposable {
    constructor(progress, renderer, context, forceShowSpinner, forceShowMessage, icon, instantiationService, chatMarkdownAnchorService) {
        super();
        this.instantiationService = instantiationService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        const followingContent = context.content.slice(context.contentIndex + 1);
        this.showSpinner = forceShowSpinner ?? shouldShowSpinner(followingContent, context.element);
        this.isHidden = forceShowMessage !== true && followingContent.some(part => part.kind !== 'progressMessage');
        if (this.isHidden) {
            // Placeholder, don't show the progress message
            this.domNode = $('');
            return;
        }
        if (this.showSpinner) {
            // TODO@roblourens is this the right place for this?
            // this step is in progress, communicate it to SR users
            alert(progress.content.value);
        }
        const codicon = icon ? icon : this.showSpinner ? ThemeIcon.modify(Codicon.loading, 'spin') : Codicon.check;
        const result = this._register(renderer.render(progress.content));
        result.element.classList.add('progress-step');
        this.renderFileWidgets(result.element);
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(codicon));
        append(this.domNode, iconElement);
        append(this.domNode, result.element);
    }
    renderFileWidgets(element) {
        const links = element.querySelectorAll('a');
        links.forEach(a => {
            // Empty link text -> render file widget
            if (!a.textContent?.trim()) {
                const href = a.getAttribute('data-href');
                const uri = href ? URI.parse(href) : undefined;
                if (uri?.scheme) {
                    const widget = this._register(this.instantiationService.createInstance(InlineAnchorWidget, a, { kind: 'inlineReference', inlineReference: uri }));
                    this._register(this.chatMarkdownAnchorService.register(widget));
                }
            }
        });
    }
    hasSameContent(other, followingContent, element) {
        // Progress parts render render until some other content shows up, then they hide.
        // When some other content shows up, need to signal to be rerendered as hidden.
        if (followingContent.some(part => part.kind !== 'progressMessage') && !this.isHidden) {
            return false;
        }
        // Needs rerender when spinner state changes
        const showSpinner = shouldShowSpinner(followingContent, element);
        return other.kind === 'progressMessage' && this.showSpinner === showSpinner;
    }
};
ChatProgressContentPart = __decorate([
    __param(6, IInstantiationService),
    __param(7, IChatMarkdownAnchorService)
], ChatProgressContentPart);
export { ChatProgressContentPart };
function shouldShowSpinner(followingContent, element) {
    return isResponseVM(element) && !element.isComplete && followingContent.length === 0;
}
let ChatWorkingProgressContentPart = class ChatWorkingProgressContentPart extends ChatProgressContentPart {
    constructor(workingProgress, renderer, context, instantiationService, chatMarkdownAnchorService) {
        const progressMessage = {
            kind: 'progressMessage',
            content: workingProgress.isPaused ?
                new MarkdownString().appendText(localize('pausedMessage', "Paused")) :
                new MarkdownString().appendText(localize('workingMessage', "Working..."))
        };
        super(progressMessage, renderer, context, undefined, undefined, workingProgress.isPaused ? Codicon.debugPause : undefined, instantiationService, chatMarkdownAnchorService);
        this.workingProgress = workingProgress;
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'working' && this.workingProgress.isPaused === other.isPaused;
    }
};
ChatWorkingProgressContentPart = __decorate([
    __param(3, IInstantiationService),
    __param(4, IChatMarkdownAnchorService)
], ChatWorkingProgressContentPart);
export { ChatWorkingProgressContentPart };
export class ChatCustomProgressPart {
    constructor(messageElement, icon) {
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        append(this.domNode, iconElement);
        messageElement.classList.add('progress-step');
        append(this.domNode, messageElement);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb2dyZXNzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFByb2dyZXNzQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUE4QyxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVsRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFNdEQsWUFDQyxRQUEwQyxFQUMxQyxRQUEwQixFQUMxQixPQUFzQyxFQUN0QyxnQkFBcUMs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