/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir } from 'os';
import { ExtHostVariableResolverProviderService } from '../common/extHostVariableResolverService.js';
export class NodeExtHostVariableResolverProviderService extends ExtHostVariableResolverProviderService {
    homeDir() {
        return homedir();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0VmFyaWFibGVSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM3QixPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVyRyxNQUFNLE9BQU8sMENBQTJDLFNBQVEsc0NBQXNDO0lBQ2xGLE9BQU87UUFDekIsT0FBTyxPQUFPLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QifQ==