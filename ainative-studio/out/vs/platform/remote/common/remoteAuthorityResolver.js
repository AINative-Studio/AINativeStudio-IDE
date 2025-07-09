/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IRemoteAuthorityResolverService = createDecorator('remoteAuthorityResolverService');
export var RemoteConnectionType;
(function (RemoteConnectionType) {
    RemoteConnectionType[RemoteConnectionType["WebSocket"] = 0] = "WebSocket";
    RemoteConnectionType[RemoteConnectionType["Managed"] = 1] = "Managed";
})(RemoteConnectionType || (RemoteConnectionType = {}));
export class ManagedRemoteConnection {
    constructor(id) {
        this.id = id;
        this.type = 1 /* RemoteConnectionType.Managed */;
    }
    toString() {
        return `Managed(${this.id})`;
    }
}
export class WebSocketRemoteConnection {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.type = 0 /* RemoteConnectionType.WebSocket */;
    }
    toString() {
        return `WebSocket(${this.host}:${this.port})`;
    }
}
export var RemoteAuthorityResolverErrorCode;
(function (RemoteAuthorityResolverErrorCode) {
    RemoteAuthorityResolverErrorCode["Unknown"] = "Unknown";
    RemoteAuthorityResolverErrorCode["NotAvailable"] = "NotAvailable";
    RemoteAuthorityResolverErrorCode["TemporarilyNotAvailable"] = "TemporarilyNotAvailable";
    RemoteAuthorityResolverErrorCode["NoResolverFound"] = "NoResolverFound";
    RemoteAuthorityResolverErrorCode["InvalidAuthority"] = "InvalidAuthority";
})(RemoteAuthorityResolverErrorCode || (RemoteAuthorityResolverErrorCode = {}));
export class RemoteAuthorityResolverError extends ErrorNoTelemetry {
    static isNotAvailable(err) {
        return (err instanceof RemoteAuthorityResolverError) && err._code === RemoteAuthorityResolverErrorCode.NotAvailable;
    }
    static isTemporarilyNotAvailable(err) {
        return (err instanceof RemoteAuthorityResolverError) && err._code === RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable;
    }
    static isNoResolverFound(err) {
        return (err instanceof RemoteAuthorityResolverError) && err._code === RemoteAuthorityResolverErrorCode.NoResolverFound;
    }
    static isInvalidAuthority(err) {
        return (err instanceof RemoteAuthorityResolverError) && err._code === RemoteAuthorityResolverErrorCode.InvalidAuthority;
    }
    static isHandled(err) {
        return (err instanceof RemoteAuthorityResolverError) && err.isHandled;
    }
    constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
        super(message);
        this._message = message;
        this._code = code;
        this._detail = detail;
        this.isHandled = (code === RemoteAuthorityResolverErrorCode.NotAvailable) && detail === true;
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, RemoteAuthorityResolverError.prototype);
    }
}
export function getRemoteAuthorityPrefix(remoteAuthority) {
    const plusIndex = remoteAuthority.indexOf('+');
    if (plusIndex === -1) {
        return remoteAuthority;
    }
    return remoteAuthority.substring(0, plusIndex);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2NvbW1vbi9yZW1vdGVBdXRob3JpdHlSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsZUFBZSxDQUFrQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRWxJLE1BQU0sQ0FBTixJQUFrQixvQkFHakI7QUFIRCxXQUFrQixvQkFBb0I7SUFDckMseUVBQVMsQ0FBQTtJQUNULHFFQUFPLENBQUE7QUFDUixDQUFDLEVBSGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFHckM7QUFFRCxNQUFNLE9BQU8sdUJBQXVCO0lBR25DLFlBQ2lCLEVBQVU7UUFBVixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBSFgsU0FBSSx3Q0FBZ0M7SUFJaEQsQ0FBQztJQUVFLFFBQVE7UUFDZCxPQUFPLFdBQVcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDO0lBQzlCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFHckMsWUFDaUIsSUFBWSxFQUNaLElBQVk7UUFEWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUpiLFNBQUksMENBQWtDO0lBS2xELENBQUM7SUFFRSxRQUFRO1FBQ2QsT0FBTyxhQUFhLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDO0lBQy9DLENBQUM7Q0FDRDtBQWtERCxNQUFNLENBQU4sSUFBWSxnQ0FNWDtBQU5ELFdBQVksZ0NBQWdDO0lBQzNDLHVEQUFtQixDQUFBO0lBQ25CLGlFQUE2QixDQUFBO0lBQzdCLHVGQUFtRCxDQUFBO0lBQ25ELHVFQUFtQyxDQUFBO0lBQ25DLHlFQUFxQyxDQUFBO0FBQ3RDLENBQUMsRUFOVyxnQ0FBZ0MsS0FBaEMsZ0NBQWdDLFFBTTNDO0FBRUQsTUFBTSxPQUFPLDRCQUE2QixTQUFRLGdCQUFnQjtJQUUxRCxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQVE7UUFDcEMsT0FBTyxDQUFDLEdBQUcsWUFBWSw0QkFBNEIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssZ0NBQWdDLENBQUMsWUFBWSxDQUFDO0lBQ3JILENBQUM7SUFFTSxNQUFNLENBQUMseUJBQXlCLENBQUMsR0FBUTtRQUMvQyxPQUFPLENBQUMsR0FBRyxZQUFZLDRCQUE0QixDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxnQ0FBZ0MsQ0FBQyx1QkFBdUIsQ0FBQztJQUNoSSxDQUFDO0lBRU0sTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQVE7UUFDdkMsT0FBTyxDQUFDLEdBQUcsWUFBWSw0QkFBNEIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssZ0NBQWdDLENBQUMsZUFBZSxDQUFDO0lBQ3hILENBQUM7SUFFTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBUTtRQUN4QyxPQUFPLENBQUMsR0FBRyxZQUFZLDRCQUE0QixDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxnQ0FBZ0MsQ0FBQyxnQkFBZ0IsQ0FBQztJQUN6SCxDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFRO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLFlBQVksNEJBQTRCLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDO0lBQ3ZFLENBQUM7SUFRRCxZQUFZLE9BQWdCLEVBQUUsT0FBeUMsZ0NBQWdDLENBQUMsT0FBTyxFQUFFLE1BQVk7UUFDNUgsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWYsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFFdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksS0FBSyxnQ0FBZ0MsQ0FBQyxZQUFZLENBQUMsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDO1FBRTdGLDRFQUE0RTtRQUM1RSwrSUFBK0k7UUFDL0ksTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDckUsQ0FBQztDQUNEO0FBMEJELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxlQUF1QjtJQUMvRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9DLElBQUksU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEIsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUNELE9BQU8sZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDaEQsQ0FBQyJ9