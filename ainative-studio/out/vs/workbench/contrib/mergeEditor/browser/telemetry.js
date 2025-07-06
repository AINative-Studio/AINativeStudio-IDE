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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3RlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoRixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQUNoQyxZQUNxQyxnQkFBbUM7UUFBbkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtJQUNwRSxDQUFDO0lBRUwsdUJBQXVCLENBQUMsSUFPdkI7UUFDQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQWtCN0Isb0JBQW9CLEVBQUU7WUFDeEIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLHVCQUF1QixFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFFckQsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDckIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELGtCQUFrQixDQUFDLElBSWxCO1FBQ0EsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FZN0IsMkJBQTJCLEVBQUU7WUFDL0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDckIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELHVCQUF1QixDQUFDLElBdUJ2QjtRQUNBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBa0Q3QixvQkFBb0IsRUFB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