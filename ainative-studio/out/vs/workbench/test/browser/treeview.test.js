/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TreeView } from '../../browser/parts/views/treeView.js';
import { workbenchInstantiationService } from './workbenchTestServices.js';
import { IViewDescriptorService, TreeItemCollapsibleState } from '../../common/views.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { ViewDescriptorService } from '../../services/views/browser/viewDescriptorService.js';
suite('TreeView', function () {
    let treeView;
    let largestBatchSize = 0;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        largestBatchSize = 0;
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const viewDescriptorService = disposables.add(instantiationService.createInstance(ViewDescriptorService));
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        treeView = disposables.add(instantiationService.createInstance(TreeView, 'testTree', 'Test Title'));
        const getChildrenOfItem = async (element) => {
            if (element) {
                return undefined;
            }
            else {
                const rootChildren = [];
                for (let i = 0; i < 100; i++) {
                    rootChildren.push({ handle: `item_${i}`, collapsibleState: TreeItemCollapsibleState.Expanded });
                }
                return rootChildren;
            }
        };
        treeView.dataProvider = {
            getChildren: getChildrenOfItem,
            getChildrenBatch: async (elements) => {
                if (elements && elements.length > largestBatchSize) {
                    largestBatchSize = elements.length;
                }
                if (elements) {
                    return Array(elements.length).fill([]);
                }
                else {
                    return [(await getChildrenOfItem()) ?? []];
                }
            }
        };
    });
    test('children are batched', async () => {
        assert.strictEqual(largestBatchSize, 0);
        treeView.setVisibility(true);
        await treeView.refresh();
        assert.strictEqual(largestBatchSize, 100);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZXZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3RyZWV2aWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUUzRSxPQUFPLEVBQWEsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNwRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUU5RixLQUFLLENBQUMsVUFBVSxFQUFFO0lBRWpCLElBQUksUUFBa0IsQ0FBQztJQUN2QixJQUFJLGdCQUFnQixHQUFXLENBQUMsQ0FBQztJQUVqQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixnQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDckIsTUFBTSxvQkFBb0IsR0FBNkIsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzdHLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQzFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3pFLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsT0FBbUIsRUFBb0MsRUFBRTtZQUN6RixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFlBQVksR0FBZ0IsRUFBRSxDQUFDO2dCQUNyQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzlCLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRyxDQUFDO2dCQUNELE9BQU8sWUFBWSxDQUFDO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixRQUFRLENBQUMsWUFBWSxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFFBQXNCLEVBQXNDLEVBQUU7Z0JBQ3RGLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDcEQsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDcEMsQ0FBQztnQkFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsQ0FBQyxNQUFNLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLE1BQU0sUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFHSixDQUFDLENBQUMsQ0FBQyJ9