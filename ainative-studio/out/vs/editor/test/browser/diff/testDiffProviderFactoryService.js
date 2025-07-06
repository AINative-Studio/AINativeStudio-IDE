/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { linesDiffComputers } from '../../../common/diff/linesDiffComputers.js';
export class TestDiffProviderFactoryService {
    createDiffProvider() {
        return new SyncDocumentDiffProvider();
    }
}
class SyncDocumentDiffProvider {
    constructor() {
        this.onDidChange = () => toDisposable(() => { });
    }
    computeDiff(original, modified, options, cancellationToken) {
        const result = linesDiffComputers.getDefault().computeDiff(original.getLinesContent(), modified.getLinesContent(), options);
        return Promise.resolve({
            changes: result.changes,
            quitEarly: result.hitTimeout,
            identical: original.getValue() === modified.getValue(),
            moves: result.moves,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERpZmZQcm92aWRlckZhY3RvcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2RpZmYvdGVzdERpZmZQcm92aWRlckZhY3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUtoRixNQUFNLE9BQU8sOEJBQThCO0lBRTFDLGtCQUFrQjtRQUNqQixPQUFPLElBQUksd0JBQXdCLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHdCQUF3QjtJQUE5QjtRQVdDLGdCQUFXLEdBQWdCLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBWEEsV0FBVyxDQUFDLFFBQW9CLEVBQUUsUUFBb0IsRUFBRSxPQUFxQyxFQUFFLGlCQUFvQztRQUNsSSxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM1SCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDdEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNLENBQUMsVUFBVTtZQUM1QixTQUFTLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDdEQsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO1NBQ25CLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FHRCJ9