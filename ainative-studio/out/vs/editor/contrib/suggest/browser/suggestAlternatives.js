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
var SuggestAlternatives_1;
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
let SuggestAlternatives = class SuggestAlternatives {
    static { SuggestAlternatives_1 = this; }
    static { this.OtherSuggestions = new RawContextKey('hasOtherSuggestions', false); }
    constructor(_editor, contextKeyService) {
        this._editor = _editor;
        this._index = 0;
        this._ckOtherSuggestions = SuggestAlternatives_1.OtherSuggestions.bindTo(contextKeyService);
    }
    dispose() {
        this.reset();
    }
    reset() {
        this._ckOtherSuggestions.reset();
        this._listener?.dispose();
        this._model = undefined;
        this._acceptNext = undefined;
        this._ignore = false;
    }
    set({ model, index }, acceptNext) {
        // no suggestions -> nothing to do
        if (model.items.length === 0) {
            this.reset();
            return;
        }
        // no alternative suggestions -> nothing to do
        const nextIndex = SuggestAlternatives_1._moveIndex(true, model, index);
        if (nextIndex === index) {
            this.reset();
            return;
        }
        this._acceptNext = acceptNext;
        this._model = model;
        this._index = index;
        this._listener = this._editor.onDidChangeCursorPosition(() => {
            if (!this._ignore) {
                this.reset();
            }
        });
        this._ckOtherSuggestions.set(true);
    }
    static _moveIndex(fwd, model, index) {
        let newIndex = index;
        for (let rounds = model.items.length; rounds > 0; rounds--) {
            newIndex = (newIndex + model.items.length + (fwd ? +1 : -1)) % model.items.length;
            if (newIndex === index) {
                break;
            }
            if (!model.items[newIndex].completion.additionalTextEdits) {
                break;
            }
        }
        return newIndex;
    }
    next() {
        this._move(true);
    }
    prev() {
        this._move(false);
    }
    _move(fwd) {
        if (!this._model) {
            // nothing to reason about
            return;
        }
        try {
            this._ignore = true;
            this._index = SuggestAlternatives_1._moveIndex(fwd, this._model, this._index);
            this._acceptNext({ index: this._index, item: this._model.items[this._index], model: this._model });
        }
        finally {
            this._ignore = false;
        }
    }
};
SuggestAlternatives = SuggestAlternatives_1 = __decorate([
    __param(1, IContextKeyService)
], SuggestAlternatives);
export { SuggestAlternatives };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdEFsdGVybmF0aXZlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdEFsdGVybmF0aXZlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBSS9HLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1COzthQUVmLHFCQUFnQixHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxBQUEzRCxDQUE0RDtJQVU1RixZQUNrQixPQUFvQixFQUNqQixpQkFBcUM7UUFEeEMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQVA5QixXQUFNLEdBQVcsQ0FBQyxDQUFDO1FBVTFCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxxQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDdEIsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQXVCLEVBQUUsVUFBa0Q7UUFFNUYsa0NBQWtD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