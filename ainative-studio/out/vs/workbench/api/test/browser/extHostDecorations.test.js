/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostDecorations } from '../../common/extHostDecorations.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
suite('ExtHostDecorations', function () {
    let mainThreadShape;
    let extHostDecorations;
    const providers = new Set();
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        providers.clear();
        mainThreadShape = new class extends mock() {
            $registerDecorationProvider(handle) {
                providers.add(handle);
            }
        };
        extHostDecorations = new ExtHostDecorations(new class extends mock() {
            getProxy() {
                return mainThreadShape;
            }
        }, new NullLogService());
    });
    test('SCM Decorations missing #100524', async function () {
        let calledA = false;
        let calledB = false;
        // never returns
        extHostDecorations.registerFileDecorationProvider({
            provideFileDecoration() {
                calledA = true;
                return new Promise(() => { });
            }
        }, nullExtensionDescription);
        // always returns
        extHostDecorations.registerFileDecorationProvider({
            provideFileDecoration() {
                calledB = true;
                return new Promise(resolve => resolve({ badge: 'H', tooltip: 'Hello' }));
            }
        }, nullExtensionDescription);
        const requests = [...providers.values()].map((handle, idx) => {
            return extHostDecorations.$provideDecorations(handle, [{ id: idx, uri: URI.parse('test:///file') }], CancellationToken.None);
        });
        assert.strictEqual(calledA, true);
        assert.strictEqual(calledB, true);
        assert.strictEqual(requests.length, 2);
        const [first, second] = requests;
        const firstResult = await Promise.race([first, timeout(30).then(() => false)]);
        assert.strictEqual(typeof firstResult, 'boolean'); // never finishes...
        const secondResult = await Promise.race([second, timeout(30).then(() => false)]);
        assert.strictEqual(typeof secondResult, 'object');
        await timeout(30);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REZWNvcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFN0YsS0FBSyxDQUFDLG9CQUFvQixFQUFFO0lBRTNCLElBQUksZUFBMkMsQ0FBQztJQUNoRCxJQUFJLGtCQUFzQyxDQUFDO0lBQzNDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFFcEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUM7UUFFTCxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEIsZUFBZSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUksRUFBOEI7WUFDNUQsMkJBQTJCLENBQUMsTUFBYztnQkFDbEQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxN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