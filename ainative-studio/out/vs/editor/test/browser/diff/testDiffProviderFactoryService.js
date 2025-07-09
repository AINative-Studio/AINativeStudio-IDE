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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERpZmZQcm92aWRlckZhY3RvcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZGlmZi90ZXN0RGlmZlByb3ZpZGVyRmFjdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBS2hGLE1BQU0sT0FBTyw4QkFBOEI7SUFFMUMsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSx3QkFBd0IsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7Q0FDRDtBQUVELE1BQU0sd0JBQXdCO0lBQTlCO1FBV0MsZ0JBQVcsR0FBZ0IsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFYQSxXQUFXLENBQUMsUUFBb0IsRUFBRSxRQUFvQixFQUFFLE9BQXFDLEVBQUUsaUJBQW9DO1FBQ2xJLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVILE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUN0QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxVQUFVO1lBQzVCLFNBQVMsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUN0RCxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7U0FDbkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUdEIn0=