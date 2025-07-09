/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, ctxReviewModeEnabled } from './chatEditingEditorContextKeys.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, IChatEditingService } from '../../common/chatEditingService.js';
import { resolveCommandsContext } from '../../../../browser/parts/editor/editorCommandsContext.js';
import { IListService } from '../../../../../platform/list/browser/listService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { EditorResourceAccessor, SideBySideEditor, TEXT_DIFF_EDITOR_ID } from '../../../../common/editor.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
class ChatEditingEditorAction extends Action2 {
    constructor(desc) {
        super({
            category: CHAT_CATEGORY,
            ...desc
        });
    }
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const uri = EditorResourceAccessor.getOriginalUri(editorService.activeEditorPane?.input, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!uri || !editorService.activeEditorPane) {
            return;
        }
        const session = chatEditingService.editingSessionsObs.get()
            .find(candidate => candidate.getEntry(uri));
        if (!session) {
            return;
        }
        const entry = session.getEntry(uri);
        const ctrl = entry.getEditorIntegration(editorService.activeEditorPane);
        return instaService.invokeFunction(this.runChatEditingCommand.bind(this), session, entry, ctrl, ...args);
    }
}
class NavigateAction extends ChatEditingEditorAction {
    constructor(next) {
        super({
            id: next
                ? 'chatEditor.action.navigateNext'
                : 'chatEditor.action.navigatePrevious',
            title: next
                ? localize2('next', 'Go to Next Chat Edit')
                : localize2('prev', 'Go to Previous Chat Edit'),
            icon: next ? Codicon.arrowDown : Codicon.arrowUp,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ctxHasRequestInProgress.negate()),
            keybinding: {
                primary: next
                    ? 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */
                    : 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(ctxHasEditorModification, EditorContextKeys.focus),
            },
            f1: true,
            menu: {
                id: MenuId.ChatEditingEditorContent,
                group: 'navigate',
                order: !next ? 2 : 3,
                when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasRequestInProgress.negate())
            }
        });
        this.next = next;
    }
    async runChatEditingCommand(accessor, session, entry, ctrl) {
        const instaService = accessor.get(IInstantiationService);
        const done = this.next
            ? ctrl.next(false)
            : ctrl.previous(false);
        if (done) {
            return;
        }
        const didOpenNext = await instaService.invokeFunction(openNextOrPreviousChange, session, entry, this.next);
        if (didOpenNext) {
            return;
        }
        //ELSE: wrap inside the same file
        this.next
            ? ctrl.next(true)
            : ctrl.previous(true);
    }
}
async function openNextOrPreviousChange(accessor, session, entry, next) {
    const editorService = accessor.get(IEditorService);
    const entries = session.entries.get();
    let idx = entries.indexOf(entry);
    let newEntry;
    while (true) {
        idx = (idx + (next ? 1 : -1) + entries.length) % entries.length;
        newEntry = entries[idx];
        if (newEntry.state.get() === 0 /* WorkingSetEntryState.Modified */) {
            break;
        }
        else if (newEntry === entry) {
            return false;
        }
    }
    const pane = await editorService.openEditor({
        resource: newEntry.modifiedURI,
        options: {
            revealIfOpened: false,
            revealIfVisible: false,
        }
    }, ACTIVE_GROUP);
    if (!pane) {
        return false;
    }
    if (session.entries.get().includes(newEntry)) {
        // make sure newEntry is still valid!
        newEntry.getEditorIntegration(pane).reveal(next);
    }
    return true;
}
class AcceptDiscardAction extends ChatEditingEditorAction {
    constructor(id, accept) {
        super({
            id,
            title: accept
                ? localize2('accept', 'Keep Chat Edits')
                : localize2('discard', 'Undo Chat Edits'),
            shortTitle: accept
                ? localize2('accept2', 'Keep')
                : localize2('discard2', 'Undo'),
            tooltip: accept
                ? localize2('accept3', 'Keep Chat Edits in this File')
                : localize2('discard3', 'Undo Chat Edits in this File'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: accept
                ? Codicon.check
                : Codicon.discard,
            f1: true,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: accept
                    ? 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */
                    : 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */
            },
            menu: {
                id: MenuId.ChatEditingEditorContent,
                group: 'a_resolve',
                order: accept ? 0 : 1,
                when: ContextKeyExpr.and(!accept ? ctxReviewModeEnabled : undefined, ctxHasRequestInProgress.negate())
            }
        });
        this.accept = accept;
    }
    async runChatEditingCommand(accessor, session, entry, _integration) {
        const instaService = accessor.get(IInstantiationService);
        if (this.accept) {
            session.accept(entry.modifiedURI);
        }
        else {
            session.reject(entry.modifiedURI);
        }
        await instaService.invokeFunction(openNextOrPreviousChange, session, entry, true);
    }
}
export class AcceptAction extends AcceptDiscardAction {
    static { this.ID = 'chatEditor.action.accept'; }
    constructor() {
        super(AcceptAction.ID, true);
    }
}
export class RejectAction extends AcceptDiscardAction {
    static { this.ID = 'chatEditor.action.reject'; }
    constructor() {
        super(RejectAction.ID, false);
    }
}
class AcceptRejectHunkAction extends ChatEditingEditorAction {
    constructor(_accept) {
        super({
            id: _accept ? 'chatEditor.action.acceptHunk' : 'chatEditor.action.undoHunk',
            title: _accept ? localize2('acceptHunk', 'Keep this Change') : localize2('undo', 'Undo this Change'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: _accept ? Codicon.check : Codicon.discard,
            f1: true,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: _accept
                    ? 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */
                    : 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */
            },
            menu: {
                id: MenuId.ChatEditingEditorHunk,
                order: 1
            }
        });
        this._accept = _accept;
    }
    runChatEditingCommand(_accessor, _session, _entry, ctrl, ...args) {
        if (this._accept) {
            ctrl.acceptNearestChange(args[0]);
        }
        else {
            ctrl.rejectNearestChange(args[0]);
        }
    }
}
class ToggleDiffAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.toggleDiff',
            title: localize2('diff', 'Toggle Diff Editor'),
            category: CHAT_CATEGORY,
            toggled: {
                condition: ContextKeyExpr.or(EditorContextKeys.inDiffEditor, ActiveEditorContext.isEqualTo(TEXT_DIFF_EDITOR_ID)),
                icon: Codicon.goToFile,
            },
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: Codicon.diffSingle,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
            },
            menu: [{
                    id: MenuId.ChatEditingEditorHunk,
                    order: 10
                }, {
                    id: MenuId.ChatEditingEditorContent,
                    group: 'a_resolve',
                    order: 2,
                    when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasRequestInProgress.negate())
                }]
        });
    }
    runChatEditingCommand(_accessor, _session, _entry, integration, ...args) {
        integration.toggleDiff(args[0]);
    }
}
class ToggleAccessibleDiffViewAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.showAccessibleDiffView',
            title: localize2('accessibleDiff', 'Show Accessible Diff View'),
            f1: true,
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */,
            }
        });
    }
    runChatEditingCommand(_accessor, _session, _entry, integration) {
        integration.enableAccessibleDiffView();
    }
}
export class ReviewChangesAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.reviewChanges',
            title: localize2('review', "Review"),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            menu: [{
                    id: MenuId.ChatEditingEditorContent,
                    group: 'a_resolve',
                    order: 3,
                    when: ContextKeyExpr.and(ctxReviewModeEnabled.negate(), ctxHasRequestInProgress.negate()),
                }]
        });
    }
    runChatEditingCommand(_accessor, _session, entry, _integration, ..._args) {
        entry.enableReviewModeUntilSettled();
    }
}
// --- multi file diff
class MultiDiffAcceptDiscardAction extends Action2 {
    constructor(accept) {
        super({
            id: accept ? 'chatEditing.multidiff.acceptAllFiles' : 'chatEditing.multidiff.discardAllFiles',
            title: accept ? localize('accept4', 'Keep All Edits') : localize('discard4', 'Undo All Edits'),
            icon: accept ? Codicon.check : Codicon.discard,
            menu: {
                when: ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME),
                id: MenuId.EditorTitle,
                order: accept ? 0 : 1,
                group: 'navigation',
            },
        });
        this.accept = accept;
    }
    async run(accessor, ...args) {
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (!(editor instanceof MultiDiffEditorInput) || !editor.resource) {
            return;
        }
        const session = chatEditingService.getEditingSession(editor.resource.authority);
        if (this.accept) {
            await session?.accept();
        }
        else {
            await session?.reject();
        }
    }
}
export function registerChatEditorActions() {
    registerAction2(class NextAction extends NavigateAction {
        constructor() { super(true); }
    });
    registerAction2(class PrevAction extends NavigateAction {
        constructor() { super(false); }
    });
    registerAction2(ReviewChangesAction);
    registerAction2(AcceptAction);
    registerAction2(RejectAction);
    registerAction2(class AcceptHunkAction extends AcceptRejectHunkAction {
        constructor() { super(true); }
    });
    registerAction2(class AcceptHunkAction extends AcceptRejectHunkAction {
        constructor() { super(false); }
    });
    registerAction2(ToggleDiffAction);
    registerAction2(ToggleAccessibleDiffViewAction);
    registerAction2(class extends MultiDiffAcceptDiscardAction {
        constructor() { super(true); }
    });
    registerAction2(class extends MultiDiffAcceptDiscardAction {
        constructor() { super(false); }
    });
    MenuRegistry.appendMenuItem(MenuId.ChatEditingEditorContent, {
        command: {
            id: navigationBearingFakeActionId,
            title: localize('label', "Navigation Status"),
            precondition: ContextKeyExpr.false(),
        },
        group: 'navigate',
        order: -1,
        when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasRequestInProgress.negate()),
    });
}
export const navigationBearingFakeActionId = 'chatEditor.navigation.bearings';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0VkaXRvckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdwSSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkcsT0FBTyxFQUFFLDhDQUE4QyxFQUFFLG1CQUFtQixFQUFzRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzdOLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFB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