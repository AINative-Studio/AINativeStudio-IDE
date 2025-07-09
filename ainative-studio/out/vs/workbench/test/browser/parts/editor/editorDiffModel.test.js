/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextDiffEditorModel } from '../../../../common/editor/textDiffEditorModel.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../workbenchTestServices.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('TextDiffEditorModel', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        disposables.add(accessor.textModelResolverService.registerTextModelContentProvider('test', {
            provideTextContent: async function (resource) {
                if (resource.scheme === 'test') {
                    const modelContent = 'Hello Test';
                    const languageSelection = accessor.languageService.createById('json');
                    return disposables.add(accessor.modelService.createModel(modelContent, languageSelection, resource));
                }
                return null;
            }
        }));
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, URI.from({ scheme: 'test', authority: null, path: 'thePath' }), 'name', 'description', undefined, undefined));
        const otherInput = disposables.add(instantiationService.createInstance(TextResourceEditorInput, URI.from({ scheme: 'test', authority: null, path: 'thePath' }), 'name2', 'description', undefined, undefined));
        const diffInput = disposables.add(instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined));
        let model = disposables.add(await diffInput.resolve());
        assert(model);
        assert(model instanceof TextDiffEditorModel);
        const diffEditorModel = model.textDiffEditorModel;
        assert(diffEditorModel.original);
        assert(diffEditorModel.modified);
        model = disposables.add(await diffInput.resolve());
        assert(model.isResolved());
        assert(diffEditorModel !== model.textDiffEditorModel);
        diffInput.dispose();
        assert(!model.textDiffEditorModel);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRGlmZk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yRGlmZk1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFFakMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxJQUFJLG9CQUEyQyxDQUFDO0lBQ2hELElBQUksUUFBNkIsQ0FBQztJQUVsQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzdFLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFD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