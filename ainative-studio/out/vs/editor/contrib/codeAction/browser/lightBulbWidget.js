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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlnaHRCdWxiV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2xpZ2h0QnVsYldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLHVCQUF1QixDQUFDO0FBSS9CLE9BQU8sRUFBRSxlQUFlLEVBQTJELE1BQU0sMEJBQTBCLENBQUM7QUFDcEgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFdEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE1BQU0scUJBQXFC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