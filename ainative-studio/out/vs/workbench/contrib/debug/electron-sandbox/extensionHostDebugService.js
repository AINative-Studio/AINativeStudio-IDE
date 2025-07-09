/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { ExtensionHostDebugChannelClient, ExtensionHostDebugBroadcastChannel } from '../../../../platform/debug/common/extensionHostDebugIpc.js';
registerMainProcessRemoteService(IExtensionHostDebugService, ExtensionHostDebugBroadcastChannel.ChannelName, { channelClientCtor: ExtensionHostDebugChannelClient });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbkhvc3REZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDckcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekcsT0FBTyxFQUFFLCtCQUErQixFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFakosZ0NBQWdDLENBQUMsMEJBQTBCLEVBQUUsa0NBQWtDLENBQUMsV0FBVyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsK0JBQStCLEVBQUUsQ0FBQyxDQUFDIn0=