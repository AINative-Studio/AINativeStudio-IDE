/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nullTokenizeEncoded } from '../../../../../editor/common/languages/nullTokenize.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { keepObserved } from '../../../../../base/common/observable.js';
export class TokenizationSupportWithLineLimit extends Disposable {
    get backgroundTokenizerShouldOnlyVerifyTokens() {
        return this._actual.backgroundTokenizerShouldOnlyVerifyTokens;
    }
    constructor(_encodedLanguageId, _actual, disposable, _maxTokenizationLineLength) {
        super();
        this._encodedLanguageId = _encodedLanguageId;
        this._actual = _actual;
        this._maxTokenizationLineLength = _maxTokenizationLineLength;
        this._register(keepObserved(this._maxTokenizationLineLength));
        this._register(disposable);
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    tokenize(line, hasEOL, state) {
        throw new Error('Not supported!');
    }
    tokenizeEncoded(line, hasEOL, state) {
        // Do not attempt to tokenize if a line is too long
        if (line.length >= this._maxTokenizationLineLength.get()) {
            return nullTokenizeEncoded(this._encodedLanguageId, state);
        }
        return this._actual.tokenizeEncoded(line, hasEOL, state);
    }
    createBackgroundTokenizer(textModel, store) {
        if (this._actual.createBackgroundTokenizer) {
            return this._actual.createBackgroundTokenizer(textModel, store);
        }
        else {
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uU3VwcG9ydFdpdGhMaW5lTGltaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvdG9rZW5pemF0aW9uU3VwcG9ydC90b2tlbml6YXRpb25TdXBwb3J0V2l0aExpbmVMaW1pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3RixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXJGLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxVQUFVO0lBQy9ELElBQUkseUNBQXlDO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsWUFDa0Isa0JBQThCLEVBQzlCLE9BQTZCLEVBQzlDLFVBQXVCLEVBQ04sMEJBQStDO1FBRWhFLEtBQUssRUFBRSxDQUFDO1FBTFMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFZO1FBQzlCLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBRTdCLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBcUI7UUFJaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBWSxFQUFFLE1BQWUsRUFBRSxLQUFhO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQVksRUFBRSxNQUFlLEVBQUUsS0FBYTtRQUMzRCxtREFBbUQ7UUFDbkQsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzFELE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVELHlCQUF5QixDQUFDLFNBQXFCLEVBQUUsS0FBbUM7UUFDbkYsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDNUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==