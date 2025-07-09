/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ProgressLocation } from './extHostTypeConverters.js';
import { Progress } from '../../../platform/progress/common/progress.js';
import { CancellationTokenSource, CancellationToken } from '../../../base/common/cancellation.js';
import { throttle } from '../../../base/common/decorators.js';
import { onUnexpectedExternalError } from '../../../base/common/errors.js';
export class ExtHostProgress {
    constructor(proxy) {
        this._handles = 0;
        this._mapHandleToCancellationSource = new Map();
        this._proxy = proxy;
    }
    async withProgress(extension, options, task) {
        const handle = this._handles++;
        const { title, location, cancellable } = options;
        const source = { label: extension.displayName || extension.name, id: extension.identifier.value };
        this._proxy.$startProgress(handle, { location: ProgressLocation.from(location), title, source, cancellable }, !extension.isUnderDevelopment ? extension.identifier.value : undefined).catch(onUnexpectedExternalError);
        return this._withProgress(handle, task, !!cancellable);
    }
    _withProgress(handle, task, cancellable) {
        let source;
        if (cancellable) {
            source = new CancellationTokenSource();
            this._mapHandleToCancellationSource.set(handle, source);
        }
        const progressEnd = (handle) => {
            this._proxy.$progressEnd(handle);
            this._mapHandleToCancellationSource.delete(handle);
            source?.dispose();
        };
        let p;
        try {
            p = task(new ProgressCallback(this._proxy, handle), cancellable && source ? source.token : CancellationToken.None);
        }
        catch (err) {
            progressEnd(handle);
            throw err;
        }
        p.then(result => progressEnd(handle), err => progressEnd(handle));
        return p;
    }
    $acceptProgressCanceled(handle) {
        const source = this._mapHandleToCancellationSource.get(handle);
        if (source) {
            source.cancel();
            this._mapHandleToCancellationSource.delete(handle);
        }
    }
}
function mergeProgress(result, currentValue) {
    result.message = currentValue.message;
    if (typeof currentValue.increment === 'number') {
        if (typeof result.increment === 'number') {
            result.increment += currentValue.increment;
        }
        else {
            result.increment = currentValue.increment;
        }
    }
    return result;
}
class ProgressCallback extends Progress {
    constructor(_proxy, _handle) {
        super(p => this.throttledReport(p));
        this._proxy = _proxy;
        this._handle = _handle;
    }
    throttledReport(p) {
        this._proxy.$progressReport(this._handle, p);
    }
}
__decorate([
    throttle(100, (result, currentValue) => mergeProgress(result, currentValue), () => Object.create(null))
], ProgressCallback.prototype, "throttledReport", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RQcm9ncmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUloRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFpQixNQUFNLCtDQUErQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRSxNQUFNLE9BQU8sZUFBZTtJQU0zQixZQUFZLEtBQThCO1FBSGxDLGFBQVEsR0FBVyxDQUFDLENBQUM7UUFDckIsbUNBQThCLEdBQXlDLElBQUksR0FBRyxFQUFFLENBQUM7UUFHeEYsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUksU0FBZ0MsRUFBRSxPQUF3QixFQUFFLElBQWtGO1FBQ25LLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMvQixNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDakQsTUFBTSxNQUFNLEdBQUcsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxHLElBQUksQ0FB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