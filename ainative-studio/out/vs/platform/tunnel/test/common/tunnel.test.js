/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { extractLocalHostUriMetaDataForPortMapping, extractQueryLocalHostUriMetaDataForPortMapping } from '../../common/tunnel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('Tunnel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function portMappingDoTest(uri, func, expectedAddress, expectedPort) {
        const res = func(URI.parse(uri));
        assert.strictEqual(!expectedAddress, !res);
        assert.strictEqual(res?.address, expectedAddress);
        assert.strictEqual(res?.port, expectedPort);
    }
    function portMappingTest(uri, expectedAddress, expectedPort) {
        portMappingDoTest(uri, extractLocalHostUriMetaDataForPortMapping, expectedAddress, expectedPort);
    }
    function portMappingTestQuery(uri, expectedAddress, expectedPort) {
        portMappingDoTest(uri, extractQueryLocalHostUriMetaDataForPortMapping, expectedAddress, expectedPort);
    }
    test('portMapping', () => {
        portMappingTest('file:///foo.bar/baz');
        portMappingTest('http://foo.bar:1234');
        portMappingTest('http://localhost:8080', 'localhost', 8080);
        portMappingTest('https://localhost:443', 'localhost', 443);
        portMappingTest('http://127.0.0.1:3456', '127.0.0.1', 3456);
        portMappingTest('http://0.0.0.0:7654', '0.0.0.0', 7654);
        portMappingTest('http://localhost:8080/path?foo=bar', 'localhost', 8080);
        portMappingTest('http://localhost:8080/path?foo=http%3A%2F%2Flocalhost%3A8081', 'localhost', 8080);
        portMappingTestQuery('http://foo.bar/path?url=http%3A%2F%2Flocalhost%3A8081', 'localhost', 8081);
        portMappingTestQuery('http://foo.bar/path?url=http%3A%2F%2Flocalhost%3A8081&url2=http%3A%2F%2Flocalhost%3A8082', 'localhost', 8081);
        portMappingTestQuery('http://foo.bar/path?url=http%3A%2F%2Fmicrosoft.com%2Fbad&url2=http%3A%2F%2Flocalhost%3A8081', 'localhost', 8081);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3R1bm5lbC90ZXN0L2NvbW1vbi90dW5uZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFDTix5Q0FBeUMsRUFDekMsOENBQThDLEVBQzlDLE1BQU0sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHaEcsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLGlCQUFpQixDQUFDLEdBQVcsRUFDckMsSUFBaUUsRUFDakUsZUFBd0IsRUFDeEIsWUFBcUI7UUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsR0FBVyxFQUFFLGVBQXdCLEVBQUUsWUFBcUI7UUFDcEYsaUJBQWlCLENBQUMsR0FBRyxFQUFFLHlDQUF5QyxFQUFFLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNsRyxDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxHQUFXLEVBQUUsZUFBd0IsRUFBRSxZQUFxQjtRQUN6RixpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsOENBQThDLEVBQUUsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFRCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0QsZUFBZSxDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RCxlQUFlLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELGVBQWUsQ0FBQyxvQ0FBb0MsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekUsZUFBZSxDQUFDLDhEQUE4RCxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRyxvQkFBb0IsQ0FBQyx1REFBdUQsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakcsb0JBQW9CLENBQUMsMEZBQTBGLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BJLG9CQUFvQixDQUFDLDZGQUE2RixFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4SSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=