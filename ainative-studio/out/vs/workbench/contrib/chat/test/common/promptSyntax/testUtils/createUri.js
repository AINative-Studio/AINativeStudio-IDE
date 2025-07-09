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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVXJpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Rlc3RVdGlscy9jcmVhdGVVcmkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV6RTs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxRQUFnQixFQUFPLEVBQUU7SUFDbEQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQztBQUVGOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLFFBQWdCLEVBQVUsRUFBRTtJQUN0RCxJQUFJLFNBQVMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDM0MsT0FBTyxNQUFNLFFBQVEsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxPQUFPLFFBQVEsQ0FBQztBQUNqQixDQUFDLENBQUMifQ==