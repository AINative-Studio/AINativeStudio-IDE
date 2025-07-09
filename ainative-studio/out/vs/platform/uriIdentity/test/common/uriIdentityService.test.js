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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSWRlbnRpdHlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXJpSWRlbnRpdHkvdGVzdC9jb21tb24vdXJpSWRlbnRpdHlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxjQUFjLEVBQUU7SUFFckIsTUFBTSxlQUFnQixTQUFRLElBQUksRUFBZ0I7UUFLakQsWUFBcUIsSUFBaUQ7WUFDckUsS0FBSyxFQUFFLENBQUM7WUFEWSxTQUFJLEdBQUosSUFBSSxDQUE2QztZQUg3RCw4Q0FBeUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ3ZELCtDQUEwQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFJakUsQ0FBQztRQUNRLFdBQVcsQ0FBQyxHQUFRO1lBQzVCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDUSxhQUFhLENBQUMsR0FBUSxFQUFFLElBQW9DO1lBQ3BFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENB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