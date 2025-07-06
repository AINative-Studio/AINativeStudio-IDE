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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lVHJlZVNpdHRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBSXREOzs7R0FHRztBQUNILE1BQU0sT0FBTyxpQ0FBaUM7SUFBOUM7UUFhQyxvQkFBZSxHQUEyQixLQUFLLENBQUMsSUFBSSxDQUFDO1FBRXJELHFCQUFnQixHQUFxRCxLQUFLLENBQUMsSUFBSSxDQUFDO0lBUWpGLENBQUM7SUF0QkEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFrQjtRQUNuQyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsV0FBVyxDQUFDLE9BQWUsRUFBRSxVQUFrQjtRQUM5QyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEtBQWlCLEVBQUUsZ0JBQTBCO1FBQ3pFLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQWUsRUFBRSxVQUFrQjtRQUNoRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBS0QsaUJBQWlCLENBQUMsV0FBbUI7UUFDcEMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELGNBQWMsQ0FBQyxTQUFxQjtRQUNuQyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0NBQ0QifQ==