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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2Jyb3dzZXIvY29kZUFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUNsSixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFckcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0Is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