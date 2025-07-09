/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir } from 'os';
import { platform } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
export class NativeMcpDiscoveryHelperService {
    constructor() { }
    load() {
        return Promise.resolve({
            platform,
            homedir: URI.file(homedir()),
            winAppData: this.uriFromEnvVariable('APPDATA'),
            xdgHome: this.uriFromEnvVariable('XDG_CONFIG_HOME'),
        });
    }
    uriFromEnvVariable(varName) {
        const envVar = process.env[varName];
        if (!envVar) {
            return undefined;
        }
        return URI.file(envVar);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tY3Avbm9kZS9uYXRpdmVNY3BEaXNjb3ZlcnlIZWxwZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDN0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUdsRCxNQUFNLE9BQU8sK0JBQStCO0lBRzNDLGdCQUFnQixDQUFDO0lBRWpCLElBQUk7UUFDSCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDdEIsUUFBUTtZQUNSLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVCLFVBQVUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDO1lBQzlDLE9BQU8sRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUM7U0FDbkQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGtCQUFrQixDQUFDLE9BQWU7UUFDekMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRCJ9