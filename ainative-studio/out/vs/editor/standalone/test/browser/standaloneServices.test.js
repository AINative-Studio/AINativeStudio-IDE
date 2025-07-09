/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { StandaloneCodeEditorService } from '../../browser/standaloneCodeEditorService.js';
import { StandaloneCommandService, StandaloneConfigurationService, StandaloneKeybindingService, StandaloneNotificationService } from '../../browser/standaloneServices.js';
import { StandaloneThemeService } from '../../browser/standaloneThemeService.js';
import { ContextKeyService } from '../../../../platform/contextkey/browser/contextKeyService.js';
import { InstantiationService } from '../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { NullTelemetryService } from '../../../../platform/telemetry/common/telemetryUtils.js';
suite('StandaloneKeybindingService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestStandaloneKeybindingService extends StandaloneKeybindingService {
        testDispatch(e) {
            super._dispatch(e, null);
        }
    }
    test('issue microsoft/monaco-editor#167', () => {
        const disposables = new DisposableStore();
        const serviceCollection = new ServiceCollection();
        const instantiationService = new InstantiationService(serviceCollection, true);
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const contextKeyService = disposables.add(new ContextKeyService(configurationService));
        const commandService = new StandaloneCommandService(instantiationService);
        const notificationService = new StandaloneNotificationService();
        const standaloneThemeService = disposables.add(new StandaloneThemeService());
        const codeEditorService = disposables.add(new StandaloneCodeEditorService(contextKeyService, standaloneThemeService));
        const keybindingService = disposables.add(new TestStandaloneKeybindingService(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService(), codeEditorService));
        let commandInvoked = false;
        disposables.add(keybindingService.addDynamicKeybinding('testCommand', 67 /* KeyCode.F9 */, () => {
            commandInvoked = true;
        }, undefined));
        keybindingService.testDispatch({
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 67 /* KeyCode.F9 */,
            code: null
        });
        assert.ok(commandInvoked, 'command invoked');
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVNlcnZpY2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvdGVzdC9icm93c2VyL3N0YW5kYWxvbmVTZXJ2aWNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDhCQUE4QixFQUFFLDJCQUEyQixFQUFFLDZCQUE2QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDM0ssT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRS9GLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFFekMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLCtCQUFnQyxTQUFRLDJCQUEyQjtRQUNqRSxZQUFZLENBQUMsQ0FBaUI7WUFDcEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSyxDQUFDLENBQUM7UUFDM0IsQ0FBQztLQUNEO0lBRUQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUU5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ2xELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRSxNQUFNLG9CQUFvQixHQUFHLElBQUksOEJBQThCLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUN2RixNQUFNLGNBQWMsR0FBRyxJQUFJLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDMUUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDZCQUE2QixFQUFFLENBQUM7UUFDaEUsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJCQUEyQixDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUN0SCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwrQkFBK0IsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxjQUFjLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFFdE0sSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzNCLFdBQVcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsYUFBYSx1QkFBYyxHQUFHLEVBQUU7WUFDdEYsY0FBYyxHQUFHLElBQUksQ0FBQztRQUN2QixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVmLGlCQUFpQixDQUFDLFlBQVksQ0FBQztZQUM5QiwyQkFBMkIsRUFBRSxJQUFJO1lBQ2pDLE9BQU8sRUFBRSxLQUFLO1lBQ2QsUUFBUSxFQUFFLEtBQUs7WUFDZixNQUFNLEVBQUUsS0FBSztZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsV0FBVyxFQUFFLEtBQUs7WUFDbEIsT0FBTyxxQkFBWTtZQUNuQixJQUFJLEVBQUUsSUFBSztTQUNYLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFN0MsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==