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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTW9kaWZpZWROb3RlYm9va0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN4SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUl0RyxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUErQjthQUNwQyxvQkFBZSxHQUFXLENBQUMsQUFBWixDQUFhO0lBQ25DLFlBQ2tCLFFBQXdCLEVBQ3hCLFFBQXdCLEVBQ00sMkJBQXlELEVBQzlELHNCQUErQyxFQUNuQywwQkFBK0Q7UUFKcEcsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7UUFDeEIsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7UUFDTSxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQThCO1FBQzlELDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDbkMsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFxQztJQUd0SCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFFaEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBRWhCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ3BELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7Z0JBQ2xFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7YUFDbEUsQ0FBQyxDQUFDO1lBQ0gsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QixXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlILE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNuRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEMsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ25CLEtBQUssVUFBVSxDQUFDO29CQUNoQixLQUFLLFFBQVE7d0JBQ1osS0FBSyxFQUFFLENBQUM7d0JBQ1IsTUFBTTtvQkFDUCxLQUFLLFFBQVE7d0JBQ1osT0FBTyxFQUFFLENBQUM7d0JBQ1YsTUFBTTtvQkFDUDt3QkFDQyxNQUFNO2dCQUNSLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUseUJBQXlCLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbkYsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxPQUFPO1lBQ04sS0FBSztZQUNMLE9BQU87WUFDUCxTQUFTLEVBQUUsS0FBSyxLQUFLLENBQUMsSUFBSSxPQUFPLEtBQUssQ0FBQztZQUN2QyxTQUFTLEVBQUUsS0FBSztZQUNoQixXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXO1lBQ3RDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVc7U0FDdEMsQ0FBQztJQUNILENBQUM7O0FBdERXLCtCQUErQjtJQUt6QyxXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxtQ0FBbUMsQ0FBQTtHQVB6QiwrQkFBK0IsQ0F1RDNDIn0=