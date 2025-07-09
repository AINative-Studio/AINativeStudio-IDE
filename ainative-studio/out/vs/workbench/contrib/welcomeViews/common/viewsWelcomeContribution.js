/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ViewIdentifierMap } from './viewsWelcomeExtensionPoint.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewContainerExtensions } from '../../../common/views.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
export class ViewsWelcomeContribution extends Disposable {
    constructor(extensionPoint) {
        super();
        this.viewWelcomeContents = new Map();
        extensionPoint.setHandler((_, { added, removed }) => {
            for (const contribution of removed) {
                for (const welcome of contribution.value) {
                    const disposable = this.viewWelcomeContents.get(welcome);
                    disposable?.dispose();
                }
            }
            const welcomesByViewId = new Map();
            for (const contribution of added) {
                for (const welcome of contribution.value) {
                    const { group, order } = parseGroupAndOrder(welcome, contribution);
                    const precondition = ContextKeyExpr.deserialize(welcome.enablement);
                    const id = ViewIdentifierMap[welcome.view] ?? welcome.view;
                    let viewContentMap = welcomesByViewId.get(id);
                    if (!viewContentMap) {
                        viewContentMap = new Map();
                        welcomesByViewId.set(id, viewContentMap);
                    }
                    viewContentMap.set(welcome, {
                        content: welcome.contents,
                        when: ContextKeyExpr.deserialize(welcome.when),
                        precondition,
                        group,
                        order
                    });
                }
            }
            for (const [id, viewContentMap] of welcomesByViewId) {
                const disposables = viewsRegistry.registerViewWelcomeContent2(id, viewContentMap);
                for (const [welcome, disposable] of disposables) {
                    this.viewWelcomeContents.set(welcome, disposable);
                }
            }
        });
    }
}
function parseGroupAndOrder(welcome, contribution) {
    let group;
    let order;
    if (welcome.group) {
        if (!isProposedApiEnabled(contribution.description, 'contribViewsWelcome')) {
            contribution.collector.warn(nls.localize('ViewsWelcomeExtensionPoint.proposedAPI', "The viewsWelcome contribution in '{0}' requires 'enabledApiProposals: [\"contribViewsWelcome\"]' in order to use the 'group' proposed property.", contribution.description.identifier.value));
            return { group, order };
        }
        const idx = welcome.group.lastIndexOf('@');
        if (idx > 0) {
            group = welcome.group.substr(0, idx);
            order = Number(welcome.group.substr(idx + 1)) || undefined;
        }
        else {
            group = welcome.group;
        }
    }
    return { group, order };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVWaWV3cy9jb21tb24vdmlld3NXZWxjb21lQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RixPQUFPLEVBQTJDLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksdUJBQXVCLEVBQTBDLE1BQU0sMEJBQTBCLENBQUM7QUFDekgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFekYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBaUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFekYsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQVU7SUFJdkQsWUFBWSxjQUEyRDtRQUN0RSxLQUFLLEVBQUUsQ0FBQztRQUhELHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBS2pFLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtZQUNuRCxLQUFLLE1BQU0sWUFBWSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNwQyxLQUFLLE1BQU0sT0FBTyxJQUFJLFlBQVksQ0FBQyxLQUFL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