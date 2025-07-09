/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CodeActionController_1;
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { editorFindMatchHighlight, editorFindMatchHighlightBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Position } from '../../../common/core/position.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MessageController } from '../../message/browser/messageController.js';
import { CodeActionKind, CodeActionTriggerSource } from '../common/types.js';
import { ApplyCodeActionReason, applyCodeAction } from './codeAction.js';
import { CodeActionKeybindingResolver } from './codeActionKeybindingResolver.js';
import { toMenuItems } from './codeActionMenu.js';
import { CodeActionModel } from './codeActionModel.js';
import { LightBulbWidget } from './lightBulbWidget.js';
const DECORATION_CLASS_NAME = 'quickfix-edit-highlight';
let CodeActionController = class CodeActionController extends Disposable {
    static { CodeActionController_1 = this; }
    static { this.ID = 'editor.contrib.codeActionController'; }
    static get(editor) {
        return editor.getContribution(CodeActionController_1.ID);
    }
    constructor(editor, markerService, contextKeyService, instantiationService, languageFeaturesService, progressService, _commandService, _configurationService, _actionWidgetService, _instantiationService, _progressService) {
        super();
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._actionWidgetService = _actionWidgetService;
        this._instantiationService = _instantiationService;
        this._progressService = _progressService;
        this._activeCodeActions = this._register(new MutableDisposable());
        this._showDisabled = false;
        this._disposed = false;
        this._editor = editor;
        this._model = this._register(new CodeActionModel(this._editor, languageFeaturesService.codeActionProvider, markerService, contextKeyService, progressService, _configurationService));
        this._register(this._model.onDidChangeState(newState => this.update(newState)));
        this._lightBulbWidget = new Lazy(() => {
            const widget = this._editor.getContribution(LightBulbWidget.ID);
            if (widget) {
                this._register(widget.onClick(e => this.showCodeActionsFromLightbulb(e.actions, e)));
            }
            return widget;
        });
        this._resolver = instantiationService.createInstance(CodeActionKeybindingResolver);
        this._register(this._editor.onDidLayoutChange(() => this._actionWidgetService.hide()));
    }
    dispose() {
        this._disposed = true;
        super.dispose();
    }
    async showCodeActionsFromLightbulb(actions, at) {
        if (actions.allAIFixes && actions.validActions.length === 1) {
            const actionItem = actions.validActions[0];
            const command = actionItem.action.command;
            if (command && command.id === 'inlineChat.start') {
                if (command.arguments && command.arguments.length >= 1) {
                    command.arguments[0] = { ...command.arguments[0], autoSend: false };
                }
            }
            await this.applyCodeAction(actionItem, false, false, ApplyCodeActionReason.FromAILightbulb);
            return;
        }
        await this.showCodeActionList(actions, at, { includeDisabledActions: false, fromLightbulb: true });
    }
    showCodeActions(_trigger, actions, at) {
        return this.showCodeActionList(actions, at, { includeDisabledActions: false, fromLightbulb: false });
    }
    hideCodeActions() {
        this._actionWidgetService.hide();
    }
    manualTriggerAtCurrentPosition(notAvailableMessage, triggerAction, filter, autoApply) {
        if (!this._editor.hasModel()) {
            return;
        }
        MessageController.get(this._editor)?.closeMessage();
        const triggerPosition = this._editor.getPosition();
        this._trigger({ type: 1 /* CodeActionTriggerType.Invoke */, triggerAction, filter, autoApply, context: { notAvailableMessage, position: triggerPosition } });
    }
    _trigger(trigger) {
        return this._model.trigger(trigger);
    }
    async applyCodeAction(action, retrigger, preview, actionReason) {
        const progress = this._progressService.show(true, 500);
        try {
            await this._instantiationService.invokeFunction(applyCodeAction, action, actionReason, { preview, editor: this._editor });
        }
        finally {
            if (retrigger) {
                this._trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.QuickFix, filter: {} });
            }
            progress.done();
        }
    }
    hideLightBulbWidget() {
        this._lightBulbWidget.rawValue?.hide();
        this._lightBulbWidget.rawValue?.gutterHide();
    }
    async update(newState) {
        if (newState.type !== 1 /* CodeActionsState.Type.Triggered */) {
            this.hideLightBulbWidget();
            return;
        }
        let actions;
        try {
            actions = await newState.actions;
        }
        catch (e) {
            onUnexpectedError(e);
            return;
        }
        if (this._disposed) {
            return;
        }
        const selection = this._editor.getSelection();
        if (selection?.startLineNumber !== newState.position.lineNumber) {
            return;
        }
        this._lightBulbWidget.value?.update(actions, newState.trigger, newState.position);
        if (newState.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            if (newState.trigger.filter?.include) { // Triggered for specific scope
                // Check to see if we want to auto apply.
                const validActionToApply = this.tryGetValidActionToApply(newState.trigger, actions);
                if (validActionToApply) {
                    try {
                        this.hideLightBulbWidget();
                        await this.applyCodeAction(validActionToApply, false, false, ApplyCodeActionReason.FromCodeActions);
                    }
                    finally {
                        actions.dispose();
                    }
                    return;
                }
                // Check to see if there is an action that we would have applied were it not invalid
                if (newState.trigger.context) {
                    const invalidAction = this.getInvalidActionThatWouldHaveBeenApplied(newState.trigger, actions);
                    if (invalidAction && invalidAction.action.disabled) {
                        MessageController.get(this._editor)?.showMessage(invalidAction.action.disabled, newState.trigger.context.position);
                        actions.dispose();
                        return;
                    }
                }
            }
            const includeDisabledActions = !!newState.trigger.filter?.include;
            if (newState.trigger.context) {
                if (!actions.allActions.length || !includeDisabledActions && !actions.validActions.length) {
                    MessageController.get(this._editor)?.showMessage(newState.trigger.context.notAvailableMessage, newState.trigger.context.position);
                    this._activeCodeActions.value = actions;
                    actions.dispose();
                    return;
                }
            }
            this._activeCodeActions.value = actions;
            this.showCodeActionList(actions, this.toCoords(newState.position), { includeDisabledActions, fromLightbulb: false });
        }
        else {
            // auto magically triggered
            if (this._actionWidgetService.isVisible) {
                // TODO: Figure out if we should update the showing menu?
                actions.dispose();
            }
            else {
                this._activeCodeActions.value = actions;
            }
        }
    }
    getInvalidActionThatWouldHaveBeenApplied(trigger, actions) {
        if (!actions.allActions.length) {
            return undefined;
        }
        if ((trigger.autoApply === "first" /* CodeActionAutoApply.First */ && actions.validActions.length === 0)
            || (trigger.autoApply === "ifSingle" /* CodeActionAutoApply.IfSingle */ && actions.allActions.length === 1)) {
            return actions.allActions.find(({ action }) => action.disabled);
        }
        return undefined;
    }
    tryGetValidActionToApply(trigger, actions) {
        if (!actions.validActions.length) {
            return undefined;
        }
        if ((trigger.autoApply === "first" /* CodeActionAutoApply.First */ && actions.validActions.length > 0)
            || (trigger.autoApply === "ifSingle" /* CodeActionAutoApply.IfSingle */ && actions.validActions.length === 1)) {
            return actions.validActions[0];
        }
        return undefined;
    }
    static { this.DECORATION = ModelDecorationOptions.register({
        description: 'quickfix-highlight',
        className: DECORATION_CLASS_NAME
    }); }
    async showCodeActionList(actions, at, options) {
        const currentDecorations = this._editor.createDecorationsCollection();
        const editorDom = this._editor.getDomNode();
        if (!editorDom) {
            return;
        }
        const actionsToShow = options.includeDisabledActions && (this._showDisabled || actions.validActions.length === 0) ? actions.allActions : actions.validActions;
        if (!actionsToShow.length) {
            return;
        }
        const anchor = Position.isIPosition(at) ? this.toCoords(at) : at;
        const delegate = {
            onSelect: async (action, preview) => {
                this.applyCodeAction(action, /* retrigger */ true, !!preview, options.fromLightbulb ? ApplyCodeActionReason.FromAILightbulb : ApplyCodeActionReason.FromCodeActions);
                this._actionWidgetService.hide(false);
                currentDecorations.clear();
            },
            onHide: (didCancel) => {
                this._editor?.focus();
                currentDecorations.clear();
            },
            onHover: async (action, token) => {
                if (token.isCancellationRequested) {
                    return;
                }
                let canPreview = false;
                const actionKind = action.action.kind;
                if (actionKind) {
                    const hierarchicalKind = new HierarchicalKind(actionKind);
                    const refactorKinds = [
                        CodeActionKind.RefactorExtract,
                        CodeActionKind.RefactorInline,
                        CodeActionKind.RefactorRewrite,
                        CodeActionKind.RefactorMove,
                        CodeActionKind.Source
                    ];
                    canPreview = refactorKinds.some(refactorKind => refactorKind.contains(hierarchicalKind));
                }
                return { canPreview: canPreview || !!action.action.edit?.edits.length };
            },
            onFocus: (action) => {
                if (action && action.action) {
                    const ranges = action.action.ranges;
                    const diagnostics = action.action.diagnostics;
                    currentDecorations.clear();
                    if (ranges && ranges.length > 0) {
                        // Handles case for `fix all` where there are multiple diagnostics.
                        const decorations = (diagnostics && diagnostics?.length > 1)
                            ? diagnostics.map(diagnostic => ({ range: diagnostic, options: CodeActionController_1.DECORATION }))
                            : ranges.map(range => ({ range, options: CodeActionController_1.DECORATION }));
                        currentDecorations.set(decorations);
                    }
                    else if (diagnostics && diagnostics.length > 0) {
                        const decorations = diagnostics.map(diagnostic => ({ range: diagnostic, options: CodeActionController_1.DECORATION }));
                        currentDecorations.set(decorations);
                        const diagnostic = diagnostics[0];
                        if (diagnostic.startLineNumber && diagnostic.startColumn) {
                            const selectionText = this._editor.getModel()?.getWordAtPosition({ lineNumber: diagnostic.startLineNumber, column: diagnostic.startColumn })?.word;
                            aria.status(localize('editingNewSelection', "Context: {0} at line {1} and column {2}.", selectionText, diagnostic.startLineNumber, diagnostic.startColumn));
                        }
                    }
                }
                else {
                    currentDecorations.clear();
                }
            }
        };
        this._actionWidgetService.show('codeActionWidget', true, toMenuItems(actionsToShow, this._shouldShowHeaders(), this._resolver.getResolver()), delegate, anchor, editorDom, this._getActionBarActions(actions, at, options));
    }
    toCoords(position) {
        if (!this._editor.hasModel()) {
            return { x: 0, y: 0 };
        }
        this._editor.revealPosition(position, 1 /* ScrollType.Immediate */);
        this._editor.render();
        // Translate to absolute editor position
        const cursorCoords = this._editor.getScrolledVisiblePosition(position);
        const editorCoords = getDomNodePagePosition(this._editor.getDomNode());
        const x = editorCoords.left + cursorCoords.left;
        const y = editorCoords.top + cursorCoords.top + cursorCoords.height;
        return { x, y };
    }
    _shouldShowHeaders() {
        const model = this._editor?.getModel();
        return this._configurationService.getValue('editor.codeActionWidget.showHeaders', { resource: model?.uri });
    }
    _getActionBarActions(actions, at, options) {
        if (options.fromLightbulb) {
            return [];
        }
        const resultActions = actions.documentation.map((command) => ({
            id: command.id,
            label: command.title,
            tooltip: command.tooltip ?? '',
            class: undefined,
            enabled: true,
            run: () => this._commandService.executeCommand(command.id, ...(command.arguments ?? [])),
        }));
        if (options.includeDisabledActions && actions.validActions.length > 0 && actions.allActions.length !== actions.validActions.length) {
            resultActions.push(this._showDisabled ? {
                id: 'hideMoreActions',
                label: localize('hideMoreActions', 'Hide Disabled'),
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    this._showDisabled = false;
                    return this.showCodeActionList(actions, at, options);
                }
            } : {
                id: 'showMoreActions',
                label: localize('showMoreActions', 'Show Disabled'),
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    this._showDisabled = true;
                    return this.showCodeActionList(actions, at, options);
                }
            });
        }
        return resultActions;
    }
};
CodeActionController = CodeActionController_1 = __decorate([
    __param(1, IMarkerService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IEditorProgressService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, IActionWidgetService),
    __param(9, IInstantiationService),
    __param(10, IEditorProgressService)
], CodeActionController);
export { CodeActionController };
registerThemingParticipant((theme, collector) => {
    const addBackgroundColorRule = (selector, color) => {
        if (color) {
            collector.addRule(`.monaco-editor ${selector} { background-color: ${color}; }`);
        }
    };
    addBackgroundColorRule('.quickfix-edit-highlight', theme.getColor(editorFindMatchHighlight));
    const findMatchHighlightBorder = theme.getColor(editorFindMatchHighlightBorder);
    if (findMatchHighlightBorder) {
        collector.addRule(`.monaco-editor .quickfix-edit-highlight { border: 1px ${isHighContrast(theme.type) ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; box-sizing: border-box; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb25Db250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RSxPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFDO0FBS2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRS9GLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUl2RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQXlELGNBQWMsRUFBb0MsdUJBQXVCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN0SyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDekUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sc0JBQXNCLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBUXZELE1BQU0scUJBQXFCLEdBQUcseUJBQXlCLENBQUM7QUFFakQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVOzthQUU1QixPQUFFLEdBQUcscUNBQXFDLEFBQXhDLENBQXlDO0lBRTNELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUF1QixzQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBYUQsWUFDQyxNQUFtQixFQUNILGFBQTZCLEVBQ3pCLGlCQUFxQyxFQUNsQyxvQkFBMkMsRUFDeEMsdUJBQWlELEVBQ25ELGVBQXVDLEVBQzlDLGVBQWlELEVBQzNDLHFCQUE2RCxFQUM5RCxvQkFBMkQsRUFDMUQscUJBQTZELEVBQzVELGdCQUF5RDtRQUVqRixLQUFLLEVBQUUsQ0FBQztRQU4wQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM3Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ3pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDM0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF3QjtRQWxCakUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFpQixDQUFDLENBQUM7UUFDckYsa0JBQWEsR0FBRyxLQUFLLENBQUM7UUFJdEIsY0FBUyxHQUFHLEtBQUssQ0FBQztRQWlCekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDdEwsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBa0IsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pGLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUVuRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU8sS0FBSyxDQUFDLDRCQUE0QixDQUFDLE9BQXNCLEVBQUUsRUFBdUI7UUFDekYsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDMUMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLEVBQUUsS0FBSyxrQkFBa0IsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3hELE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUNyRSxDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM1RixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDcEcsQ0FBQztJQUVNLGVBQWUsQ0FBQyxRQUEyQixFQUFFLE9BQXNCLEVBQUUsRUFBdUI7UUFDbEcsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLHNCQUFzQixFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN0RyxDQUFDO0lBRU0sZUFBZTtRQUNyQixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVNLDhCQUE4QixDQUNwQyxtQkFBMkIsRUFDM0IsYUFBc0MsRUFDdEMsTUFBeUIsRUFDekIsU0FBK0I7UUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFPO1FBQ1IsQ0FBQztRQUVELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUM7UUFDcEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxzQ0FBOEIsRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RKLENBQUM7SUFFTyxRQUFRLENBQUMsT0FBMEI7UUFDMUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFzQixFQUFFLFNBQWtCLEVBQUUsT0FBZ0IsRUFBRSxZQUFtQztRQUN0SCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzNILENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksb0NBQTRCLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsSCxDQUFDO1lBQ0QsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFnQztRQUNwRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLDRDQUFvQyxFQUFFLENBQUM7WUFDdkQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDM0IsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLE9BQXNCLENBQUM7UUFDM0IsSUFBSSxDQUFDO1lBQ0osT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUNsQyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTztRQUNSLENBQUM7UUFHRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzlDLElBQUksU0FBUyxFQUFFLGVBQWUsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pFLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWxGLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLHlDQUFpQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLCtCQUErQjtnQkFDdEUseUNBQXlDO2dCQUV6QyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNwRixJQUFJLGtCQUFrQixFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQzt3QkFDSixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzt3QkFDM0IsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUscUJBQXFCLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ3JHLENBQUM7NEJBQVMsQ0FBQzt3QkFDVixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ25CLENBQUM7b0JBQ0QsT0FBTztnQkFDUixDQUFDO2dCQUVELG9GQUFvRjtnQkFDcEYsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM5QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsd0NBQXdDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDL0YsSUFBSSxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzt3QkFDcEQsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxXQUFXLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ25ILE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDbEIsT0FBTztvQkFDUixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1lBQ2xFLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsc0JBQXNCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMzRixpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDbEksSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7b0JBQ3hDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbEIsT0FBTztnQkFDUixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0SCxDQUFDO2FBQU0sQ0FBQztZQUNQLDJCQUEyQjtZQUMzQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDekMseURBQXlEO2dCQUN6RCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdDQUF3QyxDQUFDLE9BQTBCLEVBQUUsT0FBc0I7UUFDbEcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyw0Q0FBOEIsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7ZUFDdEYsQ0FBQyxPQUFPLENBQUMsU0FBUyxrREFBaUMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFDekYsQ0FBQztZQUNGLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxPQUEwQixFQUFFLE9BQXNCO1FBQ2xGLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsNENBQThCLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2VBQ3BGLENBQUMsT0FBTyxDQUFDLFNBQVMsa0RBQWlDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQzNGLENBQUM7WUFDRixPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7YUFFdUIsZUFBVSxHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUNwRSxXQUFXLEVBQUUsb0JBQW9CO1FBQ2pDLFNBQVMsRUFBRSxxQkFBcUI7S0FDaEMsQ0FBQyxBQUhnQyxDQUcvQjtJQUVJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFzQixFQUFFLEVBQXVCLEVBQUUsT0FBMkI7UUFFM0csTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFFdEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsc0JBQXNCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQzlKLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0IsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFakUsTUFBTSxRQUFRLEdBQXdDO1lBQ3JELFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBc0IsRUFBRSxPQUFpQixFQUFFLEVBQUU7Z0JBQzdELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNySyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN0QyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM1QixDQUFDO1lBQ0QsTUFBTSxFQUFFLENBQUMsU0FBVSxFQUFFLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBQ3RCLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVCLENBQUM7WUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQXNCLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUNuRSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUNuQyxPQUFPO2dCQUNSLENBQUM7Z0JBRUQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFFdEMsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMxRCxNQUFNLGFBQWEsR0FBRzt3QkFDckIsY0FBYyxDQUFDLGVBQWU7d0JBQzlCLGNBQWMsQ0FBQyxjQUFjO3dCQUM3QixjQUFjLENBQUMsZUFBZTt3QkFDOUIsY0FBYyxDQUFDLFlBQVk7d0JBQzNCLGNBQWMsQ0FBQyxNQUFNO3FCQUNyQixDQUFDO29CQUVGLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzFGLENBQUM7Z0JBRUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RSxDQUFDO1lBQ0QsT0FBTyxFQUFFLENBQUMsTUFBa0MsRUFBRSxFQUFFO2dCQUMvQyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzdCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUNwQyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztvQkFDOUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzNCLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ2pDLG1FQUFtRTt3QkFDbkUsTUFBTSxXQUFXLEdBQTRCLENBQUMsV0FBVyxJQUFJLFdBQVcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDOzRCQUNwRixDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxzQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDOzRCQUNsRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLHNCQUFvQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDOUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNyQyxDQUFDO3lCQUFNLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ2xELE1BQU0sV0FBVyxHQUE0QixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLHNCQUFvQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDOUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO3dCQUNwQyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xDLElBQUksVUFBVSxDQUFDLGVBQWUsSUFBSSxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7NEJBQzFELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDOzRCQUNuSixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSwwQ0FBMEMsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDN0osQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDNUIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FDN0Isa0JBQWtCLEVBQ2xCLElBQUksRUFDSixXQUFXLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsRUFDbkYsUUFBUSxFQUNSLE1BQU0sRUFDTixTQUFTLEVBQ1QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU8sUUFBUSxDQUFDLFFBQW1CO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLCtCQUF1QixDQUFDO1FBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFdEIsd0NBQXdDO1FBQ3hDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkUsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztRQUNoRCxNQUFNLENBQUMsR0FBRyxZQUFZLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUVwRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUN2QyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVPLG9CQUFvQixDQUFDLE9BQXNCLEVBQUUsRUFBdUIsRUFBRSxPQUEyQjtRQUN4RyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMzQixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBVyxFQUFFLENBQUMsQ0FBQztZQUN0RSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDZCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLElBQUksRUFBRTtZQUM5QixLQUFLLEVBQUUsU0FBUztZQUNoQixPQUFPLEVBQUUsSUFBSTtZQUNiLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3hGLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxPQUFPLENBQUMsc0JBQXNCLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDdkMsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUM7Z0JBQ25ELE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLEtBQUssRUFBRSxTQUFTO2dCQUNoQixHQUFHLEVBQUUsR0FBRyxFQUFFO29CQUNULElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO29CQUMzQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN0RCxDQUFDO2FBQ0QsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUM7Z0JBQ25ELE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLEtBQUssRUFBRSxTQUFTO2dCQUNoQixHQUFHLEVBQUUsR0FBRyxFQUFFO29CQUNULElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO29CQUMxQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN0RCxDQUFDO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7O0FBalhXLG9CQUFvQjtJQXFCOUIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSxzQkFBc0IsQ0FBQTtHQTlCWixvQkFBb0IsQ0FrWGhDOztBQUVELDBCQUEwQixDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQy9DLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEtBQXdCLEVBQVEsRUFBRTtRQUNuRixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsU0FBUyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsUUFBUSx3QkFBd0IsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsc0JBQXNCLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7SUFDN0YsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFFaEYsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxPQUFPLENBQUMseURBQXlELGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLHdCQUF3Qiw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3RMLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyJ9