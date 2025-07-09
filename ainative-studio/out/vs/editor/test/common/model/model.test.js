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
import assert from 'assert';
import { Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { InternalModelContentChangeEvent, ModelRawContentChangedEvent, ModelRawFlush, ModelRawLineChanged, ModelRawLinesDeleted, ModelRawLinesInserted } from '../../../common/textModelEvents.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../testTextModel.js';
// --------- utils
const LINE1 = 'My First Line';
const LINE2 = '\t\tMy Second Line';
const LINE3 = '    Third Line';
const LINE4 = '';
const LINE5 = '1';
suite('Editor Model - Model', () => {
    let thisModel;
    setup(() => {
        const text = LINE1 + '\r\n' +
            LINE2 + '\n' +
            LINE3 + '\n' +
            LINE4 + '\r\n' +
            LINE5;
        thisModel = createTextModel(text);
    });
    teardown(() => {
        thisModel.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --------- insert text
    test('model getValue', () => {
        assert.strictEqual(thisModel.getValue(), 'My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
    });
    test('model insert empty text', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), '')]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'My First Line');
    });
    test('model insert text without newline 1', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), 'foo ')]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'foo My First Line');
    });
    test('model insert text without newline 2', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' foo')]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'My foo First Line');
    });
    test('model insert text with one newline', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' new line\nNo longer')]);
        assert.strictEqual(thisModel.getLineCount(), 6);
        assert.strictEqual(thisModel.getLineContent(1), 'My new line');
        assert.strictEqual(thisModel.getLineContent(2), 'No longer First Line');
    });
    test('model insert text with two newlines', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' new line\nOne more line in the middle\nNo longer')]);
        assert.strictEqual(thisModel.getLineCount(), 7);
        assert.strictEqual(thisModel.getLineContent(1), 'My new line');
        assert.strictEqual(thisModel.getLineContent(2), 'One more line in the middle');
        assert.strictEqual(thisModel.getLineContent(3), 'No longer First Line');
    });
    test('model insert text with many newlines', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), '\n\n\n\n')]);
        assert.strictEqual(thisModel.getLineCount(), 9);
        assert.strictEqual(thisModel.getLineContent(1), 'My');
        assert.strictEqual(thisModel.getLineContent(2), '');
        assert.strictEqual(thisModel.getLineContent(3), '');
        assert.strictEqual(thisModel.getLineContent(4), '');
        assert.strictEqual(thisModel.getLineContent(5), ' First Line');
    });
    // --------- insert text eventing
    test('model insert empty text does not trigger eventing', () => {
        const disposable = thisModel.onDidChangeContentOrInjectedText((e) => {
            assert.ok(false, 'was not expecting event');
        });
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), '')]);
        disposable.dispose();
    });
    test('model insert text without newline eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), 'foo ')]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, 'foo My First Line', null)
        ], 2, false, false));
        disposable.dispose();
    });
    test('model insert text with one newline eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' new line\nNo longer')]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, 'My new line', null),
            new ModelRawLinesInserted(2, 2, ['No longer First Line'], [null]),
        ], 2, false, false));
        disposable.dispose();
    });
    // --------- delete text
    test('model delete empty text', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 1))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'My First Line');
    });
    test('model delete text from one line', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 2))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'y First Line');
    });
    test('model delete text from one line 2', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), 'a')]);
        assert.strictEqual(thisModel.getLineContent(1), 'aMy First Line');
        thisModel.applyEdits([EditOperation.delete(new Range(1, 2, 1, 4))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'a First Line');
    });
    test('model delete all text from a line', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 14))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), '');
    });
    test('model delete text from two lines', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 2, 6))]);
        assert.strictEqual(thisModel.getLineCount(), 4);
        assert.strictEqual(thisModel.getLineContent(1), 'My Second Line');
    });
    test('model delete text from many lines', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 3, 5))]);
        assert.strictEqual(thisModel.getLineCount(), 3);
        assert.strictEqual(thisModel.getLineContent(1), 'My Third Line');
    });
    test('model delete everything', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 5, 2))]);
        assert.strictEqual(thisModel.getLineCount(), 1);
        assert.strictEqual(thisModel.getLineContent(1), '');
    });
    // --------- delete text eventing
    test('model delete empty text does not trigger eventing', () => {
        const disposable = thisModel.onDidChangeContentOrInjectedText((e) => {
            assert.ok(false, 'was not expecting event');
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 1))]);
        disposable.dispose();
    });
    test('model delete text from one line eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 2))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, 'y First Line', null),
        ], 2, false, false));
        disposable.dispose();
    });
    test('model delete all text from a line eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 14))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, '', null),
        ], 2, false, false));
        disposable.dispose();
    });
    test('model delete text from two lines eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 2, 6))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, 'My Second Line', null),
            new ModelRawLinesDeleted(2, 2),
        ], 2, false, false));
        disposable.dispose();
    });
    test('model delete text from many lines eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 3, 5))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, 'My Third Line', null),
            new ModelRawLinesDeleted(2, 3),
        ], 2, false, false));
        disposable.dispose();
    });
    // --------- getValueInRange
    test('getValueInRange', () => {
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 1, 1)), '');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 1, 2)), 'M');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 2, 1, 3)), 'y');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 1, 14)), 'My First Line');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 1)), 'My First Line\n');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 2)), 'My First Line\n\t');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 3)), 'My First Line\n\t\t');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 17)), 'My First Line\n\t\tMy Second Line');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 3, 1)), 'My First Line\n\t\tMy Second Line\n');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 4, 1)), 'My First Line\n\t\tMy Second Line\n    Third Line\n');
    });
    // --------- getValueLengthInRange
    test('getValueLengthInRange', () => {
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 1, 1)), ''.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 1, 2)), 'M'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 2, 1, 3)), 'y'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 1, 14)), 'My First Line'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 1)), 'My First Line\n'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 2)), 'My First Line\n\t'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 3)), 'My First Line\n\t\t'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 17)), 'My First Line\n\t\tMy Second Line'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 3, 1)), 'My First Line\n\t\tMy Second Line\n'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 4, 1)), 'My First Line\n\t\tMy Second Line\n    Third Line\n'.length);
    });
    // --------- setValue
    test('setValue eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.setValue('new value');
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawFlush()
        ], 2, false, false));
        disposable.dispose();
    });
    test('issue #46342: Maintain edit operation order in applyEdits', () => {
        const res = thisModel.applyEdits([
            { range: new Range(2, 1, 2, 1), text: 'a' },
            { range: new Range(1, 1, 1, 1), text: 'b' },
        ], true);
        assert.deepStrictEqual(res[0].range, new Range(2, 1, 2, 2));
        assert.deepStrictEqual(res[1].range, new Range(1, 1, 1, 2));
    });
});
// --------- Special Unicode LINE SEPARATOR character
suite('Editor Model - Model Line Separators', () => {
    let thisModel;
    setup(() => {
        const text = LINE1 + '\u2028' +
            LINE2 + '\n' +
            LINE3 + '\u2028' +
            LINE4 + '\r\n' +
            LINE5;
        thisModel = createTextModel(text);
    });
    teardown(() => {
        thisModel.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('model getValue', () => {
        assert.strictEqual(thisModel.getValue(), 'My First Line\u2028\t\tMy Second Line\n    Third Line\u2028\n1');
    });
    test('model lines', () => {
        assert.strictEqual(thisModel.getLineCount(), 3);
    });
    test('Bug 13333:Model should line break on lonely CR too', () => {
        const model = createTextModel('Hello\rWorld!\r\nAnother line');
        assert.strictEqual(model.getLineCount(), 3);
        assert.strictEqual(model.getValue(), 'Hello\r\nWorld!\r\nAnother line');
        model.dispose();
    });
});
// --------- Words
suite('Editor Model - Words', () => {
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
            const languageIdCodec = languageService.languageIdCodec;
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: undefined,
                tokenizeEncoded: (line, hasEOL, state) => {
                    const tokensArr = [];
                    let prevLanguageId = undefined;
                    for (let i = 0; i < line.length; i++) {
                        const languageId = (line.charAt(i) === 'x' ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID);
                        const encodedLanguageId = languageIdCodec.encodeLanguageId(languageId);
                        if (prevLanguageId !== languageId) {
                            tokensArr.push(i);
                            tokensArr.push((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */));
                        }
                        prevLanguageId = languageId;
                    }
                    const tokens = new Uint32Array(tokensArr.length);
                    for (let i = 0; i < tokens.length; i++) {
                        tokens[i] = tokensArr[i];
                    }
                    return new EncodedTokenizationResult(tokens, state);
                }
            }));
        }
    };
    OuterMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
        }
    };
    InnerMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], InnerMode);
    let disposables = [];
    setup(() => {
        disposables = [];
    });
    teardown(() => {
        dispose(disposables);
        disposables = [];
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Get word at position', () => {
        const text = ['This text has some  words. '];
        const thisModel = createTextModel(text.join('\n'));
        disposables.push(thisModel);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 1)), { word: 'This', startColumn: 1, endColumn: 5 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 2)), { word: 'This', startColumn: 1, endColumn: 5 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 4)), { word: 'This', startColumn: 1, endColumn: 5 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 5)), { word: 'This', startColumn: 1, endColumn: 5 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 6)), { word: 'text', startColumn: 6, endColumn: 10 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 19)), { word: 'some', startColumn: 15, endColumn: 19 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 20)), null);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 21)), { word: 'words', startColumn: 21, endColumn: 26 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 26)), { word: 'words', startColumn: 21, endColumn: 26 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 27)), null);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 28)), null);
    });
    test('getWordAtPosition at embedded language boundaries', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const outerMode = disposables.add(instantiationService.createInstance(OuterMode));
        disposables.add(instantiationService.createInstance(InnerMode));
        const model = disposables.add(instantiateTextModel(instantiationService, 'ab<xx>ab<x>', outerMode.languageId));
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 1)), { word: 'ab', startColumn: 1, endColumn: 3 });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 2)), { word: 'ab', startColumn: 1, endColumn: 3 });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 3)), { word: 'ab', startColumn: 1, endColumn: 3 });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 4)), { word: 'xx', startColumn: 4, endColumn: 6 });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 5)), { word: 'xx', startColumn: 4, endColumn: 6 });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 6)), { word: 'xx', startColumn: 4, endColumn: 6 });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 7)), { word: 'ab', startColumn: 7, endColumn: 9 });
        disposables.dispose();
    });
    test('issue #61296: VS code freezes when editing CSS file with emoji', () => {
        const MODE_ID = 'testMode';
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: MODE_ID }));
        disposables.add(languageConfigurationService.register(MODE_ID, {
            wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g
        }));
        const thisModel = disposables.add(instantiateTextModel(instantiationService, '.🐷-a-b', MODE_ID));
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 1)), { word: '.', startColumn: 1, endColumn: 2 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 2)), { word: '.', startColumn: 1, endColumn: 2 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 3)), null);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 4)), { word: '-a-b', startColumn: 4, endColumn: 8 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 5)), { word: '-a-b', startColumn: 4, endColumn: 8 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 6)), { word: '-a-b', startColumn: 4, endColumn: 8 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 7)), { word: '-a-b', startColumn: 4, endColumn: 8 });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 8)), { word: '-a-b', startColumn: 4, endColumn: 8 });
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvbW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLHlCQUF5QixFQUFVLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0csT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSwyQkFBMkIsRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuTSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFakcsa0JBQWtCO0FBRWxCLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztBQUM5QixNQUFN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QUF1QixFQUFFLEdBQUcsRUFBRTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JHLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMs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RUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzlELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFaEUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFL0csTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEgsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsRUFBRTtRQUMzRSxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlELE1BQU0sNEJBQTRCLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDN0YsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFbkUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25FLFdBQVcsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUM5RCxXQUFXLEVBQUUsNEVBQTRFO1NBQ3pGLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUVsRyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNySCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNySCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RSxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4SCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4SCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4SCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4SCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV4SCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9