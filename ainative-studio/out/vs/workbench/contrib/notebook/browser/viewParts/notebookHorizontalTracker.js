/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, EventType, getWindow } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { isChrome, isMacintosh } from '../../../../../base/common/platform.js';
export class NotebookHorizontalTracker extends Disposable {
    constructor(_notebookEditor, _listViewScrollablement) {
        super();
        this._notebookEditor = _notebookEditor;
        this._listViewScrollablement = _listViewScrollablement;
        this._register(addDisposableListener(this._listViewScrollablement, EventType.MOUSE_WHEEL, (event) => {
            let deltaX = event.deltaX;
            let deltaY = event.deltaY;
            let wheelDeltaX = event.wheelDeltaX;
            let wheelDeltaY = event.wheelDeltaY;
            const wheelDelta = event.wheelDelta;
            const shiftConvert = !isMacintosh && event.shiftKey;
            if (shiftConvert && !deltaX) {
                deltaX = deltaY;
                deltaY = 0;
                wheelDeltaX = wheelDeltaY;
                wheelDeltaY = 0;
            }
            if (deltaX === 0) {
                return;
            }
            const hoveringOnEditor = this._notebookEditor.codeEditors.find(editor => {
                const editorLayout = editor[1].getLayoutInfo();
                if (editorLayout.contentWidth === editorLayout.width) {
                    // no overflow
                    return false;
                }
                const editorDOM = editor[1].getDomNode();
                if (editorDOM && editorDOM.contains(event.target)) {
                    return true;
                }
                return false;
            });
            if (!hoveringOnEditor) {
                return;
            }
            const targetWindow = getWindow(event);
            const evt = {
                deltaMode: event.deltaMode,
                deltaX: deltaX,
                deltaY: 0,
                deltaZ: 0,
                wheelDelta: wheelDelta && isChrome ? (wheelDelta / targetWindow.devicePixelRatio) : wheelDelta,
                wheelDeltaX: wheelDeltaX && isChrome ? (wheelDeltaX / targetWindow.devicePixelRatio) : wheelDeltaX,
                wheelDeltaY: 0,
                detail: event.detail,
                shiftKey: event.shiftKey,
                type: event.type,
                defaultPrevented: false,
                preventDefault: () => { },
                stopPropagation: () => { }
            };
            hoveringOnEditor[1].delegateScrollFromMouseWheelEvent(evt);
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tIb3Jpem9udGFsVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0hvcml6b250YWxUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFJL0UsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFDeEQsWUFDa0IsZUFBd0MsRUFDeEMsdUJBQW9DO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSFMsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQ3hDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBYTtRQUlyRCxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBdUIsRUFBRSxFQUFFO1lBQ3JILElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDMUIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUMxQixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO1lBQ3BDLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7WUFDcEMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztZQUVwQyxNQUFNLFlBQVksR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQ3BELElBQUksWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sR0FBRyxNQUFNLENBQUM7Z0JBQ2hCLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQ1gsV0FBVyxHQUFHLFdBQVcsQ0FBQztnQkFDMUIsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUNqQixDQUFDO1lBRUQsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZFLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxZQUFZLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDdEQsY0FBYztvQkFDZCxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBcUIsQ0FBQyxFQUFFLENBQUM7b0JBQ2xFLE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUM7Z0JBRUQsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2QixPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QyxNQUFNLEdBQUcsR0FBRztnQkFDWCxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7Z0JBQzFCLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE1BQU0sRUFBRSxDQUFDO2dCQUNULE1BQU0sRUFBRSxDQUFDO2dCQUNULFVBQVUsRUFBRSxVQUFVLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtnQkFDOUYsV0FBVyxFQUFFLFdBQVcsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXO2dCQUNsRyxXQUFXLEVBQUUsQ0FBQztnQkFDZCxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ3BCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtnQkFDeEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUNoQixnQkFBZ0IsRUFBRSxLQUFLO2dCQUN2QixjQUFjLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDekIsZUFBZSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7YUFDMUIsQ0FBQztZQUVELGdCQUFnQixDQUFDLENBQUMsQ0FBc0IsQ0FBQyxpQ0FBaUMsQ0FBQyxHQUFVLENBQUMsQ0FBQztRQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEIn0=