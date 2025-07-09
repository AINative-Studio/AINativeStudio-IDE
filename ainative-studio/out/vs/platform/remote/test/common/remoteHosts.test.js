/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { parseAuthorityWithOptionalPort, parseAuthorityWithPort } from '../../common/remoteHosts.js';
suite('remoteHosts', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parseAuthority hostname', () => {
        assert.deepStrictEqual(parseAuthorityWithPort('localhost:8080'), { host: 'localhost', port: 8080 });
    });
    test('parseAuthority ipv4', () => {
        assert.deepStrictEqual(parseAuthorityWithPort('127.0.0.1:8080'), { host: '127.0.0.1', port: 8080 });
    });
    test('parseAuthority ipv6', () => {
        assert.deepStrictEqual(parseAuthorityWithPort('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080'), { host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', port: 8080 });
    });
    test('parseAuthorityWithOptionalPort hostname', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('localhost:8080', 123), { host: 'localhost', port: 8080 });
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('localhost', 123), { host: 'localhost', port: 123 });
    });
    test('parseAuthorityWithOptionalPort ipv4', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('127.0.0.1:8080', 123), { host: '127.0.0.1', port: 8080 });
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('127.0.0.1', 123), { host: '127.0.0.1', port: 123 });
    });
    test('parseAuthorityWithOptionalPort ipv6', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080', 123), { host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', port: 8080 });
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', 123), { host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', port: 123 });
    });
    test('issue #151748: Error: Remote authorities containing \'+\' need to be resolved!', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('codespaces+aaaaa-aaaaa-aaaa-aaaaa-a111aa111', 123), { host: 'codespaces+aaaaa-aaaaa-aaaa-aaaaa-a111aa111', port: 123 });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSG9zdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvdGVzdC9jb21tb24vcmVtb3RlSG9zdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFckcsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFFekIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDckcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDckcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsZ0RBQWdELENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSwyQ0FBMkMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNySyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakgsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzVHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNqSCxNQUFNLENBQUMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsOEJBQThCLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsMkNBQTJDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakwsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSwyQ0FBMkMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM1SyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnRkFBZ0YsRUFBRSxHQUFHLEVBQUU7UUFDM0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSw2Q0FBNkMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNoTCxDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=