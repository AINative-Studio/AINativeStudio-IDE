/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
export class TestTreeSitterParserService {
    constructor() {
        this.onDidUpdateTree = Event.None;
        this.onDidAddLanguage = Event.None;
    }
    getLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    getTreeSync(content, languageId) {
        throw new Error('Method not implemented.');
    }
    async getTextModelTreeSitter(model, parseImmediately) {
        throw new Error('Method not implemented.');
    }
    getTree(content, languageId) {
        throw new Error('Method not implemented.');
    }
    getOrInitLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    waitForLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    getParseResult(textModel) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy90ZXN0VHJlZVNpdHRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSXpELE1BQU0sT0FBTywyQkFBMkI7SUFBeEM7UUFhQyxvQkFBZSxHQUEyQixLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3JELHFCQUFnQixHQUFxRCxLQUFLLENBQUMsSUFBSSxDQUFDO0lBWWpGLENBQUM7SUF6QkEsV0FBVyxDQUFDLFVBQWtCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsV0FBVyxDQUFDLE9BQWUsRUFBRSxVQUFrQjtRQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLGdCQUEwQjtRQUN6RSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELE9BQU8sQ0FBQyxPQUFlLEVBQUUsVUFBa0I7UUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFJRCxpQkFBaUIsQ0FBQyxVQUFrQjtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELGVBQWUsQ0FBQyxVQUFrQjtRQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELGNBQWMsQ0FBQyxTQUFxQjtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUVEIn0=