/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NoOpNotification, NotificationsFilter, Severity } from '../../common/notification.js';
export class TestNotificationService {
    constructor() {
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    static { this.NO_OP = new NoOpNotification(); }
    info(message) {
        return this.notify({ severity: Severity.Info, message });
    }
    warn(message) {
        return this.notify({ severity: Severity.Warning, message });
    }
    error(error) {
        return this.notify({ severity: Severity.Error, message: error });
    }
    notify(notification) {
        return TestNotificationService.NO_OP;
    }
    prompt(severity, message, choices, options) {
        return TestNotificationService.NO_OP;
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter() { }
    getFilter(source) {
        return NotificationsFilter.OFF;
    }
    getFilters() {
        return [];
    }
    removeFilter(sourceId) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGlmaWNhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbm90aWZpY2F0aW9uL3Rlc3QvY29tbW9uL3Rlc3ROb3RpZmljYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFrSyxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUUvUCxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBRVUseUJBQW9CLEdBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFeEQsNEJBQXVCLEdBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFM0Qsc0JBQWlCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUM7SUF5Q3RELENBQUM7YUFyQ3dCLFVBQUssR0FBd0IsSUFBSSxnQkFBZ0IsRUFBRSxBQUE5QyxDQUErQztJQUU1RSxJQUFJLENBQUMsT0FBZTtRQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZTtRQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBcUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUEyQjtRQUNqQyxPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQztJQUN0QyxDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQWtCLEVBQUUsT0FBZSxFQUFFLE9BQXdCLEVBQUUsT0FBd0I7UUFDN0YsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7SUFDdEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUF1QixFQUFFLE9BQStCO1FBQzlELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztJQUN4QixDQUFDO0lBRUQsU0FBUyxLQUFXLENBQUM7SUFFckIsU0FBUyxDQUFDLE1BQXdDO1FBQ2pELE9BQU8sbUJBQW1CLENBQUMsR0FBRyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsWUFBWSxDQUFDLFFBQWdCLElBQVUsQ0FBQyJ9