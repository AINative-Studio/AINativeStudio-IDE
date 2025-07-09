/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
class InputModeImpl {
    constructor() {
        this._inputMode = 'insert';
        this._onDidChangeInputMode = new Emitter();
        this.onDidChangeInputMode = this._onDidChangeInputMode.event;
    }
    getInputMode() {
        return this._inputMode;
    }
    setInputMode(inputMode) {
        this._inputMode = inputMode;
        this._onDidChangeInputMode.fire(this._inputMode);
    }
}
/**
 * Controls the type mode, whether insert or overtype
 */
export const InputMode = new InputModeImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRNb2RlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vaW5wdXRNb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSw0QkFBNEIsQ0FBQztBQUU1RCxNQUFNLGFBQWE7SUFBbkI7UUFFUyxlQUFVLEdBQTBCLFFBQVEsQ0FBQztRQUNwQywwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBeUIsQ0FBQztRQUM5RCx5QkFBb0IsR0FBaUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztJQVV2RyxDQUFDO0lBUk8sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUFnQztRQUNuRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM1QixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDIn0=