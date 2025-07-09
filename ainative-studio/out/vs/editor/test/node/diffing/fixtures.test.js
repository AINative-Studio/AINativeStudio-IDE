/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { setUnexpectedErrorHandler } from '../../../../base/common/errors.js';
import { FileAccess } from '../../../../base/common/network.js';
import { RangeMapping } from '../../../common/diff/rangeMapping.js';
import { LegacyLinesDiffComputer } from '../../../common/diff/legacyLinesDiffComputer.js';
import { DefaultLinesDiffComputer } from '../../../common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ArrayText, SingleTextEdit, TextEdit } from '../../../common/core/textEdit.js';
suite('diffing fixtures', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        setUnexpectedErrorHandler(e => {
            throw e;
        });
    });
    const fixturesOutDir = FileAccess.asFileUri('vs/editor/test/node/diffing/fixtures').fsPath;
    // We want the dir in src, so we can directly update the source files if they disagree and create invalid files to capture the previous state.
    // This makes it very easy to update the fixtures.
    const fixturesSrcDir = resolve(fixturesOutDir).replaceAll('\\', '/').replace('/out/vs/editor/', '/src/vs/editor/');
    const folders = readdirSync(fixturesSrcDir);
    function runTest(folder, diffingAlgoName) {
        const folderPath = join(fixturesSrcDir, folder);
        const files = readdirSync(folderPath);
        const firstFileName = files.find(f => f.startsWith('1.'));
        const secondFileName = files.find(f => f.startsWith('2.'));
        const firstContent = readFileSync(join(folderPath, firstFileName), 'utf8').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
        const firstContentLines = firstContent.split(/\n/);
        const secondContent = readFileSync(join(folderPath, secondFileName), 'utf8').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
        const secondContentLines = secondContent.split(/\n/);
        const diffingAlgo = diffingAlgoName === 'legacy' ? new LegacyLinesDiffComputer() : new DefaultLinesDiffComputer();
        const ignoreTrimWhitespace = folder.indexOf('trimws') >= 0;
        const diff = diffingAlgo.computeDiff(firstContentLines, secondContentLines, { ignoreTrimWhitespace, maxComputationTimeMs: Number.MAX_SAFE_INTEGER, computeMoves: true });
        if (diffingAlgoName === 'advanced' && !ignoreTrimWhitespace) {
            assertDiffCorrectness(diff, firstContentLines, secondContentLines);
        }
        function getDiffs(changes) {
            for (const c of changes) {
                RangeMapping.assertSorted(c.innerChanges ?? []);
            }
            return changes.map(c => ({
                originalRange: c.original.toString(),
                modifiedRange: c.modified.toString(),
                innerChanges: c.innerChanges?.map(c => ({
                    originalRange: formatRange(c.originalRange, firstContentLines),
                    modifiedRange: formatRange(c.modifiedRange, secondContentLines),
                })) || null
            }));
        }
        function formatRange(range, lines) {
            const toLastChar = range.endColumn === lines[range.endLineNumber - 1].length + 1;
            return '[' + range.startLineNumber + ',' + range.startColumn + ' -> ' + range.endLineNumber + ',' + range.endColumn + (toLastChar ? ' EOL' : '') + ']';
        }
        const actualDiffingResult = {
            original: { content: firstContent, fileName: `./${firstFileName}` },
            modified: { content: secondContent, fileName: `./${secondFileName}` },
            diffs: getDiffs(diff.changes),
            moves: diff.moves.map(v => ({
                originalRange: v.lineRangeMapping.original.toString(),
                modifiedRange: v.lineRangeMapping.modified.toString(),
                changes: getDiffs(v.changes),
            }))
        };
        if (actualDiffingResult.moves?.length === 0) {
            delete actualDiffingResult.moves;
        }
        const expectedFilePath = join(folderPath, `${diffingAlgoName}.expected.diff.json`);
        const invalidFilePath = join(folderPath, `${diffingAlgoName}.invalid.diff.json`);
        const actualJsonStr = JSON.stringify(actualDiffingResult, null, '\t');
        if (!existsSync(expectedFilePath)) {
            // New test, create expected file
            writeFileSync(expectedFilePath, actualJsonStr);
            // Create invalid file so that this test fails on a re-run
            writeFileSync(invalidFilePath, '');
            throw new Error('No expected file! Expected and invalid files were written. Delete the invalid file to make the test pass.');
        }
        if (existsSync(invalidFilePath)) {
            const invalidJsonStr = readFileSync(invalidFilePath, 'utf8');
            if (invalidJsonStr === '') {
                // Update expected file
                writeFileSync(expectedFilePath, actualJsonStr);
                throw new Error(`Delete the invalid ${invalidFilePath} file to make the test pass.`);
            }
            else {
                const expectedFileDiffResult = JSON.parse(invalidJsonStr);
                try {
                    assert.deepStrictEqual(actualDiffingResult, expectedFileDiffResult);
                }
                catch (e) {
                    writeFileSync(expectedFilePath, actualJsonStr);
                    throw e;
                }
                // Test succeeded with the invalid file, restore expected file from invalid
                writeFileSync(expectedFilePath, invalidJsonStr);
                rmSync(invalidFilePath);
            }
        }
        else {
            const expectedJsonStr = readFileSync(expectedFilePath, 'utf8');
            const expectedFileDiffResult = JSON.parse(expectedJsonStr);
            try {
                assert.deepStrictEqual(actualDiffingResult, expectedFileDiffResult);
            }
            catch (e) {
                // Backup expected file
                writeFileSync(invalidFilePath, expectedJsonStr);
                // Update expected file
                writeFileSync(expectedFilePath, actualJsonStr);
                throw e;
            }
        }
    }
    test(`test`, () => {
        runTest('invalid-diff-trimws', 'advanced');
    });
    for (const folder of folders) {
        for (const diffingAlgoName of ['legacy', 'advanced']) {
            test(`${folder}-${diffingAlgoName}`, () => {
                runTest(folder, diffingAlgoName);
            });
        }
    }
});
function assertDiffCorrectness(diff, original, modified) {
    const allInnerChanges = diff.changes.flatMap(c => c.innerChanges);
    const edit = rangeMappingsToTextEdit(allInnerChanges, new ArrayText(modified));
    const result = edit.normalize().apply(new ArrayText(original));
    assert.deepStrictEqual(result, modified.join('\n'));
}
function rangeMappingsToTextEdit(rangeMappings, modified) {
    return new TextEdit(rangeMappings.map(m => {
        return new SingleTextEdit(m.originalRange, modified.getValueOfRange(m.modifiedRange));
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4dHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9ub2RlL2RpZmZpbmcvZml4dHVyZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDbEYsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDckMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBNEIsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFFckgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFnQixTQUFTLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3JHLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YseUJBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDN0IsTUFBTSxDQUFDLENBQUM7UUFDVCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBR0gsTUFBTSxj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