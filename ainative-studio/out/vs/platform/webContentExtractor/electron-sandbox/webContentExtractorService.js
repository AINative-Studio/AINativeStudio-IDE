/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerMainProcessRemoteService, registerSharedProcessRemoteService } from '../../ipc/electron-sandbox/services.js';
import { ISharedWebContentExtractorService, IWebContentExtractorService } from '../common/webContentExtractor.js';
registerMainProcessRemoteService(IWebContentExtractorService, 'webContentExtractor');
registerSharedProcessRemoteService(ISharedWebContentExtractorService, 'sharedWebContentExtractor');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci9lbGVjdHJvbi1zYW5kYm94L3dlYkNvbnRlbnRFeHRyYWN0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxILGdDQUFnQyxDQUFDLDJCQUEyQixFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDckYsa0NBQWtDLENBQUMsaUNBQWlDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyJ9