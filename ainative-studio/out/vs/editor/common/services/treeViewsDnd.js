/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TreeViewsDnDService {
    constructor() {
        this._dragOperations = new Map();
    }
    removeDragOperationTransfer(uuid) {
        if ((uuid && this._dragOperations.has(uuid))) {
            const operation = this._dragOperations.get(uuid);
            this._dragOperations.delete(uuid);
            return operation;
        }
        return undefined;
    }
    addDragOperationTransfer(uuid, transferPromise) {
        this._dragOperations.set(uuid, transferPromise);
    }
}
export class DraggedTreeItemsIdentifier {
    constructor(identifier) {
        this.identifier = identifier;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVZpZXdzRG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVZpZXdzRG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFFUyxvQkFBZSxHQUF3QyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBYzFFLENBQUM7SUFaQSwyQkFBMkIsQ0FBQyxJQUF3QjtRQUNuRCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELHdCQUF3QixDQUFDLElBQVksRUFBRSxlQUF1QztRQUM3RSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNEO0FBR0QsTUFBTSxPQUFPLDBCQUEwQjtJQUV0QyxZQUFxQixVQUFrQjtRQUFsQixlQUFVLEdBQVYsVUFBVSxDQUFRO0lBQUksQ0FBQztDQUM1QyJ9