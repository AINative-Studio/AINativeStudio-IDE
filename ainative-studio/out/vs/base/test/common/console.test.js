/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getFirstFrame } from '../../common/console.js';
import { normalize } from '../../common/path.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Console', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getFirstFrame', () => {
        let stack = 'at vscode.commands.registerCommand (/Users/someone/Desktop/test-ts/out/src/extension.js:18:17)';
        let frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, normalize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack = 'at /Users/someone/Desktop/test-ts/out/src/extension.js:18:17';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, normalize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack = 'at c:\\Users\\someone\\Desktop\\end-js\\extension.js:18:17';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, 'c:\\Users\\someone\\Desktop\\end-js\\extension.js');
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack = 'at e.$executeContributedCommand(c:\\Users\\someone\\Desktop\\end-js\\extension.js:18:17)';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, 'c:\\Users\\someone\\Desktop\\end-js\\extension.js');
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack = 'at /Users/someone/Desktop/test-ts/out/src/extension.js:18:17\nat /Users/someone/Desktop/test-ts/out/src/other.js:28:27\nat /Users/someone/Desktop/test-ts/out/src/more.js:38:37';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, normalize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vY29uc29sZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLElBQUksS0FBSyxHQUFHLGdHQUFnRyxDQUFDO1FBQzdHLElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQztRQUVsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyQyxLQUFLLEdBQUcsOERBQThELENBQUM7UUFDdkUsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyQyxLQUFLLEdBQUcsNERBQTRELENBQUM7UUFDckUsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLG1EQUFtRCxDQUFDLENBQUM7UUFDMUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyQyxLQUFLLEdBQUcsMEZBQTBGLENBQUM7UUFDbkcsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLG1EQUFtRCxDQUFDLENBQUM7UUFDMUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyQyxLQUFLLEdBQUcsaUxBQWlMLENBQUM7UUFDMUwsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=