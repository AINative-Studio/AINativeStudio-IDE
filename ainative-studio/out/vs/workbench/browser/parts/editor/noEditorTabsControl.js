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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9FZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL25vRWRpdG9yVGFic0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxxQ0FBcUMsQ0FBQztBQUU3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFJNUQsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGlCQUFpQjtJQUExRDs7UUFDUyxpQkFBWSxHQUF1QixJQUFJLENBQUM7SUF1RWpELENBQUM7SUFyRVUsb0JBQW9CLENBQUMsYUFBOEI7UUFDNUQsT0FBTztZQUNOLE9BQU8sRUFBRSxFQUFFO1lBQ1gsU0FBUyxFQUFFLEVBQUU7U0FDYixDQUFDO0lBQ0gsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFtQjtRQUM3QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBc0I7UUFDakMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzdDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUM7UUFDaEQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUNDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksSUFBUSw0Q0FBNEM7WUFDckcsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxJQUFRLDRDQUE0QztZQUNyRyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGdEQUFnRDtVQUNuSCxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsTUFBbUIsSUFBVSxDQUFDO0lBRWhELFdBQVcsQ0FBQyxNQUFtQjtRQUM5QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQXNCO1FBQ2xDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztJQUNqRCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQW1CLEVBQUUsU0FBaUIsRUFBRSxXQUFtQixJQUFVLENBQUM7SUFFakYsU0FBUyxDQUFDLE1BQW1CLElBQVUsQ0FBQztJQUV4QyxXQUFXLENBQUMsTUFBbUIsSUFBVSxDQUFDO0lBRTFDLGFBQWEsQ0FBQyxNQUFtQixJQUFVLENBQUM7SUFFNUMsU0FBUyxDQUFDLFFBQWlCLElBQVUsQ0FBQztJQUV0QyxzQkFBc0IsS0FBVyxDQUFDO0lBRWxDLGlCQUFpQixDQUFDLE1BQW1CLElBQVUsQ0FBQztJQUVoRCxpQkFBaUIsQ0FBQyxNQUFtQixJQUFVLENBQUM7SUFFaEQsU0FBUztRQUNSLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUF5QztRQUMvQyxPQUFPLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7Q0FDRCJ9