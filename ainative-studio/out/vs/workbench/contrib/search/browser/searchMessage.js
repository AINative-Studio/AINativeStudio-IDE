/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import Severity from '../../../../base/common/severity.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { TextSearchCompleteMessageType } from '../../../services/search/common/searchExtTypes.js';
import { Schemas } from '../../../../base/common/network.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { URI } from '../../../../base/common/uri.js';
export const renderSearchMessage = (message, instantiationService, notificationService, openerService, commandService, disposableStore, triggerSearch) => {
    const div = dom.$('div.providerMessage');
    const linkedText = parseLinkedText(message.text);
    dom.append(div, dom.$('.' +
        SeverityIcon.className(message.type === TextSearchCompleteMessageType.Information
            ? Severity.Info
            : Severity.Warning)
            .split(' ')
            .join('.')));
    for (const node of linkedText.nodes) {
        if (typeof node === 'string') {
            dom.append(div, document.createTextNode(node));
        }
        else {
            const link = instantiationService.createInstance(Link, div, node, {
                opener: async (href) => {
                    if (!message.trusted) {
                        return;
                    }
                    const parsed = URI.parse(href, true);
                    if (parsed.scheme === Schemas.command && message.trusted) {
                        const result = await commandService.executeCommand(parsed.path);
                        if (result?.triggerSearch) {
                            triggerSearch();
                        }
                    }
                    else if (parsed.scheme === Schemas.https) {
                        openerService.open(parsed);
                    }
                    else {
                        if (parsed.scheme === Schemas.command && !message.trusted) {
                            notificationService.error(nls.localize('unable to open trust', "Unable to open command link from untrusted source: {0}", href));
                        }
                        else {
                            notificationService.error(nls.localize('unable to open', "Unable to open unknown link: {0}", href));
                        }
                    }
                }
            });
            disposableStore.add(link);
        }
    }
    return div;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaE1lc3NhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUczRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEYsT0FBTyxFQUE2Qiw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRTdILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQ2xDLE9BQWtDLEVBQ2xDLG9CQUEyQyxFQUMzQyxtQkFBeUMsRUFDekMsYUFBNkIsRUFDN0IsY0FBK0IsRUFDL0IsZUFBZ0MsRUFDaEMsYUFBeUIsRUFDWCxFQUFFO0lBQ2hCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN6QyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pELEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUNiLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRztRQUNSLFlBQVksQ0FBQyxTQUFTLENBQ3JCLE9BQU8sQ0FBQyxJQUFJLEtBQUssNkJBQTZCLENBQUMsV0FBVztZQUN6RCxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDZixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQzthQUNuQixLQUFLLENBQUMsR0FBRyxDQUFDO2FBQ1YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVoQixLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRTtnQkFDakUsTUFBTSxFQUFFLEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTtvQkFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFBQyxPQUFPO29CQUFDLENBQUM7b0JBQ2pDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNyQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQzFELE1BQU0sTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2hFLElBQUssTUFBYyxFQUFFLGFBQWEsRUFBRSxDQUFDOzRCQUNwQyxhQUFhLEVBQUUsQ0FBQzt3QkFDakIsQ0FBQztvQkFDRixDQUFDO3lCQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQzVDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVCLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQzs0QkFDM0QsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsd0RBQXdELEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDakksQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGtDQUFrQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3JHLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBQ0gsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQyxDQUFDIn0=