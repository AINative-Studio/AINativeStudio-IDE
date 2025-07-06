/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../base/common/async.js';
import { localize } from '../../../../../nls.js';
export class ChatToolInvocation {
    get isComplete() {
        return this._isComplete;
    }
    get isCompletePromise() {
        return this._isCompleteDeferred.p;
    }
    get confirmed() {
        return this._confirmDeferred;
    }
    get isConfirmed() {
        return this._isConfirmed;
    }
    get resultDetails() {
        return this._resultDetails;
    }
    constructor(preparedInvocation, toolData, toolCallId) {
        this.toolCallId = toolCallId;
        this.kind = 'toolInvocation';
        this._isComplete = false;
        this._isCompleteDeferred = new DeferredPromise();
        this._confirmDeferred = new DeferredPromise();
        const defaultMessage = localize('toolInvocationMessage', "Using {0}", `"${toolData.displayName}"`);
        const invocationMessage = preparedInvocation?.invocationMessage ?? defaultMessage;
        this.invocationMessage = invocationMessage;
        this.pastTenseMessage = preparedInvocation?.pastTenseMessage;
        this._confirmationMessages = preparedInvocation?.confirmationMessages;
        this.presentation = preparedInvocation?.presentation;
        this.toolSpecificData = preparedInvocation?.toolSpecificData;
        this.toolId = toolData.id;
        if (!this._confirmationMessages) {
            // No confirmation needed
            this._isConfirmed = true;
            this._confirmDeferred.complete(true);
        }
        this._confirmDeferred.p.then(confirmed => {
            this._isConfirmed = confirmed;
            this._confirmationMessages = undefined;
        });
        this._isCompleteDeferred.p.then(() => {
            this._isComplete = true;
        });
    }
    complete(result) {
        if (result?.toolResultMessage) {
            this.pastTenseMessage = result.toolResultMessage;
        }
        this._resultDetails = result?.toolResultDetails;
        this._isCompleteDeferred.complete();
    }
    get confirmationMessages() {
        return this._confirmationMessages;
    }
    toJSON() {
        return {
            kind: 'toolInvocationSerialized',
            presentation: this.presentation,
            invocationMessage: this.invocationMessage,
            pastTenseMessage: this.pastTenseMessage,
            isConfirmed: this._isConfirmed,
            isComplete: this._isComplete,
            resultDetails: this._resultDetails,
            toolSpecificData: this.toolSpecificData,
            toolCallId: this.toolCallId,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFByb2dyZXNzVHlwZXMvY2hhdFRvb2xJbnZvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFJakQsTUFBTSxPQUFPLGtCQUFrQjtJQUk5QixJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFHRCxJQUFXLGlCQUFpQjtRQUMzQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUdELElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUM5QixDQUFDO0lBR0QsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBR0QsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM1QixDQUFDO0lBVUQsWUFBWSxrQkFBdUQsRUFBRSxRQUFtQixFQUFrQixVQUFrQjtRQUFsQixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBbkM1RyxTQUFJLEdBQXFCLGdCQUFnQixDQUFDO1FBRWxELGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBS3BCLHdCQUFtQixHQUFHLElBQUksZUFBZSxFQUFRLENBQUM7UUFLbEQscUJBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQVcsQ0FBQztRQXdCekQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ25HLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLEVBQUUsaUJBQWlCLElBQUksY0FBYyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQztRQUMzQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUM7UUFDN0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDO1FBQ3RFLElBQUksQ0FBQyxZQUFZLEdBQUcsa0JBQWtCLEVBQUUsWUFBWSxDQUFDO1FBQ3JELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQztRQUM3RCxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFFMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2pDLHlCQUF5QjtZQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztZQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQztZQUM5QixJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUErQjtRQUM5QyxJQUFJLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUM7UUFDbEQsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxFQUFFLGlCQUFpQixDQUFDO1FBQ2hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBVyxvQkFBb0I7UUFDOUIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUM7SUFDbkMsQ0FBQztJQUVNLE1BQU07UUFDWixPQUFPO1lBQ04sSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1lBQ3ZDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUM5QixVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDNUIsYUFBYSxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ2xDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDdkMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1NBQzNCLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==