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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRQcm9ncmVzc1R5cGVzL2NoYXRUb29sSW52b2NhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBSWpELE1BQU0sT0FBTyxrQkFBa0I7SUFJOUIsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBR0QsSUFBVyxpQkFBaUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFHRCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7SUFDOUIsQ0FBQztJQUdELElBQVcsV0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUdELElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQVVELFlBQVksa0JBQXVELEVBQUUsUUFBbUIsRUFBa0IsVUFBa0I7UUFBbEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQW5DNUcsU0FBSSxHQUFxQixnQkFBZ0IsQ0FBQztRQUVsRCxnQkFBVyxHQUFHLEtBQUssQ0FBQztRQUtwQix3QkFBbUIsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO1FBS2xELHFCQUFnQixHQUFHLElBQUksZUFBZSxFQUFXLENBQUM7UUF3QnpELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxRQUFRLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUNuRyxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixFQUFFLGlCQUFpQixJQUFJLGNBQWMsQ0FBQztRQUNsRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDO1FBQzdELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztRQUN0RSxJQUFJLENBQUMsWUFBWSxHQUFHLGtCQUFrQixFQUFFLFlBQVksQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUM7UUFDN0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBRTFCLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNqQyx5QkFBeUI7WUFDekIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7WUFDekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDeEMsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7WUFDOUIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxRQUFRLENBQUMsTUFBK0I7UUFDOUMsSUFBSSxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQztRQUNoRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELElBQVcsb0JBQW9CO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDO0lBQ25DLENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTztZQUNOLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDekMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUN2QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDOUIsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzVCLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNsQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1lBQ3ZDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtTQUMzQixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=