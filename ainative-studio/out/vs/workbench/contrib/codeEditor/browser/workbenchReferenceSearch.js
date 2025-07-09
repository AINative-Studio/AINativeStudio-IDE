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
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ReferencesController } from '../../../../editor/contrib/gotoSymbol/browser/peek/referencesController.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let WorkbenchReferencesController = class WorkbenchReferencesController extends ReferencesController {
    constructor(editor, contextKeyService, editorService, notificationService, instantiationService, storageService, configurationService) {
        super(false, editor, contextKeyService, editorService, notificationService, instantiationService, storageService, configurationService);
    }
};
WorkbenchReferencesController = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICodeEditorService),
    __param(3, INotificationService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IConfigurationService)
], WorkbenchReferencesController);
export { WorkbenchReferencesController };
registerEditorContribution(ReferencesController.ID, WorkbenchReferencesController, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoUmVmZXJlbmNlU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci93b3JrYmVuY2hSZWZlcmVuY2VTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRSxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLG9CQUFvQjtJQUV0RSxZQUNDLE1BQW1CLEVBQ0MsaUJBQXFDLEVBQ3JDLGFBQWlDLEVBQy9CLG1CQUF5QyxFQUN4QyxvQkFBMkMsRUFDakQsY0FBK0IsRUFDekIsb0JBQTJDO1FBRWxFLEtBQUssQ0FDSixLQUFLLEVBQ0wsTUFBTSxFQUNOLGlCQUFpQixFQUNqQixhQUFhLEVBQ2IsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixjQUFjLEVBQ2Qsb0JBQW9CLENBQ3BCLENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXRCWSw2QkFBNkI7SUFJdkMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7R0FUWCw2QkFBNkIsQ0FzQnpDOztBQUVELDBCQUEwQixDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSw2QkFBNkIsK0NBQXVDLENBQUMifQ==