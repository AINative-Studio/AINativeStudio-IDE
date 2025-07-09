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
import { IModelService } from '../../../../editor/common/services/model.js';
import { ModelService } from '../../../../editor/common/services/modelService.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IPathService } from '../../path/common/pathService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let WorkbenchModelService = class WorkbenchModelService extends ModelService {
    constructor(configurationService, resourcePropertiesService, undoRedoService, _pathService, instantiationService) {
        super(configurationService, resourcePropertiesService, undoRedoService, instantiationService);
        this._pathService = _pathService;
    }
    _schemaShouldMaintainUndoRedoElements(resource) {
        return (super._schemaShouldMaintainUndoRedoElements(resource)
            || resource.scheme === this._pathService.defaultUriScheme);
    }
};
WorkbenchModelService = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITextResourcePropertiesService),
    __param(2, IUndoRedoService),
    __param(3, IPathService),
    __param(4, IInstantiationService)
], WorkbenchModelService);
export { WorkbenchModelService };
registerSingleton(IModelService, WorkbenchModelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9tb2RlbC9jb21tb24vbW9kZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDakgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU1RixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFlBQVk7SUFDdEQsWUFDd0Isb0JBQTJDLEVBQ2xDLHlCQUF5RCxFQUN2RSxlQUFpQyxFQUNwQixZQUEwQixFQUNsQyxvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBSC9ELGlCQUFZLEdBQVosWUFBWSxDQUFjO0lBSTFELENBQUM7SUFFa0IscUNBQXFDLENBQUMsUUFBYTtRQUNyRSxPQUFPLENBQ04sS0FBSyxDQUFDLHFDQUFxQyxDQUFDLFFBQVEsQ0FBQztlQUNsRCxRQUFRLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQ3pELENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQWpCWSxxQkFBcUI7SUFFL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDhCQUE4QixDQUFBO0lBQzlCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHFCQUFxQixDQUFBO0dBTlgscUJBQXFCLENBaUJqQzs7QUFFRCxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUscUJBQXFCLG9DQUE0QixDQUFDIn0=