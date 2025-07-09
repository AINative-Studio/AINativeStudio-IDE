/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FuzzyScore } from '../../../../base/common/filters.js';
export class SimpleCompletionItem {
    constructor(completion) {
        this.completion = completion;
        // sorting, filtering
        this.score = FuzzyScore.Default;
        // validation
        this.isInvalid = false;
        // ensure lower-variants (perf)
        this.textLabel = typeof completion.label === 'string'
            ? completion.label
            : completion.label?.label;
        this.labelLow = this.textLabel.toLowerCase();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N1Z2dlc3QvYnJvd3Nlci9zaW1wbGVDb21wbGV0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFvRGhFLE1BQU0sT0FBTyxvQkFBb0I7SUFlaEMsWUFDVSxVQUE2QjtRQUE3QixlQUFVLEdBQVYsVUFBVSxDQUFtQjtRQVR2QyxxQkFBcUI7UUFDckIsVUFBSyxHQUFlLFVBQVUsQ0FBQyxPQUFPLENBQUM7UUFJdkMsYUFBYTtRQUNiLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFLMUIsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxVQUFVLENBQUMsS0FBSyxLQUFLLFFBQVE7WUFDcEQsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLO1lBQ2xCLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDOUMsQ0FBQztDQUNEIn0=