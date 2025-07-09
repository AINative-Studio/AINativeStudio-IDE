/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch } from '../../../../base/common/arrays.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export class TestDecorations {
    constructor() {
        this.value = [];
    }
    /**
     * Adds a new value to the decorations.
     */
    push(value) {
        const searchIndex = binarySearch(this.value, value, (a, b) => a.line - b.line);
        this.value.splice(searchIndex < 0 ? ~searchIndex : searchIndex, 0, value);
    }
    /**
     * Gets decorations on each line.
     */
    *lines() {
        if (!this.value.length) {
            return;
        }
        let startIndex = 0;
        let startLine = this.value[0].line;
        for (let i = 1; i < this.value.length; i++) {
            const v = this.value[i];
            if (v.line !== startLine) {
                yield [startLine, this.value.slice(startIndex, i)];
                startLine = v.line;
                startIndex = i;
            }
        }
        yield [startLine, this.value.slice(startIndex)];
    }
}
export const ITestingDecorationsService = createDecorator('testingDecorationService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RpbmdEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFLakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBMkQ3RixNQUFNLE9BQU8sZUFBZTtJQUE1QjtRQUNRLFVBQUssR0FBUSxFQUFFLENBQUM7SUE4QnhCLENBQUM7SUE3QkE7O09BRUc7SUFDSSxJQUFJLENBQUMsS0FBUTtRQUNuQixNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRUQ7O09BRUc7SUFDSSxDQUFDLEtBQUs7UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsU0FBUyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUE2QiwwQkFBMEIsQ0FBQyxDQUFDIn0=