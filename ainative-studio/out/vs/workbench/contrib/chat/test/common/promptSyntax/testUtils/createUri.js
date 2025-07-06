/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../../base/common/uri.js';
import { isWindows } from '../../../../../../../base/common/platform.js';
/**
 * Creates cross-platform `URI` for testing purposes.
 * On `Windows`, absolute paths are prefixed with the disk name.
 */
export const createURI = (linkPath) => {
    return URI.file(createPath(linkPath));
};
/**
 * Creates cross-platform `string` for testing purposes.
 * On `Windows`, absolute paths are prefixed with the disk name.
 */
export const createPath = (linkPath) => {
    if (isWindows && linkPath.startsWith('/')) {
        return `/d:${linkPath}`;
    }
    return linkPath;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVXJpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdGVzdFV0aWxzL2NyZWF0ZVVyaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXpFOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxDQUFDLFFBQWdCLEVBQU8sRUFBRTtJQUNsRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDO0FBRUY7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLENBQUMsUUFBZ0IsRUFBVSxFQUFFO0lBQ3RELElBQUksU0FBUyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMzQyxPQUFPLE1BQU0sUUFBUSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyJ9