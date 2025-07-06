/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { randomInt } from '../../../../base/common/numbers.js';
import { getCleanPromptName, isPromptFile } from '../../common/constants.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('Prompt Constants', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('• getCleanPromptName', () => {
        test('• returns a clean prompt name', () => {
            assert.strictEqual(getCleanPromptName(URI.file('/path/to/my-prompt.prompt.md')), 'my-prompt');
            assert.strictEqual(getCleanPromptName(URI.file('../common.prompt.md')), 'common');
            const expectedPromptName = `some-${randomInt(1000)}`;
            assert.strictEqual(getCleanPromptName(URI.file(`./${expectedPromptName}.prompt.md`)), expectedPromptName);
            assert.strictEqual(getCleanPromptName(URI.file('.github/copilot-instructions.md')), 'copilot-instructions');
        });
        test('• throws if not a prompt file URI provided', () => {
            assert.throws(() => {
                getCleanPromptName(URI.file('/path/to/default.prompt.md1'));
            });
            assert.throws(() => {
                getCleanPromptName(URI.file('./some.md'));
            });
            assert.throws(() => {
                getCleanPromptName(URI.file('../some-folder/frequent.txt'));
            });
            assert.throws(() => {
                getCleanPromptName(URI.file('/etc/prompts/my-prompt'));
            });
        });
    });
    suite('• isPromptFile', () => {
        test('• returns `true` for prompt files', () => {
            assert(isPromptFile(URI.file('/path/to/my-prompt.prompt.md')));
            assert(isPromptFile(URI.file('../common.prompt.md')));
            assert(isPromptFile(URI.file(`./some-${randomInt(1000)}.prompt.md`)));
            assert(isPromptFile(URI.file('.github/copilot-instructions.md')));
        });
        test('• returns `false` for non-prompt files', () => {
            assert(!isPromptFile(URI.file('/path/to/my-prompt.prompt.md1')));
            assert(!isPromptFile(URI.file('../common.md')));
            assert(!isPromptFile(URI.file(`./some-${randomInt(1000)}.txt`)));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL3Rlc3QvY29tbW9uL2NvbnN0YW50cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNsQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQyxFQUM1RCxXQUFXLENBQ1gsQ0FBQztZQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUNuRCxRQUFRLENBQ1IsQ0FBQztZQUVGLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFNLENBQUMsV0FBVyxDQUNqQixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssa0JBQWtCLFlBQVksQ0FBQyxDQUFDLEVBQ2pFLGtCQUFrQixDQUNsQixDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLEVBQy9ELHNCQUFzQixDQUN0QixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO2dCQUNsQixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztZQUM3RCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO2dCQUNsQixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDM0MsQ0FBQyxDQUFDLENBQUM7WUFHSCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtnQkFDbEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7WUFDN0QsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtnQkFDbEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7WUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUM1QixJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1lBQzlDLE1BQU0sQ0FDTCxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQ3RELENBQUM7WUFFRixNQUFNLENBQ0wsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUM3QyxDQUFDO1lBRUYsTUFBTSxDQUNMLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUM3RCxDQUFDO1lBRUYsTUFBTSxDQUNMLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FDekQsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtZQUNuRCxNQUFNLENBQ0wsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQ3hELENBQUM7WUFFRixNQUFNLENBQ0wsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUN2QyxDQUFDO1lBRUYsTUFBTSxDQUNMLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3hELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==