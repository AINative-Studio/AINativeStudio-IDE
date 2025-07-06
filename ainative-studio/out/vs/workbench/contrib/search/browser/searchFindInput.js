/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextScopedFindInput } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { NotebookFindInputFilterButton } from '../../notebook/browser/contrib/find/notebookFindReplaceWidget.js';
import * as nls from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
export class SearchFindInput extends ContextScopedFindInput {
    constructor(container, contextViewProvider, options, contextKeyService, contextMenuService, instantiationService, filters, filterStartVisiblitity) {
        super(container, contextViewProvider, options, contextKeyService);
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.filters = filters;
        this._filterChecked = false;
        this._onDidChangeAIToggle = this._register(new Emitter());
        this.onDidChangeAIToggle = this._onDidChangeAIToggle.event;
        this._findFilter = this._register(new NotebookFindInputFilterButton(filters, contextMenuService, instantiationService, options, nls.localize('searchFindInputNotebookFilter.label', "Notebook Find Filters")));
        this._updatePadding();
        this.controls.appendChild(this._findFilter.container);
        this._findFilter.container.classList.add('monaco-custom-toggle');
        this.filterVisible = filterStartVisiblitity;
    }
    _updatePadding() {
        this.inputBox.paddingRight =
            (this.caseSensitive?.visible ? this.caseSensitive.width() : 0) +
                (this.wholeWords?.visible ? this.wholeWords.width() : 0) +
                (this.regex?.visible ? this.regex.width() : 0) +
                (this._findFilter.visible ? this._findFilter.width() : 0);
    }
    set filterVisible(visible) {
        this._findFilter.visible = visible;
        this.updateFilterStyles();
        this._updatePadding();
    }
    setEnabled(enabled) {
        super.setEnabled(enabled);
        if (enabled && (!this._filterChecked || !this._findFilter.visible)) {
            this.regex?.enable();
        }
        else {
            this.regex?.disable();
        }
    }
    updateFilterStyles() {
        // filter is checked if it's in a non-default state
        this._filterChecked =
            !this.filters.markupInput ||
                !this.filters.markupPreview ||
                !this.filters.codeInput ||
                !this.filters.codeOutput;
        // TODO: find a way to express that searching notebook output and markdown preview don't support regex.
        this._findFilter.applyStyles(this._filterChecked);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRmluZElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hGaW5kSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFHNUcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDakgsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHM0QsTUFBTSxPQUFPLGVBQWdCLFNBQVEsc0JBQXNCO0lBTTFELFlBQ0MsU0FBNkIsRUFDN0IsbUJBQXlDLEVBQ3pDLE9BQTBCLEVBQzFCLGlCQUFxQyxFQUM1QixrQkFBdUMsRUFDdkMsb0JBQTJDLEVBQzNDLE9BQTRCLEVBQ3JDLHNCQUErQjtRQUUvQixLQUFLLENBQUMsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBTHpELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUFxQjtRQVg5QixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUN2Qix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQztRQUMvRCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBYXJFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDaEMsSUFBSSw2QkFBNkIsQ0FD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