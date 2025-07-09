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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL3Rlc3QvYnJvd3Nlci9wcmVmZXJlbmNlc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLDBCQUEwQixFQUFlLE1BQU0sOEJBQThCLENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUEwQixNQUFNLDZCQUE2QixDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBNkIsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FB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