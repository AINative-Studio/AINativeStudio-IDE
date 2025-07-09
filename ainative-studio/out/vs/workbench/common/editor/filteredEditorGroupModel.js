/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
class FilteredEditorGroupModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._onDidModelChange = this._register(new Emitter());
        this.onDidModelChange = this._onDidModelChange.event;
        this._register(this.model.onDidModelChange(e => {
            const candidateOrIndex = e.editorIndex ?? e.editor;
            if (candidateOrIndex !== undefined) {
                if (!this.filter(candidateOrIndex)) {
                    return; // exclude events for excluded items
                }
            }
            this._onDidModelChange.fire(e);
        }));
    }
    get id() { return this.model.id; }
    get isLocked() { return this.model.isLocked; }
    get stickyCount() { return this.model.stickyCount; }
    get activeEditor() { return this.model.activeEditor && this.filter(this.model.activeEditor) ? this.model.activeEditor : null; }
    get previewEditor() { return this.model.previewEditor && this.filter(this.model.previewEditor) ? this.model.previewEditor : null; }
    get selectedEditors() { return this.model.selectedEditors.filter(e => this.filter(e)); }
    isPinned(editorOrIndex) { return this.model.isPinned(editorOrIndex); }
    isTransient(editorOrIndex) { return this.model.isTransient(editorOrIndex); }
    isSticky(editorOrIndex) { return this.model.isSticky(editorOrIndex); }
    isActive(editor) { return this.model.isActive(editor); }
    isSelected(editorOrIndex) { return this.model.isSelected(editorOrIndex); }
    isFirst(editor) {
        return this.model.isFirst(editor, this.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
    }
    isLast(editor) {
        return this.model.isLast(editor, this.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
    }
    getEditors(order, options) {
        const editors = this.model.getEditors(order, options);
        return editors.filter(e => this.filter(e));
    }
    findEditor(candidate, options) {
        const result = this.model.findEditor(candidate, options);
        if (!result) {
            return undefined;
        }
        return this.filter(result[1]) ? result : undefined;
    }
}
export class StickyEditorGroupModel extends FilteredEditorGroupModel {
    get count() { return this.model.stickyCount; }
    getEditors(order, options) {
        if (options?.excludeSticky) {
            return [];
        }
        if (order === 1 /* EditorsOrder.SEQUENTIAL */) {
            return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */).slice(0, this.model.stickyCount);
        }
        return super.getEditors(order, options);
    }
    isSticky(editorOrIndex) {
        return true;
    }
    getEditorByIndex(index) {
        return index < this.count ? this.model.getEditorByIndex(index) : undefined;
    }
    indexOf(editor, editors, options) {
        const editorIndex = this.model.indexOf(editor, editors, options);
        if (editorIndex < 0 || editorIndex >= this.model.stickyCount) {
            return -1;
        }
        return editorIndex;
    }
    contains(candidate, options) {
        const editorIndex = this.model.indexOf(candidate, undefined, options);
        return editorIndex >= 0 && editorIndex < this.model.stickyCount;
    }
    filter(candidateOrIndex) {
        return this.model.isSticky(candidateOrIndex);
    }
}
export class UnstickyEditorGroupModel extends FilteredEditorGroupModel {
    get count() { return this.model.count - this.model.stickyCount; }
    get stickyCount() { return 0; }
    isSticky(editorOrIndex) {
        return false;
    }
    getEditors(order, options) {
        if (order === 1 /* EditorsOrder.SEQUENTIAL */) {
            return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */).slice(this.model.stickyCount);
        }
        return super.getEditors(order, options);
    }
    getEditorByIndex(index) {
        return index >= 0 ? this.model.getEditorByIndex(index + this.model.stickyCount) : undefined;
    }
    indexOf(editor, editors, options) {
        const editorIndex = this.model.indexOf(editor, editors, options);
        if (editorIndex < this.model.stickyCount || editorIndex >= this.model.count) {
            return -1;
        }
        return editorIndex - this.model.stickyCount;
    }
    contains(candidate, options) {
        const editorIndex = this.model.indexOf(candidate, undefined, options);
        return editorIndex >= this.model.stickyCount && editorIndex < this.model.count;
    }
    filter(candidateOrIndex) {
        return !this.model.isSticky(candidateOrIndex);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyZWRFZGl0b3JHcm91cE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2ZpbHRlcmVkRWRpdG9yR3JvdXBNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE1BQWUsd0JBQXlCLFNBQVEsVUFBVTtJQUt6RCxZQUNvQixLQUFnQztRQUVuRCxLQUFLLEVBQUUsQ0FBQztRQUZXLFVBQUssR0FBTCxLQUFLLENBQTJCO1FBSm5DLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQztRQUNsRixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBT3hELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM5QyxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNuRCxJQUFJLGdCQUFnQixLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7b0JBQ3BDLE9BQU8sQ0FBQyxvQ0FBb0M7Z0JBQzdDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVE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