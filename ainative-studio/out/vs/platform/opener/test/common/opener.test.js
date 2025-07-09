/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { extractSelection, withSelection } from '../../common/opener.js';
suite('extractSelection', () => {
    test('extractSelection with only startLineNumber', async () => {
        const uri = URI.parse('file:///some/file.js#73');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 1, endLineNumber: undefined, endColumn: undefined });
    });
    test('extractSelection with only startLineNumber in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 1, endLineNumber: undefined, endColumn: undefined });
    });
    test('extractSelection with startLineNumber and startColumn', async () => {
        const uri = URI.parse('file:///some/file.js#73,84');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 84, endLineNumber: undefined, endColumn: undefined });
    });
    test('extractSelection with startLineNumber and startColumn in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73,84');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 84, endLineNumber: undefined, endColumn: undefined });
    });
    test('extractSelection with range and no column number', async () => {
        const uri = URI.parse('file:///some/file.js#73-83');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 1, endLineNumber: 83, endColumn: 1 });
    });
    test('extractSelection with range and no column number in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73-L83');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 1, endLineNumber: 83, endColumn: 1 });
    });
    test('extractSelection with range and no column number in L format only for start', async () => {
        const uri = URI.parse('file:///some/file.js#L73-83');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 1, endLineNumber: 83, endColumn: 1 });
    });
    test('extractSelection with range and no column number in L format only for end', async () => {
        const uri = URI.parse('file:///some/file.js#73-L83');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 1, endLineNumber: 83, endColumn: 1 });
    });
    test('extractSelection with complete range', async () => {
        const uri = URI.parse('file:///some/file.js#73,84-83,52');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 84, endLineNumber: 83, endColumn: 52 });
    });
    test('extractSelection with complete range in L format', async () => {
        const uri = URI.parse('file:///some/file.js#L73,84-L83,52');
        assert.deepStrictEqual(extractSelection(uri).selection, { startLineNumber: 73, startColumn: 84, endLineNumber: 83, endColumn: 52 });
    });
    test('withSelection with startLineNumber and startColumn', async () => {
        assert.deepStrictEqual(withSelection(URI.parse('file:///some/file.js'), { startLineNumber: 73, startColumn: 84 }).toString(), 'file:///some/file.js#73%2C84');
    });
    test('withSelection with startLineNumber, startColumn and endLineNumber', async () => {
        assert.deepStrictEqual(withSelection(URI.parse('file:///some/file.js'), { startLineNumber: 73, startColumn: 84, endLineNumber: 83 }).toString(), 'file:///some/file.js#73%2C84-83');
    });
    test('withSelection with startLineNumber, startColumn and endLineNumber, endColumn', async () => {
        assert.deepStrictEqual(withSelection(URI.parse('file:///some/file.js'), { startLineNumber: 73, startColumn: 84, endLineNumber: 83, endColumn: 52 }).toString(), 'file:///some/file.js#73%2C84-83%2C52');
    });
    test('extractSelection returns original withSelection URI', async () => {
        let uri = URI.parse('file:///some/file.js');
        const uriWithSelection = withSelection(URI.parse('file:///some/file.js'), { startLineNumber: 73, startColumn: 84, endLineNumber: 83, endColumn: 52 });
        assert.strictEqual(uri.toString(), extractSelection(uriWithSelection).uri.toString());
        uri = URI.parse('file:///some/file.js');
        assert.strictEqual(uri.toString(), extractSelection(uri).uri.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb3BlbmVyL3Rlc3QvY29tbW9uL29wZW5lci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRXpFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFFOUIsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ2xKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pFLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxT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