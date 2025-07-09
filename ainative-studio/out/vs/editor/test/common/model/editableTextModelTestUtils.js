/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../common/core/position.js';
import { MirrorTextModel } from '../../../common/model/mirrorTextModel.js';
import { createTextModel } from '../testTextModel.js';
export function testApplyEditsWithSyncedModels(original, edits, expected, inputEditsAreInvalid = false) {
    const originalStr = original.join('\n');
    const expectedStr = expected.join('\n');
    assertSyncedModels(originalStr, (model, assertMirrorModels) => {
        // Apply edits & collect inverse edits
        const inverseEdits = model.applyEdits(edits, true);
        // Assert edits produced expected result
        assert.deepStrictEqual(model.getValue(1 /* EndOfLinePreference.LF */), expectedStr);
        assertMirrorModels();
        // Apply the inverse edits
        const inverseInverseEdits = model.applyEdits(inverseEdits, true);
        // Assert the inverse edits brought back model to original state
        assert.deepStrictEqual(model.getValue(1 /* EndOfLinePreference.LF */), originalStr);
        if (!inputEditsAreInvalid) {
            const simplifyEdit = (edit) => {
                return {
                    range: edit.range,
                    text: edit.text,
                    forceMoveMarkers: edit.forceMoveMarkers || false
                };
            };
            // Assert the inverse of the inverse edits are the original edits
            assert.deepStrictEqual(inverseInverseEdits.map(simplifyEdit), edits.map(simplifyEdit));
        }
        assertMirrorModels();
    });
}
var AssertDocumentLineMappingDirection;
(function (AssertDocumentLineMappingDirection) {
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["OffsetToPosition"] = 0] = "OffsetToPosition";
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["PositionToOffset"] = 1] = "PositionToOffset";
})(AssertDocumentLineMappingDirection || (AssertDocumentLineMappingDirection = {}));
function assertOneDirectionLineMapping(model, direction, msg) {
    const allText = model.getValue();
    let line = 1, column = 1, previousIsCarriageReturn = false;
    for (let offset = 0; offset <= allText.length; offset++) {
        // The position coordinate system cannot express the position between \r and \n
        const position = new Position(line, column + (previousIsCarriageReturn ? -1 : 0));
        if (direction === 0 /* AssertDocumentLineMappingDirection.OffsetToPosition */) {
            const actualPosition = model.getPositionAt(offset);
            assert.strictEqual(actualPosition.toString(), position.toString(), msg + ' - getPositionAt mismatch for offset ' + offset);
        }
        else {
            // The position coordinate system cannot express the position between \r and \n
            const expectedOffset = offset + (previousIsCarriageReturn ? -1 : 0);
            const actualOffset = model.getOffsetAt(position);
            assert.strictEqual(actualOffset, expectedOffset, msg + ' - getOffsetAt mismatch for position ' + position.toString());
        }
        if (allText.charAt(offset) === '\n') {
            line++;
            column = 1;
        }
        else {
            column++;
        }
        previousIsCarriageReturn = (allText.charAt(offset) === '\r');
    }
}
function assertLineMapping(model, msg) {
    assertOneDirectionLineMapping(model, 1 /* AssertDocumentLineMappingDirection.PositionToOffset */, msg);
    assertOneDirectionLineMapping(model, 0 /* AssertDocumentLineMappingDirection.OffsetToPosition */, msg);
}
export function assertSyncedModels(text, callback, setup = null) {
    const model = createTextModel(text);
    model.setEOL(0 /* EndOfLineSequence.LF */);
    assertLineMapping(model, 'model');
    if (setup) {
        setup(model);
        assertLineMapping(model, 'model');
    }
    const mirrorModel2 = new MirrorTextModel(null, model.getLinesContent(), model.getEOL(), model.getVersionId());
    let mirrorModel2PrevVersionId = model.getVersionId();
    const disposable = model.onDidChangeContent((e) => {
        const versionId = e.versionId;
        if (versionId < mirrorModel2PrevVersionId) {
            console.warn('Model version id did not advance between edits (2)');
        }
        mirrorModel2PrevVersionId = versionId;
        mirrorModel2.onEvents(e);
    });
    const assertMirrorModels = () => {
        assertLineMapping(model, 'model');
        assert.strictEqual(mirrorModel2.getText(), model.getValue(), 'mirror model 2 text OK');
        assert.strictEqual(mirrorModel2.version, model.getVersionId(), 'mirror model 2 version OK');
    };
    callback(model, assertMirrorModels);
    disposable.dispose();
    model.dispose();
    mirrorModel2.dispose();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWxUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2VkaXRhYmxlVGV4dE1vZGVsVGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxNQUFNLFVBQVUsOEJBQThCLENBQUMsUUFBa0IsRUFBRSxLQUE2QixFQUFFLFFBQWtCLEVBQUUsdUJBQWdDLEtBQUs7SUFDMUosTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXhDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxFQUFFO1FBQzdELHNDQUFzQztRQUN0QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVuRCx3Q0FBd0M7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUU1RSxrQkFBa0IsRUFBRSxDQUFDO1FBRXJCLDBCQUEwQjtRQUMxQixNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLElBQUks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