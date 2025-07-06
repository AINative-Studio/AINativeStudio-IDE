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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVUcmVlU2l0dGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFJdEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlDQUFpQztJQUE5QztRQWFDLG9CQUFlLEdBQTJCLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFckQscUJBQWdCLEdBQXFELEtBQUssQ0FBQyxJQUFJLENBQUM7SUFRakYsQ0FBQztJQXRCQSxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQWtCO1FBQ25DLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxXQUFXLENBQUMsT0FBZSxFQUFFLFVBQWtCO1FBQzlDLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsS0FBaUIsRUFBRSxnQkFBMEI7UUFDekUsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBZSxFQUFFLFVBQWtCO1FBQ2hELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFLRCxpQkFBaUIsQ0FBQyxXQUFtQjtRQUNwQyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsY0FBYyxDQUFDLFNBQXFCO1FBQ25DLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7Q0FDRCJ9