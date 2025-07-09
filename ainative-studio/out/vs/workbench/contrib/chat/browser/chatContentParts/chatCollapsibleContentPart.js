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
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { $ } from './chatReferencesContentPart.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
export class ChatCollapsibleContentPart extends Disposable {
    constructor(title, context) {
        super();
        this.title = title;
        this.context = context;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._isExpanded = observableValue(this, false);
        this.hasFollowingContent = this.context.contentIndex + 1 < this.context.content.length;
    }
    get domNode() {
        this._domNode ??= this.init();
        return this._domNode;
    }
    init() {
        const referencesLabel = this.title;
        const buttonElement = $('.chat-used-context-label', undefined);
        const collapseButton = this._register(new ButtonWithIcon(buttonElement, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined
        }));
        this._domNode = $('.chat-used-context', undefined, buttonElement);
        collapseButton.label = referencesLabel;
        this._register(collapseButton.onDidClick(() => {
            const value = this._isExpanded.get();
            this._isExpanded.set(!value, undefined);
        }));
        this._register(autorun(r => {
            const value = this._isExpanded.read(r);
            collapseButton.icon = value ? Codicon.chevronDown : Codicon.chevronRight;
            this._domNode?.classList.toggle('chat-used-context-collapsed', !value);
            this.updateAriaLabel(collapseButton.element, typeof referencesLabel === 'string' ? referencesLabel : referencesLabel.value, this.isExpanded());
            if (this._domNode?.isConnected) {
                queueMicrotask(() => {
                    this._onDidChangeHeight.fire();
                });
            }
        }));
        const content = this.initContent();
        this._domNode.appendChild(content);
        return this._domNode;
    }
    updateAriaLabel(element, label, expanded) {
        element.ariaLabel = expanded ? localize('usedReferencesExpanded', "{0}, expanded", label) : localize('usedReferencesCollapsed', "{0}, collapsed", label);
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    get expanded() {
        return this._isExpanded;
    }
    isExpanded() {
        return this._isExpanded.get();
    }
    setExpanded(value) {
        this._isExpanded.set(value, undefined);
    }
}
let ChatCollapsibleEditorContentPart = class ChatCollapsibleEditorContentPart extends ChatCollapsibleContentPart {
    constructor(title, context, editorPool, textModel, languageId, options = {}, codeBlockInfo, contextKeyService) {
        super(title, context);
        this.editorPool = editorPool;
        this.textModel = textModel;
        this.languageId = languageId;
        this.options = options;
        this.codeBlockInfo = codeBlockInfo;
        this.contextKeyService = contextKeyService;
        this._currentWidth = 0;
        this.codeblocks = [];
        this._contentDomNode = $('div.chat-collapsible-editor-content');
        this._editorReference = this.editorPool.get();
        this.codeblocks = [{
                ...codeBlockInfo,
                focus: () => {
                    this._editorReference.object.focus();
                    codeBlockInfo.focus();
                }
            }];
    }
    dispose() {
        this._editorReference?.dispose();
        super.dispose();
    }
    initContent() {
        const data = {
            languageId: this.languageId,
            textModel: this.textModel,
            codeBlockIndex: this.codeBlockInfo.codeBlockIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            parentContextKeyService: this.contextKeyService,
            renderOptions: this.options
        };
        this._editorReference.object.render(data, this._currentWidth || 300);
        this._register(this._editorReference.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
        this._contentDomNode.appendChild(this._editorReference.object.element);
        this._register(autorun(r => {
            const value = this._isExpanded.read(r);
            this._contentDomNode.style.display = value ? 'block' : 'none';
        }));
        return this._contentDomNode;
    }
    hasSameContent(other, followingContent, element) {
        // For now, we consider content different unless it's exactly the same instance
        return false;
    }
    layout(width) {
        this._currentWidth = width;
        this._editorReference.object.layout(width);
    }
};
ChatCollapsibleEditorContentPart = __decorate([
    __param(7, IContextKeyService)
], ChatCollapsibleEditorContentPart);
export { ChatCollapsibleEditorContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUlqRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFLbkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUdqRyxNQUFNLE9BQWdCLDBCQUEyQixTQUFRLFVBQVU7SUFVbEUsWUFDa0IsS0FBK0IsRUFDN0IsT0FBc0M7UUFFekQsS0FBSyxFQUFFLENBQUM7UUFIUyxVQUFLLEdBQUwsS0FBSyxDQUEwQjtRQUM3QixZQUFPLEdBQVAsT0FBTyxDQUErQjtRQVJ2Qyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUM1RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBR3hELGdCQUFXLEdBQUcsZUFB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