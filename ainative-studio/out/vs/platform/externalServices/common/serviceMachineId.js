/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { generateUuid, isUUID } from '../../../base/common/uuid.js';
export async function getServiceMachineId(environmentService, fileService, storageService) {
    let uuid = storageService ? storageService.get('storage.serviceMachineId', -1 /* StorageScope.APPLICATION */) || null : null;
    if (uuid) {
        return uuid;
    }
    try {
        const contents = await fileService.readFile(environmentService.serviceMachineIdResource);
        const value = contents.value.toString();
        uuid = isUUID(value) ? value : null;
    }
    catch (e) {
        uuid = null;
    }
    if (!uuid) {
        uuid = generateUuid();
        try {
            await fileService.writeFile(environmentService.serviceMachineIdResource, VSBuffer.fromString(uuid));
        }
        catch (error) {
            //noop
        }
    }
    storageService?.store('storage.serviceMachineId', uuid, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    return uuid;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZU1hY2hpbmVJZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlcm5hbFNlcnZpY2VzL2NvbW1vbi9zZXJ2aWNlTWFjaGluZUlkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBS3BFLE1BQU0sQ0FBQyxLQUFLLFVBQVUsbUJBQW1CLENBQUMsa0JBQXVDLEVBQUUsV0FBeUIsRUFBRSxjQUEyQztJQUN4SixJQUFJLElBQUksR0FBa0IsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixvQ0FBMkIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNuSSxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDO1FBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDekYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNyQyxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLElBQUksR0FBRyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1gsSUFBSSxHQUFHLFlBQVksRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckcsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTTtRQUNQLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxFQUFFLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxJQUFJLG1FQUFrRCxDQUFDO0lBRXpHLE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyJ9