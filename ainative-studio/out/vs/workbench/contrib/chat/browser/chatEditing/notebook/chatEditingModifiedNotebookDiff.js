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
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { computeDiff } from '../../../../notebook/common/notebookDiff.js';
import { INotebookEditorModelResolverService } from '../../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookLoggingService } from '../../../../notebook/common/notebookLoggingService.js';
import { INotebookEditorWorkerService } from '../../../../notebook/common/services/notebookWorkerService.js';
let ChatEditingModifiedNotebookDiff = class ChatEditingModifiedNotebookDiff {
    static { this.NewModelCounter = 0; }
    constructor(original, modified, notebookEditorWorkerService, notebookLoggingService, notebookEditorModelService) {
        this.original = original;
        this.modified = modified;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.notebookLoggingService = notebookLoggingService;
        this.notebookEditorModelService = notebookEditorModelService;
    }
    async computeDiff() {
        let added = 0;
        let removed = 0;
        const disposables = new DisposableStore();
        try {
            const [modifiedRef, originalRef] = await Promise.all([
                this.notebookEditorModelService.resolve(this.modified.snapshotUri),
                this.notebookEditorModelService.resolve(this.original.snapshotUri)
            ]);
            disposables.add(modifiedRef);
            disposables.add(originalRef);
            const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.original.snapshotUri, this.modified.snapshotUri);
            const result = computeDiff(originalRef.object.notebook, modifiedRef.object.notebook, notebookDiff);
            result.cellDiffInfo.forEach(diff => {
                switch (diff.type) {
                    case 'modified':
                    case 'insert':
                        added++;
                        break;
                    case 'delete':
                        removed++;
                        break;
                    default:
                        break;
                }
            });
        }
        catch (e) {
            this.notebookLoggingService.error('Notebook Chat', 'Error computing diff:\n' + e);
        }
        finally {
            disposables.dispose();
        }
        return {
            added,
            removed,
            identical: added === 0 && removed === 0,
            quitEarly: false,
            modifiedURI: this.modified.snapshotUri,
            originalURI: this.original.snapshotUri,
        };
    }
};
ChatEditingModifiedNotebookDiff = __decorate([
    __param(2, INotebookEditorWorkerService),
    __param(3, INotebookLoggingService),
    __param(4, INotebookEditorModelResolverService)
], ChatEditingModifiedNotebookDiff);
export { ChatEditingModifiedNotebookDiff };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBSXRHLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQStCO2FBQ3BDLG9CQUFlLEdBQVcsQ0FBQyxBQUFaLENBQWE7SUFDbkMsWUFDa0IsUUFBd0IsRUFDeEIsUUFBd0IsRUFDTSwyQkFBeUQsRUFDOUQsc0JBQStDLEVBQ25DLDBCQUErRDtRQUpwRyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUNNLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBOEI7UUFDOUQsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUNuQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXFDO0lBR3RILENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUVoQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFFaEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUM7WUFDSixNQUFNLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDcEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztnQkFDbEUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQzthQUNsRSxDQUFDLENBQUM7WUFDSCxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDN0IsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDOUgsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25HLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxVQUFVLENBQUM7b0JBQ2hCLEtBQUssUUFBUTt3QkFDWixLQUFLLEVBQUUsQ0FBQzt3QkFDUixNQUFNO29CQUNQLEtBQUssUUFBUTt3QkFDWixPQUFPLEVBQUUsQ0FBQzt3QkFDVixNQUFNO29CQUNQO3dCQUNDLE1BQU07Z0JBQ1IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSx5QkFBeUIsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNuRixDQUFDO2dCQUFTLENBQUM7WUFDVixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLO1lBQ0wsT0FBTztZQUNQLFNBQVMsRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLE9BQU8sS0FBSyxDQUFDO1lBQ3ZDLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVc7WUFDdEMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVztTQUN0QyxDQUFDO0lBQ0gsQ0FBQzs7QUF0RFcsK0JBQStCO0lBS3pDLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLG1DQUFtQyxDQUFBO0dBUHpCLCtCQUErQixDQXVEM0MifQ==