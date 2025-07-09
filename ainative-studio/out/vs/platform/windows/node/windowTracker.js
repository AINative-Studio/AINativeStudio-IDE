/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
export class ActiveWindowManager extends Disposable {
    constructor({ onDidOpenMainWindow, onDidFocusMainWindow, getActiveWindowId }) {
        super();
        this.disposables = this._register(new DisposableStore());
        // remember last active window id upon events
        const onActiveWindowChange = Event.latch(Event.any(onDidOpenMainWindow, onDidFocusMainWindow));
        onActiveWindowChange(this.setActiveWindow, this, this.disposables);
        // resolve current active window
        this.firstActiveWindowIdPromise = createCancelablePromise(() => getActiveWindowId());
        (async () => {
            try {
                const windowId = await this.firstActiveWindowIdPromise;
                this.activeWindowId = (typeof this.activeWindowId === 'number') ? this.activeWindowId : windowId;
            }
            catch (error) {
                // ignore
            }
            finally {
                this.firstActiveWindowIdPromise = undefined;
            }
        })();
    }
    setActiveWindow(windowId) {
        if (this.firstActiveWindowIdPromise) {
            this.firstActiveWindowIdPromise.cancel();
            this.firstActiveWindowIdPromise = undefined;
        }
        this.activeWindowId = windowId;
    }
    async getActiveClientId() {
        const id = this.firstActiveWindowIdPromise ? (await this.firstActiveWindowIdPromise) : this.activeWindowId;
        return `window:${id}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93VHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3dzL25vZGUvd2luZG93VHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFaEYsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFPbEQsWUFBWSxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUl6RTtRQUNBLEtBQUssRUFBRSxDQUFDO1FBVlEsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQVlwRSw2Q0FBNkM7UUFDN0MsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQy9GLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVuRSxnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLDBCQUEwQixHQUFHLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNyRixDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ1gsSUFBSSxDQUFDO2dCQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDO2dCQUN2RCxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDbEcsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLFNBQVM7WUFDVixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLDBCQUEwQixHQUFHLFNBQVMsQ0FBQztZQUM3QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNOLENBQUM7SUFFTyxlQUFlLENBQUMsUUFBNEI7UUFDbkQsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLDBCQUEwQixHQUFHLFNBQVMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUI7UUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7UUFFM0csT0FBTyxVQUFVLEVBQUUsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCJ9