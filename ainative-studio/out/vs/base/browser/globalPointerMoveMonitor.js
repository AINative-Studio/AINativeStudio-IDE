/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from './dom.js';
import { DisposableStore, toDisposable } from '../common/lifecycle.js';
export class GlobalPointerMoveMonitor {
    constructor() {
        this._hooks = new DisposableStore();
        this._pointerMoveCallback = null;
        this._onStopCallback = null;
    }
    dispose() {
        this.stopMonitoring(false);
        this._hooks.dispose();
    }
    stopMonitoring(invokeStopCallback, browserEvent) {
        if (!this.isMonitoring()) {
            // Not monitoring
            return;
        }
        // Unhook
        this._hooks.clear();
        this._pointerMoveCallback = null;
        const onStopCallback = this._onStopCallback;
        this._onStopCallback = null;
        if (invokeStopCallback && onStopCallback) {
            onStopCallback(browserEvent);
        }
    }
    isMonitoring() {
        return !!this._pointerMoveCallback;
    }
    startMonitoring(initialElement, pointerId, initialButtons, pointerMoveCallback, onStopCallback) {
        if (this.isMonitoring()) {
            this.stopMonitoring(false);
        }
        this._pointerMoveCallback = pointerMoveCallback;
        this._onStopCallback = onStopCallback;
        let eventSource = initialElement;
        try {
            initialElement.setPointerCapture(pointerId);
            this._hooks.add(toDisposable(() => {
                try {
                    initialElement.releasePointerCapture(pointerId);
                }
                catch (err) {
                    // See https://github.com/microsoft/vscode/issues/161731
                    //
                    // `releasePointerCapture` sometimes fails when being invoked with the exception:
                    //     DOMException: Failed to execute 'releasePointerCapture' on 'Element':
                    //     No active pointer with the given id is found.
                    //
                    // There's no need to do anything in case of failure
                }
            }));
        }
        catch (err) {
            // See https://github.com/microsoft/vscode/issues/144584
            // See https://github.com/microsoft/vscode/issues/146947
            // `setPointerCapture` sometimes fails when being invoked
            // from a `mousedown` listener on macOS and Windows
            // and it always fails on Linux with the exception:
            //     DOMException: Failed to execute 'setPointerCapture' on 'Element':
            //     No active pointer with the given id is found.
            // In case of failure, we bind the listeners on the window
            eventSource = dom.getWindow(initialElement);
        }
        this._hooks.add(dom.addDisposableListener(eventSource, dom.EventType.POINTER_MOVE, (e) => {
            if (e.buttons !== initialButtons) {
                // Buttons state has changed in the meantime
                this.stopMonitoring(true);
                return;
            }
            e.preventDefault();
            this._pointerMoveCallback(e);
        }));
        this._hooks.add(dom.addDisposableListener(eventSource, dom.EventType.POINTER_UP, (e) => this.stopMonitoring(true)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsUG9pbnRlck1vdmVNb25pdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9nbG9iYWxQb2ludGVyTW92ZU1vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQVVwRixNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBRWtCLFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3hDLHlCQUFvQixHQUFnQyxJQUFJLENBQUM7UUFDekQsb0JBQWUsR0FBMkIsSUFBSSxDQUFDO0lBMkZ4RCxDQUFDO0lBekZPLE9BQU87UUFDYixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVNLGNBQWMsQ0FBQyxrQkFBMkIsRUFBRSxZQUEyQztRQUM3RixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDMUIsaUJBQWlCO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsU0FBUztRQUNULElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUNqQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO1FBQzVDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBRTVCLElBQUksa0JBQWtCLElBQUksY0FBYyxFQUFFLENBQUM7WUFDMUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDcEMsQ0FBQztJQUVNLGVBQWUsQ0FDckIsY0FBdUIsRUFDdkIsU0FBaUIsRUFDakIsY0FBc0IsRUFDdEIsbUJBQXlDLEVBQ3pDLGNBQStCO1FBRS9CLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDO1FBQ2hELElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBRXRDLElBQUksV0FBVyxHQUFxQixjQUFjLENBQUM7UUFFbkQsSUFBSSxDQUFDO1lBQ0osY0FBYyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQztvQkFDSixjQUFjLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2pELENBQUM7Z0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDZCx3REFBd0Q7b0JBQ3hELEVBQUU7b0JBQ0YsaUZBQWlGO29CQUNqRiw0RUFBNEU7b0JBQzVFLG9EQUFvRDtvQkFDcEQsRUFBRTtvQkFDRixvREFBb0Q7Z0JBQ3JELENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCx3REFBd0Q7WUFDeEQsd0RBQXdEO1lBQ3hELHlEQUF5RDtZQUN6RCxtREFBbUQ7WUFDbkQsbURBQW1EO1lBQ25ELHdFQUF3RTtZQUN4RSxvREFBb0Q7WUFDcEQsMERBQTBEO1lBQzFELFdBQVcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQ3hDLFdBQVcsRUFDWCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFDMUIsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNMLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDbEMsNENBQTRDO2dCQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixPQUFPO1lBQ1IsQ0FBQztZQUVELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsb0JBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FDeEMsV0FBVyxFQUNYLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUN4QixDQUFDLENBQWUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FDOUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=