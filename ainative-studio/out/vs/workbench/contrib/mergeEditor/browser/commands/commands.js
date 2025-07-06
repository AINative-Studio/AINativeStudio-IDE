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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvY29tbWFuZHMvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUduRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxtREFBbUQsQ0FBQztBQUVsRyxPQUFPLEVBQW9CLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRXJELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxzQkFBc0IsRUFBRSwyQkFBMkIsRUFBRSx1Q0FBdUMsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlNLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVyRixNQUFlLGlCQUFrQixTQUFR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