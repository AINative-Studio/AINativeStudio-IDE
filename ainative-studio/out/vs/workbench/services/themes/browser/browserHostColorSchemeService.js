/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { addMatchMediaChangeListener } from '../../../../base/browser/browser.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IHostColorSchemeService } from '../common/hostColorSchemeService.js';
import { mainWindow } from '../../../../base/browser/window.js';
export class BrowserHostColorSchemeService extends Disposable {
    constructor() {
        super();
        this._onDidSchemeChangeEvent = this._register(new Emitter());
        this.registerListeners();
    }
    registerListeners() {
        addMatchMediaChangeListener(mainWindow, '(prefers-color-scheme: dark)', () => {
            this._onDidSchemeChangeEvent.fire();
        });
        addMatchMediaChangeListener(mainWindow, '(forced-colors: active)', () => {
            this._onDidSchemeChangeEvent.fire();
        });
    }
    get onDidChangeColorScheme() {
        return this._onDidSchemeChangeEvent.event;
    }
    get dark() {
        if (mainWindow.matchMedia(`(prefers-color-scheme: light)`).matches) {
            return false;
        }
        else if (mainWindow.matchMedia(`(prefers-color-scheme: dark)`).matches) {
            return true;
        }
        return false;
    }
    get highContrast() {
        if (mainWindow.matchMedia(`(forced-colors: active)`).matches) {
            return true;
        }
        return false;
    }
}
registerSingleton(IHostColorSchemeService, BrowserHostColorSchemeService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RDb2xvclNjaGVtZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9icm93c2VyL2Jyb3dzZXJIb3N0Q29sb3JTY2hlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVoRSxNQUFNLE9BQU8sNkJBQThCLFNBQVEsVUFBVTtJQU01RDtRQUVDLEtBQUssRUFBRSxDQUFDO1FBSlEsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFNOUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGlCQUFpQjtRQUV4QiwyQkFBMkIsQ0FBQyxVQUFVLEVBQUUsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQzVFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUNILDJCQUEyQixDQUFDLFVBQVUsRUFBRSx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDdkUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksc0JBQXNCO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQztJQUMzQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLCtCQUErQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO2FBQU0sSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDMUUsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0NBRUQ7QUFFRCxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSw2QkFBNkIsb0NBQTRCLENBQUMifQ==