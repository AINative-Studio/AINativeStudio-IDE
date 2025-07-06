/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import { InternalModelContentChangeEvent, LineInjectedText } from '../../../common/textModelEvents.js';
import { createTextModel } from '../testTextModel.js';
suite('Editor Model - Injected Text Events', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Basic', () => {
        const thisModel = store.add(createTextModel('First Line\nSecond Line'));
        const recordedChanges = new Array();
        store.add(thisModel.onDidChangeContentOrInjectedText((e) => {
            const changes = (e instanceof InternalModelContentChangeEvent ? e.rawContentChangedEvent.changes : e.changes);
            for (const change of changes) {
                recordedChanges.push(mapChange(change));
            }
        }));
        // Initial decoration
        let decorations = thisModel.deltaDecorations([], [{
                options: {
                    after: { content: 'injected1' },
                    description: 'test1',
                    showIfCollapsed: true
                },
                range: new Range(1, 1, 1, 1),
            }]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]First Line',
                lineNumber: 1,
            }
        ]);
        // Decoration change
        decorations = thisModel.deltaDecorations(decorations, [{
                options: {
                    after: { content: 'injected1' },
                    description: 'test1',
                    showIfCollapsed: true
                },
                range: new Range(2, 1, 2, 1),
            }, {
                options: {
                    after: { content: 'injected2' },
                    description: 'test2',
                    showIfCollapsed: true
                },
                range: new Range(2, 2, 2, 2),
            }]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: 'First Line',
                lineNumber: 1,
            },
            {
                kind: 'lineChanged',
                line: '[injected1]S[injected2]econd Line',
                lineNumber: 2,
            }
        ]);
        // Simple Insert
        thisModel.applyEdits([EditOperation.replace(new Range(2, 2, 2, 2), 'Hello')]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]SHello[injected2]econd Line',
                lineNumber: 2,
            }
        ]);
        // Multi-Line Insert
        thisModel.pushEditOperations(null, [EditOperation.replace(new Range(2, 2, 2, 2), '\n\n\n')], null);
        assert.deepStrictEqual(thisModel.getAllDecorations(undefined).map(d => ({ description: d.options.description, range: d.range.toString() })), [{
                'description': 'test1',
                'range': '[2,1 -> 2,1]'
            },
            {
                'description': 'test2',
                'range': '[2,2 -> 5,6]'
            }]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]S',
                lineNumber: 2,
            },
            {
                fromLineNumber: 3,
                kind: 'linesInserted',
                lines: [
                    '',
                    '',
                    'Hello[injected2]econd Line',
                ]
            }
        ]);
        // Multi-Line Replace
        thisModel.pushEditOperations(null, [EditOperation.replace(new Range(3, 1, 5, 1), '\n\n\n\n\n\n\n\n\n\n\n\n\n')], null);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                'kind': 'lineChanged',
                'line': '',
                'lineNumber': 5,
            },
            {
                'kind': 'lineChanged',
                'line': '',
                'lineNumber': 4,
            },
            {
                'kind': 'lineChanged',
                'line': '',
                'lineNumber': 3,
            },
            {
                'fromLineNumber': 6,
                'kind': 'linesInserted',
                'lines': [
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    'Hello[injected2]econd Line',
                ]
            }
        ]);
        // Multi-Line Replace undo
        assert.strictEqual(thisModel.undo(), undefined);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]SHello[injected2]econd Line',
                lineNumber: 2,
            },
            {
                kind: 'linesDeleted',
            }
        ]);
    });
});
function mapChange(change) {
    if (change.changeType === 2 /* RawContentChangedType.LineChanged */) {
        (change.injectedText || []).every(e => {
            assert.deepStrictEqual(e.lineNumber, change.lineNumber);
        });
        return {
            kind: 'lineChanged',
            line: getDetail(change.detail, change.injectedText),
            lineNumber: change.lineNumber,
        };
    }
    else if (change.changeType === 4 /* RawContentChangedType.LinesInserted */) {
        return {
            kind: 'linesInserted',
            lines: change.detail.map((e, idx) => getDetail(e, change.injectedTexts[idx])),
            fromLineNumber: change.fromLineNumber
        };
    }
    else if (change.changeType === 3 /* RawContentChangedType.LinesDeleted */) {
        return {
            kind: 'linesDeleted',
        };
    }
    else if (change.changeType === 5 /* RawContentChangedType.EOLChanged */) {
        return {
            kind: 'eolChanged'
        };
    }
    else if (change.changeType === 1 /* RawContentChangedType.Flush */) {
        return {
            kind: 'flush'
        };
    }
    return { kind: 'unknown' };
}
function getDetail(line, injectedTexts) {
    return LineInjectedText.applyInjectedText(line, (injectedTexts || []).map(t => t.withText(`[${t.options.content}]`)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxJbmplY3RlZFRleHQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9tb2RlbEluamVjdGVkVGV4dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxnQkFBZ0IsRUFBeUMsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5SSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEQsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztRQUV4RSxNQUFNLGVBQWUsR0FBRyxJQUFJLEtBQUssRUFBVyxDQUFDO1FBRTdDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFlBQVksK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxP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