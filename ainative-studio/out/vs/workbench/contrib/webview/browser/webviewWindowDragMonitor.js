/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Allows webviews to monitor when an element in the VS Code editor is being dragged/dropped.
 *
 * This is required since webview end up eating the drag event. VS Code needs to see this
 * event so it can handle editor element drag drop.
 */
export class WebviewWindowDragMonitor extends Disposable {
    constructor(targetWindow, getWebview) {
        super();
        const onDragStart = () => {
            getWebview()?.windowDidDragStart();
        };
        const onDragEnd = () => {
            getWebview()?.windowDidDragEnd();
        };
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG_START, () => {
            onDragStart();
        }));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG_END, onDragEnd));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.MOUSE_MOVE, currentEvent => {
            if (currentEvent.buttons === 0) {
                onDragEnd();
            }
        }));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG, (event) => {
            if (event.shiftKey) {
                onDragEnd();
            }
            else {
                onDragStart();
            }
        }));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG_OVER, (event) => {
            if (event.shiftKey) {
                onDragEnd();
            }
            else {
                onDragStart();
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1dpbmRvd0RyYWdNb25pdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci93ZWJ2aWV3V2luZG93RHJhZ01vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHbEU7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQUN2RCxZQUFZLFlBQXdCLEVBQUUsVUFBc0M7UUFDM0UsS0FBSyxFQUFFLENBQUM7UUFFUixNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUU7WUFDeEIsVUFBVSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztRQUNwQyxDQUFDLENBQUM7UUFFRixNQUFNLFNBQVMsR0FBRyxHQUFHLEVBQUU7WUFDdEIsVUFBVSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQ3JGLFdBQVcsRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRTNGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsRUFBRTtZQUMvRixJQUFJLFlBQVksQ0FBQyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLFNBQVMsRUFBRSxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNwRixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDcEIsU0FBUyxFQUFFLENBQUM7WUFDYixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsV0FBVyxFQUFFLENBQUM7WUFDZixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3pGLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNwQixTQUFTLEVBQUUsQ0FBQztZQUNiLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLEVBQUUsQ0FBQztZQUNmLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUNEIn0=