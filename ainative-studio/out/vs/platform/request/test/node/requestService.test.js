/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { lookupKerberosAuthorization } from '../../node/requestService.js';
import { isWindows } from '../../../../base/common/platform.js';
suite('Request Service', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    // Kerberos module fails to load on local macOS and Linux CI.
    (isWindows ? test : test.skip)('Kerberos lookup', async () => {
        try {
            const logService = store.add(new NullLogService());
            const response = await lookupKerberosAuthorization('http://localhost:9999', undefined, logService, 'requestService.test.ts');
            assert.ok(response);
        }
        catch (err) {
            assert.ok(err?.message?.includes('No authority could be contacted for authentication')
                || err?.message?.includes('No Kerberos credentials available')
                || err?.message?.includes('No credentials are available in the security package')
                || err?.message?.includes('no credential for'), `Unexpected error: ${err}`);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlcXVlc3QvdGVzdC9ub2RlL3JlcXVlc3RTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHaEUsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELDZEQUE2RDtJQUM3RCxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDbkQsTUFBTSxRQUFRLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFDN0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE1BQU0sQ0FBQyxFQUFFLENBQ1IsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsb0RBQW9ELENBQUM7bUJBQ3pFLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxDQUFDO21CQUMzRCxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzREFBc0QsQ0FBQzttQkFDOUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFDNUMscUJBQXFCLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==