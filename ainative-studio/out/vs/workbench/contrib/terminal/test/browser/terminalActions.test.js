/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { shrinkWorkspaceFolderCwdPairs } from '../../browser/terminalActions.js';
function makeFakeFolder(name, uri) {
    return {
        name,
        uri,
        index: 0,
        toResource: () => uri,
    };
}
function makePair(folder, cwd, isAbsolute) {
    return {
        folder,
        cwd: !cwd ? folder.uri : (cwd instanceof URI ? cwd : cwd.uri),
        isAbsolute: !!isAbsolute,
        isOverridden: !!cwd && cwd.toString() !== folder.uri.toString(),
    };
}
suite('terminalActions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const root = URI.file('/some-root');
    const a = makeFakeFolder('a', URI.joinPath(root, 'a'));
    const b = makeFakeFolder('b', URI.joinPath(root, 'b'));
    const c = makeFakeFolder('c', URI.joinPath(root, 'c'));
    const d = makeFakeFolder('d', URI.joinPath(root, 'd'));
    suite('shrinkWorkspaceFolderCwdPairs', () => {
        test('should return empty when given array is empty', () => {
            deepStrictEqual(shrinkWorkspaceFolderCwdPairs([]), []);
        });
        test('should return the only single pair when given argument is a single element array', () => {
            const pairs = [makePair(a)];
            deepStrictEqual(shrinkWorkspaceFolderCwdPairs(pairs), pairs);
        });
        test('should return all pairs when no repeated cwds', () => {
            const pairs = [makePair(a), makePair(b), makePair(c)];
            deepStrictEqual(shrinkWorkspaceFolderCwdPairs(pairs), pairs);
        });
        suite('should select the pair that has the same URI when repeated cwds exist', () => {
            test('all repeated', () => {
                const pairA = makePair(a);
                const pairB = makePair(b, a); // CWD points to A
                const pairC = makePair(c, a); // CWD points to A
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC]), [pairA]);
            });
            test('two repeated + one different', () => {
                const pairA = makePair(a);
                const pairB = makePair(b, a); // CWD points to A
                const pairC = makePair(c);
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC]), [pairA, pairC]);
            });
            test('two repeated + two repeated', () => {
                const pairA = makePair(a);
                const pairB = makePair(b, a); // CWD points to A
                const pairC = makePair(c);
                const pairD = makePair(d, c);
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC, pairD]), [pairA, pairC]);
            });
            test('two repeated + two repeated (reverse order)', () => {
                const pairB = makePair(b, a); // CWD points to A
                const pairA = makePair(a);
                const pairD = makePair(d, c);
                const pairC = makePair(c);
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC, pairD]), [pairA, pairC]);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsQWN0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBMEIsNkJBQTZCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RyxTQUFTLGNBQWMsQ0FBQyxJQUFZLEVBQUUsR0FBUTtJQUM3QyxPQUFPO1FBQ04sSUFBSTtRQUNKLEdBQUc7UUFDSCxLQUFLLEVBQUUsQ0FBQztRQUNSLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHO0tBQ3JCLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsTUFBd0IsRUFBRSxHQUE0QixFQUFFLFVBQW9CO0lBQzdGLE9BQU87UUFDTixNQUFNO1FBQ04sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUM3RCxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVU7UUFDeEIsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO0tB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