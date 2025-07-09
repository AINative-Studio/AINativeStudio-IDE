/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Lazy {
    constructor(executor) {
        this.executor = executor;
        this._didRun = false;
    }
    /**
     * True if the lazy value has been resolved.
     */
    get hasValue() { return this._didRun; }
    /**
     * Get the wrapped value.
     *
     * This will force evaluation of the lazy value if it has not been resolved yet. Lazy values are only
     * resolved once. `getValue` will re-throw exceptions that are hit while resolving the value
     */
    get value() {
        if (!this._didRun) {
            try {
                this._value = this.executor();
            }
            catch (err) {
                this._error = err;
            }
            finally {
                this._didRun = true;
            }
        }
        if (this._error) {
            throw this._error;
        }
        return this._value;
    }
    /**
     * Get the wrapped value without forcing evaluation.
     */
    get rawValue() { return this._value; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9sYXp5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sT0FBTyxJQUFJO0lBTWhCLFlBQ2tCLFFBQWlCO1FBQWpCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFMM0IsWUFBTyxHQUFZLEtBQUssQ0FBQztJQU03QixDQUFDO0lBRUw7O09BRUc7SUFDSCxJQUFJLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXZDOzs7OztPQUtHO0lBQ0gsSUFBSSxLQUFLO1FBQ1IsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0IsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDbkIsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ25CLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFPLENBQUM7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxRQUFRLEtBQW9CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Q0FDckQifQ==