/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { getRandomTestPath } from '../../../base/test/node/testUtils.js';
import { parseServerConnectionToken, ServerConnectionTokenParseError } from '../../node/serverConnectionToken.js';
suite('parseServerConnectionToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function isError(r) {
        return (r instanceof ServerConnectionTokenParseError);
    }
    function assertIsError(r) {
        assert.strictEqual(isError(r), true);
    }
    test('no arguments generates a token that is mandatory', async () => {
        const result = await parseServerConnectionToken({}, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
    });
    test('--without-connection-token', async () => {
        const result = await parseServerConnectionToken({ 'without-connection-token': true }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 0 /* ServerConnectionTokenType.None */);
    });
    test('--without-connection-token --connection-token results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'without-connection-token': true, 'connection-token': '0' }, async () => 'defaultTokenValue'));
    });
    test('--without-connection-token --connection-token-file results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'without-connection-token': true, 'connection-token-file': '0' }, async () => 'defaultTokenValue'));
    });
    test('--connection-token-file --connection-token results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'connection-token-file': '0', 'connection-token': '0' }, async () => 'defaultTokenValue'));
    });
    test('--connection-token-file', async function () {
        this.timeout(10000);
        const testDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'server-connection-token');
        fs.mkdirSync(testDir, { recursive: true });
        const filename = path.join(testDir, 'connection-token-file');
        const connectionToken = `12345-123-abc`;
        fs.writeFileSync(filename, connectionToken);
        const result = await parseServerConnectionToken({ 'connection-token-file': filename }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
        assert.strictEqual(result.value, connectionToken);
        fs.rmSync(testDir, { recursive: true, force: true });
    });
    test('--connection-token', async () => {
        const connectionToken = `12345-123-abc`;
        const result = await parseServerConnectionToken({ 'connection-token': connectionToken }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
        assert.strictEqual(result.value, connectionToken);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL3Rlc3Qvbm9kZS9zZXJ2ZXJDb25uZWN0aW9uVG9rZW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLDBCQUEwQixFQUF5QiwrQkFBK0IsRUFBNkIsTUFBTSxxQ0FBcUMsQ0FBQztBQUdwSyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxPQUFPLENBQUMsQ0FBMEQ7UUFDMUUsT0FBTyxDQUFDLENBQUMsWUFBWSwrQkFBK0IsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBQyxDQUEwRDtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25FLE1BQU0sTUFBTSxHQUFHLE1BQU0sMEJBQTBCLENBQUMsRUFBc0IsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDekcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxZQUFZLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdEQUF3QyxDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQyxFQUFFLDBCQUEwQixFQUFFLElBQUksRUFBc0IsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDM0ksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxZQUFZLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLDJDQUFtQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakYsYUFBYSxDQUFDLE1BQU0sMEJBQTBCLENBQUMsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxFQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ3JLLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RGLGFBQWEsQ0FBQyxNQUFNLDBCQUEwQixDQUFDLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEdBQUcsRUFBc0IsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUMxSyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2REFBNkQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RSxhQUFhLENBQUMsTUFBTSwwQkFBMEIsQ0FBQyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEVBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDakssQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSztRQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUN0RixFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDN0QsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3hDLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sTUFBTSxHQUFHLE1BQU0sMEJBQTBCLENBQUMsRUFBRSx1QkFBdUIsRUFBRSxRQUFRLEVBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sWUFBWSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxnREFBd0MsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNsRCxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLE1BQU0sMEJBQTBCLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzlJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sWUFBWSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxnREFBd0MsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=