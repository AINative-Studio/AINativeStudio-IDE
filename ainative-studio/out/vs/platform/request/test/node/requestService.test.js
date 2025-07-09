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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZXF1ZXN0L3Rlc3Qvbm9kZS9yZXF1ZXN0U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR2hFLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCw2REFBNkQ7SUFDN0QsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELElBQUksQ0FBQztZQUNKLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sUUFBUSxHQUFHLE1BQU0sMkJBQTJCLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1lBQzdILE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxNQUFNLENBQUMsRUFBRSxDQUNSLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLG9EQUFvRCxDQUFDO21CQUN6RSxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsQ0FBQzttQkFDM0QsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsc0RBQXNELENBQUM7bUJBQzlFLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQzVDLHFCQUFxQixHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=