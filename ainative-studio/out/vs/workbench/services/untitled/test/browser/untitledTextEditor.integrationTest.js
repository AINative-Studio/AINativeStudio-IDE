/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { UntitledTextEditorInput } from '../../common/untitledTextEditorInput.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Untitled text editors', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
    });
    teardown(() => {
        disposables.clear();
    });
    test('backup and restore (simple)', async function () {
        return testBackupAndRestore('Some very small file text content.');
    });
    test('backup and restore (large, #121347)', async function () {
        const largeContent = '국어한\n'.repeat(100000);
        return testBackupAndRestore(largeContent);
    });
    async function testBackupAndRestore(content) {
        const service = accessor.untitledTextEditorService;
        const originalInput = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const restoredInput = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const originalModel = disposables.add(await originalInput.resolve());
        originalModel.textEditorModel?.setValue(content);
        const backup = await originalModel.backup(CancellationToken.None);
        const modelRestoredIdentifier = { typeId: originalModel.typeId, resource: restoredInput.resource };
        await accessor.workingCopyBackupService.backup(modelRestoredIdentifier, backup.content);
        const restoredModel = disposables.add(await restoredInput.resolve());
        assert.strictEqual(restoredModel.textEditorModel?.getValue(), content);
        assert.strictEqual(restoredModel.isDirty(), true);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvdGVzdC9icm93c2VyL3VudGl0bGVkVGV4dEVkaXRvci5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBRW5DLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsSUFBSSxvQkFBMkMsQ0FBQztJQUNoRCxJQUFJLFFBQTZCLENBQUM7SUFFbEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM3RSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDcEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNyRCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSztRQUN4QyxPQUFPLG9CQUFvQixDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSztRQUNoRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLE9BQU8sb0JBQW9CLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLFVBQVUsb0JBQW9CLENBQUMsT0FBZTtRQUNsRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMseUJBQXlCLENBQUM7UUFDbkQsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0SCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRILE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNyRSxhQUFhLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSx1QkFBdUIsR0FBRyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkcsTUFBTSxRQUFRLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV4RixNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=