/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class NativeEditContextRegistryImpl {
    constructor() {
        this._nativeEditContextMapping = new Map();
    }
    register(ownerID, nativeEditContext) {
        this._nativeEditContextMapping.set(ownerID, nativeEditContext);
        return {
            dispose: () => {
                this._nativeEditContextMapping.delete(ownerID);
            }
        };
    }
    get(ownerID) {
        return this._nativeEditContextMapping.get(ownerID);
    }
}
export const NativeEditContextRegistry = new NativeEditContextRegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHRSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L25hdGl2ZS9uYXRpdmVFZGl0Q29udGV4dFJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sNkJBQTZCO0lBQW5DO1FBRVMsOEJBQXlCLEdBQW1DLElBQUksR0FBRyxFQUFFLENBQUM7SUFjL0UsQ0FBQztJQVpBLFFBQVEsQ0FBQyxPQUFlLEVBQUUsaUJBQW9DO1FBQzdELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDL0QsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNoRCxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsT0FBZTtRQUNsQixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSw2QkFBNkIsRUFBRSxDQUFDIn0=