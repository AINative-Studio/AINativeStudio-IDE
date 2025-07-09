/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditorResourceAccessor, isResourceSideBySideEditorInput, isSideBySideEditorInput } from '../../../../common/editor.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { TestFileEditorInput, workbenchInstantiationService } from '../../workbenchTestServices.js';
suite('SideBySideEditorInput', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    class MyEditorInput extends EditorInput {
        constructor(resource = undefined) {
            super();
            this.resource = resource;
        }
        fireCapabilitiesChangeEvent() {
            this._onDidChangeCapabilities.fire();
        }
        fireDirtyChangeEvent() {
            this._onDidChangeDirty.fire();
        }
        fireLabelChangeEvent() {
            this._onDidChangeLabel.fire();
        }
        get typeId() { return 'myEditorInput'; }
        resolve() { return null; }
        toUntyped() {
            return { resource: this.resource, options: { override: this.typeId } };
        }
        matches(otherInput) {
            if (super.matches(otherInput)) {
                return true;
            }
            const resource = EditorResourceAccessor.getCanonicalUri(otherInput);
            return resource?.toString() === this.resource?.toString();
        }
    }
    test('basics', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        let counter = 0;
        const input = disposables.add(new MyEditorInput(URI.file('/fake')));
        disposables.add(input.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const otherInput = disposables.add(new MyEditorInput(URI.file('/fake2')));
        disposables.add(otherInput.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const sideBySideInput = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'name', 'description', input, otherInput));
        assert.strictEqual(sideBySideInput.getName(), 'name');
        assert.strictEqual(sideBySideInput.getDescription(), 'description');
        assert.ok(isSideBySideEditorInput(sideBySideInput));
        assert.ok(!isSideBySideEditorInput(input));
        assert.strictEqual(sideBySideInput.secondary, input);
        assert.strictEqual(sideBySideInput.primary, otherInput);
        assert(sideBySideInput.matches(sideBySideInput));
        assert(!sideBySideInput.matches(otherInput));
        sideBySideInput.dispose();
        assert.strictEqual(counter, 0);
        const sideBySideInputSame = disposables.add(instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input, input));
        assert.strictEqual(sideBySideInputSame.getName(), input.getName());
        assert.strictEqual(sideBySideInputSame.getDescription(), input.getDescription());
        assert.strictEqual(sideBySideInputSame.getTitle(), input.getTitle());
        assert.strictEqual(sideBySideInputSame.resource?.toString(), input.resource?.toString());
    });
    test('events dispatching', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input = disposables.add(new MyEditorInput());
        const otherInput = disposables.add(new MyEditorInput());
        const sideBySideInut = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'name', 'description', otherInput, input));
        assert.ok(isSideBySideEditorInput(sideBySideInut));
        let capabilitiesChangeCounter = 0;
        disposables.add(sideBySideInut.onDidChangeCapabilities(() => capabilitiesChangeCounter++));
        let dirtyChangeCounter = 0;
        disposables.add(sideBySideInut.onDidChangeDirty(() => dirtyChangeCounter++));
        let labelChangeCounter = 0;
        disposables.add(sideBySideInut.onDidChangeLabel(() => labelChangeCounter++));
        input.fireCapabilitiesChangeEvent();
        assert.strictEqual(capabilitiesChangeCounter, 1);
        otherInput.fireCapabilitiesChangeEvent();
        assert.strictEqual(capabilitiesChangeCounter, 2);
        input.fireDirtyChangeEvent();
        otherInput.fireDirtyChangeEvent();
        assert.strictEqual(dirtyChangeCounter, 1);
        input.fireLabelChangeEvent();
        otherInput.fireLabelChangeEvent();
        assert.strictEqual(labelChangeCounter, 2);
    });
    test('toUntyped', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const primaryInput = disposables.add(new MyEditorInput(URI.file('/fake')));
        const secondaryInput = disposables.add(new MyEditorInput(URI.file('/fake2')));
        const sideBySideInput = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'Side By Side Test', undefined, secondaryInput, primaryInput));
        const untypedSideBySideInput = sideBySideInput.toUntyped();
        assert.ok(isResourceSideBySideEditorInput(untypedSideBySideInput));
    });
    test('untyped matches', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const primaryInput = disposables.add(new TestFileEditorInput(URI.file('/fake'), 'primaryId'));
        const secondaryInput = disposables.add(new TestFileEditorInput(URI.file('/fake2'), 'secondaryId'));
        const sideBySideInput = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'Side By Side Test', undefined, secondaryInput, primaryInput));
        const primaryUntypedInput = { resource: URI.file('/fake'), options: { override: 'primaryId' } };
        const secondaryUntypedInput = { resource: URI.file('/fake2'), options: { override: 'secondaryId' } };
        const sideBySideUntyped = { primary: primaryUntypedInput, secondary: secondaryUntypedInput };
        assert.ok(sideBySideInput.matches(sideBySideUntyped));
        const primaryUntypedInput2 = { resource: URI.file('/fake'), options: { override: 'primaryIdWrong' } };
        const secondaryUntypedInput2 = { resource: URI.file('/fake2'), options: { override: 'secondaryId' } };
        const sideBySideUntyped2 = { primary: primaryUntypedInput2, secondary: secondaryUntypedInput2 };
        assert.ok(!sideBySideInput.matches(sideBySideUntyped2));
        const primaryUntypedInput3 = { resource: URI.file('/fake'), options: { override: 'primaryId' } };
        const secondaryUntypedInput3 = { resource: URI.file('/fake2Wrong'), options: { override: 'secondaryId' } };
        const sideBySideUntyped3 = { primary: primaryUntypedInput3, secondary: secondaryUntypedInput3 };
        assert.ok(!sideBySideInput.matches(sideBySideUntyped3));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3Ivc2lkZUJ5U2lkZUVkaXRvcklucHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFrQywrQkFBK0IsRUFBRSx1QkFBdUIsRUFBdUIsTUFBTSw4QkFBOEIsQ0FBQztBQUNyTCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDM0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUVuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBRTFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLGFBQWMsU0FBUSxXQUFXO1FBRXRDLFlBQW1CLFdBQTRCLFNBQVM7WUFDdkQsS0FBSyxFQUFFLENBQUM7WUFEVSxhQUFRLEdBQVIsUUFBUSxDQUE2QjtRQUV4RCxDQUFDO1FBRUQsMkJBQTJCO1lBQzFCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsb0JBQW9CO1lBQ25CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBRUQsb0JBQW9CO1lBQ25CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBRUQsSUFBYSxNQUFNLEtBQWEsT0FBTyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sS0FBVSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0IsU0FBUztZQUNqQixPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ3hFLENBQUM7UUFFUSxPQUFPLENBQUMsVUFBNkM7WUFDN0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRSxPQUFPLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDO1FBQzNELENBQUM7S0FDRDtJQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRW5GLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNiLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDOUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRS9CLE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1SSxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRW5GLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBRXhELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0ksTUFBTSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBRW5ELElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNGLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakQsVUFBVSxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVqRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM3QixVQUFVLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzdCLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVuRixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUUsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRWxLLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzNELE1BQU0sQ0FBQyxFQUFFLENBQUMsK0JBQStCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVuRixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDbkcsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRWxLLE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUNoRyxNQUFNLHFCQUFxQixHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7UUFDckcsTUFBTSxpQkFBaUIsR0FBbUMsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLENBQUM7UUFFN0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUV0RCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztRQUN0RyxNQUFNLHNCQUFzQixHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7UUFDdEcsTUFBTSxrQkFBa0IsR0FBbUMsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLENBQUM7UUFFaEksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBRXhELE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUNqRyxNQUFNLHNCQUFzQixHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7UUFDM0csTUFBTSxrQkFBa0IsR0FBbUMsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLENBQUM7UUFFaEksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyJ9