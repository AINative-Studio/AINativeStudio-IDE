/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class KeyboardLayoutContribution {
    static { this.INSTANCE = new KeyboardLayoutContribution(); }
    get layoutInfos() {
        return this._layoutInfos;
    }
    constructor() {
        this._layoutInfos = [];
    }
    registerKeyboardLayout(layout) {
        this._layoutInfos.push(layout);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiXy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvYnJvd3Nlci9rZXlib2FyZExheW91dHMvXy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxPQUFPLDBCQUEwQjthQUNmLGFBQVEsR0FBK0IsSUFBSSwwQkFBMEIsRUFBRSxBQUEvRCxDQUFnRTtJQUkvRixJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVEO1FBTlEsaUJBQVksR0FBa0IsRUFBRSxDQUFDO0lBT3pDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxNQUFtQjtRQUN6QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoQyxDQUFDIn0=