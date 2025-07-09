/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export const staticObservableValue = (value) => ({
    onDidChange: Event.None,
    value,
});
export class MutableObservableValue extends Disposable {
    get value() {
        return this._value;
    }
    set value(v) {
        if (v !== this._value) {
            this._value = v;
            this.changeEmitter.fire(v);
        }
    }
    static stored(stored, defaultValue) {
        const o = new MutableObservableValue(stored.get(defaultValue));
        o._register(stored);
        o._register(o.onDidChange(value => stored.store(value)));
        return o;
    }
    constructor(_value) {
        super();
        this._value = _value;
        this.changeEmitter = this._register(new Emitter());
        this.onDidChange = this.changeEmitter.event;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVZhbHVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL29ic2VydmFibGVWYWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQVFsRSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxDQUFJLEtBQVEsRUFBdUIsRUFBRSxDQUFDLENBQUM7SUFDM0UsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO0lBQ3ZCLEtBQUs7Q0FDTCxDQUFDLENBQUM7QUFFSCxNQUFNLE9BQU8sc0JBQTBCLFNBQVEsVUFBVTtJQUt4RCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELElBQVcsS0FBSyxDQUFDLENBQUk7UUFDcEIsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FBSSxNQUFzQixFQUFFLFlBQWU7UUFDOUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDL0QsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFFRCxZQUFvQixNQUFTO1FBQzVCLEtBQUssRUFBRSxDQUFDO1FBRFcsV0FBTSxHQUFOLE1BQU0sQ0FBRztRQXRCWixrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUssQ0FBQyxDQUFDO1FBRWxELGdCQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7SUFzQnZELENBQUM7Q0FDRCJ9