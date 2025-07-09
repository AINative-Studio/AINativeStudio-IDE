/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class McpDiscoveryRegistry {
    constructor() {
        this._discovery = [];
    }
    register(discovery) {
        this._discovery.push(discovery);
    }
    getAll() {
        return this._discovery;
    }
}
export const mcpDiscoveryRegistry = new McpDiscoveryRegistry();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L21jcERpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxNQUFNLG9CQUFvQjtJQUExQjtRQUNrQixlQUFVLEdBQXFDLEVBQUUsQ0FBQztJQVNwRSxDQUFDO0lBUEEsUUFBUSxDQUFDLFNBQXlDO1FBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQyJ9