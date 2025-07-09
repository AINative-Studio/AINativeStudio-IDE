/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
/**
 * The monaco build doesn't like the dynamic import of tree sitter in the real service.
 * We use a dummy service here to make the build happy.
 */
export class StandaloneTreeSitterParserService {
    constructor() {
        this.onDidUpdateTree = Event.None;
        this.onDidAddLanguage = Event.None;
    }
    async getLanguage(languageId) {
        return undefined;
    }
    getTreeSync(content, languageId) {
        return undefined;
    }
    async getTextModelTreeSitter(model, parseImmediately) {
        return undefined;
    }
    async getTree(content, languageId) {
        return undefined;
    }
    getOrInitLanguage(_languageId) {
        return undefined;
    }
    getParseResult(textModel) {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZVRyZWVTaXR0ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUl0RDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUNBQWlDO0lBQTlDO1FBYUMsb0JBQWUsR0FBMkIsS0FBSyxDQUFDLElBQUksQ0FBQztRQUVyRCxxQkFBZ0IsR0FBcUQsS0FBSyxDQUFDLElBQUksQ0FBQztJQVFqRixDQUFDO0lBdEJBLEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBa0I7UUFDbkMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELFdBQVcsQ0FBQyxPQUFlLEVBQUUsVUFBa0I7UUFDOUMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLGdCQUEwQjtRQUN6RSxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFlLEVBQUUsVUFBa0I7UUFDaEQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUtELGlCQUFpQixDQUFDLFdBQW1CO1FBQ3BDLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxjQUFjLENBQUMsU0FBcUI7UUFDbkMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEIn0=