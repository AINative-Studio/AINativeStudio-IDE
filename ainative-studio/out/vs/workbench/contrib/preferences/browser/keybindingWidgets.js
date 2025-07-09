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
var DefineKeybindingWidget_1, DefineKeybindingOverlayWidget_1;
import './media/keybindings.css';
import * as nls from '../../../../nls.js';
import { OS } from '../../../../base/common/platform.js';
import { Disposable, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import * as dom from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { asCssVariable, editorWidgetBackground, editorWidgetForeground, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { SearchWidget } from './preferencesWidgets.js';
import { Promises, timeout } from '../../../../base/common/async.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { defaultInputBoxStyles, defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
let KeybindingsSearchWidget = class KeybindingsSearchWidget extends SearchWidget {
    constructor(parent, options, contextViewService, instantiationService, contextKeyService, keybindingService) {
        super(parent, options, contextViewService, instantiationService, contextKeyService, keybindingService);
        this.recordDisposables = this._register(new DisposableStore());
        this._onKeybinding = this._register(new Emitter());
        this.onKeybinding = this._onKeybinding.event;
        this._onEnter = this._register(new Emitter());
        this.onEnter = this._onEnter.event;
        this._onEscape = this._register(new Emitter());
        this.onEscape = this._onEscape.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this._register(toDisposable(() => this.stopRecordingKeys()));
        this._chords = null;
        this._inputValue = '';
    }
    clear() {
        this._chords = null;
        super.clear();
    }
    startRecordingKeys() {
        this.recordDisposables.add(dom.addDisposableListener(this.inputBox.inputElement, dom.EventType.KEY_DOWN, (e) => this._onKeyDown(new StandardKeyboardEvent(e))));
        this.recordDisposables.add(dom.addDisposableListener(this.inputBox.inputElement, dom.EventType.BLUR, () => this._onBlur.fire()));
        this.recordDisposables.add(dom.addDisposableListener(this.inputBox.inputElement, dom.EventType.INPUT, () => {
            // Prevent other characters from showing up
            this.setInputValue(this._inputValue);
        }));
    }
    stopRecordingKeys() {
        this._chords = null;
        this.recordDisposables.clear();
    }
    setInputValue(value) {
        this._inputValue = value;
        this.inputBox.value = this._inputValue;
    }
    _onKeyDown(keyboardEvent) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        const options = this.options;
        if (!options.recordEnter && keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            this._onEnter.fire();
            return;
        }
        if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
            this._onEscape.fire();
            return;
        }
        this.printKeybinding(keyboardEvent);
    }
    printKeybinding(keyboardEvent) {
        const keybinding = this.keybindingService.resolveKeyboardEvent(keyboardEvent);
        const info = `code: ${keyboardEvent.browserEvent.code}, keyCode: ${keyboardEvent.browserEvent.keyCode}, key: ${keyboardEvent.browserEvent.key} => UI: ${keybinding.getAriaLabel()}, user settings: ${keybinding.getUserSettingsLabel()}, dispatch: ${keybinding.getDispatchChords()[0]}`;
        const options = this.options;
        if (!this._chords) {
            this._chords = [];
        }
        // TODO: note that we allow a keybinding "shift shift", but this widget doesn't allow input "shift shift" because the first "shift" will be incomplete - this is _not_ a regression
        const hasIncompleteChord = this._chords.length > 0 && this._chords[this._chords.length - 1].getDispatchChords()[0] === null;
        if (hasIncompleteChord) {
            this._chords[this._chords.length - 1] = keybinding;
        }
        else {
            if (this._chords.length === 2) { // TODO: limit chords # to 2 for now
                this._chords = [];
            }
            this._chords.push(keybinding);
        }
        const value = this._chords.map((keybinding) => keybinding.getUserSettingsLabel() || '').join(' ');
        this.setInputValue(options.quoteRecordedKeys ? `"${value}"` : value);
        this.inputBox.inputElement.title = info;
        this._onKeybinding.fire(this._chords);
    }
};
KeybindingsSearchWidget = __decorate([
    __param(2, IContextViewService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IKeybindingService)
], KeybindingsSearchWidget);
export { KeybindingsSearchWidget };
let DefineKeybindingWidget = class DefineKeybindingWidget extends Widget {
    static { DefineKeybindingWidget_1 = this; }
    static { this.WIDTH = 400; }
    static { this.HEIGHT = 110; }
    constructor(parent, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._keybindingDisposables = this._register(new DisposableStore());
        this._chords = null;
        this._isVisible = false;
        this._onHide = this._register(new Emitter());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onShowExistingKeybindings = this._register(new Emitter());
        this.onShowExistingKeybidings = this._onShowExistingKeybindings.event;
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setDisplay('none');
        this._domNode.setClassName('defineKeybindingWidget');
        this._domNode.setWidth(DefineKeybindingWidget_1.WIDTH);
        this._domNode.setHeight(DefineKeybindingWidget_1.HEIGHT);
        const message = nls.localize('defineKeybinding.initial', "Press desired key combination and then press ENTER.");
        dom.append(this._domNode.domNode, dom.$('.message', undefined, message));
        this._domNode.domNode.style.backgroundColor = asCssVariable(editorWidgetBackground);
        this._domNode.domNode.style.color = asCssVariable(editorWidgetForeground);
        this._domNode.domNode.style.boxShadow = `0 2px 8px ${asCssVariable(widgetShadow)}`;
        this._keybindingInputWidget = this._register(this.instantiationService.createInstance(KeybindingsSearchWidget, this._domNode.domNode, { ariaLabel: message, history: new Set([]), inputBoxStyles: defaultInputBoxStyles }));
        this._keybindingInputWidget.startRecordingKeys();
        this._register(this._keybindingInputWidget.onKeybinding(keybinding => this.onKeybinding(keybinding)));
        this._register(this._keybindingInputWidget.onEnter(() => this.hide()));
        this._register(this._keybindingInputWidget.onEscape(() => this.clearOrHide()));
        this._register(this._keybindingInputWidget.onBlur(() => this.onCancel()));
        this._outputNode = dom.append(this._domNode.domNode, dom.$('.output'));
        this._showExistingKeybindingsNode = dom.append(this._domNode.domNode, dom.$('.existing'));
        if (parent) {
            dom.append(parent, this._domNode.domNode);
        }
    }
    get domNode() {
        return this._domNode.domNode;
    }
    define() {
        this._keybindingInputWidget.clear();
        return Promises.withAsyncBody(async (c) => {
            if (!this._isVisible) {
                this._isVisible = true;
                this._domNode.setDisplay('block');
                this._chords = null;
                this._keybindingInputWidget.setInputValue('');
                dom.clearNode(this._outputNode);
                dom.clearNode(this._showExistingKeybindingsNode);
                // Input is not getting focus without timeout in safari
                // https://github.com/microsoft/vscode/issues/108817
                await timeout(0);
                this._keybindingInputWidget.focus();
            }
            const disposable = this._onHide.event(() => {
                c(this.getUserSettingsLabel());
                disposable.dispose();
            });
        });
    }
    layout(layout) {
        const top = Math.round((layout.height - DefineKeybindingWidget_1.HEIGHT) / 2);
        this._domNode.setTop(top);
        const left = Math.round((layout.width - DefineKeybindingWidget_1.WIDTH) / 2);
        this._domNode.setLeft(left);
    }
    printExisting(numberOfExisting) {
        if (numberOfExisting > 0) {
            const existingElement = dom.$('span.existingText');
            const text = numberOfExisting === 1 ? nls.localize('defineKeybinding.oneExists', "1 existing command has this keybinding", numberOfExisting) : nls.localize('defineKeybinding.existing', "{0} existing commands have this keybinding", numberOfExisting);
            dom.append(existingElement, document.createTextNode(text));
            aria.alert(text);
            this._showExistingKeybindingsNode.appendChild(existingElement);
            existingElement.onmousedown = (e) => { e.preventDefault(); };
            existingElement.onmouseup = (e) => { e.preventDefault(); };
            existingElement.onclick = () => { this._onShowExistingKeybindings.fire(this.getUserSettingsLabel()); };
        }
    }
    onKeybinding(keybinding) {
        this._keybindingDisposables.clear();
        this._chords = keybinding;
        dom.clearNode(this._outputNode);
        dom.clearNode(this._showExistingKeybindingsNode);
        const firstLabel = this._keybindingDisposables.add(new KeybindingLabel(this._outputNode, OS, defaultKeybindingLabelStyles));
        firstLabel.set(this._chords?.[0] ?? undefined);
        if (this._chords) {
            for (let i = 1; i < this._chords.length; i++) {
                this._outputNode.appendChild(document.createTextNode(nls.localize('defineKeybinding.chordsTo', "chord to")));
                const chordLabel = this._keybindingDisposables.add(new KeybindingLabel(this._outputNode, OS, defaultKeybindingLabelStyles));
                chordLabel.set(this._chords[i]);
            }
        }
        const label = this.getUserSettingsLabel();
        if (label) {
            this._onDidChange.fire(label);
        }
    }
    getUserSettingsLabel() {
        let label = null;
        if (this._chords) {
            label = this._chords.map(keybinding => keybinding.getUserSettingsLabel()).join(' ');
        }
        return label;
    }
    onCancel() {
        this._chords = null;
        this.hide();
    }
    clearOrHide() {
        if (this._chords === null) {
            this.hide();
        }
        else {
            this._chords = null;
            this._keybindingInputWidget.clear();
            dom.clearNode(this._outputNode);
            dom.clearNode(this._showExistingKeybindingsNode);
        }
    }
    hide() {
        this._domNode.setDisplay('none');
        this._isVisible = false;
        this._onHide.fire();
    }
};
DefineKeybindingWidget = DefineKeybindingWidget_1 = __decorate([
    __param(1, IInstantiationService)
], DefineKeybindingWidget);
export { DefineKeybindingWidget };
let DefineKeybindingOverlayWidget = class DefineKeybindingOverlayWidget extends Disposable {
    static { DefineKeybindingOverlayWidget_1 = this; }
    static { this.ID = 'editor.contrib.defineKeybindingWidget'; }
    constructor(_editor, instantiationService) {
        super();
        this._editor = _editor;
        this._widget = this._register(instantiationService.createInstance(DefineKeybindingWidget, null));
        this._editor.addOverlayWidget(this);
    }
    getId() {
        return DefineKeybindingOverlayWidget_1.ID;
    }
    getDomNode() {
        return this._widget.domNode;
    }
    getPosition() {
        return {
            preference: null
        };
    }
    dispose() {
        this._editor.removeOverlayWidget(this);
        super.dispose();
    }
    start() {
        if (this._editor.hasModel()) {
            this._editor.revealPositionInCenterIfOutsideViewport(this._editor.getPosition(), 0 /* ScrollType.Smooth */);
        }
        const layoutInfo = this._editor.getLayoutInfo();
        this._widget.layout(new dom.Dimension(layoutInfo.width, layoutInfo.height));
        return this._widget.define();
    }
};
DefineKeybindingOverlayWidget = DefineKeybindingOverlayWidget_1 = __decorate([
    __param(1, IInstantiationService)
], DefineKeybindingOverlayWidget);
export { DefineKeybindingOverlayWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1dpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9rZXliaW5kaW5nV2lkZ2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUcvRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxhQUFhLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxF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