/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { UriIdentityService } from '../../common/uriIdentityService.js';
import { mock } from '../../../../base/test/common/mock.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('URI Identity', function () {
    class FakeFileService extends mock() {
        constructor(data) {
            super();
            this.data = data;
            this.onDidChangeFileSystemProviderCapabilities = Event.None;
            this.onDidChangeFileSystemProviderRegistrations = Event.None;
        }
        hasProvider(uri) {
            return this.data.has(uri.scheme);
        }
        hasCapability(uri, flag) {
            const mask = this.data.get(uri.scheme) ?? 0;
            return Boolean(mask & flag);
        }
    }
    let _service;
    setup(function () {
        _service = new UriIdentityService(new FakeFileService(new Map([
            ['bar', 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */],
            ['foo', 0 /* FileSystemProviderCapabilities.None */]
        ])));
    });
    teardown(function () {
        _service.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertCanonical(input, expected, service = _service) {
        const actual = service.asCanonicalUri(input);
        assert.strictEqual(actual.toString(), expected.toString());
        assert.ok(service.extUri.isEqual(actual, expected));
    }
    test('extUri (isEqual)', function () {
        const a = URI.parse('foo://bar/bang');
        const a1 = URI.parse('foo://bar/BANG');
        const b = URI.parse('bar://bar/bang');
        const b1 = URI.parse('bar://bar/BANG');
        assert.strictEqual(_service.extUri.isEqual(a, a1), true);
        assert.strictEqual(_service.extUri.isEqual(a1, a), true);
        assert.strictEqual(_service.extUri.isEqual(b, b1), false);
        assert.strictEqual(_service.extUri.isEqual(b1, b), false);
    });
    test('asCanonicalUri (casing)', function () {
        const a = URI.parse('foo://bar/bang');
        const a1 = URI.parse('foo://bar/BANG');
        const b = URI.parse('bar://bar/bang');
        const b1 = URI.parse('bar://bar/BANG');
        assertCanonical(a, a);
        assertCanonical(a1, a);
        assertCanonical(b, b);
        assertCanonical(b1, b1); // case sensitive
    });
    test('asCanonicalUri (normalization)', function () {
        const a = URI.parse('foo://bar/bang');
        assertCanonical(a, a);
        assertCanonical(URI.parse('foo://bar/./bang'), a);
        assertCanonical(URI.parse('foo://bar/./bang'), a);
        assertCanonical(URI.parse('foo://bar/./foo/../bang'), a);
    });
    test('asCanonicalUri (keep fragement)', function () {
        const a = URI.parse('foo://bar/bang');
        assertCanonical(a, a);
        assertCanonical(URI.parse('foo://bar/./bang#frag'), a.with({ fragment: 'frag' }));
        assertCanonical(URI.parse('foo://bar/./bang#frag'), a.with({ fragment: 'frag' }));
        assertCanonical(URI.parse('foo://bar/./bang#frag'), a.with({ fragment: 'frag' }));
        assertCanonical(URI.parse('foo://bar/./foo/../bang#frag'), a.with({ fragment: 'frag' }));
        const b = URI.parse('foo://bar/bazz#frag');
        assertCanonical(b, b);
        assertCanonical(URI.parse('foo://bar/bazz'), b.with({ fragment: '' }));
        assertCanonical(URI.parse('foo://bar/BAZZ#DDD'), b.with({ fragment: 'DDD' })); // lower-case path, but fragment is kept
    });
    test.skip('[perf] CPU pegged after some builds #194853', function () {
        const n = 100 + (2 ** 16);
        for (let i = 0; i < n; i++) {
            const uri = URI.parse(`foo://bar/${i}`);
            const uri2 = _service.asCanonicalUri(uri);
            assert.ok(uri2);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSWRlbnRpdHlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cmlJZGVudGl0eS90ZXN0L2NvbW1vbi91cmlJZGVudGl0eVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLGNBQWMsRUFBRTtJQUVyQixNQUFNLGVBQWdCLFNBQVEsSUFBSSxFQUFnQjtRQUtqRCxZQUFxQixJQUFpRDtZQUNyRSxLQUFLLEVBQUUsQ0FBQztZQURZLFNBQUksR0FBSixJQUFJLENBQTZDO1lBSDdELDhDQUF5QyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDdkQsK0NBQTBDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUlqRSxDQUFDO1FBQ1EsV0FBVyxDQUFDLEdBQVE7WUFDNUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNRLGFBQWEsQ0FBQyxHQUFRLEVBQUUsSUFBb0M7WUFDcEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FB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