/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { isMacintosh, isLinux, isWindows } from '../../../../../base/common/platform.js';
import { OutputLinkComputer } from '../../common/outputLinkComputer.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('OutputLinkProvider', () => {
    function toOSPath(p) {
        if (isMacintosh || isLinux) {
            return p.replace(/\\/g, '/');
        }
        return p;
    }
    test('OutputLinkProvider - Link detection', function () {
        const rootFolder = isWindows ? URI.file('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala') :
            URI.file('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala');
        const patterns = OutputLinkComputer.createPatterns(rootFolder);
        const contextService = new TestContextService();
        let line = toOSPath('Foo bar');
        let result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 0);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 84);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336 in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 88);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9 in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336,9');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 90);
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9 in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336,9');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 90);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts>dir
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts>dir in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 84);
        // Example: at [C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9]
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9] in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336,9');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 90);
        // Example: at [C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts]
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts] in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts]').toString());
        // Example: C:\Users\someone\AppData\Local\Temp\_monacodata_9888\workspaces\express\server.js on line 8
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts on line 8');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 90);
        // Example: C:\Users\someone\AppData\Local\Temp\_monacodata_9888\workspaces\express\server.js on line 8, column 13
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts on line 8, column 13');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8,13');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 101);
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts on LINE 8, COLUMN 13');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8,13');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 101);
        // Example: C:\Users\someone\AppData\Local\Temp\_monacodata_9888\workspaces\express\server.js:line 8
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:line 8');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 87);
        // Example: at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts)
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 94);
        // Example: at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278)
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#278');
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 98);
        // Example: at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278:34)
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278:34)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#278,34');
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 101);
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278:34)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#278,34');
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 101);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts(45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 102);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts (45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 103);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45,18): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts(45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 102);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts (45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 103);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45,18): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        // Example: C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features Special.ts (45,18): error.
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features Special.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features Special.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 114);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts.
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts. in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 84);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game\\
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game\\ in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        // Example: at "C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts"
        line = toOSPath(' at "C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts" in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 6);
        assert.strictEqual(result[0].range.endColumn, 85);
        // Example: at 'C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts'
        line = toOSPath(' at \'C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts\' in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 6);
        assert.strictEqual(result[0].range.endColumn, 85);
    });
    test('OutputLinkProvider - #106847', function () {
        const rootFolder = isWindows ? URI.file('C:\\Users\\username\\Desktop\\test-ts') :
            URI.file('C:/Users/username/Desktop');
        const patterns = OutputLinkComputer.createPatterns(rootFolder);
        const contextService = new TestContextService();
        const line = toOSPath('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa C:\\Users\\username\\Desktop\\test-ts\\prj.conf C:\\Users\\username\\Desktop\\test-ts\\prj.conf C:\\Users\\username\\Desktop\\test-ts\\prj.conf');
        const result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 3);
        for (const res of result) {
            assert.ok(res.range.startColumn > 0 && res.range.endColumn > 0);
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua1Byb3ZpZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L3Rlc3QvYnJvd3Nlci9vdXRwdXRMaW5rUHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFFaEMsU0FBUyxRQUFRLENBQUMsQ0FBUztRQUMxQixJQUFJLFdBQVcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM1QixPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFFRCxJQUFJLENBQUMscUNBQXFDLEVBQUU7UUFDM0MsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlGQUFpRixDQUFDLENBQUMsQ0FBQztZQUMzSCxHQUFHLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxDQUFDLENBQUM7UUFFckYsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENB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