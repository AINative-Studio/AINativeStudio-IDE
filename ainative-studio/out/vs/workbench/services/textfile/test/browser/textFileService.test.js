/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Files - TextFileService', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('isDirty/getDirty - files and untitled', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        assert.ok(!accessor.textFileService.isDirty(model.resource));
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const untitled = disposables.add(await accessor.textFileService.untitled.resolve());
        assert.ok(!accessor.textFileService.isDirty(untitled.resource));
        untitled.textEditorModel?.setValue('changed');
        assert.ok(accessor.textFileService.isDirty(untitled.resource));
    });
    test('save - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const res = await accessor.textFileService.save(model.resource);
        assert.strictEqual(res?.toString(), model.resource.toString());
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('saveAll - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const res = await accessor.textFileService.save(model.resource);
        assert.strictEqual(res?.toString(), model.resource.toString());
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('saveAs - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        accessor.fileDialogService.setPickFileToSave(model.resource);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        const res = await accessor.textFileService.saveAs(model.resource);
        assert.strictEqual(res.toString(), model.resource.toString());
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('revert - file', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        accessor.fileDialogService.setPickFileToSave(model.resource);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        await accessor.textFileService.revert(model.resource);
        assert.ok(!accessor.textFileService.isDirty(model.resource));
    });
    test('create does not overwrite existing model', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.textFileService.isDirty(model.resource));
        let eventCounter = 0;
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files) => {
                assert.strictEqual(files[0].target.toString(), model.resource.toString());
                eventCounter++;
            }
        }));
        disposables.add(accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            assert.strictEqual(e.files[0].target.toString(), model.resource.toString());
            eventCounter++;
        }));
        await accessor.textFileService.create([{ resource: model.resource, value: 'Foo' }]);
        assert.ok(!accessor.textFileService.isDirty(model.resource));
        assert.strictEqual(eventCounter, 2);
    });
    test('Filename Suggestion - Suggest prefix only when there are no relevant extensions', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus0',
            extensions: ['.one', '.two']
        }));
        const suggested = accessor.textFileService.suggestFilename('shleem', 'Untitled-1');
        assert.strictEqual(suggested, 'Untitled-1');
    });
    test('Filename Suggestion - Suggest prefix with first extension', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus1',
            extensions: ['.shleem', '.gazorpazorp'],
            filenames: ['plumbus']
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus1', 'Untitled-1');
        assert.strictEqual(suggested, 'Untitled-1.shleem');
    });
    test('Filename Suggestion - Preserve extension if it matchers', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            extensions: ['.shleem', '.gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'Untitled-1.gazorpazorp');
        assert.strictEqual(suggested, 'Untitled-1.gazorpazorp');
    });
    test('Filename Suggestion - Rewrite extension according to language', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            extensions: ['.shleem', '.gazorpazorp'],
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'Untitled-1.foobar');
        assert.strictEqual(suggested, 'Untitled-1.shleem');
    });
    test('Filename Suggestion - Suggest filename if there are no extensions', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            filenames: ['plumbus', 'shleem', 'gazorpazorp']
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'Untitled-1');
        assert.strictEqual(suggested, 'plumbus');
    });
    test('Filename Suggestion - Preserve filename if it matches', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            filenames: ['plumbus', 'shleem', 'gazorpazorp']
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'gazorpazorp');
        assert.strictEqual(suggested, 'gazorpazorp');
    });
    test('Filename Suggestion - Rewrites filename according to language', () => {
        disposables.add(accessor.languageService.registerLanguage({
            id: 'plumbus2',
            filenames: ['plumbus', 'shleem', 'gazorpazorp']
        }));
        const suggested = accessor.textFileService.suggestFilename('plumbus2', 'foobar');
        assert.strictEqual(suggested, 'plumbus');
    });
    test('getEncoding() - files and untitled', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        assert.strictEqual(accessor.textFileService.getEncoding(model.resource), 'utf8');
        await model.setEncoding('utf16', 0 /* EncodingMode.Encode */);
        assert.strictEqual(accessor.textFileService.getEncoding(model.resource), 'utf16');
        const untitled = disposables.add(await accessor.textFileService.untitled.resolve());
        assert.strictEqual(accessor.textFileService.getEncoding(untitled.resource), 'utf8');
        await untitled.setEncoding('utf16');
        assert.strictEqual(accessor.textFileService.getEncoding(untitled.resource), 'utf16');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3QvYnJvd3Nlci90ZXh0RmlsZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFtQyxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hKLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUvRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHMUUsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUVyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLElBQUksb0JBQTJDLENBQUM7SUFDaEQsSUFBSSxRQUE2QixDQUFDO0lBRWxDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDN0UsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BFLFdBQVcsQ0FBQyxHQUFHLENBQWtDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUs7UUFDbEQsTUFBTSxLQUFLLEdBQXdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdkksUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFN0YsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdELEtBQUssQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTVELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoRSxRQUFRLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLO1FBQ3hCLE1BQU0sS0FBSyxHQUF3QixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZJLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdGLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTVELE1BQU0sR0FBRyxHQUFHLE1BQU0sUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSztRQUMzQixNQUFNLEtBQUssR0FBd0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN2SSxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3RixNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixLQUFLLENBQUMsZUFBZ0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUU1RCxNQUFNLEdBQUcsR0FBRyxNQUFNLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLO1FBQzFCLE1BQU0sS0FBSyxHQUF3QixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZJLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdGLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFN0QsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsS0FBSyxDQUFDLGVBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFNUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSztRQUMxQixNQUFNLEtBQUssR0FBd0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN2SSxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RixRQUFRLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdELE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTVELE1BQU0sUUFBUSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLO1FBQ3JELE1BQU0sS0FBSyxHQUF3QixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZJLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdGLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTVELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztRQUVyQixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQywyQkFBMkIsQ0FBQztZQUMzRSxXQUFXLEVBQUUsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO2dCQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRSxZQUFZLEVBQUUsQ0FBQztZQUNoQixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLCtCQUF1QixDQUFDO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzVFLFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFFBQVEsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUU3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRSxHQUFHLEVBQUU7UUFDNUYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDO1lBQ3pELEVBQUUsRUFBRSxVQUFVO1lBQ2QsVUFBVSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztTQUM1QixDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUU7UUFDdEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDO1lBQ3pELEVBQUUsRUFBRSxVQUFVO1lBQ2QsVUFBVSxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQztZQUN2QyxTQUFTLEVBQUUsQ0FBQyxTQUFTLENBQUM7U0FDdEIsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUNwRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDO1lBQ3pELEVBQUUsRUFBRSxVQUFVO1lBQ2QsVUFBVSxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQztTQUN2QyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN6RCxFQUFFLEVBQUUsVUFBVTtZQUNkLFVBQVUsRUFBRSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUM7U0FDdkMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3BELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEdBQUcsRUFBRTtRQUM5RSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUM7WUFDekQsRUFBRSxFQUFFLFVBQVU7WUFDZCxTQUFTLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQztTQUMvQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7UUFDbEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDO1lBQ3pELEVBQUUsRUFBRSxVQUFVO1lBQ2QsU0FBUyxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxhQUFhLENBQUM7U0FDL0MsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN6RCxFQUFFLEVBQUUsVUFBVTtZQUNkLFNBQVMsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDO1NBQy9DLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUs7UUFDL0MsTUFBTSxLQUFLLEdBQXdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdkksUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFN0YsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDakYsTUFBTSxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sOEJBQXNCLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEYsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEYsTUFBTSxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3RGLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyJ9