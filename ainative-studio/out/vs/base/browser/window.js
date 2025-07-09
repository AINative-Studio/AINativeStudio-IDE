/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function ensureCodeWindow(targetWindow, fallbackWindowId) {
    const codeWindow = targetWindow;
    if (typeof codeWindow.vscodeWindowId !== 'number') {
        Object.defineProperty(codeWindow, 'vscodeWindowId', {
            get: () => fallbackWindowId
        });
    }
}
// eslint-disable-next-line no-restricted-globals
export const mainWindow = window;
export function isAuxiliaryWindow(obj) {
    if (obj === mainWindow) {
        return false;
    }
    const candidate = obj;
    return typeof candidate?.vscodeWindowId === 'number';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFlBQW9CLEVBQUUsZ0JBQXdCO0lBQzlFLE1BQU0sVUFBVSxHQUFHLFlBQW1DLENBQUM7SUFFdkQsSUFBSSxPQUFPLFVBQVUsQ0FBQyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbkQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbkQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQjtTQUMzQixDQUFDLENBQUM7SUFDSixDQUFDO0FBQ0YsQ0FBQztBQUVELGlEQUFpRDtBQUNqRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsTUFBb0IsQ0FBQztBQUUvQyxNQUFNLFVBQVUsaUJBQWlCLENBQUMsR0FBVztJQUM1QyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxHQUE2QixDQUFDO0lBRWhELE9BQU8sT0FBTyxTQUFTLEVBQUUsY0FBYyxLQUFLLFFBQVEsQ0FBQztBQUN0RCxDQUFDIn0=