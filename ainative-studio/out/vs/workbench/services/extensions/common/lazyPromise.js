/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationError, onUnexpectedError } from '../../../../base/common/errors.js';
export class LazyPromise {
    constructor() {
        this._actual = null;
        this._actualOk = null;
        this._actualErr = null;
        this._hasValue = false;
        this._value = null;
        this._hasErr = false;
        this._err = null;
    }
    get [Symbol.toStringTag]() {
        return this.toString();
    }
    _ensureActual() {
        if (!this._actual) {
            this._actual = new Promise((c, e) => {
                this._actualOk = c;
                this._actualErr = e;
                if (this._hasValue) {
                    this._actualOk(this._value);
                }
                if (this._hasErr) {
                    this._actualErr(this._err);
                }
            });
        }
        return this._actual;
    }
    resolveOk(value) {
        if (this._hasValue || this._hasErr) {
            return;
        }
        this._hasValue = true;
        this._value = value;
        if (this._actual) {
            this._actualOk(value);
        }
    }
    resolveErr(err) {
        if (this._hasValue || this._hasErr) {
            return;
        }
        this._hasErr = true;
        this._err = err;
        if (this._actual) {
            this._actualErr(err);
        }
        else {
            // If nobody's listening at this point, it is safe to assume they never will,
            // since resolving this promise is always "async"
            onUnexpectedError(err);
        }
    }
    then(success, error) {
        return this._ensureActual().then(success, error);
    }
    catch(error) {
        return this._ensureActual().then(undefined, error);
    }
    finally(callback) {
        return this._ensureActual().finally(callback);
    }
}
export class CanceledLazyPromise extends LazyPromise {
    constructor() {
        super();
        this._hasErr = true;
        this._err = new CancellationError();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eVByb21pc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2xhenlQcm9taXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXpGLE1BQU0sT0FBTyxXQUFXO0lBWXZCO1FBQ0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFTyxhQUFhO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUVwQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdCLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFTSxTQUFTLENBQUMsS0FBVTtRQUMxQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLFNBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVNLFVBQVUsQ0FBQyxHQUFRO1FBQ3pCLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUVoQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsVUFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7YUFBTSxDQUFDO1lBQ1AsNkVBQTZFO1lBQzdFLGlEQUFpRDtZQUNqRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFZLEVBQUUsS0FBVTtRQUNuQyxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFTSxLQUFLLENBQUMsS0FBVTtRQUN0QixPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTSxPQUFPLENBQUMsUUFBb0I7UUFDbEMsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxXQUFXO0lBQ25EO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0NBQ0QifQ==