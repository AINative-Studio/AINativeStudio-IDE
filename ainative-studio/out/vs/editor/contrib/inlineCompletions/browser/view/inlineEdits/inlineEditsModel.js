/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derived } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { StringText, TextEdit } from '../../../../../common/core/textEdit.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
export class InlineEditModel {
    constructor(_model, inlineEdit, tabAction) {
        this._model = _model;
        this.inlineEdit = inlineEdit;
        this.tabAction = tabAction;
        this.action = this.inlineEdit.inlineCompletion.action;
        this.displayName = this.inlineEdit.inlineCompletion.source.provider.displayName ?? localize('inlineEdit', "Inline Edit");
        this.extensionCommands = this.inlineEdit.inlineCompletion.source.inlineCompletions.commands ?? [];
        this.showCollapsed = this._model.showCollapsed;
    }
    accept() {
        this._model.accept();
    }
    jump() {
        this._model.jump();
    }
    abort(reason) {
        console.error(reason); // TODO: add logs/telemetry
        this._model.stop();
    }
    handleInlineEditShown() {
        this._model.handleInlineEditShown(this.inlineEdit.inlineCompletion);
    }
}
export class InlineEditHost {
    constructor(_model) {
        this._model = _model;
        this.onDidAccept = this._model.onDidAccept;
        this.inAcceptFlow = this._model.inAcceptFlow;
        this.inPartialAcceptFlow = this._model.inPartialAcceptFlow;
    }
}
export class GhostTextIndicator {
    constructor(editor, model, lineRange, inlineCompletion) {
        this.lineRange = lineRange;
        const editorObs = observableCodeEditor(editor);
        const tabAction = derived(this, reader => {
            if (editorObs.isFocused.read(reader)) {
                if (model.inlineCompletionState.read(reader)?.inlineCompletion?.sourceInlineCompletion.showInlineEditMenu) {
                    return InlineEditTabAction.Accept;
                }
            }
            return InlineEditTabAction.Inactive;
        });
        this.model = new InlineEditModel(model, new InlineEditWithChanges(new StringText(''), new TextEdit([]), model.primaryPosition.get(), inlineCompletion.source.inlineCompletions.commands ?? [], inlineCompletion.inlineCompletion), tabAction);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUk5RSxPQUFPLEVBQXFDLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbkUsTUFBTSxPQUFPLGVBQWU7SUFRM0IsWUFDa0IsTUFBOEIsRUFDdEMsVUFBaUMsRUFDakMsU0FBMkM7UUFGbkMsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7UUFDdEMsZUFBVSxHQUFWLFVBQVUsQ0FBdUI7UUFDakMsY0FBUyxHQUFULFNBQVMsQ0FBa0M7UUFFcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztRQUN0RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN6SCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUVsRyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO0lBQ2hELENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFjO1FBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBMkI7UUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRUQscUJBQXFCO1FBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFjO0lBSzFCLFlBQ2tCLE1BQThCO1FBQTlCLFdBQU0sR0FBTixNQUFNLENBQXdCO1FBRS9DLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7UUFDM0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztRQUM3QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztJQUM1RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBSTlCLFlBQ0MsTUFBbUIsRUFDbkIsS0FBNkIsRUFDcEIsU0FBb0IsRUFDN0IsZ0JBQWtEO1FBRHpDLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFHN0IsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFzQixJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDN0QsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDM0csT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7Z0JBQ25DLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksZUFBZSxDQUMvQixLQUFLLEVBQ0wsSUFBSSxxQkFBcUIsQ0FDeEIsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQ2xCLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUNoQixLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxFQUMzQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFDeEQsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQ2pDLEVBQ0QsU0FBUyxDQUNULENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==