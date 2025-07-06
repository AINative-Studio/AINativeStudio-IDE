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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHRSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9uYXRpdmUvbmF0aXZlRWRpdENvbnRleHRSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLDZCQUE2QjtJQUFuQztRQUVTLDhCQUF5QixHQUFtQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBYy9FLENBQUM7SUFaQSxRQUFRLENBQUMsT0FBZSxFQUFFLGlCQUFvQztRQUM3RCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9ELE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEQsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLE9BQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLElBQUksNkJBQTZCLEVBQUUsQ0FBQyJ9