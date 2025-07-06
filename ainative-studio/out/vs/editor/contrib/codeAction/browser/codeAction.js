/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce, equals, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, isCancellationError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IModelService } from '../../../common/services/model.js';
import { TextModelCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { CodeActionItem, CodeActionKind, CodeActionTriggerSource, filtersAction, mayIncludeActionsOfKind } from '../common/types.js';
export const codeActionCommandId = 'editor.action.codeAction';
export const quickFixCommandId = 'editor.action.quickFix';
export const autoFixCommandId = 'editor.action.autoFix';
export const refactorCommandId = 'editor.action.refactor';
export const refactorPreviewCommandId = 'editor.action.refactor.preview';
export const sourceActionCommandId = 'editor.action.sourceAction';
export const organizeImportsCommandId = 'editor.action.organizeImports';
export const fixAllCommandId = 'editor.action.fixAll';
class ManagedCodeActionSet extends Disposable {
    static codeActionsPreferredComparator(a, b) {
        if (a.isPreferred && !b.isPreferred) {
            return -1;
        }
        else if (!a.isPreferred && b.isPreferred) {
            return 1;
        }
        else {
            return 0;
        }
    }
    static codeActionsComparator({ action: a }, { action: b }) {
        if (a.isAI && !b.isAI) {
            return 1;
        }
        else if (!a.isAI && b.isAI) {
            return -1;
        }
        if (isNonEmptyArray(a.diagnostics)) {
            return isNonEmptyArray(b.diagnostics) ? ManagedCodeActionSet.codeActionsPreferredComparator(a, b) : -1;
        }
        else if (isNonEmptyArray(b.diagnostics)) {
            return 1;
        }
        else {
            return ManagedCodeActionSet.codeActionsPreferredComparator(a, b); // both have no diagnostics
        }
    }
    constructor(actions, documentation, disposables) {
        super();
        this.documentation = documentation;
        this._register(disposables);
        this.allActions = [...actions].sort(ManagedCodeActionSet.codeActionsComparator);
        this.validActions = this.allActions.filter(({ action }) => !action.disabled);
    }
    get hasAutoFix() {
        return this.validActions.some(({ action: fix }) => !!fix.kind && CodeActionKind.QuickFix.contains(new HierarchicalKind(fix.kind)) && !!fix.isPreferred);
    }
    get hasAIFix() {
        return this.validActions.some(({ action: fix }) => !!fix.isAI);
    }
    get allAIFixes() {
        return this.validActions.every(({ action: fix }) => !!fix.isAI);
    }
}
const emptyCodeActionsResponse = { actions: [], documentation: undefined };
export async function getCodeActions(registry, model, rangeOrSelection, trigger, progress, token) {
    const filter = trigger.filter || {};
    const notebookFilter = {
        ...filter,
        excludes: [...(filter.excludes || []), CodeActionKind.Notebook],
    };
    const codeActionContext = {
        only: filter.include?.value,
        trigger: trigger.type,
    };
    const cts = new TextModelCancellationTokenSource(model, token);
    // if the trigger is auto (autosave, lightbulb, etc), we should exclude notebook codeActions
    const excludeNotebookCodeActions = (trigger.type === 2 /* languages.CodeActionTriggerType.Auto */);
    const providers = getCodeActionProviders(registry, model, (excludeNotebookCodeActions) ? notebookFilter : filter);
    const disposables = new DisposableStore();
    const promises = providers.map(async (provider) => {
        const handle = setTimeout(() => progress.report(provider), 1250);
        try {
            const providedCodeActions = await provider.provideCodeActions(model, rangeOrSelection, codeActionContext, cts.token);
            if (providedCodeActions) {
                disposables.add(providedCodeActions);
            }
            if (cts.token.isCancellationRequested) {
                return emptyCodeActionsResponse;
            }
            const filteredActions = (providedCodeActions?.actions || []).filter(action => action && filtersAction(filter, action));
            const documentation = getDocumentationFromProvider(provider, filteredActions, filter.include);
            return {
                actions: filteredActions.map(action => new CodeActionItem(action, provider)),
                documentation
            };
        }
        catch (err) {
            if (isCancellationError(err)) {
                throw err;
            }
            onUnexpectedExternalError(err);
            return emptyCodeActionsResponse;
        }
        finally {
            clearTimeout(handle);
        }
    });
    const listener = registry.onDidChange(() => {
        const newProviders = registry.all(model);
        if (!equals(newProviders, providers)) {
            cts.cancel();
        }
    });
    try {
        const actions = await Promise.all(promises);
        const allActions = actions.map(x => x.actions).flat();
        const allDocumentation = [
            ...coalesce(actions.map(x => x.documentation)),
            ...getAdditionalDocumentationForShowingActions(registry, model, trigger, allActions)
        ];
        return new ManagedCodeActionSet(allActions, allDocumentation, disposables);
    }
    catch (err) {
        disposables.dispose();
        throw err;
    }
    finally {
        listener.dispose();
        cts.dispose();
    }
}
function getCodeActionProviders(registry, model, filter) {
    return registry.all(model)
        // Don't include providers that we know will not return code actions of interest
        .filter(provider => {
        if (!provider.providedCodeActionKinds) {
            // We don't know what type of actions this provider will return.
            return true;
        }
        return provider.providedCodeActionKinds.some(kind => mayIncludeActionsOfKind(filter, new HierarchicalKind(kind)));
    });
}
function* getAdditionalDocumentationForShowingActions(registry, model, trigger, actionsToShow) {
    if (model && actionsToShow.length) {
        for (const provider of registry.all(model)) {
            if (provider._getAdditionalMenuItems) {
                yield* provider._getAdditionalMenuItems?.({ trigger: trigger.type, only: trigger.filter?.include?.value }, actionsToShow.map(item => item.action));
            }
        }
    }
}
function getDocumentationFromProvider(provider, providedCodeActions, only) {
    if (!provider.documentation) {
        return undefined;
    }
    const documentation = provider.documentation.map(entry => ({ kind: new HierarchicalKind(entry.kind), command: entry.command }));
    if (only) {
        let currentBest;
        for (const entry of documentation) {
            if (entry.kind.contains(only)) {
                if (!currentBest) {
                    currentBest = entry;
                }
                else {
                    // Take best match
                    if (currentBest.kind.contains(entry.kind)) {
                        currentBest = entry;
                    }
                }
            }
        }
        if (currentBest) {
            return currentBest?.command;
        }
    }
    // Otherwise, check to see if any of the provided actions match.
    for (const action of providedCodeActions) {
        if (!action.kind) {
            continue;
        }
        for (const entry of documentation) {
            if (entry.kind.contains(new HierarchicalKind(action.kind))) {
                return entry.command;
            }
        }
    }
    return undefined;
}
export var ApplyCodeActionReason;
(function (ApplyCodeActionReason) {
    ApplyCodeActionReason["OnSave"] = "onSave";
    ApplyCodeActionReason["FromProblemsView"] = "fromProblemsView";
    ApplyCodeActionReason["FromCodeActions"] = "fromCodeActions";
    ApplyCodeActionReason["FromAILightbulb"] = "fromAILightbulb";
    ApplyCodeActionReason["FromProblemsHover"] = "fromProblemsHover";
})(ApplyCodeActionReason || (ApplyCodeActionReason = {}));
export async function applyCodeAction(accessor, item, codeActionReason, options, token = CancellationToken.None) {
    const bulkEditService = accessor.get(IBulkEditService);
    const commandService = accessor.get(ICommandService);
    const telemetryService = accessor.get(ITelemetryService);
    const notificationService = accessor.get(INotificationService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    telemetryService.publicLog2('codeAction.applyCodeAction', {
        codeActionTitle: item.action.title,
        codeActionKind: item.action.kind,
        codeActionIsPreferred: !!item.action.isPreferred,
        reason: codeActionReason,
    });
    accessibilitySignalService.playSignal(AccessibilitySignal.codeActionTriggered);
    await item.resolve(token);
    if (token.isCancellationRequested) {
        return;
    }
    if (item.action.edit?.edits.length) {
        const result = await bulkEditService.apply(item.action.edit, {
            editor: options?.editor,
            label: item.action.title,
            quotableLabel: item.action.title,
            code: 'undoredo.codeAction',
            respectAutoSaveConfig: codeActionReason !== ApplyCodeActionReason.OnSave,
            showPreview: options?.preview,
        });
        if (!result.isApplied) {
            return;
        }
    }
    if (item.action.command) {
        try {
            await commandService.executeCommand(item.action.command.id, ...(item.action.command.arguments || []));
        }
        catch (err) {
            const message = asMessage(err);
            notificationService.error(typeof message === 'string'
                ? message
                : nls.localize('applyCodeActionFailed', "An unknown error occurred while applying the code action"));
        }
    }
    // ensure the start sound and end sound do not overlap
    setTimeout(() => accessibilitySignalService.playSignal(AccessibilitySignal.codeActionApplied), 100);
}
function asMessage(err) {
    if (typeof err === 'string') {
        return err;
    }
    else if (err instanceof Error && typeof err.message === 'string') {
        return err.message;
    }
    else {
        return undefined;
    }
}
CommandsRegistry.registerCommand('_executeCodeActionProvider', async function (accessor, resource, rangeOrSelection, kind, itemResolveCount) {
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const { codeActionProvider } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const validatedRangeOrSelection = Selection.isISelection(rangeOrSelection)
        ? Selection.liftSelection(rangeOrSelection)
        : Range.isIRange(rangeOrSelection)
            ? model.validateRange(rangeOrSelection)
            : undefined;
    if (!validatedRangeOrSelection) {
        throw illegalArgument();
    }
    const include = typeof kind === 'string' ? new HierarchicalKind(kind) : undefined;
    const codeActionSet = await getCodeActions(codeActionProvider, model, validatedRangeOrSelection, { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.Default, filter: { includeSourceActions: true, include } }, Progress.None, CancellationToken.None);
    const resolving = [];
    const resolveCount = Math.min(codeActionSet.validActions.length, typeof itemResolveCount === 'number' ? itemResolveCount : 0);
    for (let i = 0; i < resolveCount; i++) {
        resolving.push(codeActionSet.validActions[i].resolve(CancellationToken.None));
    }
    try {
        await Promise.all(resolving);
        return codeActionSet.validActions.map(item => item.action);
    }
    finally {
        setTimeout(() => codeActionSet.dispose(), 100);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2xKLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixD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