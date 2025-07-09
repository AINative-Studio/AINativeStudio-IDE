/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ContentHoverController } from './contentHoverController.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { HoverVerbosityAction } from '../../../common/languages.js';
import { DECREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID, DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID } from './hoverActionIds.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Action } from '../../../../base/common/actions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { labelForHoverVerbosityAction } from './markdownHoverParticipant.js';
var HoverAccessibilityHelpNLS;
(function (HoverAccessibilityHelpNLS) {
    HoverAccessibilityHelpNLS.increaseVerbosity = localize('increaseVerbosity', '- The focused hover part verbosity level can be increased with the Increase Hover Verbosity command.', `<keybinding:${INCREASE_HOVER_VERBOSITY_ACTION_ID}>`);
    HoverAccessibilityHelpNLS.decreaseVerbosity = localize('decreaseVerbosity', '- The focused hover part verbosity level can be decreased with the Decrease Hover Verbosity command.', `<keybinding:${DECREASE_HOVER_VERBOSITY_ACTION_ID}>`);
})(HoverAccessibilityHelpNLS || (HoverAccessibilityHelpNLS = {}));
export class HoverAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 95;
        this.name = 'hover';
        this.when = EditorContextKeys.hoverFocused;
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            throw new Error('No active or focused code editor');
        }
        const hoverController = ContentHoverController.get(codeEditor);
        if (!hoverController) {
            return;
        }
        const keybindingService = accessor.get(IKeybindingService);
        return accessor.get(IInstantiationService).createInstance(HoverAccessibleViewProvider, keybindingService, codeEditor, hoverController);
    }
}
export class HoverAccessibilityHelp {
    constructor() {
        this.priority = 100;
        this.name = 'hover';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = EditorContextKeys.hoverVisible;
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            throw new Error('No active or focused code editor');
        }
        const hoverController = ContentHoverController.get(codeEditor);
        if (!hoverController) {
            return;
        }
        return accessor.get(IInstantiationService).createInstance(HoverAccessibilityHelpProvider, hoverController);
    }
}
class BaseHoverAccessibleViewProvider extends Disposable {
    constructor(_hoverController) {
        super();
        this._hoverController = _hoverController;
        this.id = "hover" /* AccessibleViewProviderId.Hover */;
        this.verbositySettingKey = 'accessibility.verbosity.hover';
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._focusedHoverPartIndex = -1;
    }
    onOpen() {
        if (!this._hoverController) {
            return;
        }
        this._hoverController.shouldKeepOpenOnEditorMouseMoveOrLeave = true;
        this._focusedHoverPartIndex = this._hoverController.focusedHoverPartIndex();
        this._register(this._hoverController.onHoverContentsChanged(() => {
            this._onDidChangeContent.fire();
        }));
    }
    onClose() {
        if (!this._hoverController) {
            return;
        }
        if (this._focusedHoverPartIndex === -1) {
            this._hoverController.focus();
        }
        else {
            this._hoverController.focusHoverPartWithIndex(this._focusedHoverPartIndex);
        }
        this._focusedHoverPartIndex = -1;
        this._hoverController.shouldKeepOpenOnEditorMouseMoveOrLeave = false;
    }
    provideContentAtIndex(focusedHoverIndex, includeVerbosityActions) {
        if (focusedHoverIndex !== -1) {
            const accessibleContent = this._hoverController.getAccessibleWidgetContentAtIndex(focusedHoverIndex);
            if (accessibleContent === undefined) {
                return '';
            }
            const contents = [];
            if (includeVerbosityActions) {
                contents.push(...this._descriptionsOfVerbosityActionsForIndex(focusedHoverIndex));
            }
            contents.push(accessibleContent);
            return contents.join('\n');
        }
        else {
            const accessibleContent = this._hoverController.getAccessibleWidgetContent();
            if (accessibleContent === undefined) {
                return '';
            }
            const contents = [];
            contents.push(accessibleContent);
            return contents.join('\n');
        }
    }
    _descriptionsOfVerbosityActionsForIndex(index) {
        const content = [];
        const descriptionForIncreaseAction = this._descriptionOfVerbosityActionForIndex(HoverVerbosityAction.Increase, index);
        if (descriptionForIncreaseAction !== undefined) {
            content.push(descriptionForIncreaseAction);
        }
        const descriptionForDecreaseAction = this._descriptionOfVerbosityActionForIndex(HoverVerbosityAction.Decrease, index);
        if (descriptionForDecreaseAction !== undefined) {
            content.push(descriptionForDecreaseAction);
        }
        return content;
    }
    _descriptionOfVerbosityActionForIndex(action, index) {
        const isActionSupported = this._hoverController.doesHoverAtIndexSupportVerbosityAction(index, action);
        if (!isActionSupported) {
            return;
        }
        switch (action) {
            case HoverVerbosityAction.Increase:
                return HoverAccessibilityHelpNLS.increaseVerbosity;
            case HoverVerbosityAction.Decrease:
                return HoverAccessibilityHelpNLS.decreaseVerbosity;
        }
    }
}
export class HoverAccessibilityHelpProvider extends BaseHoverAccessibleViewProvider {
    constructor(hoverController) {
        super(hoverController);
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    provideContent() {
        return this.provideContentAtIndex(this._focusedHoverPartIndex, true);
    }
}
export class HoverAccessibleViewProvider extends BaseHoverAccessibleViewProvider {
    constructor(_keybindingService, _editor, hoverController) {
        super(hoverController);
        this._keybindingService = _keybindingService;
        this._editor = _editor;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._initializeOptions(this._editor, hoverController);
    }
    provideContent() {
        return this.provideContentAtIndex(this._focusedHoverPartIndex, false);
    }
    get actions() {
        const actions = [];
        actions.push(this._getActionFor(this._editor, HoverVerbosityAction.Increase));
        actions.push(this._getActionFor(this._editor, HoverVerbosityAction.Decrease));
        return actions;
    }
    _getActionFor(editor, action) {
        let actionId;
        let accessibleActionId;
        let actionCodicon;
        switch (action) {
            case HoverVerbosityAction.Increase:
                actionId = INCREASE_HOVER_VERBOSITY_ACTION_ID;
                accessibleActionId = INCREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID;
                actionCodicon = Codicon.add;
                break;
            case HoverVerbosityAction.Decrease:
                actionId = DECREASE_HOVER_VERBOSITY_ACTION_ID;
                accessibleActionId = DECREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID;
                actionCodicon = Codicon.remove;
                break;
        }
        const actionLabel = labelForHoverVerbosityAction(this._keybindingService, action);
        const actionEnabled = this._hoverController.doesHoverAtIndexSupportVerbosityAction(this._focusedHoverPartIndex, action);
        return new Action(accessibleActionId, actionLabel, ThemeIcon.asClassName(actionCodicon), actionEnabled, () => {
            editor.getAction(actionId)?.run({ index: this._focusedHoverPartIndex, focus: false });
        });
    }
    _initializeOptions(editor, hoverController) {
        const helpProvider = this._register(new HoverAccessibilityHelpProvider(hoverController));
        this.options.language = editor.getModel()?.getLanguageId();
        this.options.customHelp = () => { return helpProvider.provideContentAtIndex(this._focusedHoverPartIndex, true); };
    }
}
export class ExtHoverAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 90;
        this.name = 'extension-hover';
    }
    getProvider(accessor) {
        const contextViewService = accessor.get(IContextViewService);
        const contextViewElement = contextViewService.getContextViewElement();
        const extensionHoverContent = contextViewElement?.textContent ?? undefined;
        const hoverService = accessor.get(IHoverService);
        if (contextViewElement.classList.contains('accessible-view-container') || !extensionHoverContent) {
            // The accessible view, itself, uses the context view service to display the text. We don't want to read that.
            return;
        }
        return new AccessibleContentProvider("hover" /* AccessibleViewProviderId.Hover */, { language: 'typescript', type: "view" /* AccessibleViewType.View */ }, () => { return extensionHoverContent; }, () => {
            hoverService.showAndFocusLastHover();
        }, 'accessibility.verbosity.hover');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJBY2Nlc3NpYmxlVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9ob3ZlckFjY2Vzc2libGVWaWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFnRCx5QkFBeUIsRUFBMEQsTUFBTSw4REFBOEQsQ0FBQztBQUUvTSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSw2Q0FBNkMsRUFBRSxrQ0FBa0MsRUFBRSw2Q0FBNkMsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRTNNLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFP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