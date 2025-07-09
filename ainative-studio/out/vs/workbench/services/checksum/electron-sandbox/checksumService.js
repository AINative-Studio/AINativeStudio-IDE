/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IChecksumService } from '../../../../platform/checksum/common/checksumService.js';
import { registerSharedProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
registerSharedProcessRemoteService(IChecksumService, 'checksum');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tzdW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jaGVja3N1bS9lbGVjdHJvbi1zYW5kYm94L2NoZWNrc3VtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUUzRyxrQ0FBa0MsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQyJ9