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
var ReplInputHintContentWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { OS } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ReplEditorSettings } from './interactiveCommon.js';
let ReplInputHintContentWidget = class ReplInputHintContentWidget extends Disposable {
    static { ReplInputHintContentWidget_1 = this; }
    static { this.ID = 'replInput.widget.emptyHint'; }
    constructor(editor, configurationService, keybindingService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.ariaLabel = '';
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (this.domNode && e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        const onDidFocusEditorText = Event.debounce(this.editor.onDidFocusEditorText, () => undefined, 500);
        this._register(onDidFocusEditorText(() => {
            if (this.editor.hasTextFocus() && this.ariaLabel && configurationService.getValue("accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */)) {
                status(this.ariaLabel);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ReplEditorSettings.executeWithShiftEnter)) {
                this.setHint();
            }
        }));
        this.editor.addContentWidget(this);
    }
    getId() {
        return ReplInputHintContentWidget_1.ID;
    }
    getPosition() {
        return {
            position: { lineNumber: 1, column: 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */]
        };
    }
    getDomNode() {
        if (!this.domNode) {
            this.domNode = dom.$('.empty-editor-hint');
            this.domNode.style.width = 'max-content';
            this.domNode.style.paddingLeft = '4px';
            this.setHint();
            this._register(dom.addDisposableListener(this.domNode, 'click', () => {
                this.editor.focus();
            }));
            this.editor.applyFontInfo(this.domNode);
        }
        return this.domNode;
    }
    setHint() {
        if (!this.domNode) {
            return;
        }
        while (this.domNode.firstChild) {
            this.domNode.removeChild(this.domNode.firstChild);
        }
        const hintElement = dom.$('div.empty-hint-text');
        hintElement.style.cursor = 'text';
        hintElement.style.whiteSpace = 'nowrap';
        const keybinding = this.getKeybinding();
        const keybindingHintLabel = keybinding?.getLabel();
        if (keybinding && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Press {0} to execute. ', keybindingHintLabel);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                const hintPart = dom.$('span', undefined, fragment);
                hintPart.style.fontStyle = 'italic';
                return hintPart;
            });
            hintElement.appendChild(before);
            const label = new KeybindingLabel(hintElement, OS);
            label.set(keybinding);
            label.element.style.width = 'min-content';
            label.element.style.display = 'inline';
            hintElement.appendChild(after);
            this.domNode.append(hintElement);
            const helpKeybinding = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            const helpInfo = helpKeybinding
                ? localize('ReplInputAriaLabelHelp', "Use {0} for accessibility help. ", helpKeybinding)
                : localize('ReplInputAriaLabelHelpNoKb', "Run the Open Accessibility Help command for more information. ");
            this.ariaLabel = actionPart.concat(helpInfo, localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */));
        }
    }
    getKeybinding() {
        const keybindings = this.keybindingService.lookupKeybindings('interactive.execute');
        const shiftEnterConfig = this.configurationService.getValue(ReplEditorSettings.executeWithShiftEnter);
        const hasEnterChord = (kb, modifier = '') => {
            const chords = kb.getDispatchChords();
            const chord = modifier + 'Enter';
            const chordAlt = modifier + '[Enter]';
            return chords.length === 1 && (chords[0] === chord || chords[0] === chordAlt);
        };
        if (shiftEnterConfig) {
            const keybinding = keybindings.find(kb => hasEnterChord(kb, 'shift+'));
            if (keybinding) {
                return keybinding;
            }
        }
        else {
            let keybinding = keybindings.find(kb => hasEnterChord(kb));
            if (keybinding) {
                return keybinding;
            }
            keybinding = this.keybindingService.lookupKeybindings('python.execInREPLEnter')
                .find(kb => hasEnterChord(kb));
            if (keybinding) {
                return keybinding;
            }
        }
        return keybindings?.[0];
    }
    dispose() {
        super.dispose();
        this.editor.removeContentWidget(this);
    }
};
ReplInputHintContentWidget = ReplInputHintContentWidget_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IKeybindingService)
], ReplInputHintContentWidget);
export { ReplInputHintContentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbElucHV0SGludENvbnRlbnRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW50ZXJhY3RpdmUvYnJvd3Nlci9yZXBsSW5wdXRIaW50Q29udGVudFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUcxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUdyRCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7O2FBRWpDLE9BQUUsR0FBRyw0QkFBNEIsQUFBL0IsQ0FBZ0M7SUFLMUQsWUFDa0IsTUFBbUIsRUFDYixvQkFBNEQsRUFDL0QsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBSlMsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNJLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFD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