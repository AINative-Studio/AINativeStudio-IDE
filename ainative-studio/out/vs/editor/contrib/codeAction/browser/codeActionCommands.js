/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { EditorAction, EditorCommand } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { autoFixCommandId, codeActionCommandId, fixAllCommandId, organizeImportsCommandId, quickFixCommandId, refactorCommandId, sourceActionCommandId } from './codeAction.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { CodeActionCommandArgs, CodeActionKind, CodeActionTriggerSource } from '../common/types.js';
import { CodeActionController } from './codeActionController.js';
import { SUPPORTED_CODE_ACTIONS } from './codeActionModel.js';
function contextKeyForSupportedActions(kind) {
    return ContextKeyExpr.regex(SUPPORTED_CODE_ACTIONS.keys()[0], new RegExp('(\\s|^)' + escapeRegExpCharacters(kind.value) + '\\b'));
}
const argsSchema = {
    type: 'object',
    defaultSnippets: [{ body: { kind: '' } }],
    properties: {
        'kind': {
            type: 'string',
            description: nls.localize('args.schema.kind', "Kind of the code action to run."),
        },
        'apply': {
            type: 'string',
            description: nls.localize('args.schema.apply', "Controls when the returned actions are applied."),
            default: "ifSingle" /* CodeActionAutoApply.IfSingle */,
            enum: ["first" /* CodeActionAutoApply.First */, "ifSingle" /* CodeActionAutoApply.IfSingle */, "never" /* CodeActionAutoApply.Never */],
            enumDescriptions: [
                nls.localize('args.schema.apply.first', "Always apply the first returned code action."),
                nls.localize('args.schema.apply.ifSingle', "Apply the first returned code action if it is the only one."),
                nls.localize('args.schema.apply.never', "Do not apply the returned code actions."),
            ]
        },
        'preferred': {
            type: 'boolean',
            default: false,
            description: nls.localize('args.schema.preferred', "Controls if only preferred code actions should be returned."),
        }
    }
};
function triggerCodeActionsForEditorSelection(editor, notAvailableMessage, filter, autoApply, triggerAction = CodeActionTriggerSource.Default) {
    if (editor.hasModel()) {
        const controller = CodeActionController.get(editor);
        controller?.manualTriggerAtCurrentPosition(notAvailableMessage, triggerAction, filter, autoApply);
    }
}
export class QuickFixAction extends EditorAction {
    constructor() {
        super({
            id: quickFixCommandId,
            label: nls.localize2('quickfix.trigger.label', "Quick Fix..."),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.quickFix.noneMessage', "No code actions available"), undefined, undefined, CodeActionTriggerSource.QuickFix);
    }
}
export class CodeActionCommand extends EditorCommand {
    constructor() {
        super({
            id: codeActionCommandId,
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            metadata: {
                description: 'Trigger a code action',
                args: [{ name: 'args', schema: argsSchema, }]
            }
        });
    }
    runEditorCommand(_accessor, editor, userArgs) {
        const args = CodeActionCommandArgs.fromUser(userArgs, {
            kind: HierarchicalKind.Empty,
            apply: "ifSingle" /* CodeActionAutoApply.IfSingle */,
        });
        return triggerCodeActionsForEditorSelection(editor, typeof userArgs?.kind === 'string'
            ? args.preferred
                ? nls.localize('editor.action.codeAction.noneMessage.preferred.kind', "No preferred code actions for '{0}' available", userArgs.kind)
                : nls.localize('editor.action.codeAction.noneMessage.kind', "No code actions for '{0}' available", userArgs.kind)
            : args.preferred
                ? nls.localize('editor.action.codeAction.noneMessage.preferred', "No preferred code actions available")
                : nls.localize('editor.action.codeAction.noneMessage', "No code actions available"), {
            include: args.kind,
            includeSourceActions: true,
            onlyIncludePreferredActions: args.preferred,
        }, args.apply);
    }
}
export class RefactorAction extends EditorAction {
    constructor() {
        super({
            id: refactorCommandId,
            label: nls.localize2('refactor.label', "Refactor..."),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 2,
                when: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.Refactor)),
            },
            metadata: {
                description: 'Refactor...',
                args: [{ name: 'args', schema: argsSchema }]
            }
        });
    }
    run(_accessor, editor, userArgs) {
        const args = CodeActionCommandArgs.fromUser(userArgs, {
            kind: CodeActionKind.Refactor,
            apply: "never" /* CodeActionAutoApply.Never */
        });
        return triggerCodeActionsForEditorSelection(editor, typeof userArgs?.kind === 'string'
            ? args.preferred
                ? nls.localize('editor.action.refactor.noneMessage.preferred.kind', "No preferred refactorings for '{0}' available", userArgs.kind)
                : nls.localize('editor.action.refactor.noneMessage.kind', "No refactorings for '{0}' available", userArgs.kind)
            : args.preferred
                ? nls.localize('editor.action.refactor.noneMessage.preferred', "No preferred refactorings available")
                : nls.localize('editor.action.refactor.noneMessage', "No refactorings available"), {
            include: CodeActionKind.Refactor.contains(args.kind) ? args.kind : HierarchicalKind.None,
            onlyIncludePreferredActions: args.preferred
        }, args.apply, CodeActionTriggerSource.Refactor);
    }
}
export class SourceAction extends EditorAction {
    constructor() {
        super({
            id: sourceActionCommandId,
            label: nls.localize2('source.label', "Source Action..."),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCodeActionsProvider),
            contextMenuOpts: {
                group: '1_modification',
                order: 2.1,
                when: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.Source)),
            },
            metadata: {
                description: 'Source Action...',
                args: [{ name: 'args', schema: argsSchema }]
            }
        });
    }
    run(_accessor, editor, userArgs) {
        const args = CodeActionCommandArgs.fromUser(userArgs, {
            kind: CodeActionKind.Source,
            apply: "never" /* CodeActionAutoApply.Never */
        });
        return triggerCodeActionsForEditorSelection(editor, typeof userArgs?.kind === 'string'
            ? args.preferred
                ? nls.localize('editor.action.source.noneMessage.preferred.kind', "No preferred source actions for '{0}' available", userArgs.kind)
                : nls.localize('editor.action.source.noneMessage.kind', "No source actions for '{0}' available", userArgs.kind)
            : args.preferred
                ? nls.localize('editor.action.source.noneMessage.preferred', "No preferred source actions available")
                : nls.localize('editor.action.source.noneMessage', "No source actions available"), {
            include: CodeActionKind.Source.contains(args.kind) ? args.kind : HierarchicalKind.None,
            includeSourceActions: true,
            onlyIncludePreferredActions: args.preferred,
        }, args.apply, CodeActionTriggerSource.SourceAction);
    }
}
export class OrganizeImportsAction extends EditorAction {
    constructor() {
        super({
            id: organizeImportsCommandId,
            label: nls.localize2('organizeImports.label', "Organize Imports"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.SourceOrganizeImports)),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            metadata: {
                description: nls.localize2('organizeImports.description', "Organize imports in the current file. Also called 'Optimize Imports' by some tools")
            }
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.organize.noneMessage', "No organize imports action available"), { include: CodeActionKind.SourceOrganizeImports, includeSourceActions: true }, "ifSingle" /* CodeActionAutoApply.IfSingle */, CodeActionTriggerSource.OrganizeImports);
    }
}
export class FixAllAction extends EditorAction {
    constructor() {
        super({
            id: fixAllCommandId,
            label: nls.localize2('fixAll.label', "Fix All"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.SourceFixAll))
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('fixAll.noneMessage', "No fix all action available"), { include: CodeActionKind.SourceFixAll, includeSourceActions: true }, "ifSingle" /* CodeActionAutoApply.IfSingle */, CodeActionTriggerSource.FixAll);
    }
}
export class AutoFixAction extends EditorAction {
    constructor() {
        super({
            id: autoFixCommandId,
            label: nls.localize2('autoFix.label', "Auto Fix..."),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, contextKeyForSupportedActions(CodeActionKind.QuickFix)),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 89 /* KeyCode.Period */
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.autoFix.noneMessage', "No auto fixes available"), {
            include: CodeActionKind.QuickFix,
            onlyIncludePreferredActions: true
        }, "ifSingle" /* CodeActionAutoApply.IfSingle */, CodeActionTriggerSource.AutoFix);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hMLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8sRUFBdUIscUJBQXFCLEVBQW9CLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzNJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTlELFNBQVMsNkJBQTZCLENBQUMsSUFBc0I7SUFDNUQsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUMxQixzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDaEMsSUFBSSxNQUFNLENBQUMsU0FB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