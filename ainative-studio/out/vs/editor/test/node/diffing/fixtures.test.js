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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4dHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L25vZGUvZGlmZmluZy9maXh0dXJlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNsRixPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNyQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUE0QixZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUVySCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQWdCLFNBQVMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHckcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVix5QkFBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM3QixNQUFNLENBQUMsQ0FBQztRQUNULENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFHSCxNQUFNLGNB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