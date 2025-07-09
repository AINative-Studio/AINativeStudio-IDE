/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ValidationState;
(function (ValidationState) {
    ValidationState[ValidationState["OK"] = 0] = "OK";
    ValidationState[ValidationState["Info"] = 1] = "Info";
    ValidationState[ValidationState["Warning"] = 2] = "Warning";
    ValidationState[ValidationState["Error"] = 3] = "Error";
    ValidationState[ValidationState["Fatal"] = 4] = "Fatal";
})(ValidationState || (ValidationState = {}));
export class ValidationStatus {
    constructor() {
        this._state = 0 /* ValidationState.OK */;
    }
    get state() {
        return this._state;
    }
    set state(value) {
        if (value > this._state) {
            this._state = value;
        }
    }
    isOK() {
        return this._state === 0 /* ValidationState.OK */;
    }
    isFatal() {
        return this._state === 4 /* ValidationState.Fatal */;
    }
}
export class Parser {
    constructor(problemReporter) {
        this._problemReporter = problemReporter;
    }
    reset() {
        this._problemReporter.status.state = 0 /* ValidationState.OK */;
    }
    get problemReporter() {
        return this._problemReporter;
    }
    info(message) {
        this._problemReporter.info(message);
    }
    warn(message) {
        this._problemReporter.warn(message);
    }
    error(message) {
        this._problemReporter.error(message);
    }
    fatal(message) {
        this._problemReporter.fatal(message);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wYXJzZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFrQixlQU1qQjtBQU5ELFdBQWtCLGVBQWU7SUFDaEMsaURBQU0sQ0FBQTtJQUNOLHFEQUFRLENBQUE7SUFDUiwyREFBVyxDQUFBO0lBQ1gsdURBQVMsQ0FBQTtJQUNULHVEQUFTLENBQUE7QUFDVixDQUFDLEVBTmlCLGVBQWUsS0FBZixlQUFlLFFBTWhDO0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQUc1QjtRQUNDLElBQUksQ0FBQyxNQUFNLDZCQUFxQixDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELElBQVcsS0FBSyxDQUFDLEtBQXNCO1FBQ3RDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNyQixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLElBQUksQ0FBQyxNQUFNLCtCQUF1QixDQUFDO0lBQzNDLENBQUM7SUFFTSxPQUFPO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxrQ0FBMEIsQ0FBQztJQUM5QyxDQUFDO0NBQ0Q7QUFVRCxNQUFNLE9BQWdCLE1BQU07SUFJM0IsWUFBWSxlQUFpQztRQUM1QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLDZCQUFxQixDQUFDO0lBQ3pELENBQUM7SUFFRCxJQUFXLGVBQWU7UUFDekIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7SUFDOUIsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLEtBQUssQ0FBQyxPQUFlO1FBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVNLEtBQUssQ0FBQyxPQUFlO1FBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNEIn0=