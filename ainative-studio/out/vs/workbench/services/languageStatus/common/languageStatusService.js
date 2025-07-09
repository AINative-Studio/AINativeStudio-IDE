/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compare } from '../../../../base/common/strings.js';
import { LanguageFeatureRegistry } from '../../../../editor/common/languageFeatureRegistry.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ILanguageStatusService = createDecorator('ILanguageStatusService');
class LanguageStatusServiceImpl {
    constructor() {
        this._provider = new LanguageFeatureRegistry();
        this.onDidChange = this._provider.onDidChange;
    }
    addStatus(status) {
        return this._provider.register(status.selector, status);
    }
    getLanguageStatus(model) {
        return this._provider.ordered(model).sort((a, b) => {
            let res = b.severity - a.severity;
            if (res === 0) {
                res = compare(a.source, b.source);
            }
            if (res === 0) {
                res = compare(a.id, b.id);
            }
            return res;
        });
    }
}
registerSingleton(ILanguageStatusService, LanguageStatusServiceImpl, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdGF0dXNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYW5ndWFnZVN0YXR1cy9jb21tb24vbGFuZ3VhZ2VTdGF0dXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUc3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUcvRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBbUI3RixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUM7QUFjeEcsTUFBTSx5QkFBeUI7SUFBL0I7UUFJa0IsY0FBUyxHQUFHLElBQUksdUJBQXVCLEVBQW1CLENBQUM7UUFFbkUsZ0JBQVcsR0FBZSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztJQWtCL0QsQ0FBQztJQWhCQSxTQUFTLENBQUMsTUFBdUI7UUFDaEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxLQUFpQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNsRCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDbEMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHlCQUF5QixvQ0FBNEIsQ0FBQyJ9