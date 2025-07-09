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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlJZGVudGlmaWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9wcm94eUlkZW50aWZpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUE2QmhHLE1BQU0sT0FBTyxlQUFlO2FBQ2IsVUFBSyxHQUFHLENBQUMsQUFBSixDQUFLO0lBTXhCLFlBQVksR0FBVztRQUx2QiwwQkFBcUIsR0FBUyxTQUFTLENBQUM7UUFNdkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEMsQ0FBQzs7QUFHRixNQUFNLFdBQVcsR0FBMkIsRUFBRSxDQUFDO0FBRS9DLE1BQU0sVUFBVSxxQkFBcUIsQ0FBSSxVQUFrQjtJQUMxRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBSSxVQUFVLENBQUMsQ0FBQztJQUNsRCxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztJQUNqQyxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFzQkQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLEdBQVc7SUFDdEQsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzdCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyw2QkFBNkI7SUFDekMsWUFDaUIsS0FBUTtRQUFSLFVBQUssR0FBTCxLQUFLLENBQUc7SUFDckIsQ0FBQztDQUNMIn0=