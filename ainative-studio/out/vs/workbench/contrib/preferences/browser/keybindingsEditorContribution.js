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
var KeybindingEditorDecorationsRenderer_1;
import * as nls from '../../../../nls.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SmartSnippetInserter } from '../common/smartSnippetInserter.js';
import { DefineKeybindingOverlayWidget } from './keybindingWidgets.js';
import { parseTree } from '../../../../base/common/json.js';
import { WindowsNativeResolvedKeybinding } from '../../../services/keybinding/common/windowsKeyboardMapper.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { overviewRulerInfo, overviewRulerError } from '../../../../editor/common/core/editorColorRegistry.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { DEFINE_KEYBINDING_EDITOR_CONTRIB_ID } from '../../../services/preferences/common/preferences.js';
const NLS_KB_LAYOUT_ERROR_MESSAGE = nls.localize('defineKeybinding.kbLayoutErrorMessage', "You won't be able to produce this key combination under your current keyboard layout.");
let DefineKeybindingEditorContribution = class DefineKeybindingEditorContribution extends Disposable {
    constructor(_editor, _instantiationService, _userDataProfileService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._userDataProfileService = _userDataProfileService;
        this._keybindingDecorationRenderer = this._register(new MutableDisposable());
        this._defineWidget = this._register(this._instantiationService.createInstance(DefineKeybindingOverlayWidget, this._editor));
        this._register(this._editor.onDidChangeModel(e => this._update()));
        this._update();
    }
    _update() {
        this._keybindingDecorationRenderer.value = isInterestingEditorModel(this._editor, this._userDataProfileService)
            // Decorations are shown for the default keybindings.json **and** for the user keybindings.json
            ? this._instantiationService.createInstance(KeybindingEditorDecorationsRenderer, this._editor)
            : undefined;
    }
    showDefineKeybindingWidget() {
        if (isInterestingEditorModel(this._editor, this._userDataProfileService)) {
            this._defineWidget.start().then(keybinding => this._onAccepted(keybinding));
        }
    }
    _onAccepted(keybinding) {
        this._editor.focus();
        if (keybinding && this._editor.hasModel()) {
            const regexp = new RegExp(/\\/g);
            const backslash = regexp.test(keybinding);
            if (backslash) {
                keybinding = keybinding.slice(0, -1) + '\\\\';
            }
            let snippetText = [
                '{',
                '\t"key": ' + JSON.stringify(keybinding) + ',',
                '\t"command": "${1:commandId}",',
                '\t"when": "${2:editorTextFocus}"',
                '}$0'
            ].join('\n');
            const smartInsertInfo = SmartSnippetInserter.insertSnippet(this._editor.getModel(), this._editor.getPosition());
            snippetText = smartInsertInfo.prepend + snippetText + smartInsertInfo.append;
            this._editor.setPosition(smartInsertInfo.position);
            SnippetController2.get(this._editor)?.insert(snippetText, { overwriteBefore: 0, overwriteAfter: 0 });
        }
    }
};
DefineKeybindingEditorContribution = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUserDataProfileService)
], DefineKeybindingEditorContribution);
let KeybindingEditorDecorationsRenderer = KeybindingEditorDecorationsRenderer_1 = class KeybindingEditorDecorationsRenderer extends Disposable {
    constructor(_editor, _keybindingService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._dec = this._editor.createDecorationsCollection();
        this._updateDecorations = this._register(new RunOnceScheduler(() => this._updateDecorationsNow(), 500));
        const model = assertIsDefined(this._editor.getModel());
        this._register(model.onDidChangeContent(() => this._updateDecorations.schedule()));
        this._register(this._keybindingService.onDidUpdateKeybindings(() => this._updateDecorations.schedule()));
        this._register({
            dispose: () => {
                this._dec.clear();
                this._updateDecorations.cancel();
            }
        });
        this._updateDecorations.schedule();
    }
    _updateDecorationsNow() {
        const model = assertIsDefined(this._editor.getModel());
        const newDecorations = [];
        const root = parseTree(model.getValue());
        if (root && Array.isArray(root.children)) {
            for (let i = 0, len = root.children.length; i < len; i++) {
                const entry = root.children[i];
                const dec = this._getDecorationForEntry(model, entry);
                if (dec !== null) {
                    newDecorations.push(dec);
                }
            }
        }
        this._dec.set(newDecorations);
    }
    _getDecorationForEntry(model, entry) {
        if (!Array.isArray(entry.children)) {
            return null;
        }
        for (let i = 0, len = entry.children.length; i < len; i++) {
            const prop = entry.children[i];
            if (prop.type !== 'property') {
                continue;
            }
            if (!Array.isArray(prop.children) || prop.children.length !== 2) {
                continue;
            }
            const key = prop.children[0];
            if (key.value !== 'key') {
                continue;
            }
            const value = prop.children[1];
            if (value.type !== 'string') {
                continue;
            }
            const resolvedKeybindings = this._keybindingService.resolveUserBinding(value.value);
            if (resolvedKeybindings.length === 0) {
                return this._createDecoration(true, null, null, model, value);
            }
            const resolvedKeybinding = resolvedKeybindings[0];
            let usLabel = null;
            if (resolvedKeybinding instanceof WindowsNativeResolvedKeybinding) {
                usLabel = resolvedKeybinding.getUSLabel();
            }
            if (!resolvedKeybinding.isWYSIWYG()) {
                const uiLabel = resolvedKeybinding.getLabel();
                if (typeof uiLabel === 'string' && value.value.toLowerCase() === uiLabel.toLowerCase()) {
                    // coincidentally, this is actually WYSIWYG
                    return null;
                }
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            if (/abnt_|oem_/.test(value.value)) {
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            const expectedUserSettingsLabel = resolvedKeybinding.getUserSettingsLabel();
            if (typeof expectedUserSettingsLabel === 'string' && !KeybindingEditorDecorationsRenderer_1._userSettingsFuzzyEquals(value.value, expectedUserSettingsLabel)) {
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            return null;
        }
        return null;
    }
    static _userSettingsFuzzyEquals(a, b) {
        a = a.trim().toLowerCase();
        b = b.trim().toLowerCase();
        if (a === b) {
            return true;
        }
        const aKeybinding = KeybindingParser.parseKeybinding(a);
        const bKeybinding = KeybindingParser.parseKeybinding(b);
        if (aKeybinding === null && bKeybinding === null) {
            return true;
        }
        if (!aKeybinding || !bKeybinding) {
            return false;
        }
        return aKeybinding.equals(bKeybinding);
    }
    _createDecoration(isError, uiLabel, usLabel, model, keyNode) {
        let msg;
        let className;
        let overviewRulerColor;
        if (isError) {
            // this is the error case
            msg = new MarkdownString().appendText(NLS_KB_LAYOUT_ERROR_MESSAGE);
            className = 'keybindingError';
            overviewRulerColor = themeColorFromId(overviewRulerError);
        }
        else {
            // this is the info case
            if (usLabel && uiLabel !== usLabel) {
                msg = new MarkdownString(nls.localize({
                    key: 'defineKeybinding.kbLayoutLocalAndUSMessage',
                    comment: [
                        'Please translate maintaining the stars (*) around the placeholders such that they will be rendered in bold.',
                        'The placeholders will contain a keyboard combination e.g. Ctrl+Shift+/'
                    ]
                }, "**{0}** for your current keyboard layout (**{1}** for US standard).", uiLabel, usLabel));
            }
            else {
                msg = new MarkdownString(nls.localize({
                    key: 'defineKeybinding.kbLayoutLocalMessage',
                    comment: [
                        'Please translate maintaining the stars (*) around the placeholder such that it will be rendered in bold.',
                        'The placeholder will contain a keyboard combination e.g. Ctrl+Shift+/'
                    ]
                }, "**{0}** for your current keyboard layout.", uiLabel));
            }
            className = 'keybindingInfo';
            overviewRulerColor = themeColorFromId(overviewRulerInfo);
        }
        const startPosition = model.getPositionAt(keyNode.offset);
        const endPosition = model.getPositionAt(keyNode.offset + keyNode.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        // icon + highlight + message decoration
        return {
            range: range,
            options: {
                description: 'keybindings-widget',
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                className: className,
                hoverMessage: msg,
                overviewRuler: {
                    color: overviewRulerColor,
                    position: OverviewRulerLane.Right
                }
            }
        };
    }
};
KeybindingEditorDecorationsRenderer = KeybindingEditorDecorationsRenderer_1 = __decorate([
    __param(1, IKeybindingService)
], KeybindingEditorDecorationsRenderer);
export { KeybindingEditorDecorationsRenderer };
function isInterestingEditorModel(editor, userDataProfileService) {
    const model = editor.getModel();
    if (!model) {
        return false;
    }
    return isEqual(model.uri, userDataProfileService.currentProfile.keybindingsResource);
}
registerEditorContribution(DEFINE_KEYBINDING_EDITOR_CONTRIB_ID, DefineKeybindingEditorContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9rZXliaW5kaW5nc0VkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQW1DLE1BQU0sZ0RBQWdELENBQUM7QUFFN0gsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBUSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FB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