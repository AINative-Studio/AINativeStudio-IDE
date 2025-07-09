/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IInteractiveDocumentService = createDecorator('IInteractiveDocumentService');
export class InteractiveDocumentService extends Disposable {
    constructor() {
        super();
        this._onWillAddInteractiveDocument = this._register(new Emitter());
        this.onWillAddInteractiveDocument = this._onWillAddInteractiveDocument.event;
        this._onWillRemoveInteractiveDocument = this._register(new Emitter());
        this.onWillRemoveInteractiveDocument = this._onWillRemoveInteractiveDocument.event;
    }
    willCreateInteractiveDocument(notebookUri, inputUri, languageId) {
        this._onWillAddInteractiveDocument.fire({
            notebookUri,
            inputUri,
            languageId
        });
    }
    willRemoveInteractiveDocument(notebookUri, inputUri) {
        this._onWillRemoveInteractiveDocument.fire({
            notebookUri,
            inputUri
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVEb2N1bWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW50ZXJhY3RpdmUvYnJvd3Nlci9pbnRlcmFjdGl2ZURvY3VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQThCLDZCQUE2QixDQUFDLENBQUM7QUFVdkgsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQVU7SUFPekQ7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQU5RLGtDQUE2QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTJELENBQUMsQ0FBQztRQUN4SSxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDO1FBQ3ZELHFDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXVDLENBQUMsQ0FBQztRQUN2SCxvQ0FBK0IsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDO0lBSTlFLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxXQUFnQixFQUFFLFFBQWEsRUFBRSxVQUFrQjtRQUNoRixJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLFdBQVc7WUFDWCxRQUFRO1lBQ1IsVUFBVTtTQUNWLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxXQUFnQixFQUFFLFFBQWE7UUFDNUQsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQztZQUMxQyxXQUFXO1lBQ1gsUUFBUTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9