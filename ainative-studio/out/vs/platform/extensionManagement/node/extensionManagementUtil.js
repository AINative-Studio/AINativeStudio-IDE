/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { buffer, ExtractError } from '../../../base/node/zip.js';
import { localize } from '../../../nls.js';
import { toExtensionManagementError } from '../common/abstractExtensionManagementService.js';
import { ExtensionManagementError } from '../common/extensionManagement.js';
export function fromExtractError(e) {
    let errorCode = "Extract" /* ExtensionManagementErrorCode.Extract */;
    if (e instanceof ExtractError) {
        if (e.type === 'CorruptZip') {
            errorCode = "CorruptZip" /* ExtensionManagementErrorCode.CorruptZip */;
        }
        else if (e.type === 'Incomplete') {
            errorCode = "IncompleteZip" /* ExtensionManagementErrorCode.IncompleteZip */;
        }
    }
    return toExtensionManagementError(e, errorCode);
}
export async function getManifest(vsixPath) {
    let data;
    try {
        data = await buffer(vsixPath, 'extension/package.json');
    }
    catch (e) {
        throw fromExtractError(e);
    }
    try {
        return JSON.parse(data.toString('utf8'));
    }
    catch (err) {
        throw new ExtensionManagementError(localize('invalidManifest', "VSIX invalid: package.json is not a JSON file."), "Invalid" /* ExtensionManagementErrorCode.Invalid */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9ub2RlL2V4dGVuc2lvbk1hbmFnZW1lbnRVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBZ0MsTUFBTSxrQ0FBa0MsQ0FBQztBQUcxRyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsQ0FBUTtJQUN4QyxJQUFJLFNBQVMsdURBQXVDLENBQUM7SUFDckQsSUFBSSxDQUFDLFlBQVksWUFBWSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQzdCLFNBQVMsNkRBQTBDLENBQUM7UUFDckQsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUNwQyxTQUFTLG1FQUE2QyxDQUFDO1FBQ3hELENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTywwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDakQsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsV0FBVyxDQUFDLFFBQWdCO0lBQ2pELElBQUksSUFBSSxDQUFDO0lBQ1QsSUFBSSxDQUFDO1FBQ0osSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osTUFBTSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNkLE1BQU0sSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsZ0RBQWdELENBQUMsdURBQXVDLENBQUM7SUFDekosQ0FBQztBQUNGLENBQUMifQ==