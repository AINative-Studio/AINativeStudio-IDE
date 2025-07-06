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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29sbGFwc2libGVDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBSWpELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUtuRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR2pHLE1BQU0sT0FBZ0IsMEJBQTJCLFNBQVEsVUFBVTtJQVVsRSxZQUNrQixLQUErQixFQUM3QixPQUFzQztRQUV6RCxLQUFLLEVBQUUsQ0FBQztRQUhTLFVBQUssR0FBTCxLQUFLLENBQTBCO1FBQzdCLFlBQU8sR0FBUCxPQUFPLENBQStCO1FBUnZDLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzVELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFHeEQsZ0JBQVcsR0FBRyxlQUFl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