/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, Delayer } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { CharacterSet } from '../../../common/core/characterClassifier.js';
import * as languages from '../../../common/languages.js';
import { provideSignatureHelp } from './provideSignatureHelp.js';
var ParameterHintState;
(function (ParameterHintState) {
    let Type;
    (function (Type) {
        Type[Type["Default"] = 0] = "Default";
        Type[Type["Active"] = 1] = "Active";
        Type[Type["Pending"] = 2] = "Pending";
    })(Type = ParameterHintState.Type || (ParameterHintState.Type = {}));
    ParameterHintState.Default = { type: 0 /* Type.Default */ };
    class Pending {
        constructor(request, previouslyActiveHints) {
            this.request = request;
            this.previouslyActiveHints = previouslyActiveHints;
            this.type = 2 /* Type.Pending */;
        }
    }
    ParameterHintState.Pending = Pending;
    class Active {
        constructor(hints) {
            this.hints = hints;
            this.type = 1 /* Type.Active */;
        }
    }
    ParameterHintState.Active = Active;
})(ParameterHintState || (ParameterHintState = {}));
export class ParameterHintsModel extends Disposable {
    static { this.DEFAULT_DELAY = 120; } // ms
    constructor(editor, providers, delay = ParameterHintsModel.DEFAULT_DELAY) {
        super();
        this._onChangedHints = this._register(new Emitter());
        this.onChangedHints = this._onChangedHints.event;
        this.triggerOnType = false;
        this._state = ParameterHintState.Default;
        this._pendingTriggers = [];
        this._lastSignatureHelpResult = this._register(new MutableDisposable());
        this.triggerChars = new CharacterSet();
        this.retriggerChars = new CharacterSet();
        this.triggerId = 0;
        this.editor = editor;
        this.providers = providers;
        this.throttledDelayer = new Delayer(delay);
        this._register(this.editor.onDidBlurEditorWidget(() => this.cancel()));
        this._register(this.editor.onDidChangeConfiguration(() => this.onEditorConfigurationChange()));
        this._register(this.editor.onDidChangeModel(e => this.onModelChanged()));
        this._register(this.editor.onDidChangeModelLanguage(_ => this.onModelChanged()));
        this._register(this.editor.onDidChangeCursorSelection(e => this.onCursorChange(e)));
        this._register(this.editor.onDidChangeModelContent(e => this.onModelContentChange()));
        this._register(this.providers.onDidChange(this.onModelChanged, this));
        this._register(this.editor.onDidType(text => this.onDidType(text)));
        this.onEditorConfigurationChange();
        this.onModelChanged();
    }
    get state() { return this._state; }
    set state(value) {
        if (this._state.type === 2 /* ParameterHintState.Type.Pending */) {
            this._state.request.cancel();
        }
        this._state = value;
    }
    cancel(silent = false) {
        this.state = ParameterHintState.Default;
        this.throttledDelayer.cancel();
        if (!silent) {
            this._onChangedHints.fire(undefined);
        }
    }
    trigger(context, delay) {
        const model = this.editor.getModel();
        if (!model || !this.providers.has(model)) {
            return;
        }
        const triggerId = ++this.triggerId;
        this._pendingTriggers.push(context);
        this.throttledDelayer.trigger(() => {
            return this.doTrigger(triggerId);
        }, delay)
            .catch(onUnexpectedError);
    }
    next() {
        if (this.state.type !== 1 /* ParameterHintState.Type.Active */) {
            return;
        }
        const length = this.state.hints.signatures.length;
        const activeSignature = this.state.hints.activeSignature;
        const last = (activeSignature % length) === (length - 1);
        const cycle = this.editor.getOption(90 /* EditorOption.parameterHints */).cycle;
        // If there is only one signature, or we're on last signature of list
        if ((length < 2 || last) && !cycle) {
            this.cancel();
            return;
        }
        this.updateActiveSignature(last && cycle ? 0 : activeSignature + 1);
    }
    previous() {
        if (this.state.type !== 1 /* ParameterHintState.Type.Active */) {
            return;
        }
        const length = this.state.hints.signatures.length;
        const activeSignature = this.state.hints.activeSignature;
        const first = activeSignature === 0;
        const cycle = this.editor.getOption(90 /* EditorOption.parameterHints */).cycle;
        // If there is only one signature, or we're on first signature of list
        if ((length < 2 || first) && !cycle) {
            this.cancel();
            return;
        }
        this.updateActiveSignature(first && cycle ? length - 1 : activeSignature - 1);
    }
    updateActiveSignature(activeSignature) {
        if (this.state.type !== 1 /* ParameterHintState.Type.Active */) {
            return;
        }
        this.state = new ParameterHintState.Active({ ...this.state.hints, activeSignature });
        this._onChangedHints.fire(this.state.hints);
    }
    async doTrigger(triggerId) {
        const isRetrigger = this.state.type === 1 /* ParameterHintState.Type.Active */ || this.state.type === 2 /* ParameterHintState.Type.Pending */;
        const activeSignatureHelp = this.getLastActiveHints();
        this.cancel(true);
        if (this._pendingTriggers.length === 0) {
            return false;
        }
        const context = this._pendingTriggers.reduce(mergeTriggerContexts);
        this._pendingTriggers = [];
        const triggerContext = {
            triggerKind: context.triggerKind,
            triggerCharacter: context.triggerCharacter,
            isRetrigger: isRetrigger,
            activeSignatureHelp: activeSignatureHelp
        };
        if (!this.editor.hasModel()) {
            return false;
        }
        const model = this.editor.getModel();
        const position = this.editor.getPosition();
        this.state = new ParameterHintState.Pending(createCancelablePromise(token => provideSignatureHelp(this.providers, model, position, triggerContext, token)), activeSignatureHelp);
        try {
            const result = await this.state.request;
            // Check that we are still resolving the correct signature help
            if (triggerId !== this.triggerId) {
                result?.dispose();
                return false;
            }
            if (!result || !result.value.signatures || result.value.signatures.length === 0) {
                result?.dispose();
                this._lastSignatureHelpResult.clear();
                this.cancel();
                return false;
            }
            else {
                this.state = new ParameterHintState.Active(result.value);
                this._lastSignatureHelpResult.value = result;
                this._onChangedHints.fire(this.state.hints);
                return true;
            }
        }
        catch (error) {
            if (triggerId === this.triggerId) {
                this.state = ParameterHintState.Default;
            }
            onUnexpectedError(error);
            return false;
        }
    }
    getLastActiveHints() {
        switch (this.state.type) {
            case 1 /* ParameterHintState.Type.Active */: return this.state.hints;
            case 2 /* ParameterHintState.Type.Pending */: return this.state.previouslyActiveHints;
            default: return undefined;
        }
    }
    get isTriggered() {
        return this.state.type === 1 /* ParameterHintState.Type.Active */
            || this.state.type === 2 /* ParameterHintState.Type.Pending */
            || this.throttledDelayer.isTriggered();
    }
    onModelChanged() {
        this.cancel();
        this.triggerChars.clear();
        this.retriggerChars.clear();
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        for (const support of this.providers.ordered(model)) {
            for (const ch of support.signatureHelpTriggerCharacters || []) {
                if (ch.length) {
                    const charCode = ch.charCodeAt(0);
                    this.triggerChars.add(charCode);
                    // All trigger characters are also considered retrigger characters
                    this.retriggerChars.add(charCode);
                }
            }
            for (const ch of support.signatureHelpRetriggerCharacters || []) {
                if (ch.length) {
                    this.retriggerChars.add(ch.charCodeAt(0));
                }
            }
        }
    }
    onDidType(text) {
        if (!this.triggerOnType) {
            return;
        }
        const lastCharIndex = text.length - 1;
        const triggerCharCode = text.charCodeAt(lastCharIndex);
        if (this.triggerChars.has(triggerCharCode) || this.isTriggered && this.retriggerChars.has(triggerCharCode)) {
            this.trigger({
                triggerKind: languages.SignatureHelpTriggerKind.TriggerCharacter,
                triggerCharacter: text.charAt(lastCharIndex),
            });
        }
    }
    onCursorChange(e) {
        if (e.source === 'mouse') {
            this.cancel();
        }
        else if (this.isTriggered) {
            this.trigger({ triggerKind: languages.SignatureHelpTriggerKind.ContentChange });
        }
    }
    onModelContentChange() {
        if (this.isTriggered) {
            this.trigger({ triggerKind: languages.SignatureHelpTriggerKind.ContentChange });
        }
    }
    onEditorConfigurationChange() {
        this.triggerOnType = this.editor.getOption(90 /* EditorOption.parameterHints */).enabled;
        if (!this.triggerOnType) {
            this.cancel();
        }
    }
    dispose() {
        this.cancel(true);
        super.dispose();
    }
}
function mergeTriggerContexts(previous, current) {
    switch (current.triggerKind) {
        case languages.SignatureHelpTriggerKind.Invoke:
            // Invoke overrides previous triggers.
            return current;
        case languages.SignatureHelpTriggerKind.ContentChange:
            // Ignore content changes triggers
            return previous;
        case languages.SignatureHelpTriggerKind.TriggerCharacter:
        default:
            return current;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wYXJhbWV0ZXJIaW50cy9icm93c2VyL3BhcmFtZXRlckhpbnRzTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUczRSxPQUFPLEtBQUssU0FBUyxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBT2pFLElBQVUsa0JBQWtCLENBeUIzQjtBQXpCRCxXQUFVLGtCQUFrQjtJQUMzQixJQUFrQixJQUlqQjtJQUpELFdBQWtCLElBQUk7UUFDckIscUNBQU8sQ0FBQTtRQUNQLG1DQUFNLENBQUE7UUFDTixxQ0FBTyxDQUFBO0lBQ1IsQ0FBQyxFQUppQixJQUFJLEdBQUosdUJBQUksS0FBSix1QkFBSSxRQUlyQjtJQUVZLDBCQUFPLEdBQUcsRUFBRSxJQUFJLHNCQUFjLEVBQVcsQ0FBQztJQUV2RCxNQUFhLE9BQU87UUFFbkIsWUFDVSxPQUE0RSxFQUM1RSxxQkFBMEQ7WUFEMUQsWUFBTyxHQUFQLE9BQU8sQ0FBcUU7WUFDNUUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFxQztZQUgzRCxTQUFJLHdC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