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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxJbmplY3RlZFRleHQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvbW9kZWxJbmplY3RlZFRleHQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsZ0JBQWdCLEVBQXlDLE1BQU0sb0NBQW9DLENBQUM7QUFDOUksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXRELEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7UUFFeEUsTUFBTSxlQUFlLEdBQUcsSUFBSSxLQUFLLEVBQVcsQ0FBQztRQUU3QyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxZQUFZLCtCQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUcsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN6QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLHFCQUFxQjtRQUNyQixJQUFJLFdBQVcsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2pELE9BQU8sRUFBRTtvQkFDUixLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFO29CQUMvQixXQUFXLEVBQUUsT0FBTztvQkFDcEIsZUFBZSxFQUFFLElBQUk7aUJBQ3JCO2dCQUNELEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakQ7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLElBQUksRUFBRSx1QkFBdUI7Z0JBQzdCLFVBQVUsRUFBRSxDQUFDO2FBQ2I7U0FDRCxDQUFDLENBQUM7UUFFSCxvQkFBb0I7UUFDcEIsV0FBVyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdEQsT0FBTyxFQUFFO29CQUNSLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUU7b0JBQy9CLFdBQVcsRUFBRSxPQUFPO29CQUNwQixlQUFlLEVBQUUsSUFBSTtpQkFDckI7Z0JBQ0QsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUM1QixFQUFFO2dCQUNGLE9BQU8sRUFBRTtvQkFDUixLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFO29CQUMvQixXQUFXLEVBQUUsT0FBTztvQkFDcEIsZUFBZSxFQUFFLElBQUk7aUJBQ3JCO2dCQUNELEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakQ7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLElBQUksRUFBRSxZQUFZO2dCQUNsQixVQUFVLEVBQUUsQ0FBQzthQUNiO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLElBQUksRUFBRSxtQ0FBbUM7Z0JBQ3pDLFVBQVUsRUFBRSxDQUFDO2FBQ2I7U0FDRCxDQUFDLENBQUM7UUFFSCxnQkFBZ0I7UUFDaEIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRDtnQkFDQyxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsSUFBSSxFQUFFLHdDQUF3QztnQkFDOUMsVUFBVSxFQUFFLENBQUM7YUFDYjtTQUNELENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixTQUFTLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25HLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0ksYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLE9BQU8sRUFBRSxjQUFjO2FBQ3ZCO1lBQ0Q7Z0JBQ0MsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLE9BQU8sRUFBRSxjQUFjO2FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pEO2dCQUNDLElBQUksRUFBRSxhQUFhO2dCQUNuQixJQUFJLEVBQUUsY0FBYztnQkFDcEIsVUFBVSxFQUFFLENBQUM7YUFDYjtZQUNEO2dCQUNDLGNBQWMsRUFBRSxDQUFDO2dCQUNqQixJQUFJLEVBQUUsZUFBZTtnQkFDckIsS0FBSyxFQUFFO29CQUNOLEVBQUU7b0JBQ0YsRUFBRTtvQkFDRiw0QkFBNEI7aUJBQzVCO2FBQ0Q7U0FDRCxDQUFDLENBQUM7UUFHSCxxQkFBcUI7UUFDckIsU0FBUyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZILE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRDtnQkFDQyxNQUFNLEVBQUUsYUFBYTtnQkFDckIsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsWUFBWSxFQUFFLENBQUM7YUFDZjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxhQUFhO2dCQUNyQixNQUFNLEVBQUUsRUFBRTtnQkFDVixZQUFZLEVBQUUsQ0FBQzthQUNmO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLGFBQWE7Z0JBQ3JCLE1BQU0sRUFBRSxFQUFFO2dCQUNWLFlBQVksRUFBRSxDQUFDO2FBQ2Y7WUFDRDtnQkFDQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNuQixNQUFNLEVBQUUsZUFBZTtnQkFDdkIsT0FBTyxFQUFFO29CQUNSLEVBQUU7b0JBQ0YsRUFBRTtvQkFDRixFQUFFO29CQUNGLEVBQUU7b0JBQ0YsRUFBRTtvQkFDRixFQUFFO29CQUNGLEVBQUU7b0JBQ0YsRUFBRTtvQkFDRixFQUFFO29CQUNGLEVBQUU7b0JBQ0YsNEJBQTRCO2lCQUM1QjthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRDtnQkFDQyxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsSUFBSSxFQUFFLHdDQUF3QztnQkFDOUMsVUFBVSxFQUFFLENBQUM7YUFDYjtZQUNEO2dCQUNDLElBQUksRUFBRSxjQUFjO2FBQ3BCO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQVMsU0FBUyxDQUFDLE1BQXNCO0lBQ3hDLElBQUksTUFBTSxDQUFDLFVBQVUsOENBQXNDLEVBQUUsQ0FBQztRQUM3RCxDQUFDLE1BQU0sQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sSUFBSSxFQUFFLGFBQWE7WUFDbkIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDbkQsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO1NBQzdCLENBQUM7SUFDSCxDQUFDO1NBQU0sSUFBSSxNQUFNLENBQUMsVUFBVSxnREFBd0MsRUFBRSxDQUFDO1FBQ3RFLE9BQU87WUFDTixJQUFJLEVBQUUsZUFBZTtZQUNyQixLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3RSxjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQWM7U0FDckMsQ0FBQztJQUNILENBQUM7U0FBTSxJQUFJLE1BQU0sQ0FBQyxVQUFVLCtDQUF1QyxFQUFFLENBQUM7UUFDckUsT0FBTztZQUNOLElBQUksRUFBRSxjQUFjO1NBQ3BCLENBQUM7SUFDSCxDQUFDO1NBQU0sSUFBSSxNQUFNLENBQUMsVUFBVSw2Q0FBcUMsRUFBRSxDQUFDO1FBQ25FLE9BQU87WUFDTixJQUFJLEVBQUUsWUFBWTtTQUNsQixDQUFDO0lBQ0gsQ0FBQztTQUFNLElBQUksTUFBTSxDQUFDLFVBQVUsd0NBQWdDLEVBQUUsQ0FBQztRQUM5RCxPQUFPO1lBQ04sSUFBSSxFQUFFLE9BQU87U0FDYixDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLElBQVksRUFBRSxhQUF3QztJQUN4RSxPQUFPLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2SCxDQUFDIn0=