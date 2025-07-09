/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/singleeditortabscontrol.css';
import { EditorTabsControl } from './editorTabsControl.js';
import { Dimension } from '../../../../base/browser/dom.js';
export class NoEditorTabsControl extends EditorTabsControl {
    constructor() {
        super(...arguments);
        this.activeEditor = null;
    }
    prepareEditorActions(editorActions) {
        return {
            primary: [],
            secondary: []
        };
    }
    openEditor(editor) {
        return this.handleOpenedEditors();
    }
    openEditors(editors) {
        return this.handleOpenedEditors();
    }
    handleOpenedEditors() {
        const didChange = this.activeEditorChanged();
        this.activeEditor = this.tabsModel.activeEditor;
        return didChange;
    }
    activeEditorChanged() {
        if (!this.activeEditor && this.tabsModel.activeEditor || // active editor changed from null => editor
            this.activeEditor && !this.tabsModel.activeEditor || // active editor changed from editor => null
            (!this.activeEditor || !this.tabsModel.isActive(this.activeEditor)) // active editor changed from editorA => editorB
        ) {
            return true;
        }
        return false;
    }
    beforeCloseEditor(editor) { }
    closeEditor(editor) {
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        this.activeEditor = this.tabsModel.activeEditor;
    }
    moveEditor(editor, fromIndex, targetIndex) { }
    pinEditor(editor) { }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    setActive(isActive) { }
    updateEditorSelections() { }
    updateEditorLabel(editor) { }
    updateEditorDirty(editor) { }
    getHeight() {
        return 0;
    }
    layout(dimensions) {
        return new Dimension(dimensions.container.width, this.getHeight());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9FZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3Ivbm9FZGl0b3JUYWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFDQUFxQyxDQUFDO0FBRTdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUk1RCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsaUJBQWlCO0lBQTFEOztRQUNTLGlCQUFZLEdBQXVCLElBQUksQ0FBQztJQXVFakQsQ0FBQztJQXJFVSxvQkFBb0IsQ0FBQyxhQUE4QjtRQUM1RCxPQUFPO1lBQ04sT0FBTyxFQUFFLEVBQUU7WUFDWCxTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUM7SUFDSCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFzQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztRQUNoRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLElBQ0MsQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxJQUFRLDRDQUE0QztZQUNyRyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLElBQVEsNENBQTRDO1lBQ3JHLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsZ0RBQWdEO1VBQ25ILENBQUM7WUFDRixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxNQUFtQixJQUFVLENBQUM7SUFFaEQsV0FBVyxDQUFDLE1BQW1CO1FBQzlCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBc0I7UUFDbEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDO0lBQ2pELENBQUM7SUFFRCxVQUFVLENBQUMsTUFBbUIsRUFBRSxTQUFpQixFQUFFLFdBQW1CLElBQVUsQ0FBQztJQUVqRixTQUFTLENBQUMsTUFBbUIsSUFBVSxDQUFDO0lBRXhDLFdBQVcsQ0FBQyxNQUFtQixJQUFVLENBQUM7SUFFMUMsYUFBYSxDQUFDLE1BQW1CLElBQVUsQ0FBQztJQUU1QyxTQUFTLENBQUMsUUFBaUIsSUFBVSxDQUFDO0lBRXRDLHNCQUFzQixLQUFXLENBQUM7SUFFbEMsaUJBQWlCLENBQUMsTUFBbUIsSUFBVSxDQUFDO0lBRWhELGlCQUFpQixDQUFDLE1BQW1CLElBQVUsQ0FBQztJQUVoRCxTQUFTO1FBQ1IsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQXlDO1FBQy9DLE9BQU8sSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFDcEUsQ0FBQztDQUNEIn0=