/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { EditorState } from '../../browser/editorState.js';
suite('Editor Core - Editor State', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const allFlags = (1 /* CodeEditorStateFlag.Value */
        | 2 /* CodeEditorStateFlag.Selection */
        | 4 /* CodeEditorStateFlag.Position */
        | 8 /* CodeEditorStateFlag.Scroll */);
    test('empty editor state should be valid', () => {
        const result = validate({}, {});
        assert.strictEqual(result, true);
    });
    test('different model URIs should be invalid', () => {
        const result = validate({ model: { uri: URI.parse('http://test1') } }, { model: { uri: URI.parse('http://test2') } });
        assert.strictEqual(result, false);
    });
    test('different model versions should be invalid', () => {
        const result = validate({ model: { version: 1 } }, { model: { version: 2 } });
        assert.strictEqual(result, false);
    });
    test('different positions should be invalid', () => {
        const result = validate({ position: new Position(1, 2) }, { position: new Position(2, 3) });
        assert.strictEqual(result, false);
    });
    test('different selections should be invalid', () => {
        const result = validate({ selection: new Selection(1, 2, 3, 4) }, { selection: new Selection(5, 2, 3, 4) });
        assert.strictEqual(result, false);
    });
    test('different scroll positions should be invalid', () => {
        const result = validate({ scroll: { left: 1, top: 2 } }, { scroll: { left: 3, top: 2 } });
        assert.strictEqual(result, false);
    });
    function validate(source, target) {
        const sourceEditor = createEditor(source), targetEditor = createEditor(target);
        const result = new EditorState(sourceEditor, allFlags).validate(targetEditor);
        return result;
    }
    function createEditor({ model, position, selection, scroll } = {}) {
        const mappedModel = model ? { uri: model.uri ? model.uri : URI.parse('http://dummy.org'), getVersionId: () => model.version } : null;
        return {
            getModel: () => mappedModel,
            getPosition: () => position,
            getSelection: () => selection,
            getScrollLeft: () => scroll && scroll.left,
            getScrollTop: () => scroll && scroll.top
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9lZGl0b3JTdGF0ZS90ZXN0L2Jyb3dzZXIvZWRpdG9yU3RhdGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQVNoRixLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBRXhDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxRQUFRLEdBQUcsQ0FDaEI7K0NBQytCOzhDQUNEOzRDQUNGLENBQzVCLENBQUM7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FDdEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFB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