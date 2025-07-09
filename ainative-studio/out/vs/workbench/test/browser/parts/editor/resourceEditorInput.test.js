/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService } from '../../workbenchTestServices.js';
import { AbstractResourceEditorInput } from '../../../../common/editor/resourceEditorInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { CustomEditorLabelService, ICustomEditorLabelService } from '../../../../services/editor/common/customEditorLabelService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
suite('ResourceEditorInput', () => {
    const disposables = new DisposableStore();
    let TestResourceEditorInput = class TestResourceEditorInput extends AbstractResourceEditorInput {
        constructor(resource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
            super(resource, resource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
            this.typeId = 'test.typeId';
        }
    };
    TestResourceEditorInput = __decorate([
        __param(1, ILabelService),
        __param(2, IFileService),
        __param(3, IFilesConfigurationService),
        __param(4, ITextResourceConfigurationService),
        __param(5, ICustomEditorLabelService)
    ], TestResourceEditorInput);
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const testConfigurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, testConfigurationService);
        const customEditorLabelService = disposables.add(new CustomEditorLabelService(testConfigurationService, instantiationService.get(IWorkspaceContextService)));
        instantiationService.stub(ICustomEditorLabelService, customEditorLabelService);
        return [instantiationService, testConfigurationService, customEditorLabelService];
    }
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const [instantiationService] = await createServices();
        const resource = URI.from({ scheme: 'testResource', path: 'thePath/of/the/resource.txt' });
        const input = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource));
        assert.ok(input.getName().length > 0);
        assert.ok(input.getDescription(0 /* Verbosity.SHORT */).length > 0);
        assert.ok(input.getDescription(1 /* Verbosity.MEDIUM */).length > 0);
        assert.ok(input.getDescription(2 /* Verbosity.LONG */).length > 0);
        assert.ok(input.getTitle(0 /* Verbosity.SHORT */).length > 0);
        assert.ok(input.getTitle(1 /* Verbosity.MEDIUM */).length > 0);
        assert.ok(input.getTitle(2 /* Verbosity.LONG */).length > 0);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        assert.strictEqual(input.hasCapability(4 /* EditorInputCapabilities.Untitled */), true);
    });
    test('custom editor name', async () => {
        const [instantiationService, testConfigurationService, customEditorLabelService] = await createServices();
        const resource1 = URI.from({ scheme: 'testResource', path: 'thePath/of/the/resource.txt' });
        const resource2 = URI.from({ scheme: 'testResource', path: 'theOtherPath/of/the/resource.md' });
        const input1 = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource1));
        const input2 = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource2));
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, {
            '**/theOtherPath/**': 'Label 1',
            '**/*.txt': 'Label 2',
            '**/resource.txt': 'Label 3',
        });
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_PATTERNS; }, source: 2 /* ConfigurationTarget.USER */ });
        let label1Name = '';
        let label2Name = '';
        disposables.add(customEditorLabelService.onDidChange(() => {
            label1Name = input1.getName();
            label2Name = input2.getName();
        }));
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_ENABLED; }, source: 2 /* ConfigurationTarget.USER */ });
        assert.ok(label1Name === 'Label 3');
        assert.ok(label2Name === 'Label 1');
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, false);
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_ENABLED; }, source: 2 /* ConfigurationTarget.USER */ });
        assert.ok(label1Name === 'resource.txt');
        assert.ok(label2Name === 'resource.md');
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_ENABLED; }, source: 2 /* ConfigurationTarget.USER */ });
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, {
            'thePath/**/resource.txt': 'Label 4',
            'thePath/of/*/resource.txt': 'Label 5',
        });
        testConfigurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration(configuration) { return configuration === CustomEditorLabelService.SETTING_ID_PATTERNS; }, source: 2 /* ConfigurationTarget.USER */ });
        assert.ok(label1Name === 'Label 5');
        assert.ok(label2Name === 'resource.md');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VFZGl0b3JJbnB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL3Jlc291cmNlRWRpdG9ySW5wdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZILE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNySSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBRWpDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSwyQkFBMkI7UUFJaEUsWUFDQyxRQUFhLEVBQ0UsWUFBMkIsRUFDNUIsV0FBeUIsRUFDWCx5QkFBcUQsRUFDOUMsZ0NBQW1FLEVBQzNFLHdCQUFtRDtZQUU5RSxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFLGdDQUFnQyxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFWcEksV0FBTSxHQUFHLGFBQWEsQ0FBQztRQVdoQyxDQUFDO0tBQ0QsQ0FBQTtJQWRLLHVCQUF1QjtRQU0xQixXQUFBLGFBQWEsQ0FBQTtRQUNiLFdBQUEsWUFBWSxDQUFBO1FBQ1osV0FBQSwwQkFBMEIsQ0FBQTtRQUMxQixXQUFBLGlDQUFpQyxDQUFBO1FBQ2pDLFdBQUEseUJBQXlCLENBQUE7T0FWdEIsdUJBQXVCLENBYzVCO0lBRUQsS0FBSyxVQUFVLGNBQWM7UUFDNUIsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFbkYsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDaEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFFM0UsTUFBTSx3QkFBd0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLENBQUMsd0JBQXdCLEVBQUUsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdKLG9CQUFvQixDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFRCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QixNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxNQUFNLGNBQWMsRUFBRSxDQUFDO1FBRXRELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUM7UUFFM0YsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV0RyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyx5QkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYywwQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyx3QkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSx5QkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSwwQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSx3QkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLDBDQUFrQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxHQUFHLE1BQU0sY0FBYyxFQUFFLENBQUM7UUFFMUcsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztRQUM1RixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBRWhHLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEcsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUV4RyxNQUFNLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixFQUFFO1lBQ2pHLG9CQUFvQixFQUFFLFNBQVM7WUFDL0IsVUFBVSxFQUFFLFNBQVM7WUFDckIsaUJBQWlCLEVBQUUsU0FBUztTQUM1QixDQUFDLENBQUM7UUFDSCx3QkFBd0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxhQUFxQixJQUFJLE9BQU8sYUFBYSxLQUFLLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sa0NBQTBCLEVBQVMsQ0FBQyxDQUFDO1FBRW5PLElBQUksVUFBVSxHQUFXLEVBQUUsQ0FBQztRQUM1QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3pELFVBQVUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSx3QkFBd0IsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2Ryx3QkFBd0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxhQUFxQixJQUFJLE9BQU8sYUFBYSxLQUFLLHdCQUF3QixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sa0NBQTBCLEVBQVMsQ0FBQyxDQUFDO1FBRWxPLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEcsd0JBQXdCLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsYUFBcUIsSUFBSSxPQUFPLGFBQWEsS0FBSyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLGtDQUEwQixFQUFTLENBQUMsQ0FBQztRQUVsTyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsS0FBSyxjQUF3QixDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEtBQUssYUFBdUIsQ0FBQyxDQUFDO1FBRWxELE1BQU0sd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkcsd0JBQXdCLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsYUFBcUIsSUFBSSxPQUFPLGFBQWEsS0FBSyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLGtDQUEwQixFQUFTLENBQUMsQ0FBQztRQUVsTyxNQUFNLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixFQUFFO1lBQ2pHLHlCQUF5QixFQUFFLFNBQVM7WUFDcEMsMkJBQTJCLEVBQUUsU0FBUztTQUN0QyxDQUFDLENBQUM7UUFDSCx3QkFBd0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxhQUFxQixJQUFJLE9BQU8sYUFBYSxLQUFLLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sa0NBQTBCLEVBQVMsQ0FBQyxDQUFDO1FBRW5PLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLFNBQW1CLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsS0FBSyxhQUF1QixDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=