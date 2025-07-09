/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { MergeEditorInputData } from '../mergeEditorInput.js';
import { MergeEditor } from '../view/mergeEditor.js';
import { ctxIsMergeEditor, ctxMergeEditorLayout, ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop, ctxMergeEditorShowNonConflictingChanges, StorageCloseWithConflicts } from '../../common/mergeEditor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
class MergeEditorAction extends Action2 {
    constructor(desc) {
        super(desc);
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            const vm = activeEditorPane.viewModel.get();
            if (!vm) {
                return;
            }
            this.runWithViewModel(vm, accessor);
        }
    }
}
class MergeEditorAction2 extends Action2 {
    constructor(desc) {
        super(desc);
    }
    run(accessor, ...args) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            const vm = activeEditorPane.viewModel.get();
            if (!vm) {
                return;
            }
            return this.runWithMergeEditor({
                viewModel: vm,
                inputModel: activeEditorPane.inputModel.get(),
                input: activeEditorPane.input,
                editorIdentifier: {
                    editor: activeEditorPane.input,
                    groupId: activeEditorPane.group.id,
                }
            }, accessor, ...args);
        }
    }
}
export class OpenMergeEditor extends Action2 {
    constructor() {
        super({
            id: '_open.mergeEditor',
            title: localize2('title', 'Open Merge Editor'),
        });
    }
    run(accessor, ...args) {
        const validatedArgs = IRelaxedOpenArgs.validate(args[0]);
        const input = {
            base: { resource: validatedArgs.base },
            input1: { resource: validatedArgs.input1.uri, label: validatedArgs.input1.title, description: validatedArgs.input1.description, detail: validatedArgs.input1.detail },
            input2: { resource: validatedArgs.input2.uri, label: validatedArgs.input2.title, description: validatedArgs.input2.description, detail: validatedArgs.input2.detail },
            result: { resource: validatedArgs.output },
            options: { preserveFocus: true }
        };
        accessor.get(IEditorService).openEditor(input);
    }
}
var IRelaxedOpenArgs;
(function (IRelaxedOpenArgs) {
    function validate(obj) {
        if (!obj || typeof obj !== 'object') {
            throw new TypeError('invalid argument');
        }
        const o = obj;
        const base = toUri(o.base);
        const output = toUri(o.output);
        const input1 = toInputData(o.input1);
        const input2 = toInputData(o.input2);
        return { base, input1, input2, output };
    }
    IRelaxedOpenArgs.validate = validate;
    function toInputData(obj) {
        if (typeof obj === 'string') {
            return new MergeEditorInputData(URI.parse(obj, true), undefined, undefined, undefined);
        }
        if (!obj || typeof obj !== 'object') {
            throw new TypeError('invalid argument');
        }
        if (isUriComponents(obj)) {
            return new MergeEditorInputData(URI.revive(obj), undefined, undefined, undefined);
        }
        const o = obj;
        const title = o.title;
        const uri = toUri(o.uri);
        const detail = o.detail;
        const description = o.description;
        return new MergeEditorInputData(uri, title, detail, description);
    }
    function toUri(obj) {
        if (typeof obj === 'string') {
            return URI.parse(obj, true);
        }
        else if (obj && typeof obj === 'object') {
            return URI.revive(obj);
        }
        throw new TypeError('invalid argument');
    }
    function isUriComponents(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        const o = obj;
        return typeof o.scheme === 'string'
            && typeof o.authority === 'string'
            && typeof o.path === 'string'
            && typeof o.query === 'string'
            && typeof o.fragment === 'string';
    }
})(IRelaxedOpenArgs || (IRelaxedOpenArgs = {}));
export class SetMixedLayout extends Action2 {
    constructor() {
        super({
            id: 'merge.mixedLayout',
            title: localize2('layout.mixed', "Mixed Layout"),
            toggled: ctxMergeEditorLayout.isEqualTo('mixed'),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: '1_merge',
                    order: 9,
                },
            ],
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.setLayoutKind('mixed');
        }
    }
}
export class SetColumnLayout extends Action2 {
    constructor() {
        super({
            id: 'merge.columnLayout',
            title: localize2('layout.column', 'Column Layout'),
            toggled: ctxMergeEditorLayout.isEqualTo('columns'),
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: '1_merge',
                    order: 10,
                }],
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.setLayoutKind('columns');
        }
    }
}
export class ShowNonConflictingChanges extends Action2 {
    constructor() {
        super({
            id: 'merge.showNonConflictingChanges',
            title: localize2('showNonConflictingChanges', "Show Non-Conflicting Changes"),
            toggled: ctxMergeEditorShowNonConflictingChanges.isEqualTo(true),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: '3_merge',
                    order: 9,
                },
            ],
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleShowNonConflictingChanges();
        }
    }
}
export class ShowHideBase extends Action2 {
    constructor() {
        super({
            id: 'merge.showBase',
            title: localize2('layout.showBase', "Show Base"),
            toggled: ctxMergeEditorShowBase.isEqualTo(true),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ctxIsMergeEditor, ctxMergeEditorLayout.isEqualTo('columns')),
                    group: '2_merge',
                    order: 9,
                },
            ]
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleBase();
        }
    }
}
export class ShowHideTopBase extends Action2 {
    constructor() {
        super({
            id: 'merge.showBaseTop',
            title: localize2('layout.showBaseTop', "Show Base Top"),
            toggled: ContextKeyExpr.and(ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ctxIsMergeEditor, ctxMergeEditorLayout.isEqualTo('mixed')),
                    group: '2_merge',
                    order: 10,
                },
            ],
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleShowBaseTop();
        }
    }
}
export class ShowHideCenterBase extends Action2 {
    constructor() {
        super({
            id: 'merge.showBaseCenter',
            title: localize2('layout.showBaseCenter', "Show Base Center"),
            toggled: ContextKeyExpr.and(ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop.negate()),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ctxIsMergeEditor, ctxMergeEditorLayout.isEqualTo('mixed')),
                    group: '2_merge',
                    order: 11,
                },
            ],
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleShowBaseCenter();
        }
    }
}
const mergeEditorCategory = localize2('mergeEditor', "Merge Editor");
export class OpenResultResource extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.openResult',
            icon: Codicon.goToFile,
            title: localize2('openfile', "Open File"),
            category: mergeEditorCategory,
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: 'navigation',
                    order: 1,
                }],
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const editorService = accessor.get(IEditorService);
        editorService.openEditor({ resource: viewModel.model.resultTextModel.uri });
    }
}
export class GoToNextUnhandledConflict extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.goToNextUnhandledConflict',
            category: mergeEditorCategory,
            title: localize2('merge.goToNextUnhandledConflict', "Go to Next Unhandled Conflict"),
            icon: Codicon.arrowDown,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: 'navigation',
                    order: 3
                },
            ],
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.model.telemetry.reportNavigationToNextConflict();
        viewModel.goToNextModifiedBaseRange(r => !viewModel.model.isHandled(r).get());
    }
}
export class GoToPreviousUnhandledConflict extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.goToPreviousUnhandledConflict',
            category: mergeEditorCategory,
            title: localize2('merge.goToPreviousUnhandledConflict', "Go to Previous Unhandled Conflict"),
            icon: Codicon.arrowUp,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: 'navigation',
                    order: 2
                },
            ],
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.model.telemetry.reportNavigationToPreviousConflict();
        viewModel.goToPreviousModifiedBaseRange(r => !viewModel.model.isHandled(r).get());
    }
}
export class ToggleActiveConflictInput1 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.toggleActiveConflictInput1',
            category: mergeEditorCategory,
            title: localize2('merge.toggleCurrentConflictFromLeft', "Toggle Current Conflict from Left"),
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.toggleActiveConflict(1);
    }
}
export class ToggleActiveConflictInput2 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.toggleActiveConflictInput2',
            category: mergeEditorCategory,
            title: localize2('merge.toggleCurrentConflictFromRight', "Toggle Current Conflict from Right"),
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.toggleActiveConflict(2);
    }
}
export class CompareInput1WithBaseCommand extends MergeEditorAction {
    constructor() {
        super({
            id: 'mergeEditor.compareInput1WithBase',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.compareInput1WithBase', "Compare Input 1 With Base"),
            shortTitle: localize('mergeEditor.compareWithBase', 'Compare With Base'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput1Toolbar, group: 'primary' },
            icon: Codicon.compareChanges,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const editorService = accessor.get(IEditorService);
        mergeEditorCompare(viewModel, editorService, 1);
    }
}
export class CompareInput2WithBaseCommand extends MergeEditorAction {
    constructor() {
        super({
            id: 'mergeEditor.compareInput2WithBase',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.compareInput2WithBase', "Compare Input 2 With Base"),
            shortTitle: localize('mergeEditor.compareWithBase', 'Compare With Base'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput2Toolbar, group: 'primary' },
            icon: Codicon.compareChanges,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const editorService = accessor.get(IEditorService);
        mergeEditorCompare(viewModel, editorService, 2);
    }
}
async function mergeEditorCompare(viewModel, editorService, inputNumber) {
    editorService.openEditor(editorService.activeEditor, { pinned: true });
    const model = viewModel.model;
    const base = model.base;
    const input = inputNumber === 1 ? viewModel.inputCodeEditorView1.editor : viewModel.inputCodeEditorView2.editor;
    const lineNumber = input.getPosition().lineNumber;
    await editorService.openEditor({
        original: { resource: base.uri },
        modified: { resource: input.getModel().uri },
        options: {
            selection: {
                startLineNumber: lineNumber,
                startColumn: 1,
            },
            revealIfOpened: true,
            revealIfVisible: true,
        }
    });
}
export class OpenBaseFile extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.openBaseEditor',
            category: mergeEditorCategory,
            title: localize2('merge.openBaseEditor', "Open Base File"),
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const openerService = accessor.get(IOpenerService);
        openerService.open(viewModel.model.base.uri);
    }
}
export class AcceptAllInput1 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.acceptAllInput1',
            category: mergeEditorCategory,
            title: localize2('merge.acceptAllInput1', "Accept All Changes from Left"),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput1Toolbar, group: 'primary' },
            icon: Codicon.checkAll,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.acceptAll(1);
    }
}
export class AcceptAllInput2 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.acceptAllInput2',
            category: mergeEditorCategory,
            title: localize2('merge.acceptAllInput2', "Accept All Changes from Right"),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput2Toolbar, group: 'primary' },
            icon: Codicon.checkAll,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.acceptAll(2);
    }
}
export class ResetToBaseAndAutoMergeCommand extends MergeEditorAction {
    constructor() {
        super({
            id: 'mergeEditor.resetResultToBaseAndAutoMerge',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.resetResultToBaseAndAutoMerge', "Reset Result"),
            shortTitle: localize('mergeEditor.resetResultToBaseAndAutoMerge.short', 'Reset'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInputResultToolbar, group: 'primary' },
            icon: Codicon.discard,
        });
    }
    runWithViewModel(viewModel, accessor) {
        viewModel.model.reset();
    }
}
export class ResetCloseWithConflictsChoice extends Action2 {
    constructor() {
        super({
            id: 'mergeEditor.resetCloseWithConflictsChoice',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.resetChoice', "Reset Choice for \'Close with Conflicts\'"),
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove(StorageCloseWithConflicts, 0 /* StorageScope.PROFILE */);
    }
}
// this is an API command
export class AcceptMerge extends MergeEditorAction2 {
    constructor() {
        super({
            id: 'mergeEditor.acceptMerge',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.acceptMerge', "Complete Merge"),
            f1: false,
            precondition: ctxIsMergeEditor
        });
    }
    async runWithMergeEditor({ inputModel, editorIdentifier, viewModel }, accessor) {
        const dialogService = accessor.get(IDialogService);
        const editorService = accessor.get(IEditorService);
        if (viewModel.model.unhandledConflictsCount.get() > 0) {
            const { confirmed } = await dialogService.confirm({
                message: localize('mergeEditor.acceptMerge.unhandledConflicts.message', "Do you want to complete the merge of {0}?", basename(inputModel.resultUri)),
                detail: localize('mergeEditor.acceptMerge.unhandledConflicts.detail', "The file contains unhandled conflicts."),
                primaryButton: localize({ key: 'mergeEditor.acceptMerge.unhandledConflicts.accept', comment: ['&& denotes a mnemonic'] }, "&&Complete with Conflicts")
            });
            if (!confirmed) {
                return {
                    successful: false
                };
            }
        }
        await inputModel.accept();
        await editorService.closeEditor(editorIdentifier);
        return {
            successful: true
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9jb21tYW5kcy9jb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBR25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLG1EQUFtRCxDQUFDO0FBRWxHLE9BQU8sRUFBb0Isb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLDJCQUEyQixFQUFFLHVDQUF1QyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOU0sT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXJGLE1BQWUsaUJBQWtCLFNBQVEsT0FBTztJQUMvQyxZQUFZLElBQStCO1FBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNiLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRCxJQUFJLGdCQUFnQixZQUFZLFdBQVcsRUFBRSxDQUFDO1lBQzdDLE1BQU0sRUFBRSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ1QsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0NBR0Q7QUFTRCxNQUFlLGtCQUFtQixTQUFRLE9BQU87SUFDaEQsWUFBWSxJQUErQjtRQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDYixDQUFDO0lBRVEsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQ3RELE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUQsSUFBSSxnQkFBZ0IsWUFBWSxXQUFXLEVBQUUsQ0FBQztZQUM3QyxNQUFNLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNULE9BQU87WUFDUixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUM7Z0JBQzlCLFNBQVMsRUFBRSxFQUFFO2dCQUNiLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFHO2dCQUM5QyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsS0FBeUI7Z0JBQ2pELGdCQUFnQixFQUFFO29CQUNqQixNQUFNLEVBQUUsZ0JBQWdCLENBQUMsS0FBSztvQkFDOUIsT0FBTyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFO2lCQUNsQzthQUNELEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFRLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7Q0FHRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLE9BQU87SUFDM0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUJBQW1CO1lBQ3ZCLEtBQUssRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLG1CQUFtQixDQUFDO1NBQzlDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQWU7UUFDakQsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpELE1BQU0sS0FBSyxHQUE4QjtZQUN4QyxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRTtZQUN0QyxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDckssTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ3JLLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQzFDLE9BQU8sRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUU7U0FDaEMsQ0FBQztRQUNGLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRDtBQUVELElBQVUsZ0JBQWdCLENBMkR6QjtBQTNERCxXQUFVLGdCQUFnQjtJQUN6QixTQUFnQixRQUFRLENBQUMsR0FBWTtRQU1wQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsR0FBdUIsQ0FBQztRQUNsQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0IsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBaEJlLHlCQUFRLFdBZ0J2QixDQUFBO0lBRUQsU0FBUyxXQUFXLENBQUMsR0FBWTtRQUNoQyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzdCLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ25GLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxHQUF3QixDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDdEIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3hCLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDbEMsT0FBTyxJQUFJLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxHQUFZO1FBQzFCLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0IsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QixDQUFDO2FBQU0sSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFnQixHQUFHLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsTUFBTSxJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBQyxHQUFZO1FBQ3BDLElBQUksQ0FBQyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsR0FBb0IsQ0FBQztRQUMvQixPQUFPLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRO2VBQy9CLE9BQU8sQ0FBQyxDQUFDLFNBQVMsS0FBSyxRQUFRO2VBQy9CLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRO2VBQzFCLE9BQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRO2VBQzNCLE9BQU8sQ0FBQyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUM7SUFDcEMsQ0FBQztBQUNGLENBQUMsRUEzRFMsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQTJEekI7QUFXRCxNQUFNLE9BQU8sY0FBZSxTQUFRLE9BQU87SUFDMUM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUJBQW1CO1lBQ3ZCLEtBQUssRUFBRSxTQUFTLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQztZQUNoRCxPQUFPLEVBQUUsb0JBQW9CLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztZQUNoRCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixLQUFLLEVBQUUsU0FBUztvQkFDaEIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFlBQVksRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksZ0JBQWdCLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDN0MsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxPQUFPO0lBQzNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixLQUFLLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUM7WUFDbEQsT0FBTyxFQUFFLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDbEQsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixLQUFLLEVBQUUsU0FBUztvQkFDaEIsS0FBSyxFQUFFLEVBQUU7aUJBQ1QsQ0FBQztZQUNGLFlBQVksRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksZ0JBQWdCLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDN0MsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsT0FBTztJQUNyRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQ0FBaUM7WUFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSw4QkFBOEIsQ0FBQztZQUM3RSxPQUFPLEVBQUUsdUNBQXVDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztZQUNoRSxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixLQUFLLEVBQUUsU0FBUztvQkFDaEIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFlBQVksRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksZ0JBQWdCLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDN0MsZ0JBQWdCLENBQUMsK0JBQStCLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSxPQUFPO0lBQ3hDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdCQUFnQjtZQUNwQixLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQztZQUNoRCxPQUFPLEVBQUUsc0JBQXNCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztZQUMvQyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3JGLEtBQUssRUFBRSxTQUFTO29CQUNoQixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksZ0JBQWdCLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDN0MsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLE9BQU87SUFDM0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUJBQW1CO1lBQ3ZCLEtBQUssRUFBRSxTQUFTLENBQUMsb0JBQW9CLEVBQUUsZUFBZSxDQUFDO1lBQ3ZELE9BQU8sRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLDJCQUEyQixDQUFDO1lBQ2hGLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDbkYsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0Q7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUQsSUFBSSxnQkFBZ0IsWUFBWSxXQUFXLEVBQUUsQ0FBQztZQUM3QyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsT0FBTztJQUM5QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQztZQUM3RCxPQUFPLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ25GLEtBQUssRUFBRSxTQUFTO29CQUNoQixLQUFLLEVBQUUsRUFBRTtpQkFDVDthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksZ0JBQWdCLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDN0MsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN6QyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxtQkFBbUIsR0FBcUIsU0FBUyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztBQUV2RixNQUFNLE9BQU8sa0JBQW1CLFNBQVEsaUJBQWlCO0lBQ3hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVE7WUFDdEIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO1lBQ3pDLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFlBQVksRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFNBQStCLEVBQUUsUUFBMEI7UUFDcEYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDN0UsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLGlCQUFpQjtJQUMvRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQ0FBaUM7WUFDckMsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLGlDQUFpQyxFQUFFLCtCQUErQixDQUFDO1lBQ3BGLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUztZQUN2QixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGdCQUFnQjtTQUM5QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsZ0JBQWdCLENBQUMsU0FBK0I7UUFDeEQsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUMzRCxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDL0UsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLGlCQUFpQjtJQUNuRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQ0FBcUM7WUFDekMsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLHFDQUFxQyxFQUFFLG1DQUFtQyxDQUFDO1lBQzVGLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztZQUNyQixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGdCQUFnQjtTQUM5QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsZ0JBQWdCLENBQUMsU0FBK0I7UUFDeEQsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztRQUMvRCxTQUFTLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGlCQUFpQjtJQUNoRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxrQ0FBa0M7WUFDdEMsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLHFDQUFxQyxFQUFFLG1DQUFtQyxDQUFDO1lBQzVGLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGdCQUFnQjtTQUM5QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsZ0JBQWdCLENBQUMsU0FBK0I7UUFDeEQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxpQkFBaUI7SUFDaEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0NBQWtDO1lBQ3RDLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSxvQ0FBb0MsQ0FBQztZQUM5RixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFNBQStCO1FBQ3hELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsaUJBQWlCO0lBQ2xFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1DQUFtQztZQUN2QyxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsbUNBQW1DLEVBQUUsMkJBQTJCLENBQUM7WUFDbEYsVUFBVSxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxtQkFBbUIsQ0FBQztZQUN4RSxFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxnQkFBZ0I7WUFDOUIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO1lBQ3pELElBQUksRUFBRSxPQUFPLENBQUMsY0FBYztTQUM1QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsZ0JBQWdCLENBQUMsU0FBK0IsRUFBRSxRQUEwQjtRQUNwRixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELGtCQUFrQixDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDRCQUE2QixTQUFRLGlCQUFpQjtJQUNsRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLG1DQUFtQyxFQUFFLDJCQUEyQixDQUFDO1lBQ2xGLFVBQVUsRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsbUJBQW1CLENBQUM7WUFDeEUsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsZ0JBQWdCO1lBQzlCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUN6RCxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWM7U0FDNUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFNBQStCLEVBQUUsUUFBMEI7UUFDcEYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FDRDtBQUVELEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxTQUErQixFQUFFLGFBQTZCLEVBQUUsV0FBa0I7SUFFbkgsYUFBYSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsWUFBYSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFFeEUsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztJQUM5QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3hCLE1BQU0sS0FBSyxHQUFHLFdBQVcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUM7SUFFaEgsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRyxDQUFDLFVBQVUsQ0FBQztJQUNuRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7UUFDOUIsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDaEMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUcsQ0FBQyxHQUFHLEVBQUU7UUFDN0MsT0FBTyxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNWLGVBQWUsRUFBRSxVQUFVO2dCQUMzQixXQUFXLEVBQUUsQ0FBQzthQUNkO1lBQ0QsY0FBYyxFQUFFLElBQUk7WUFDcEIsZUFBZSxFQUFFLElBQUk7U0FDUTtLQUM5QixDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSxpQkFBaUI7SUFDbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxnQkFBZ0IsQ0FBQztZQUMxRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFNBQStCLEVBQUUsUUFBMEI7UUFDcEYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLGlCQUFpQjtJQUNyRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLHVCQUF1QixFQUFFLDhCQUE4QixDQUFDO1lBQ3pFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGdCQUFnQjtZQUM5QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDekQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1NBQ3RCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxnQkFBZ0IsQ0FBQyxTQUErQjtRQUN4RCxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLGlCQUFpQjtJQUNyRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLHVCQUF1QixFQUFFLCtCQUErQixDQUFDO1lBQzFFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGdCQUFnQjtZQUM5QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDekQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1NBQ3RCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxnQkFBZ0IsQ0FBQyxTQUErQjtRQUN4RCxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxpQkFBaUI7SUFDcEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkNBQTJDO1lBQy9DLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQ0FBMkMsRUFBRSxjQUFjLENBQUM7WUFDN0UsVUFBVSxFQUFFLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSxPQUFPLENBQUM7WUFDaEYsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsZ0JBQWdCO1lBQzlCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUM5RCxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU87U0FDckIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFNBQStCLEVBQUUsUUFBMEI7UUFDcEYsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsT0FBTztJQUN6RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQ0FBMkM7WUFDL0MsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLHlCQUF5QixFQUFFLDJDQUEyQyxDQUFDO1lBQ3hGLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsK0JBQXVCLENBQUM7SUFDdkYsQ0FBQztDQUNEO0FBRUQseUJBQXlCO0FBQ3pCLE1BQU0sT0FBTyxXQUFZLFNBQVEsa0JBQWtCO0lBQ2xEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlCQUF5QjtZQUM3QixRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMseUJBQXlCLEVBQUUsZ0JBQWdCLENBQUM7WUFDN0QsRUFBRSxFQUFFLEtBQUs7WUFDVCxZQUFZLEVBQUUsZ0JBQWdCO1NBQzlCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUEwQixFQUFFLFFBQTBCO1FBQ2hJLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkQsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDakQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxvREFBb0QsRUFBRSwyQ0FBMkMsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNwSixNQUFNLEVBQUUsUUFBUSxDQUFDLG1EQUFtRCxFQUFFLHdDQUF3QyxDQUFDO2dCQUMvRyxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLG1EQUFtRCxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQzthQUN0SixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU87b0JBQ04sVUFBVSxFQUFFLEtBQUs7aUJBQ2pCLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFCLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRWxELE9BQU87WUFDTixVQUFVLEVBQUUsSUFBSTtTQUNoQixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=