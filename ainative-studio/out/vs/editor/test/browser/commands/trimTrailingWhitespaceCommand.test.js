/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TrimTrailingWhitespaceCommand, trimTrailingWhitespace } from '../../../common/commands/trimTrailingWhitespaceCommand.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { getEditOperation } from '../testCommand.js';
import { createModelServices, instantiateTextModel, withEditorModel } from '../../common/testTextModel.js';
/**
 * Create single edit operation
 */
function createInsertDeleteSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
    return {
        range: new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn),
        text: text
    };
}
/**
 * Create single edit operation
 */
function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
    return {
        range: new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn),
        text: text,
        forceMoveMarkers: false
    };
}
function assertTrimTrailingWhitespaceCommand(text, expected) {
    return withEditorModel(text, (model) => {
        const op = new TrimTrailingWhitespaceCommand(new Selection(1, 1, 1, 1), [], true);
        const actual = getEditOperation(model, op);
        assert.deepStrictEqual(actual, expected);
    });
}
function assertTrimTrailingWhitespace(text, cursors, expected) {
    return withEditorModel(text, (model) => {
        const actual = trimTrailingWhitespace(model, cursors, true);
        assert.deepStrictEqual(actual, expected);
    });
}
suite('Editor Commands - Trim Trailing Whitespace Command', () => {
    let disposables;
    setup(() => {
        disposables = new DisposableStore();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('remove trailing whitespace', function () {
        assertTrimTrailingWhitespaceCommand([''], []);
        assertTrimTrailingWhitespaceCommand(['text'], []);
        assertTrimTrailingWhitespaceCommand(['text   '], [createSingleEditOp(null, 1, 5, 1, 8)]);
        assertTrimTrailingWhitespaceCommand(['text\t   '], [createSingleEditOp(null, 1, 5, 1, 9)]);
        assertTrimTrailingWhitespaceCommand(['\t   '], [createSingleEditOp(null, 1, 1, 1, 5)]);
        assertTrimTrailingWhitespaceCommand(['text\t'], [createSingleEditOp(null, 1, 5, 1, 6)]);
        assertTrimTrailingWhitespaceCommand([
            'some text\t',
            'some more text',
            '\t  ',
            'even more text  ',
            'and some mixed\t   \t'
        ], [
            createSingleEditOp(null, 1, 10, 1, 11),
            createSingleEditOp(null, 3, 1, 3, 4),
            createSingleEditOp(null, 4, 15, 4, 17),
            createSingleEditOp(null, 5, 15, 5, 20)
        ]);
        assertTrimTrailingWhitespace(['text   '], [new Position(1, 1), new Position(1, 2), new Position(1, 3)], [createInsertDeleteSingleEditOp(null, 1, 5, 1, 8)]);
        assertTrimTrailingWhitespace(['text   '], [new Position(1, 1), new Position(1, 5)], [createInsertDeleteSingleEditOp(null, 1, 5, 1, 8)]);
        assertTrimTrailingWhitespace(['text   '], [new Position(1, 1), new Position(1, 5), new Position(1, 6)], [createInsertDeleteSingleEditOp(null, 1, 6, 1, 8)]);
        assertTrimTrailingWhitespace([
            'some text\t',
            'some more text',
            '\t  ',
            'even more text  ',
            'and some mixed\t   \t'
        ], [], [
            createInsertDeleteSingleEditOp(null, 1, 10, 1, 11),
            createInsertDeleteSingleEditOp(null, 3, 1, 3, 4),
            createInsertDeleteSingleEditOp(null, 4, 15, 4, 17),
            createInsertDeleteSingleEditOp(null, 5, 15, 5, 20)
        ]);
        assertTrimTrailingWhitespace([
            'some text\t',
            'some more text',
            '\t  ',
            'even more text  ',
            'and some mixed\t   \t'
        ], [new Position(1, 11), new Position(3, 2), new Position(5, 1), new Position(4, 1), new Position(5, 10)], [
            createInsertDeleteSingleEditOp(null, 3, 2, 3, 4),
            createInsertDeleteSingleEditOp(null, 4, 15, 4, 17),
            createInsertDeleteSingleEditOp(null, 5, 15, 5, 20)
        ]);
    });
    test('skips strings and regex if configured', function () {
        const instantiationService = createModelServices(disposables);
        const languageService = instantiationService.get(ILanguageService);
        const languageId = 'testLanguageId';
        const languageIdCodec = languageService.languageIdCodec;
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const encodedLanguageId = languageIdCodec.encodeLanguageId(languageId);
        const otherMetadata = ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
            | (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)
            | (1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */)) >>> 0;
        const stringMetadata = ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
            | (2 /* StandardTokenType.String */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)
            | (1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */)) >>> 0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                switch (line) {
                    case 'const a = `  ': {
                        const tokens = new Uint32Array([
                            0, otherMetadata,
                            10, stringMetadata,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '  a string  ': {
                        const tokens = new Uint32Array([
                            0, stringMetadata,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '`;  ': {
                        const tokens = new Uint32Array([
                            0, stringMetadata,
                            1, otherMetadata
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                }
                throw new Error(`Unexpected`);
            }
        };
        disposables.add(TokenizationRegistry.register(languageId, tokenizationSupport));
        const model = disposables.add(instantiateTextModel(instantiationService, [
            'const a = `  ',
            '  a string  ',
            '`;  ',
        ].join('\n'), languageId));
        model.tokenization.forceTokenization(1);
        model.tokenization.forceTokenization(2);
        model.tokenization.forceTokenization(3);
        const op = new TrimTrailingWhitespaceCommand(new Selection(1, 1, 1, 1), [], false);
        const actual = getEditOperation(model, op);
        assert.deepStrictEqual(actual, [createSingleEditOp(null, 3, 3, 3, 5)]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpbVRyYWlsaW5nV2hpdGVzcGFjZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbW1hbmRzL3RyaW1UcmFpbGluZ1doaXRlc3BhY2VDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUVsSSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUseUJBQXlCLEVBQXdCLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUzRzs7R0FFRztBQUNILFNBQVMsOEJBQThCLENBQUMsSUFBbUIsRUFBRSxrQkFBMEIsRUFBRSxjQUFzQixFQUFFLHNCQUE4Qixr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