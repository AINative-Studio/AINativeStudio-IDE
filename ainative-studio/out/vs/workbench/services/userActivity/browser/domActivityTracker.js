/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
/**
 * This uses a time interval and checks whether there's any activity in that
 * interval. A naive approach might be to use a debounce whenever an event
 * happens, but this has some scheduling overhead. Instead, the tracker counts
 * how many intervals have elapsed since any activity happened.
 *
 * If there's more than `MIN_INTERVALS_WITHOUT_ACTIVITY`, then say the user is
 * inactive. Therefore the maximum time before an inactive user is detected
 * is `CHECK_INTERVAL * (MIN_INTERVALS_WITHOUT_ACTIVITY + 1)`.
 */
const CHECK_INTERVAL = 30_000;
/** See {@link CHECK_INTERVAL} */
const MIN_INTERVALS_WITHOUT_ACTIVITY = 2;
const eventListenerOptions = {
    passive: true, /** does not preventDefault() */
    capture: true, /** should dispatch first (before anyone stopPropagation()) */
};
export class DomActivityTracker extends Disposable {
    constructor(userActivityService) {
        super();
        let intervalsWithoutActivity = MIN_INTERVALS_WITHOUT_ACTIVITY;
        const intervalTimer = this._register(new dom.WindowIntervalTimer());
        const activeMutex = this._register(new MutableDisposable());
        activeMutex.value = userActivityService.markActive();
        const onInterval = () => {
            if (++intervalsWithoutActivity === MIN_INTERVALS_WITHOUT_ACTIVITY) {
                activeMutex.clear();
                intervalTimer.cancel();
            }
        };
        const onActivity = (targetWindow) => {
            // if was inactive, they've now returned
            if (intervalsWithoutActivity === MIN_INTERVALS_WITHOUT_ACTIVITY) {
                activeMutex.value = userActivityService.markActive();
                intervalTimer.cancelAndSet(onInterval, CHECK_INTERVAL, targetWindow);
            }
            intervalsWithoutActivity = 0;
        };
        this._register(Event.runAndSubscribe(dom.onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(dom.addDisposableListener(window.document, 'touchstart', () => onActivity(window), eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'mousedown', () => onActivity(window), eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'keydown', () => onActivity(window), eventListenerOptions));
        }, { window: mainWindow, disposables: this._store }));
        onActivity(mainWindow);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tQWN0aXZpdHlUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyQWN0aXZpdHkvYnJvd3Nlci9kb21BY3Rpdml0eVRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdyRjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUM7QUFFOUIsaUNBQWlDO0FBQ2pDLE1BQU0sOEJBQThCLEdBQUcsQ0FBQyxDQUFDO0FBRXpDLE1BQU0sb0JBQW9CLEdBQTRCO0lBQ3JELE9BQU8sRUFBRSxJQUFJLEVBQUUsZ0NBQWdDO0lBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQUUsOERBQThEO0NBQzdFLENBQUM7QUFFRixNQUFNLE9BQU8sa0JBQW1CLFNBQVEsVUFBVTtJQUNqRCxZQUFZLG1CQUF5QztRQUNwRCxLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksd0JBQXdCLEdBQUcsOEJBQThCLENBQUM7UUFDOUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUM1RCxXQUFXLENBQUMsS0FBSyxHQUFHLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRXJELE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtZQUN2QixJQUFJLEVBQUUsd0JBQXdCLEtBQUssOEJBQThCLEVBQUUsQ0FBQztnQkFDbkUsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNwQixhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLE1BQU0sVUFBVSxHQUFHLENBQUMsWUFBd0MsRUFBRSxFQUFFO1lBQy9ELHdDQUF3QztZQUN4QyxJQUFJLHdCQUF3QixLQUFLLDhCQUE4QixFQUFFLENBQUM7Z0JBQ2pFLFdBQVcsQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JELGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN0RSxDQUFDO1lBRUQsd0JBQXdCLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFO1lBQ3pGLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7WUFDMUgsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUN6SCxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQ3hILENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEQsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRCJ9