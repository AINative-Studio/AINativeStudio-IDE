/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TestClipboardService {
    constructor() {
        this.text = undefined;
        this.findText = undefined;
        this.resources = undefined;
    }
    readImage() {
        throw new Error('Method not implemented.');
    }
    async writeText(text, type) {
        this.text = text;
    }
    async readText(type) {
        return this.text ?? '';
    }
    async readFindText() {
        return this.findText ?? '';
    }
    async writeFindText(text) {
        this.findText = text;
    }
    async writeResources(resources) {
        this.resources = resources;
    }
    async readResources() {
        return this.resources ?? [];
    }
    async hasResources() {
        return Array.isArray(this.resources) && this.resources.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENsaXBib2FyZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jbGlwYm9hcmQvdGVzdC9jb21tb24vdGVzdENsaXBib2FyZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxPQUFPLG9CQUFvQjtJQUFqQztRQU9TLFNBQUksR0FBdUIsU0FBUyxDQUFDO1FBVXJDLGFBQVEsR0FBdUIsU0FBUyxDQUFDO1FBVXpDLGNBQVMsR0FBc0IsU0FBUyxDQUFDO0lBYWxELENBQUM7SUF2Q0EsU0FBUztRQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBTUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFZLEVBQUUsSUFBYTtRQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFhO1FBQzNCLE9BQU8sSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUlELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWTtRQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN0QixDQUFDO0lBSUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFnQjtRQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNEIn0=