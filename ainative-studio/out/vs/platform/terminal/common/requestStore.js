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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../log/common/log.js';
/**
 * A helper class to track requests that have replies. Using this it's easy to implement an event
 * that accepts a reply.
 */
let RequestStore = class RequestStore extends Disposable {
    /**
     * @param timeout How long in ms to allow requests to go unanswered for, undefined will use the
     * default (15 seconds).
     */
    constructor(timeout, _logService) {
        super();
        this._logService = _logService;
        this._lastRequestId = 0;
        this._pendingRequests = new Map();
        this._pendingRequestDisposables = new Map();
        this._onCreateRequest = this._register(new Emitter());
        this.onCreateRequest = this._onCreateRequest.event;
        this._timeout = timeout === undefined ? 15000 : timeout;
        this._register(toDisposable(() => {
            for (const d of this._pendingRequestDisposables.values()) {
                dispose(d);
            }
        }));
    }
    /**
     * Creates a request.
     * @param args The arguments to pass to the onCreateRequest event.
     */
    createRequest(args) {
        return new Promise((resolve, reject) => {
            const requestId = ++this._lastRequestId;
            this._pendingRequests.set(requestId, resolve);
            this._onCreateRequest.fire({ requestId, ...args });
            const tokenSource = new CancellationTokenSource();
            timeout(this._timeout, tokenSource.token).then(() => reject(`Request ${requestId} timed out (${this._timeout}ms)`));
            this._pendingRequestDisposables.set(requestId, [toDisposable(() => tokenSource.cancel())]);
        });
    }
    /**
     * Accept a reply to a request.
     * @param requestId The request ID originating from the onCreateRequest event.
     * @param data The reply data.
     */
    acceptReply(requestId, data) {
        const resolveRequest = this._pendingRequests.get(requestId);
        if (resolveRequest) {
            this._pendingRequests.delete(requestId);
            dispose(this._pendingRequestDisposables.get(requestId) || []);
            this._pendingRequestDisposables.delete(requestId);
            resolveRequest(data);
        }
        else {
            this._logService.warn(`RequestStore#acceptReply was called without receiving a matching request ${requestId}`);
        }
    }
};
RequestStore = __decorate([
    __param(1, ILogService)
], RequestStore);
export { RequestStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFN0b3JlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9yZXF1ZXN0U3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQ7OztHQUdHO0FBQ0ksSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBNkIsU0FBUSxVQUFVO0lBUzNEOzs7T0FHRztJQUNILFlBQ0MsT0FBMkIsRUFDZCxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQztRQUZzQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQWQvQyxtQkFBYyxHQUFHLENBQUMsQ0FBQztRQUVuQixxQkFBZ0IsR0FBdUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNqRSwrQkFBMEIsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUUxRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF1QyxDQUFDLENBQUM7UUFDOUYsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBV3RELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDeEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2hDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQzFELE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNaLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7T0FHRztJQUNILGFBQWEsQ0FBQyxJQUFpQjtRQUM5QixPQUFPLElBQUksT0FBTyxDQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLE1BQU0sU0FBUyxHQUFHLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQztZQUN4QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNuRCxNQUFNLFdBQVcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxTQUFTLGVBQWUsSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNwSCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUYsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFdBQVcsQ0FBQyxTQUFpQixFQUFFLElBQU87UUFDckMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEMsT0FBTyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDOUQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsRCxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw0RUFBNEUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNoSCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6RFksWUFBWTtJQWV0QixXQUFBLFdBQVcsQ0FBQTtHQWZELFlBQVksQ0F5RHhCIn0=