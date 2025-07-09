/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { NotebookEditorWidgetService } from '../../../notebook/browser/services/notebookEditorServiceImpl.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { TestEditorGroupsService, TestEditorService } from '../../../../test/browser/workbenchTestServices.js';
export function createFileUriFromPathFromRoot(path) {
    const rootName = getRootName();
    if (path) {
        return URI.file(`${rootName}${path}`);
    }
    else {
        if (isWindows) {
            return URI.file(`${rootName}/`);
        }
        else {
            return URI.file(rootName);
        }
    }
}
export function getRootName() {
    if (isWindows) {
        return 'c:';
    }
    else {
        return '';
    }
}
export function stubModelService(instantiationService, addDisposable) {
    instantiationService.stub(IThemeService, new TestThemeService());
    const config = new TestConfigurationService();
    config.setUserConfiguration('search', { searchOnType: true });
    instantiationService.stub(IConfigurationService, config);
    const modelService = instantiationService.createInstance(ModelService);
    addDisposable(modelService);
    return modelService;
}
export function stubNotebookEditorService(instantiationService, addDisposable) {
    instantiationService.stub(IEditorGroupsService, new TestEditorGroupsService());
    instantiationService.stub(IContextKeyService, new MockContextKeyService());
    const es = new TestEditorService();
    addDisposable(es);
    instantiationService.stub(IEditorService, es);
    const notebookEditorWidgetService = instantiationService.createInstance(NotebookEditorWidgetService);
    addDisposable(notebookEditorWidgetService);
    return notebookEditorWidgetService;
}
export function addToSearchResult(searchResult, allRaw, searchInstanceID = '') {
    searchResult.add(allRaw, searchInstanceID, false);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVGVzdENvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9icm93c2VyL3NlYXJjaFRlc3RDb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRWpHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUcvRyxNQUFNLFVBQVUsNkJBQTZCLENBQUMsSUFBYTtJQUMxRCxNQUFNLFFBQVEsR0FBRyxXQUFXLEVBQUUsQ0FBQztJQUMvQixJQUFJLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVztJQUMxQixJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsb0JBQThDLEVBQUUsYUFBdUM7SUFDdkgsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQztJQUNqRSxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7SUFDOUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzlELG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN6RCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkUsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVCLE9BQU8sWUFBWSxDQUFDO0FBQ3JCLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsb0JBQThDLEVBQUUsYUFBdUM7SUFDaEksb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQy9FLG9CQUFvQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQztJQUMzRSxNQUFNLEVBQUUsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7SUFDbkMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUMsTUFBTSwyQkFBMkIsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUNyRyxhQUFhLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUMzQyxPQUFPLDJCQUEyQixDQUFDO0FBQ3BDLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsWUFBMkIsRUFBRSxNQUFvQixFQUFFLGdCQUFnQixHQUFHLEVBQUU7SUFDekcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbkQsQ0FBQyJ9