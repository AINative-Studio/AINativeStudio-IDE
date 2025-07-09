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
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let MergeEditorTelemetry = class MergeEditorTelemetry {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
    }
    reportMergeEditorOpened(args) {
        this.telemetryService.publicLog2('mergeEditor.opened', {
            conflictCount: args.conflictCount,
            combinableConflictCount: args.combinableConflictCount,
            baseVisible: args.baseVisible,
            isColumnView: args.isColumnView,
            baseTop: args.baseTop,
        });
    }
    reportLayoutChange(args) {
        this.telemetryService.publicLog2('mergeEditor.layoutChanged', {
            baseVisible: args.baseVisible,
            isColumnView: args.isColumnView,
            baseTop: args.baseTop,
        });
    }
    reportMergeEditorClosed(args) {
        this.telemetryService.publicLog2('mergeEditor.closed', {
            conflictCount: args.conflictCount,
            combinableConflictCount: args.combinableConflictCount,
            durationOpenedSecs: args.durationOpenedSecs,
            remainingConflictCount: args.remainingConflictCount,
            accepted: args.accepted,
            conflictsResolvedWithBase: args.conflictsResolvedWithBase,
            conflictsResolvedWithInput1: args.conflictsResolvedWithInput1,
            conflictsResolvedWithInput2: args.conflictsResolvedWithInput2,
            conflictsResolvedWithSmartCombination: args.conflictsResolvedWithSmartCombination,
            manuallySolvedConflictCountThatEqualNone: args.manuallySolvedConflictCountThatEqualNone,
            manuallySolvedConflictCountThatEqualSmartCombine: args.manuallySolvedConflictCountThatEqualSmartCombine,
            manuallySolvedConflictCountThatEqualInput1: args.manuallySolvedConflictCountThatEqualInput1,
            manuallySolvedConflictCountThatEqualInput2: args.manuallySolvedConflictCountThatEqualInput2,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithBase: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithBase,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart,
            manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart: args.manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart,
        });
    }
    reportAcceptInvoked(inputNumber, otherAccepted) {
        this.telemetryService.publicLog2('mergeEditor.action.accept', {
            otherAccepted: otherAccepted,
            isInput1: inputNumber === 1,
        });
    }
    reportSmartCombinationInvoked(otherAccepted) {
        this.telemetryService.publicLog2('mergeEditor.action.smartCombination', {
            otherAccepted: otherAccepted,
        });
    }
    reportRemoveInvoked(inputNumber, otherAccepted) {
        this.telemetryService.publicLog2('mergeEditor.action.remove', {
            otherAccepted: otherAccepted,
            isInput1: inputNumber === 1,
        });
    }
    reportResetToBaseInvoked() {
        this.telemetryService.publicLog2('mergeEditor.action.resetToBase', {});
    }
    reportNavigationToNextConflict() {
        this.telemetryService.publicLog2('mergeEditor.action.goToNextConflict', {});
    }
    reportNavigationToPreviousConflict() {
        this.telemetryService.publicLog2('mergeEditor.action.goToPreviousConflict', {});
    }
    reportConflictCounterClicked() {
        this.telemetryService.publicLog2('mergeEditor.action.conflictCounterClicked', {});
    }
};
MergeEditorTelemetry = __decorate([
    __param(0, ITelemetryService)
], MergeEditorTelemetry);
export { MergeEditorTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRWhGLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBQ2hDLFlBQ3FDLGdCQUFtQztRQUFuQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO0lBQ3BFLENBQUM7SUFFTCx1QkFBdUIsQ0FBQyxJQU92QjtRQUNBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBa0I3QixvQkFBb0IsRUFBRTtZQUN4QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QjtZQUVyRCxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsa0JBQWtCLENBQUMsSUFJbEI7UUFDQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQVk3QiwyQkFBMkIsRUFBRTtZQUMvQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsdUJBQXVCLENBQUMsSUF1QnZCO1FBQ0EsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FrRDdCLG9CQUFvQixFQUFFO1lB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