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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdERlY29yYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUU3RixLQUFLLENBQUMsb0JBQW9CLEVBQUU7SUFFM0IsSUFBSSxlQUEyQyxDQUFDO0lBQ2hELElBQUksa0JBQXNDLENBQUM7SUFDM0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUVwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQztRQUVMLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixlQUFlLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE4QjtZQUM1RCwyQkFBMkIsQ0FBQyxNQUFjO2dCQUNsRCxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0s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