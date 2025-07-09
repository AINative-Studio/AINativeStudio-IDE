/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, TimeoutTimer } from '../../../../base/common/async.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ShowLightbulbIconMode } from '../../../common/config/editorOptions.js';
import { Position } from '../../../common/core/position.js';
import { Selection } from '../../../common/core/selection.js';
import { CodeActionKind, CodeActionTriggerSource } from '../common/types.js';
import { getCodeActions } from './codeAction.js';
export const SUPPORTED_CODE_ACTIONS = new RawContextKey('supportedCodeAction', '');
export const APPLY_FIX_ALL_COMMAND_ID = '_typescript.applyFixAllCodeAction';
class CodeActionOracle extends Disposable {
    constructor(_editor, _markerService, _signalChange, _delay = 250) {
        super();
        this._editor = _editor;
        this._markerService = _markerService;
        this._signalChange = _signalChange;
        this._delay = _delay;
        this._autoTriggerTimer = this._register(new TimeoutTimer());
        this._register(this._markerService.onMarkerChanged(e => this._onMarkerChanges(e)));
        this._register(this._editor.onDidChangeCursorPosition(() => this._tryAutoTrigger()));
    }
    trigger(trigger) {
        const selection = this._getRangeOfSelectionUnlessWhitespaceEnclosed(trigger);
        this._signalChange(selection ? { trigger, selection } : undefined);
    }
    _onMarkerChanges(resources) {
        const model = this._editor.getModel();
        if (model && resources.some(resource => isEqual(resource, model.uri))) {
            this._tryAutoTrigger();
        }
    }
    _tryAutoTrigger() {
        this._autoTriggerTimer.cancelAndSet(() => {
            this.trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default });
        }, this._delay);
    }
    _getRangeOfSelectionUnlessWhitespaceEnclosed(trigger) {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const selection = this._editor.getSelection();
        if (trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            return selection;
        }
        const enabled = this._editor.getOption(66 /* EditorOption.lightbulb */).enabled;
        if (enabled === ShowLightbulbIconMode.Off) {
            return undefined;
        }
        else if (enabled === ShowLightbulbIconMode.On) {
            return selection;
        }
        else if (enabled === ShowLightbulbIconMode.OnCode) {
            const isSelectionEmpty = selection.isEmpty();
            if (!isSelectionEmpty) {
                return selection;
            }
            const model = this._editor.getModel();
            const { lineNumber, column } = selection.getPosition();
            const line = model.getLineContent(lineNumber);
            if (line.length === 0) {
                // empty line
                return undefined;
            }
            else if (column === 1) {
                // look only right
                if (/\s/.test(line[0])) {
                    return undefined;
                }
            }
            else if (column === model.getLineMaxColumn(lineNumber)) {
                // look only left
                if (/\s/.test(line[line.length - 1])) {
                    return undefined;
                }
            }
            else {
                // look left and right
                if (/\s/.test(line[column - 2]) && /\s/.test(line[column - 1])) {
                    return undefined;
                }
            }
        }
        return selection;
    }
}
export var CodeActionsState;
(function (CodeActionsState) {
    let Type;
    (function (Type) {
        Type[Type["Empty"] = 0] = "Empty";
        Type[Type["Triggered"] = 1] = "Triggered";
    })(Type = CodeActionsState.Type || (CodeActionsState.Type = {}));
    CodeActionsState.Empty = { type: 0 /* Type.Empty */ };
    class Triggered {
        constructor(trigger, position, _cancellablePromise) {
            this.trigger = trigger;
            this.position = position;
            this._cancellablePromise = _cancellablePromise;
            this.type = 1 /* Type.Triggered */;
            this.actions = _cancellablePromise.catch((e) => {
                if (isCancellationError(e)) {
                    return emptyCodeActionSet;
                }
                throw e;
            });
        }
        cancel() {
            this._cancellablePromise.cancel();
        }
    }
    CodeActionsState.Triggered = Triggered;
})(CodeActionsState || (CodeActionsState = {}));
const emptyCodeActionSet = Object.freeze({
    allActions: [],
    validActions: [],
    dispose: () => { },
    documentation: [],
    hasAutoFix: false,
    hasAIFix: false,
    allAIFixes: false,
});
export class CodeActionModel extends Disposable {
    constructor(_editor, _registry, _markerService, contextKeyService, _progressService, _configurationService) {
        super();
        this._editor = _editor;
        this._registry = _registry;
        this._markerService = _markerService;
        this._progressService = _progressService;
        this._configurationService = _configurationService;
        this._codeActionOracle = this._register(new MutableDisposable());
        this._state = CodeActionsState.Empty;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this.codeActionsDisposable = this._register(new MutableDisposable());
        this._disposed = false;
        this._supportedCodeActions = SUPPORTED_CODE_ACTIONS.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeModel(() => this._update()));
        this._register(this._editor.onDidChangeModelLanguage(() => this._update()));
        this._register(this._registry.onDidChange(() => this._update()));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(66 /* EditorOption.lightbulb */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        super.dispose();
        this.setState(CodeActionsState.Empty, true);
    }
    _settingEnabledNearbyQuickfixes() {
        const model = this._editor?.getModel();
        return this._configurationService ? this._configurationService.getValue('editor.codeActionWidget.includeNearbyQuickFixes', { resource: model?.uri }) : false;
    }
    _update() {
        if (this._disposed) {
            return;
        }
        this._codeActionOracle.value = undefined;
        this.setState(CodeActionsState.Empty);
        const model = this._editor.getModel();
        if (model
            && this._registry.has(model)
            && !this._editor.getOption(96 /* EditorOption.readOnly */)) {
            const supportedActions = this._registry.all(model).flatMap(provider => provider.providedCodeActionKinds ?? []);
            this._supportedCodeActions.set(supportedActions.join(' '));
            this._codeActionOracle.value = new CodeActionOracle(this._editor, this._markerService, trigger => {
                if (!trigger) {
                    this.setState(CodeActionsState.Empty);
                    return;
                }
                const startPosition = trigger.selection.getStartPosition();
                const actions = createCancelablePromise(async (token) => {
                    if (this._settingEnabledNearbyQuickfixes() && trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */ && (trigger.trigger.triggerAction === CodeActionTriggerSource.QuickFix || trigger.trigger.filter?.include?.contains(CodeActionKind.QuickFix))) {
                        const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        const allCodeActions = [...codeActionSet.allActions];
                        if (token.isCancellationRequested) {
                            codeActionSet.dispose();
                            return emptyCodeActionSet;
                        }
                        // Search for quickfixes in the curret code action set.
                        const foundQuickfix = codeActionSet.validActions?.some(action => action.action.kind ? CodeActionKind.QuickFix.contains(new HierarchicalKind(action.action.kind)) : false);
                        const allMarkers = this._markerService.read({ resource: model.uri });
                        if (foundQuickfix) {
                            for (const action of codeActionSet.validActions) {
                                if (action.action.command?.arguments?.some(arg => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                    action.action.diagnostics = [...allMarkers.filter(marker => marker.relatedInformation)];
                                }
                            }
                            return { validActions: codeActionSet.validActions, allActions: allCodeActions, documentation: codeActionSet.documentation, hasAutoFix: codeActionSet.hasAutoFix, hasAIFix: codeActionSet.hasAIFix, allAIFixes: codeActionSet.allAIFixes, dispose: () => { this.codeActionsDisposable.value = codeActionSet; } };
                        }
                        else if (!foundQuickfix) {
                            // If markers exist, and there are no quickfixes found or length is zero, check for quickfixes on that line.
                            if (allMarkers.length > 0) {
                                const currPosition = trigger.selection.getPosition();
                                let trackedPosition = currPosition;
                                let distance = Number.MAX_VALUE;
                                const currentActions = [...codeActionSet.validActions];
                                for (const marker of allMarkers) {
                                    const col = marker.endColumn;
                                    const row = marker.endLineNumber;
                                    const startRow = marker.startLineNumber;
                                    // Found quickfix on the same line and check relative distance to other markers
                                    if ((row === currPosition.lineNumber || startRow === currPosition.lineNumber)) {
                                        trackedPosition = new Position(row, col);
                                        const newCodeActionTrigger = {
                                            type: trigger.trigger.type,
                                            triggerAction: trigger.trigger.triggerAction,
                                            filter: { include: trigger.trigger.filter?.include ? trigger.trigger.filter?.include : CodeActionKind.QuickFix },
                                            autoApply: trigger.trigger.autoApply,
                                            context: { notAvailableMessage: trigger.trigger.context?.notAvailableMessage || '', position: trackedPosition }
                                        };
                                        const selectionAsPosition = new Selection(trackedPosition.lineNumber, trackedPosition.column, trackedPosition.lineNumber, trackedPosition.column);
                                        const actionsAtMarker = await getCodeActions(this._registry, model, selectionAsPosition, newCodeActionTrigger, Progress.None, token);
                                        if (token.isCancellationRequested) {
                                            actionsAtMarker.dispose();
                                            return emptyCodeActionSet;
                                        }
                                        if (actionsAtMarker.validActions.length !== 0) {
                                            for (const action of actionsAtMarker.validActions) {
                                                if (action.action.command?.arguments?.some(arg => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                                    action.action.diagnostics = [...allMarkers.filter(marker => marker.relatedInformation)];
                                                }
                                            }
                                            if (codeActionSet.allActions.length === 0) {
                                                allCodeActions.push(...actionsAtMarker.allActions);
                                            }
                                            // Already filtered through to only get quickfixes, so no need to filter again.
                                            if (Math.abs(currPosition.column - col) < distance) {
                                                currentActions.unshift(...actionsAtMarker.validActions);
                                            }
                                            else {
                                                currentActions.push(...actionsAtMarker.validActions);
                                            }
                                        }
                                        distance = Math.abs(currPosition.column - col);
                                    }
                                }
                                const filteredActions = currentActions.filter((action, index, self) => self.findIndex((a) => a.action.title === action.action.title) === index);
                                filteredActions.sort((a, b) => {
                                    if (a.action.isPreferred && !b.action.isPreferred) {
                                        return -1;
                                    }
                                    else if (!a.action.isPreferred && b.action.isPreferred) {
                                        return 1;
                                    }
                                    else if (a.action.isAI && !b.action.isAI) {
                                        return 1;
                                    }
                                    else if (!a.action.isAI && b.action.isAI) {
                                        return -1;
                                    }
                                    else {
                                        return 0;
                                    }
                                });
                                // Only retriggers if actually found quickfix on the same line as cursor
                                return { validActions: filteredActions, allActions: allCodeActions, documentation: codeActionSet.documentation, hasAutoFix: codeActionSet.hasAutoFix, hasAIFix: codeActionSet.hasAIFix, allAIFixes: codeActionSet.allAIFixes, dispose: () => { this.codeActionsDisposable.value = codeActionSet; } };
                            }
                        }
                    }
                    // Case for manual triggers - specifically Source Actions and Refactors
                    if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                        const codeActions = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        return codeActions;
                    }
                    const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                    this.codeActionsDisposable.value = codeActionSet;
                    return codeActionSet;
                });
                if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                    this._progressService?.showWhile(actions, 250);
                }
                const newState = new CodeActionsState.Triggered(trigger.trigger, startPosition, actions);
                let isManualToAutoTransition = false;
                if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
                    // Check if the current state is manual and the new state is automatic
                    isManualToAutoTransition = this._state.trigger.type === 1 /* CodeActionTriggerType.Invoke */ &&
                        newState.type === 1 /* CodeActionsState.Type.Triggered */ &&
                        newState.trigger.type === 2 /* CodeActionTriggerType.Auto */ &&
                        this._state.position !== newState.position;
                }
                // Do not trigger state if current state is manual and incoming state is automatic
                if (!isManualToAutoTransition) {
                    this.setState(newState);
                }
                else {
                    // Reset the new state after getting code actions back.
                    setTimeout(() => {
                        this.setState(newState);
                    }, 500);
                }
            }, undefined);
            this._codeActionOracle.value.trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default });
        }
        else {
            this._supportedCodeActions.reset();
        }
    }
    trigger(trigger) {
        this._codeActionOracle.value?.trigger(trigger);
        this.codeActionsDisposable.clear();
    }
    setState(newState, skipNotify) {
        if (newState === this._state) {
            return;
        }
        // Cancel old request
        if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
            this._state.cancel();
        }
        this._state = newState;
        if (!skipNotify && !this._disposed) {
            this._onDidChangeState.fire(newState);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUcvRCxPQUFPLEVBQW1DLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRILE9BQU8sRUFBMEIsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFcEcsT0FBTyxFQUFnQixxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHOUQsT0FBTyxFQUFFLGNBQWMsRUFBb0MsdUJBQXVCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFakQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVMscUJBQXFCLEVBQUUsRUFBRSxD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