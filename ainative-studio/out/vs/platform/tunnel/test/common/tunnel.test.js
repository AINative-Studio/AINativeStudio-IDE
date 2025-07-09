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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdHVubmVsL3Rlc3QvY29tbW9uL3R1bm5lbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUNOLHlDQUF5QyxFQUN6Qyw4Q0FBOEMsRUFDOUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUNwQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsaUJBQWlCLENBQUMsR0FBVyxFQUNyQyxJQUFpRSxFQUNqRSxlQUF3QixFQUN4QixZQUFxQjtRQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBQyxHQUFXLEVBQUUsZUFBd0IsRUFBRSxZQUFxQjtRQUNwRixpQkFBaUIsQ0FBQyxHQUFHLEVBQUUseUNBQXlDLEVBQUUsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLEdBQVcsRUFBRSxlQUF3QixFQUFFLFlBQXFCO1FBQ3pGLGlCQUFpQixDQUFDLEdBQUcsRUFBRSw4Q0FBOEMsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVELElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZDLGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsZUFBZSxDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzRCxlQUFlLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsZUFBZSxDQUFDLG9DQUFvQyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RSxlQUFlLENBQUMsOERBQThELEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25HLG9CQUFvQixDQUFDLHVEQUF1RCxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRyxvQkFBb0IsQ0FBQywwRkFBMEYsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEksb0JBQW9CLENBQUMsNkZBQTZGLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hJLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==