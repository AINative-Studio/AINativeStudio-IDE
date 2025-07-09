/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const AccessibleViewRegistry = new class AccessibleViewRegistry {
    constructor() {
        this._implementations = [];
    }
    register(implementation) {
        this._implementations.push(implementation);
        return {
            dispose: () => {
                const idx = this._implementations.indexOf(implementation);
                if (idx !== -1) {
                    this._implementations.splice(idx, 1);
                }
            }
        };
    }
    getImplementations() {
        return this._implementations;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXdSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWtCaEcsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLHNCQUFzQjtJQUE1QjtRQUN6QyxxQkFBZ0IsR0FBb0MsRUFBRSxDQUFDO0lBaUJ4RCxDQUFDO0lBZkEsUUFBUSxDQUFDLGNBQTZDO1FBQ3JELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDM0MsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7SUFDOUIsQ0FBQztDQUNELENBQUMifQ==