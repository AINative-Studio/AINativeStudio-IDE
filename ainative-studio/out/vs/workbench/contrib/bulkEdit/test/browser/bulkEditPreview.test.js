/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { mock } from '../../../../test/common/workbenchTestServices.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { URI } from '../../../../../base/common/uri.js';
import { BulkFileOperations } from '../../browser/preview/bulkEditPreview.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ResourceFileEdit, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('BulkEditPreview', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instaService;
    setup(function () {
        const fileService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFilesChange = Event.None;
            }
            async exists() {
                return true;
            }
        };
        const modelService = new class extends mock() {
            getModel() {
                return null;
            }
            getModels() {
                return [];
            }
        };
        instaService = new InstantiationService(new ServiceCollection([IFileService, fileService], [IModelService, modelService]));
    });
    test('one needsConfirmation unchecks all of file', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, { label: 'cat1', needsConfirmation: true }),
            new ResourceFileEdit(URI.parse('some:///uri1'), URI.parse('some:///uri2'), undefined, { label: 'cat2', needsConfirmation: false }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.fileOperations.length, 1);
        assert.strictEqual(ops.checked.isChecked(edits[0]), false);
    });
    test('has categories', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, { label: 'uri1', needsConfirmation: true }),
            new ResourceFileEdit(undefined, URI.parse('some:///uri2'), undefined, { label: 'uri2', needsConfirmation: false }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.categories.length, 2);
        assert.strictEqual(ops.categories[0].metadata.label, 'uri1'); // unconfirmed!
        assert.strictEqual(ops.categories[1].metadata.label, 'uri2');
    });
    test('has not categories', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, { label: 'uri1', needsConfirmation: true }),
            new ResourceFileEdit(undefined, URI.parse('some:///uri2'), undefined, { label: 'uri1', needsConfirmation: false }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.categories.length, 1);
        assert.strictEqual(ops.categories[0].metadata.label, 'uri1'); // unconfirmed!
        assert.strictEqual(ops.categories[0].metadata.label, 'uri1');
    });
    test('category selection', async function () {
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, { label: 'C1', needsConfirmation: false }),
            new ResourceTextEdit(URI.parse('some:///uri2'), { text: 'foo', range: new Range(1, 1, 1, 1) }, undefined, { label: 'C2', needsConfirmation: false }),
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.checked.isChecked(edits[0]), true);
        assert.strictEqual(ops.checked.isChecked(edits[1]), true);
        assert.ok(edits === ops.getWorkspaceEdit());
        // NOT taking to create, but the invalid text edit will
        // go through
        ops.checked.updateChecked(edits[0], false);
        const newEdits = ops.getWorkspaceEdit();
        assert.ok(edits !== newEdits);
        assert.strictEqual(edits.length, 2);
        assert.strictEqual(newEdits.length, 1);
    });
    test('fix bad metadata', async function () {
        // bogous edit that wants creation to be confirmed, but not it's textedit-child...
        const edits = [
            new ResourceFileEdit(undefined, URI.parse('some:///uri1'), undefined, { label: 'C1', needsConfirmation: true }),
            new ResourceTextEdit(URI.parse('some:///uri1'), { text: 'foo', range: new Range(1, 1, 1, 1) }, undefined, { label: 'C2', needsConfirmation: false })
        ];
        const ops = await instaService.invokeFunction(BulkFileOperations.create, edits);
        store.add(ops);
        assert.strictEqual(ops.checked.isChecked(edits[0]), false);
        assert.strictEqual(ops.checked.isChecked(edits[1]), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQcmV2aWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvdGVzdC9icm93c2VyL2J1bGtFZGl0UHJldmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM1RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUV0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsaUJBQWlCLEVBQUU7SUFFeEIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLFlBQW1DLENBQUM7SUFFeEMsS0FBSyxDQUFDO1FBRUwsTUFBTSxXQUFXLEdBQWlCLElBQUks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