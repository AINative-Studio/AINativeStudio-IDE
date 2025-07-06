/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ProxyIdentifier {
    static { this.count = 0; }
    constructor(sid) {
        this._proxyIdentifierBrand = undefined;
        this.sid = sid;
        this.nid = (++ProxyIdentifier.count);
    }
}
const identifiers = [];
export function createProxyIdentifier(identifier) {
    const result = new ProxyIdentifier(identifier);
    identifiers[result.nid] = result;
    return result;
}
export function getStringIdentifierForProxy(nid) {
    return identifiers[nid].sid;
}
/**
 * Marks the object as containing buffers that should be serialized more efficiently.
 */
export class SerializableObjectWithBuffers {
    constructor(value) {
        this.value = value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlJZGVudGlmaWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vcHJveHlJZGVudGlmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNkJoRyxNQUFNLE9BQU8sZUFBZTthQUNiLFVBQUssR0FBRyxDQUFDLEFBQUosQ0FBSztJQU14QixZQUFZLEdBQVc7UUFMdkIsMEJBQXFCLEdBQVMsU0FBUyxDQUFDO1FBTXZDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7O0FBR0YsTUFBTSxXQUFXLEdBQTJCLEVBQUUsQ0FBQztBQUUvQyxNQUFNLFVBQVUscUJBQXFCLENBQUksVUFBa0I7SUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUksVUFBVSxDQUFDLENBQUM7SUFDbEQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUM7SUFDakMsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBc0JELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxHQUFXO0lBQ3RELE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUM3QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNkJBQTZCO0lBQ3pDLFlBQ2lCLEtBQVE7UUFBUixVQUFLLEdBQUwsS0FBSyxDQUFHO0lBQ3JCLENBQUM7Q0FDTCJ9