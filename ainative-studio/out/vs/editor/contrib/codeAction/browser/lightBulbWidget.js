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
var LightBulbWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { Gesture } from '../../../../base/browser/touch.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './lightBulbWidget.css';
import { GlyphMarginLane } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { computeIndentLevel } from '../../../common/model/utils.js';
import { autoFixCommandId, quickFixCommandId } from './codeAction.js';
import * as nls from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Range } from '../../../common/core/range.js';
const GUTTER_LIGHTBULB_ICON = registerIcon('gutter-lightbulb', Codicon.lightBulb, nls.localize('gutterLightbulbWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor.'));
const GUTTER_LIGHTBULB_AUTO_FIX_ICON = registerIcon('gutter-lightbulb-auto-fix', Codicon.lightbulbAutofix, nls.localize('gutterLightbulbAutoFixWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and a quick fix is available.'));
const GUTTER_LIGHTBULB_AIFIX_ICON = registerIcon('gutter-lightbulb-sparkle', Codicon.lightbulbSparkle, nls.localize('gutterLightbulbAIFixWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and an AI fix is available.'));
const GUTTER_LIGHTBULB_AIFIX_AUTO_FIX_ICON = registerIcon('gutter-lightbulb-aifix-auto-fix', Codicon.lightbulbSparkleAutofix, nls.localize('gutterLightbulbAIFixAutoFixWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and an AI fix and a quick fix is available.'));
const GUTTER_SPARKLE_FILLED_ICON = registerIcon('gutter-lightbulb-sparkle-filled', Codicon.sparkleFilled, nls.localize('gutterLightbulbSparkleFilledWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and an AI fix and a quick fix is available.'));
var LightBulbState;
(function (LightBulbState) {
    let Type;
    (function (Type) {
        Type[Type["Hidden"] = 0] = "Hidden";
        Type[Type["Showing"] = 1] = "Showing";
    })(Type = LightBulbState.Type || (LightBulbState.Type = {}));
    LightBulbState.Hidden = { type: 0 /* Type.Hidden */ };
    class Showing {
        constructor(actions, trigger, editorPosition, widgetPosition) {
            this.actions = actions;
            this.trigger = trigger;
            this.editorPosition = editorPosition;
            this.widgetPosition = widgetPosition;
            this.type = 1 /* Type.Showing */;
        }
    }
    LightBulbState.Showing = Showing;
})(LightBulbState || (LightBulbState = {}));
let LightBulbWidget = class LightBulbWidget extends Disposable {
    static { LightBulbWidget_1 = this; }
    static { this.GUTTER_DECORATION = ModelDecorationOptions.register({
        description: 'codicon-gutter-lightbulb-decoration',
        glyphMarginClassName: ThemeIcon.asClassName(Codicon.lightBulb),
        glyphMargin: { position: GlyphMarginLane.Left },
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    }); }
    static { this.ID = 'editor.contrib.lightbulbWidget'; }
    static { this._posPref = [0 /* ContentWidgetPositionPreference.EXACT */]; }
    constructor(_editor, _keybindingService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._state = LightBulbState.Hidden;
        this._gutterState = LightBulbState.Hidden;
        this._iconClasses = [];
        this.lightbulbClasses = [
            'codicon-' + GUTTER_LIGHTBULB_ICON.id,
            'codicon-' + GUTTER_LIGHTBULB_AIFIX_AUTO_FIX_ICON.id,
            'codicon-' + GUTTER_LIGHTBULB_AUTO_FIX_ICON.id,
            'codicon-' + GUTTER_LIGHTBULB_AIFIX_ICON.id,
            'codicon-' + GUTTER_SPARKLE_FILLED_ICON.id
        ];
        this.gutterDecoration = LightBulbWidget_1.GUTTER_DECORATION;
        this._domNode = dom.$('div.lightBulbWidget');
        this._domNode.role = 'listbox';
        this._register(Gesture.ignoreTarget(this._domNode));
        this._editor.addContentWidget(this);
        this._register(this._editor.onDidChangeModelContent(_ => {
            // cancel when the line in question has been removed
            const editorModel = this._editor.getModel();
            if (this.state.type !== 1 /* LightBulbState.Type.Showing */ || !editorModel || this.state.editorPosition.lineNumber >= editorModel.getLineCount()) {
                this.hide();
            }
            if (this.gutterState.type !== 1 /* LightBulbState.Type.Showing */ || !editorModel || this.gutterState.editorPosition.lineNumber >= editorModel.getLineCount()) {
                this.gutterHide();
            }
        }));
        this._register(dom.addStandardDisposableGenericMouseDownListener(this._domNode, e => {
            if (this.state.type !== 1 /* LightBulbState.Type.Showing */) {
                return;
            }
            // Make sure that focus / cursor location is not lost when clicking widget icon
            this._editor.focus();
            e.preventDefault();
            // a bit of extra work to make sure the menu
            // doesn't cover the line-text
            const { top, height } = dom.getDomNodePagePosition(this._domNode);
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            let pad = Math.floor(lineHeight / 3);
            if (this.state.widgetPosition.position !== null && this.state.widgetPosition.position.lineNumber < this.state.editorPosition.lineNumber) {
                pad += lineHeight;
            }
            this._onClick.fire({
                x: e.posx,
                y: top + height + pad,
                actions: this.state.actions,
                trigger: this.state.trigger,
            });
        }));
        this._register(dom.addDisposableListener(this._domNode, 'mouseenter', (e) => {
            if ((e.buttons & 1) !== 1) {
                return;
            }
            // mouse enters lightbulb while the primary/left button
            // is being pressed -> hide the lightbulb
            this.hide();
        }));
        this._register(Event.runAndSubscribe(this._keybindingService.onDidUpdateKeybindings, () => {
            this._preferredKbLabel = this._keybindingService.lookupKeybinding(autoFixCommandId)?.getLabel() ?? undefined;
            this._quickFixKbLabel = this._keybindingService.lookupKeybinding(quickFixCommandId)?.getLabel() ?? undefined;
            this._updateLightBulbTitleAndIcon();
        }));
        this._register(this._editor.onMouseDown(async (e) => {
            if (!e.target.element || !this.lightbulbClasses.some(cls => e.target.element && e.target.element.classList.contains(cls))) {
                return;
            }
            if (this.gutterState.type !== 1 /* LightBulbState.Type.Showing */) {
                return;
            }
            // Make sure that focus / cursor location is not lost when clicking widget icon
            this._editor.focus();
            // a bit of extra work to make sure the menu
            // doesn't cover the line-text
            const { top, height } = dom.getDomNodePagePosition(e.target.element);
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            let pad = Math.floor(lineHeight / 3);
            if (this.gutterState.widgetPosition.position !== null && this.gutterState.widgetPosition.position.lineNumber < this.gutterState.editorPosition.lineNumber) {
                pad += lineHeight;
            }
            this._onClick.fire({
                x: e.event.posx,
                y: top + height + pad,
                actions: this.gutterState.actions,
                trigger: this.gutterState.trigger,
            });
        }));
    }
    dispose() {
        super.dispose();
        this._editor.removeContentWidget(this);
        if (this._gutterDecorationID) {
            this._removeGutterDecoration(this._gutterDecorationID);
        }
    }
    getId() {
        return 'LightBulbWidget';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._state.type === 1 /* LightBulbState.Type.Showing */ ? this._state.widgetPosition : null;
    }
    update(actions, trigger, atPosition) {
        if (actions.validActions.length <= 0) {
            this.gutterHide();
            return this.hide();
        }
        const hasTextFocus = this._editor.hasTextFocus();
        if (!hasTextFocus) {
            this.gutterHide();
            return this.hide();
        }
        const options = this._editor.getOptions();
        if (!options.get(66 /* EditorOption.lightbulb */).enabled) {
            this.gutterHide();
            return this.hide();
        }
        const model = this._editor.getModel();
        if (!model) {
            this.gutterHide();
            return this.hide();
        }
        const { lineNumber, column } = model.validatePosition(atPosition);
        const tabSize = model.getOptions().tabSize;
        const fontInfo = this._editor.getOptions().get(52 /* EditorOption.fontInfo */);
        const lineContent = model.getLineContent(lineNumber);
        const indent = computeIndentLevel(lineContent, tabSize);
        const lineHasSpace = fontInfo.spaceWidth * indent > 22;
        const isFolded = (lineNumber) => {
            return lineNumber > 2 && this._editor.getTopForLineNumber(lineNumber) === this._editor.getTopForLineNumber(lineNumber - 1);
        };
        // Check for glyph margin decorations of any kind
        const currLineDecorations = this._editor.getLineDecorations(lineNumber);
        let hasDecoration = false;
        if (currLineDecorations) {
            for (const decoration of currLineDecorations) {
                const glyphClass = decoration.options.glyphMarginClassName;
                if (glyphClass && !this.lightbulbClasses.some(className => glyphClass.includes(className))) {
                    hasDecoration = true;
                    break;
                }
            }
        }
        let effectiveLineNumber = lineNumber;
        let effectiveColumnNumber = 1;
        if (!lineHasSpace) {
            // Checks if line is empty or starts with any amount of whitespace
            const isLineEmptyOrIndented = (lineNumber) => {
                const lineContent = model.getLineContent(lineNumber);
                return /^\s*$|^\s+/.test(lineContent) || lineContent.length <= effectiveColumnNumber;
            };
            if (lineNumber > 1 && !isFolded(lineNumber - 1)) {
                const lineCount = model.getLineCount();
                const endLine = lineNumber === lineCount;
                const prevLineEmptyOrIndented = lineNumber > 1 && isLineEmptyOrIndented(lineNumber - 1);
                const nextLineEmptyOrIndented = !endLine && isLineEmptyOrIndented(lineNumber + 1);
                const currLineEmptyOrIndented = isLineEmptyOrIndented(lineNumber);
                const notEmpty = !nextLineEmptyOrIndented && !prevLineEmptyOrIndented;
                // check above and below. if both are blocked, display lightbulb in the gutter.
                if (!nextLineEmptyOrIndented && !prevLineEmptyOrIndented && !hasDecoration) {
                    this.gutterState = new LightBulbState.Showing(actions, trigger, atPosition, {
                        position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
                        preference: LightBulbWidget_1._posPref
                    });
                    this.renderGutterLightbub();
                    return this.hide();
                }
                else if (prevLineEmptyOrIndented || endLine || (prevLineEmptyOrIndented && !currLineEmptyOrIndented)) {
                    effectiveLineNumber -= 1;
                }
                else if (nextLineEmptyOrIndented || (notEmpty && currLineEmptyOrIndented)) {
                    effectiveLineNumber += 1;
                }
            }
            else if (lineNumber === 1 && (lineNumber === model.getLineCount() || !isLineEmptyOrIndented(lineNumber + 1) && !isLineEmptyOrIndented(lineNumber))) {
                // special checks for first line blocked vs. not blocked.
                this.gutterState = new LightBulbState.Showing(actions, trigger, atPosition, {
                    position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
                    preference: LightBulbWidget_1._posPref
                });
                if (hasDecoration) {
                    this.gutterHide();
                }
                else {
                    this.renderGutterLightbub();
                    return this.hide();
                }
            }
            else if ((lineNumber < model.getLineCount()) && !isFolded(lineNumber + 1)) {
                effectiveLineNumber += 1;
            }
            else if (column * fontInfo.spaceWidth < 22) {
                // cannot show lightbulb above/below and showing
                // it inline would overlay the cursor...
                return this.hide();
            }
            effectiveColumnNumber = /^\S\s*$/.test(model.getLineContent(effectiveLineNumber)) ? 2 : 1;
        }
        this.state = new LightBulbState.Showing(actions, trigger, atPosition, {
            position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
            preference: LightBulbWidget_1._posPref
        });
        if (this._gutterDecorationID) {
            this._removeGutterDecoration(this._gutterDecorationID);
            this.gutterHide();
        }
        const validActions = actions.validActions;
        const actionKind = actions.validActions[0].action.kind;
        if (validActions.length !== 1 || !actionKind) {
            this._editor.layoutContentWidget(this);
            return;
        }
        this._editor.layoutContentWidget(this);
    }
    hide() {
        if (this.state === LightBulbState.Hidden) {
            return;
        }
        this.state = LightBulbState.Hidden;
        this._editor.layoutContentWidget(this);
    }
    gutterHide() {
        if (this.gutterState === LightBulbState.Hidden) {
            return;
        }
        if (this._gutterDecorationID) {
            this._removeGutterDecoration(this._gutterDecorationID);
        }
        this.gutterState = LightBulbState.Hidden;
    }
    get state() { return this._state; }
    set state(value) {
        this._state = value;
        this._updateLightBulbTitleAndIcon();
    }
    get gutterState() { return this._gutterState; }
    set gutterState(value) {
        this._gutterState = value;
        this._updateGutterLightBulbTitleAndIcon();
    }
    _updateLightBulbTitleAndIcon() {
        this._domNode.classList.remove(...this._iconClasses);
        this._iconClasses = [];
        if (this.state.type !== 1 /* LightBulbState.Type.Showing */) {
            return;
        }
        let icon;
        let autoRun = false;
        if (this.state.actions.allAIFixes) {
            icon = Codicon.sparkleFilled;
            if (this.state.actions.validActions.length === 1) {
                autoRun = true;
            }
        }
        else if (this.state.actions.hasAutoFix) {
            if (this.state.actions.hasAIFix) {
                icon = Codicon.lightbulbSparkleAutofix;
            }
            else {
                icon = Codicon.lightbulbAutofix;
            }
        }
        else if (this.state.actions.hasAIFix) {
            icon = Codicon.lightbulbSparkle;
        }
        else {
            icon = Codicon.lightBulb;
        }
        this._updateLightbulbTitle(this.state.actions.hasAutoFix, autoRun);
        this._iconClasses = ThemeIcon.asClassNameArray(icon);
        this._domNode.classList.add(...this._iconClasses);
    }
    _updateGutterLightBulbTitleAndIcon() {
        if (this.gutterState.type !== 1 /* LightBulbState.Type.Showing */) {
            return;
        }
        let icon;
        let autoRun = false;
        if (this.gutterState.actions.allAIFixes) {
            icon = GUTTER_SPARKLE_FILLED_ICON;
            if (this.gutterState.actions.validActions.length === 1) {
                autoRun = true;
            }
        }
        else if (this.gutterState.actions.hasAutoFix) {
            if (this.gutterState.actions.hasAIFix) {
                icon = GUTTER_LIGHTBULB_AIFIX_AUTO_FIX_ICON;
            }
            else {
                icon = GUTTER_LIGHTBULB_AUTO_FIX_ICON;
            }
        }
        else if (this.gutterState.actions.hasAIFix) {
            icon = GUTTER_LIGHTBULB_AIFIX_ICON;
        }
        else {
            icon = GUTTER_LIGHTBULB_ICON;
        }
        this._updateLightbulbTitle(this.gutterState.actions.hasAutoFix, autoRun);
        const GUTTER_DECORATION = ModelDecorationOptions.register({
            description: 'codicon-gutter-lightbulb-decoration',
            glyphMarginClassName: ThemeIcon.asClassName(icon),
            glyphMargin: { position: GlyphMarginLane.Left },
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        this.gutterDecoration = GUTTER_DECORATION;
    }
    /* Gutter Helper Functions */
    renderGutterLightbub() {
        const selection = this._editor.getSelection();
        if (!selection) {
            return;
        }
        if (this._gutterDecorationID === undefined) {
            this._addGutterDecoration(selection.startLineNumber);
        }
        else {
            this._updateGutterDecoration(this._gutterDecorationID, selection.startLineNumber);
        }
    }
    _addGutterDecoration(lineNumber) {
        this._editor.changeDecorations((accessor) => {
            this._gutterDecorationID = accessor.addDecoration(new Range(lineNumber, 0, lineNumber, 0), this.gutterDecoration);
        });
    }
    _removeGutterDecoration(decorationId) {
        this._editor.changeDecorations((accessor) => {
            accessor.removeDecoration(decorationId);
            this._gutterDecorationID = undefined;
        });
    }
    _updateGutterDecoration(decorationId, lineNumber) {
        this._editor.changeDecorations((accessor) => {
            accessor.changeDecoration(decorationId, new Range(lineNumber, 0, lineNumber, 0));
            accessor.changeDecorationOptions(decorationId, this.gutterDecoration);
        });
    }
    _updateLightbulbTitle(autoFix, autoRun) {
        if (this.state.type !== 1 /* LightBulbState.Type.Showing */) {
            return;
        }
        if (autoRun) {
            this.title = nls.localize('codeActionAutoRun', "Run: {0}", this.state.actions.validActions[0].action.title);
        }
        else if (autoFix && this._preferredKbLabel) {
            this.title = nls.localize('preferredcodeActionWithKb', "Show Code Actions. Preferred Quick Fix Available ({0})", this._preferredKbLabel);
        }
        else if (!autoFix && this._quickFixKbLabel) {
            this.title = nls.localize('codeActionWithKb', "Show Code Actions ({0})", this._quickFixKbLabel);
        }
        else if (!autoFix) {
            this.title = nls.localize('codeAction', "Show Code Actions");
        }
    }
    set title(value) {
        this._domNode.title = value;
    }
};
LightBulbWidget = LightBulbWidget_1 = __decorate([
    __param(1, IKeybindingService)
], LightBulbWidget);
export { LightBulbWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlnaHRCdWxiV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9saWdodEJ1bGJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyx1QkFBdUIsQ0FBQztBQUkvQixPQUFPLEVBQUUsZUFBZSxFQUEyRCxNQUFNLDBCQUEwQixDQUFDO0FBQ3BILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXRFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsMkZBQTJGLENBQUMsQ0FBQyxDQUFDO0FBQ3ROLE1BQU0sOEJBQThCLEdBQUcsWUFBWSxDQUFDLDJCQUEyQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHdIQUF3SCxDQUFDLENBQUMsQ0FBQztBQUNuUixNQUFNLDJCQUEyQixHQUFHLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxzSEFBc0gsQ0FBQyxDQUFDLENBQUM7QUFDM1EsTUFBTSxvQ0FBb0MsR0FBRyxZQUFZLENBQUMsaUNBQWlDLEVBQUUsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsc0lBQXNJLENBQUMsQ0FBQyxDQUFDO0FBQ3pULE1BQU0sMEJBQTBCLEdBQUcsWUFBWSxDQUFDLGlDQUFpQyxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxzSUFBc0ksQ0FBQyxDQUFDLENBQUM7QUFFdFMsSUFBVSxjQUFjLENBcUJ2QjtBQXJCRCxXQUFVLGNBQWM7SUFFdkIsSUFBa0IsSUFHakI7SUFIRCxXQUFrQixJQUFJO1FBQ3JCLG1DQUFNLENBQUE7UUFDTixxQ0FBTyxDQUFBO0lBQ1IsQ0FBQyxFQUhpQixJQUFJLEdBQUosbUJBQUksS0FBSixtQkFBSSxRQUdyQjtJQUVZLHFCQUFNLEdBQUcsRUFBRSxJQUFJLHFCQUFhLEVBQVcsQ0FBQztJQUVyRCxNQUFhLE9BQU87UUFHbkIsWUFDaUIsT0FBc0IsRUFDdEIsT0FBMEIsRUFDMUIsY0FBeUIsRUFDekIsY0FBc0M7WUFIdEMsWUFBTyxHQUFQLE9BQU8sQ0FBZTtZQUN0QixZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUMxQixtQkFBYyxHQUFkLGNBQWMsQ0FBVztZQUN6QixtQkFBYyxHQUFkLGNBQWMsQ0FBd0I7WUFOOUMsU0FBSSx3QkFBZ0I7UUFPekIsQ0FBQztLQUNMO0lBVFksc0JBQU8sVUFTbkIsQ0FBQTtBQUdGLENBQUMsRUFyQlMsY0FBYyxLQUFkLGNBQWMsUUFxQnZCO0FBRU0sSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVOzthQUd0QixzQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7UUFDM0UsV0FBVyxFQUFFLHFDQUFxQztRQUNsRCxvQkFBb0IsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDOUQsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUU7UUFDL0MsVUFBVSw0REFBb0Q7S0FDOUQsQ0FBQyxBQUx1QyxDQUt0QzthQUVvQixPQUFFLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW9DO2FBRXJDLGFBQVEsR0FBRywrQ0FBdUMsQUFBMUMsQ0FBMkM7SUF3QjNFLFlBQ2tCLE9BQW9CLEVBQ2pCLGtCQUF1RDtRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUhTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDQSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBdEIzRCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBb0gsQ0FBQyxDQUFDO1FBQzVKLFlBQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUV0QyxXQUFNLEdBQXlCLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDckQsaUJBQVksR0FBeUIsY0FBYyxDQUFDLE1BQU0sQ0FBQztRQUMzRCxpQkFBWSxHQUFhLEVBQUUsQ0FBQztRQUVuQixxQkFBZ0IsR0FBRztZQUNuQyxVQUFVLEdBQUcscUJBQXFCLENBQUMsRUFBRTtZQUNyQyxVQUFVLEdBQUcsb0NBQW9DLENBQUMsRUFBRTtZQUNwRCxVQUFVLEdBQUcsOEJBQThCLENBQUMsRUFBRTtZQUM5QyxVQUFVLEdBQUcsMkJBQTJCLENBQUMsRUFBRTtZQUMzQyxVQUFVLEdBQUcsMEJBQTBCLENBQUMsRUFBRTtTQUMxQyxDQUFDO1FBS00scUJBQWdCLEdBQTJCLGlCQUFlLENBQUMsaUJBQWlCLENBQUM7UUFRcEYsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXBDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RCxvREFBb0Q7WUFDcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBZ0MsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQzNJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNiLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSx3Q0FBZ0MsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQ3ZKLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNuQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDbkYsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksd0NBQWdDLEVBQUUsQ0FBQztnQkFDckQsT0FBTztZQUNSLENBQUM7WUFFRCwrRUFBK0U7WUFDL0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFbkIsNENBQTRDO1lBQzVDLDhCQUE4QjtZQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGtDQUF5QixDQUFDO1lBRW5FLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN6SSxHQUFHLElBQUksVUFBVSxDQUFDO1lBQ25CLENBQUM7WUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDbEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNULENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUc7Z0JBQ3JCLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU87Z0JBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU87YUFDM0IsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBYSxFQUFFLEVBQUU7WUFDdkYsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU87WUFDUixDQUFDO1lBQ0QsdURBQXVEO1lBQ3ZELHlDQUF5QztZQUN6QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBR0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDekYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLFNBQVMsQ0FBQztZQUM3RyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksU0FBUyxDQUFDO1lBQzdHLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFvQixFQUFFLEVBQUU7WUFFdEUsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMzSCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLHdDQUFnQyxFQUFFLENBQUM7Z0JBQzNELE9BQU87WUFDUixDQUFDO1lBRUQsK0VBQStFO1lBQy9FLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFckIsNENBQTRDO1lBQzVDLDhCQUE4QjtZQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQztZQUVuRSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFFBQVEsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDM0osR0FBRyxJQUFJLFVBQVUsQ0FBQztZQUNuQixDQUFDO1lBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUk7Z0JBQ2YsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRztnQkFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTztnQkFDakMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTzthQUNqQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN4RCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLGlCQUFpQixDQUFDO0lBQzFCLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksd0NBQWdDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDN0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFzQixFQUFFLE9BQTBCLEVBQUUsVUFBcUI7UUFDdEYsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsaUNBQXdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFHRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBRUQsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbEUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQztRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsZ0NBQXVCLENBQUM7UUFDdEUsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFVBQVUsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLENBQUMsVUFBa0IsRUFBRSxFQUFFO1lBQ3ZDLE9BQU8sVUFBVSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzVILENBQUMsQ0FBQztRQUVGLGlEQUFpRDtRQUNqRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEUsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBQzFCLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixLQUFLLE1BQU0sVUFBVSxJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBQzlDLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7Z0JBRTNELElBQUksVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM1RixhQUFhLEdBQUcsSUFBSSxDQUFDO29CQUNyQixNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksbUJBQW1CLEdBQUcsVUFBVSxDQUFDO1FBQ3JDLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixrRUFBa0U7WUFDbEUsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFVBQWtCLEVBQVcsRUFBRTtnQkFDN0QsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDckQsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLElBQUkscUJBQXFCLENBQUM7WUFDdEYsQ0FBQyxDQUFDO1lBRUYsSUFBSSxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sT0FBTyxHQUFHLFVBQVUsS0FBSyxTQUFTLENBQUM7Z0JBQ3pDLE1BQU0sdUJBQXVCLEdBQUcsVUFBVSxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hGLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxPQUFPLElBQUkscUJBQXFCLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLHVCQUF1QixHQUFHLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNsRSxNQUFNLFFBQVEsR0FBRyxDQUFDLHVCQUF1QixJQUFJLENBQUMsdUJBQXVCLENBQUM7Z0JBRXRFLCtFQUErRTtnQkFDL0UsSUFBSSxDQUFDLHVCQUF1QixJQUFJLENBQUMsdUJBQXVCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDNUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUU7d0JBQzNFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7d0JBQzVFLFVBQVUsRUFBRSxpQkFBZSxDQUFDLFFBQVE7cUJBQ3BDLENBQUMsQ0FBQztvQkFDSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BCLENBQUM7cUJBQU0sSUFBSSx1QkFBdUIsSUFBSSxPQUFPLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztvQkFDeEcsbUJBQW1CLElBQUksQ0FBQyxDQUFDO2dCQUMxQixDQUFDO3FCQUFNLElBQUksdUJBQXVCLElBQUksQ0FBQyxRQUFRLElBQUksdUJBQXVCLENBQUMsRUFBRSxDQUFDO29CQUM3RSxtQkFBbUIsSUFBSSxDQUFDLENBQUM7Z0JBQzFCLENBQUM7WUFDRixDQUFDO2lCQUFNLElBQUksVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RKLHlEQUF5RDtnQkFDekQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUU7b0JBQzNFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7b0JBQzVFLFVBQVUsRUFBRSxpQkFBZSxDQUFDLFFBQVE7aUJBQ3BDLENBQUMsQ0FBQztnQkFFSCxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ25CLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO2lCQUFNLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzdFLG1CQUFtQixJQUFJLENBQUMsQ0FBQztZQUMxQixDQUFDO2lCQUFNLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQzlDLGdEQUFnRDtnQkFDaEQsd0NBQXdDO2dCQUN4QyxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQixDQUFDO1lBQ0QscUJBQXFCLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFO1lBQ3JFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7WUFDNUUsVUFBVSxFQUFFLGlCQUFlLENBQUMsUUFBUTtTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbkIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ3ZELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRU0sSUFBSTtRQUNWLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztJQUMxQyxDQUFDO0lBRUQsSUFBWSxLQUFLLEtBQTJCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFakUsSUFBWSxLQUFLLENBQUMsS0FBSztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBWSxXQUFXLEtBQTJCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFFN0UsSUFBWSxXQUFXLENBQUMsS0FBSztRQUM1QixJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBRU8sNEJBQTRCO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO1lBQ3JELE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxJQUFlLENBQUM7UUFDcEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMxQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDO1lBQ3hDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN4QyxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDMUIsQ0FBQztRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFTyxrQ0FBa0M7UUFDekMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksd0NBQWdDLEVBQUUsQ0FBQztZQUMzRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksSUFBZSxDQUFDO1FBQ3BCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3pDLElBQUksR0FBRywwQkFBMEIsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksR0FBRyxvQ0FBb0MsQ0FBQztZQUM3QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxHQUFHLDhCQUE4QixDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5QyxJQUFJLEdBQUcsMkJBQTJCLENBQUM7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEdBQUcscUJBQXFCLENBQUM7UUFDOUIsQ0FBQztRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFekUsTUFBTSxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7WUFDekQsV0FBVyxFQUFFLHFDQUFxQztZQUNsRCxvQkFBb0IsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztZQUNqRCxXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRTtZQUMvQyxVQUFVLDREQUFvRDtTQUM5RCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUM7SUFDM0MsQ0FBQztJQUVELDZCQUE2QjtJQUNyQixvQkFBb0I7UUFDM0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM5QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3RELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbkYsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxVQUFrQjtRQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBeUMsRUFBRSxFQUFFO1lBQzVFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25ILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLHVCQUF1QixDQUFDLFlBQW9CO1FBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUF5QyxFQUFFLEVBQUU7WUFDNUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sdUJBQXVCLENBQUMsWUFBb0IsRUFBRSxVQUFrQjtRQUN2RSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBeUMsRUFBRSxFQUFFO1lBQzVFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRixRQUFRLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQWdCLEVBQUUsT0FBZ0I7UUFDL0QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksd0NBQWdDLEVBQUUsQ0FBQztZQUNyRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0csQ0FBQzthQUFNLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx3REFBd0QsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMxSSxDQUFDO2FBQU0sSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUseUJBQXlCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDakcsQ0FBQzthQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDOUQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLEtBQUssQ0FBQyxLQUFhO1FBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUM3QixDQUFDOztBQTNhVyxlQUFlO0lBc0N6QixXQUFBLGtCQUFrQixDQUFBO0dBdENSLGVBQWUsQ0E0YTNCIn0=