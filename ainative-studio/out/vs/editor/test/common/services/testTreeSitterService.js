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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL3Rlc3RUcmVlU2l0dGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJekQsTUFBTSxPQUFPLDJCQUEyQjtJQUF4QztRQWFDLG9CQUFlLEdBQTJCLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDckQscUJBQWdCLEdBQXFELEtBQUssQ0FBQyxJQUFJLENBQUM7SUFZakYsQ0FBQztJQXpCQSxXQUFXLENBQUMsVUFBa0I7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxXQUFXLENBQUMsT0FBZSxFQUFFLFVBQWtCO1FBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEtBQWlCLEVBQUUsZ0JBQTBCO1FBQ3pFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLE9BQWUsRUFBRSxVQUFrQjtRQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUlELGlCQUFpQixDQUFDLFVBQWtCO1FBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsZUFBZSxDQUFDLFVBQWtCO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsY0FBYyxDQUFDLFNBQXFCO1FBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBRUQifQ==