/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ServiceCollection {
    constructor(...entries) {
        this._entries = new Map();
        for (const [id, service] of entries) {
            this.set(id, service);
        }
    }
    set(id, instanceOrDescriptor) {
        const result = this._entries.get(id);
        this._entries.set(id, instanceOrDescriptor);
        return result;
    }
    has(id) {
        return this._entries.has(id);
    }
    get(id) {
        return this._entries.get(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZUNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi9jb21tb24vc2VydmljZUNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxPQUFPLGlCQUFpQjtJQUk3QixZQUFZLEdBQUcsT0FBd0M7UUFGL0MsYUFBUSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1FBR3pELEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELEdBQUcsQ0FBSSxFQUF3QixFQUFFLG9CQUEyQztRQUMzRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUM1QyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxHQUFHLENBQUMsRUFBMEI7UUFDN0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsR0FBRyxDQUFJLEVBQXdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNEIn0=