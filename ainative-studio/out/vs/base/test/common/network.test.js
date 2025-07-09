/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess, Schemas } from '../../common/network.js';
import { isWeb } from '../../common/platform.js';
import { isEqual } from '../../common/resources.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('network', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    (isWeb ? test.skip : test)('FileAccess: URI (native)', () => {
        // asCodeUri() & asFileUri(): simple, without authority
        let originalFileUri = URI.file('network.test.ts');
        let browserUri = FileAccess.uriToBrowserUri(originalFileUri);
        assert.ok(browserUri.authority.length > 0);
        let fileUri = FileAccess.uriToFileUri(browserUri);
        assert.strictEqual(fileUri.authority.length, 0);
        assert(isEqual(originalFileUri, fileUri));
        // asCodeUri() & asFileUri(): with authority
        originalFileUri = URI.file('network.test.ts').with({ authority: 'test-authority' });
        browserUri = FileAccess.uriToBrowserUri(originalFileUri);
        assert.strictEqual(browserUri.authority, originalFileUri.authority);
        fileUri = FileAccess.uriToFileUri(browserUri);
        assert(isEqual(originalFileUri, fileUri));
    });
    (isWeb ? test.skip : test)('FileAccess: moduleId (native)', () => {
        const browserUri = FileAccess.asBrowserUri('vs/base/test/node/network.test');
        assert.strictEqual(browserUri.scheme, Schemas.vscodeFileResource);
        const fileUri = FileAccess.asFileUri('vs/base/test/node/network.test');
        assert.strictEqual(fileUri.scheme, Schemas.file);
    });
    (isWeb ? test.skip : test)('FileAccess: query and fragment is dropped (native)', () => {
        const originalFileUri = URI.file('network.test.ts').with({ query: 'foo=bar', fragment: 'something' });
        const browserUri = FileAccess.uriToBrowserUri(originalFileUri);
        assert.strictEqual(browserUri.query, '');
        assert.strictEqual(browserUri.fragment, '');
    });
    (isWeb ? test.skip : test)('FileAccess: query and fragment is kept if URI is already of same scheme (native)', () => {
        const originalFileUri = URI.file('network.test.ts').with({ query: 'foo=bar', fragment: 'something' });
        const browserUri = FileAccess.uriToBrowserUri(originalFileUri.with({ scheme: Schemas.vscodeFileResource }));
        assert.strictEqual(browserUri.query, 'foo=bar');
        assert.strictEqual(browserUri.fragment, 'something');
        const fileUri = FileAccess.uriToFileUri(originalFileUri);
        assert.strictEqual(fileUri.query, 'foo=bar');
        assert.strictEqual(fileUri.fragment, 'something');
    });
    (isWeb ? test.skip : test)('FileAccess: web', () => {
        const originalHttpsUri = URI.file('network.test.ts').with({ scheme: 'https' });
        const browserUri = FileAccess.uriToBrowserUri(originalHttpsUri);
        assert.strictEqual(originalHttpsUri.toString(), browserUri.toString());
    });
    test('FileAccess: remote URIs', () => {
        const originalRemoteUri = URI.file('network.test.ts').with({ scheme: Schemas.vscodeRemote });
        const browserUri = FileAccess.uriToBrowserUri(originalRemoteUri);
        assert.notStrictEqual(originalRemoteUri.scheme, browserUri.scheme);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbmV0d29yay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUVyQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFFM0QsdURBQXVEO1FBQ3ZELElBQUksZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNsRCxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxPQUFPLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9B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