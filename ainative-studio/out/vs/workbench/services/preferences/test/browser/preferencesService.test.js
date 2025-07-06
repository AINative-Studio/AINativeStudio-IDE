/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestCommandService } from '../../../../../editor/test/browser/editorTestServices.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { IJSONEditingService } from '../../../configuration/common/jsonEditing.js';
import { TestJSONEditingService } from '../../../configuration/test/common/testServices.js';
import { PreferencesService } from '../../browser/preferencesService.js';
import { IPreferencesService } from '../../common/preferences.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { TestRemoteAgentService, workbenchInstantiationService, TestEditorGroupView, TestEditorGroupsService } from '../../../../test/browser/workbenchTestServices.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
suite('PreferencesService', () => {
    let testInstantiationService;
    let testObject;
    let lastOpenEditorOptions;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testInstantiationService = workbenchInstantiationService({}, disposables);
        class TestOpenEditorGroupView extends TestEditorGroupView {
            openEditor(_editor, options) {
                lastOpenEditorOptions = options;
                _editor.dispose();
                return Promise.resolve(undefined);
            }
        }
        const testEditorGroupService = new TestEditorGroupsService([new TestOpenEditorGroupView(0)]);
        testInstantiationService.stub(IEditorGroupsService, testEditorGroupService);
        testInstantiationService.stub(IJSONEditingService, TestJSONEditingService);
        testInstantiationService.stub(IRemoteAgentService, TestRemoteAgentService);
        testInstantiationService.stub(ICommandService, TestCommandService);
        testInstantiationService.stub(IURLService, { registerHandler: () => { } });
        // PreferencesService creates a PreferencesEditorInput which depends on IPreferencesService, add the real one, not a stub
        const collection = new ServiceCollection();
        collection.set(IPreferencesService, new SyncDescriptor(PreferencesService));
        const instantiationService = disposables.add(testInstantiationService.createChild(collection));
        testObject = disposables.add(instantiationService.createInstance(PreferencesService));
    });
    test('options are preserved when calling openEditor', async () => {
        await testObject.openSettings({ jsonEditor: false, query: 'test query' });
        const options = lastOpenEditorOptions;
        assert.strictEqual(options.focusSearch, true);
        assert.strictEqual(options.override, DEFAULT_EDITOR_ASSOCIATION.id);
        assert.strictEqual(options.query, 'test query');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvdGVzdC9icm93c2VyL3ByZWZlcmVuY2VzU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsMEJBQTBCLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQTBCLE1BQU0sNkJBQTZCLENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUE2Qiw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFD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