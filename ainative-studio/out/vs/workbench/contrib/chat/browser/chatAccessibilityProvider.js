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
import { marked } from '../../../../base/common/marked/marked.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
let ChatAccessibilityProvider = class ChatAccessibilityProvider {
    constructor(_accessibleViewService) {
        this._accessibleViewService = _accessibleViewService;
    }
    getWidgetRole() {
        return 'list';
    }
    getRole(element) {
        return 'listitem';
    }
    getWidgetAriaLabel() {
        return localize('chat', "Chat");
    }
    getAriaLabel(element) {
        if (isRequestVM(element)) {
            return element.messageText;
        }
        if (isResponseVM(element)) {
            return this._getLabelWithInfo(element);
        }
        return '';
    }
    _getLabelWithInfo(element) {
        const accessibleViewHint = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        let label = '';
        const toolInvocation = element.response.value.filter(v => v.kind === 'toolInvocation').filter(v => !v.isComplete);
        let toolInvocationHint = '';
        if (toolInvocation.length) {
            const titles = toolInvocation.map(v => v.confirmationMessages?.title).filter(v => !!v);
            if (titles.length) {
                toolInvocationHint = localize('toolInvocationsHint', "Action required: {0} ", titles.join(', '));
            }
        }
        const tableCount = marked.lexer(element.response.toString()).filter(token => token.type === 'table')?.length ?? 0;
        let tableCountHint = '';
        switch (tableCount) {
            case 0:
                break;
            case 1:
                tableCountHint = localize('singleTableHint', "1 table ");
                break;
            default:
                tableCountHint = localize('multiTableHint', "{0} tables ", tableCount);
                break;
        }
        const fileTreeCount = element.response.value.filter(v => v.kind === 'treeData').length ?? 0;
        let fileTreeCountHint = '';
        switch (fileTreeCount) {
            case 0:
                break;
            case 1:
                fileTreeCountHint = localize('singleFileTreeHint', "1 file tree ");
                break;
            default:
                fileTreeCountHint = localize('multiFileTreeHint', "{0} file trees ", fileTreeCount);
                break;
        }
        const codeBlockCount = marked.lexer(element.response.toString()).filter(token => token.type === 'code')?.length ?? 0;
        switch (codeBlockCount) {
            case 0:
                label = accessibleViewHint ? localize('noCodeBlocksHint', "{0}{1}{2}{3} {4}", toolInvocationHint, fileTreeCountHint, tableCountHint, element.response.toString(), accessibleViewHint) : localize('noCodeBlocks', "{0} {1}", fileTreeCountHint, element.response.toString());
                break;
            case 1:
                label = accessibleViewHint ? localize('singleCodeBlockHint', "{0}{1}1 code block: {2} {3}{4}", toolInvocationHint, fileTreeCountHint, tableCountHint, element.response.toString(), accessibleViewHint) : localize('singleCodeBlock', "{0} 1 code block: {1}", fileTreeCountHint, element.response.toString());
                break;
            default:
                label = accessibleViewHint ? localize('multiCodeBlockHint', "{0}{1}{2} code blocks: {3}{4}", toolInvocationHint, fileTreeCountHint, tableCountHint, codeBlockCount, element.response.toString(), accessibleViewHint) : localize('multiCodeBlock', "{0} {1} code blocks", fileTreeCountHint, codeBlockCount, element.response.toString());
                break;
        }
        return label;
    }
};
ChatAccessibilityProvider = __decorate([
    __param(0, IAccessibleViewService)
], ChatAccessibilityProvider);
export { ChatAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEFjY2Vzc2liaWxpdHlQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUEwQixNQUFNLDRCQUE0QixDQUFDO0FBRXhGLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBRXJDLFlBQzBDLHNCQUE4QztRQUE5QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO0lBRXhGLENBQUM7SUFDRCxhQUFhO1FBQ1osT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsT0FBTyxDQUFDLE9BQXFCO1FBQzVCLE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBcUI7UUFDakMsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDNUIsQ0FBQztRQUVELElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEMsQ0FB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