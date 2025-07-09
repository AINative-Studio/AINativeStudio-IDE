/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LocalProcessRunningLocation {
    constructor(affinity) {
        this.affinity = affinity;
        this.kind = 1 /* ExtensionHostKind.LocalProcess */;
    }
    equals(other) {
        return (this.kind === other.kind && this.affinity === other.affinity);
    }
    asString() {
        if (this.affinity === 0) {
            return 'LocalProcess';
        }
        return `LocalProcess${this.affinity}`;
    }
}
export class LocalWebWorkerRunningLocation {
    constructor(affinity) {
        this.affinity = affinity;
        this.kind = 2 /* ExtensionHostKind.LocalWebWorker */;
    }
    equals(other) {
        return (this.kind === other.kind && this.affinity === other.affinity);
    }
    asString() {
        if (this.affinity === 0) {
            return 'LocalWebWorker';
        }
        return `LocalWebWorker${this.affinity}`;
    }
}
export class RemoteRunningLocation {
    constructor() {
        this.kind = 3 /* ExtensionHostKind.Remote */;
        this.affinity = 0;
    }
    equals(other) {
        return (this.kind === other.kind);
    }
    asString() {
        return 'Remote';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUnVubmluZ0xvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25SdW5uaW5nTG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxPQUFPLDJCQUEyQjtJQUV2QyxZQUNpQixRQUFnQjtRQUFoQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBRmpCLFNBQUksMENBQWtDO0lBR2xELENBQUM7SUFDRSxNQUFNLENBQUMsS0FBK0I7UUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBQ00sUUFBUTtRQUNkLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLGNBQWMsQ0FBQztRQUN2QixDQUFDO1FBQ0QsT0FBTyxlQUFlLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNkJBQTZCO0lBRXpDLFlBQ2lCLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFGakIsU0FBSSw0Q0FBb0M7SUFHcEQsQ0FBQztJQUNFLE1BQU0sQ0FBQyxLQUErQjtRQUM1QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFDTSxRQUFRO1FBQ2QsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sZ0JBQWdCLENBQUM7UUFDekIsQ0FBQztRQUNELE9BQU8saUJBQWlCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8scUJBQXFCO0lBQWxDO1FBQ2lCLFNBQUksb0NBQTRCO1FBQ2hDLGFBQVEsR0FBRyxDQUFDLENBQUM7SUFPOUIsQ0FBQztJQU5PLE1BQU0sQ0FBQyxLQUErQjtRQUM1QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUNNLFFBQVE7UUFDZCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0NBQ0QifQ==