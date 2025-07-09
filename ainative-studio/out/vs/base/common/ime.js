/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
export class IMEImpl {
    constructor() {
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._enabled = true;
    }
    get enabled() {
        return this._enabled;
    }
    /**
     * Enable IME
     */
    enable() {
        this._enabled = true;
        this._onDidChange.fire();
    }
    /**
     * Disable IME
     */
    disable() {
        this._enabled = false;
        this._onDidChange.fire();
    }
}
export const IME = new IMEImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2ltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJDLE1BQU0sT0FBTyxPQUFPO0lBQXBCO1FBRWtCLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNwQyxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBRTlDLGFBQVEsR0FBRyxJQUFJLENBQUM7SUFxQnpCLENBQUM7SUFuQkEsSUFBVyxPQUFPO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNO1FBQ1osSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQ7O09BRUc7SUFDSSxPQUFPO1FBQ2IsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQyJ9