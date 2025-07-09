/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { workbenchInstantiationService } from '../../workbenchTestServices.js';
import { EditorResourceAccessor, isDiffEditorInput, isResourceDiffEditorInput, isResourceSideBySideEditorInput } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Diff editor input', () => {
    class MyEditorInput extends EditorInput {
        constructor(resource = undefined) {
            super();
            this.resource = resource;
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
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('basics', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        let counter = 0;
        const input = disposables.add(new MyEditorInput());
        disposables.add(input.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const otherInput = disposables.add(new MyEditorInput());
        disposables.add(otherInput.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const diffInput = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined);
        assert.ok(isDiffEditorInput(diffInput));
        assert.ok(!isDiffEditorInput(input));
        assert.strictEqual(diffInput.original, input);
        assert.strictEqual(diffInput.modified, otherInput);
        assert(diffInput.matches(diffInput));
        assert(!diffInput.matches(otherInput));
        diffInput.dispose();
        assert.strictEqual(counter, 0);
    });
    test('toUntyped', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input = disposables.add(new MyEditorInput(URI.file('foo/bar1')));
        const otherInput = disposables.add(new MyEditorInput(URI.file('foo/bar2')));
        const diffInput = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined);
        const untypedDiffInput = diffInput.toUntyped();
        assert.ok(isResourceDiffEditorInput(untypedDiffInput));
        assert.ok(!isResourceSideBySideEditorInput(untypedDiffInput));
        assert.ok(diffInput.matches(untypedDiffInput));
    });
    test('disposes when input inside disposes', function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        let counter = 0;
        let input = disposables.add(new MyEditorInput());
        let otherInput = disposables.add(new MyEditorInput());
        const diffInput = disposables.add(instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined));
        disposables.add(diffInput.onWillDispose(() => {
            counter++;
            assert(true);
        }));
        input.dispose();
        input = disposables.add(new MyEditorInput());
        otherInput = disposables.add(new MyEditorInput());
        const diffInput2 = disposables.add(instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined));
        disposables.add(diffInput2.onWillDispose(() => {
            counter++;
            assert(true);
        }));
        otherInput.dispose();
        assert.strictEqual(counter, 2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZGlmZkVkaXRvcklucHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLCtCQUErQixFQUF1QixNQUFNLDhCQUE4QixDQUFDO0FBQzFLLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUUvQixNQUFNLGFBQWMsU0FBUSxXQUFXO1FBRXRDLFlBQW1CLFdBQTRCLFNBQVM7WUFDdkQsS0FBSyxFQUFFLENBQUM7WUFEVSxhQUFRLEdBQVIsUUFBUSxDQUE2QjtRQUV4RCxDQUFDO1FBRUQsSUFBYSxNQUFNLEtBQWEsT0FBTyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sS0FBVSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0IsU0FBUztZQUNqQixPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVB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