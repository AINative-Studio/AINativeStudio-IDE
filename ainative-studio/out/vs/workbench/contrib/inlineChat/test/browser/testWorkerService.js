var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { mock } from '../../../../../base/test/common/mock.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { assertType } from '../../../../../base/common/types.js';
import { EditorWorker } from '../../../../../editor/common/services/editorWebWorker.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { MovedText } from '../../../../../editor/common/diff/linesDiffComputer.js';
import { LineRangeMapping, DetailedLineRangeMapping, RangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
let TestWorkerService = class TestWorkerService extends mock() {
    constructor(_modelService) {
        super();
        this._modelService = _modelService;
        this._worker = new EditorWorker();
    }
    async computeMoreMinimalEdits(resource, edits, pretty) {
        return undefined;
    }
    async computeDiff(original, modified, options, algorithm) {
        const originalModel = this._modelService.getModel(original);
        const modifiedModel = this._modelService.getModel(modified);
        assertType(originalModel);
        assertType(modifiedModel);
        this._worker.$acceptNewModel({
            url: originalModel.uri.toString(),
            versionId: originalModel.getVersionId(),
            lines: originalModel.getLinesContent(),
            EOL: originalModel.getEOL(),
        });
        this._worker.$acceptNewModel({
            url: modifiedModel.uri.toString(),
            versionId: modifiedModel.getVersionId(),
            lines: modifiedModel.getLinesContent(),
            EOL: modifiedModel.getEOL(),
        });
        const result = await this._worker.$computeDiff(originalModel.uri.toString(), modifiedModel.uri.toString(), options, algorithm);
        if (!result) {
            return result;
        }
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: toLineRangeMappings(result.changes),
            moves: result.moves.map(m => new MovedText(new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])), toLineRangeMappings(m[4])))
        };
        return diff;
        function toLineRangeMappings(changes) {
            return changes.map((c) => new DetailedLineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), c[4]?.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7])))));
        }
    }
};
TestWorkerService = __decorate([
    __param(0, IModelService)
], TestWorkerService);
export { TestWorkerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFdvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC90ZXN0L2Jyb3dzZXIvdGVzdFdvcmtlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSx3QkFBd0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUl0SCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLElBQUksRUFBd0I7SUFJbEUsWUFBMkIsYUFBNkM7UUFDdkUsS0FBSyxFQUFFLENBQUM7UUFEbUMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFGdkQsWUFBTyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7SUFJOUMsQ0FBQztJQUVRLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxRQUFhLEVBQUUsS0FBb0MsRUFBRSxNQUE0QjtRQUN2SCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRVEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFhLEVBQUUsUUFBYSxFQUFFLE9B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