/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { TextEditInfo } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { combineTextEditInfos } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/combineTextEditInfos.js';
import { lengthAdd, lengthToObj, lengthToPosition, positionToLength, toLength } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
import { Random } from '../../core/random.js';
import { createTextModel } from '../../testTextModel.js';
suite('combineTextEditInfos', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    for (let seed = 0; seed < 50; seed++) {
        test('test' + seed, () => {
            runTest(seed);
        });
    }
});
function runTest(seed) {
    const rng = Random.create(seed);
    const str = 'abcde\nfghij\nklmno\npqrst\n';
    const textModelS0 = createTextModel(str);
    const edits1 = getRandomEditInfos(textModelS0, rng.nextIntRange(1, 4), rng);
    const textModelS1 = createTextModel(textModelS0.getValue());
    textModelS1.applyEdits(edits1.map(e => toEdit(e)));
    const edits2 = getRandomEditInfos(textModelS1, rng.nextIntRange(1, 4), rng);
    const textModelS2 = createTextModel(textModelS1.getValue());
    textModelS2.applyEdits(edits2.map(e => toEdit(e)));
    const combinedEdits = combineTextEditInfos(edits1, edits2);
    for (const edit of combinedEdits) {
        const range = Range.fromPositions(lengthToPosition(edit.startOffset), lengthToPosition(lengthAdd(edit.startOffset, edit.newLength)));
        const value = textModelS2.getValueInRange(range);
        if (!value.match(/^(L|C|\n)*$/)) {
            throw new Error('Invalid edit: ' + value);
        }
        textModelS2.applyEdits([{
                range,
                text: textModelS0.getValueInRange(Range.fromPositions(lengthToPosition(edit.startOffset), lengthToPosition(edit.endOffset))),
            }]);
    }
    assert.deepStrictEqual(textModelS2.getValue(), textModelS0.getValue());
    textModelS0.dispose();
    textModelS1.dispose();
    textModelS2.dispose();
}
export function getRandomEditInfos(textModel, count, rng, disjoint = false) {
    const edits = [];
    let i = 0;
    for (let j = 0; j < count; j++) {
        edits.push(getRandomEdit(textModel, i, rng));
        i = textModel.getOffsetAt(lengthToPosition(edits[j].endOffset)) + (disjoint ? 1 : 0);
    }
    return edits;
}
function getRandomEdit(textModel, rangeOffsetStart, rng) {
    const textModelLength = textModel.getValueLength();
    const offsetStart = rng.nextIntRange(rangeOffsetStart, textModelLength);
    const offsetEnd = rng.nextIntRange(offsetStart, textModelLength);
    const lineCount = rng.nextIntRange(0, 3);
    const columnCount = rng.nextIntRange(0, 5);
    return new TextEditInfo(positionToLength(textModel.getPositionAt(offsetStart)), positionToLength(textModel.getPositionAt(offsetEnd)), toLength(lineCount, columnCount));
}
function toEdit(editInfo) {
    const l = lengthToObj(editInfo.newLength);
    let text = '';
    for (let i = 0; i < l.lineCount; i++) {
        text += 'LLL\n';
    }
    for (let i = 0; i < l.columnCount; i++) {
        text += 'C';
    }
    return new SingleTextEdit(Range.fromPositions(lengthToPosition(editInfo.startOffset), lengthToPosition(editInfo.endOffset)), text);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tYmluZVRleHRFZGl0SW5mb3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJDb2xvcml6ZXIvY29tYmluZVRleHRFZGl0SW5mb3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUdBQWlHLENBQUM7QUFDL0gsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkZBQTZGLENBQUM7QUFDbkksT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFFckssT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUV6RCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFD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