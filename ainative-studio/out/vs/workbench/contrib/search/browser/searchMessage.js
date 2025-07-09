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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hNZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDeEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFHM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3hGLE9BQU8sRUFBNkIsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUU3SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxDQUNsQyxPQUFrQyxFQUNsQyxvQkFBMkMsRUFDM0MsbUJBQXlDLEVBQ3pDLGFBQTZCLEVBQzdCLGNBQStCLEVBQy9CLGVBQWdDLEVBQ2hDLGFBQXlCLEVBQ1gsRUFBRTtJQUNoQixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDekMsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqRCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFDYixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUc7UUFDUixZQUFZLENBQUMsU0FBUyxDQUNyQixPQUFPLENBQUMsSUFBSSxLQUFLLDZCQUE2QixDQUFDLFdBQVc7WUFDekQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQ2YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7YUFDbkIsS0FBSyxDQUFDLEdBQUcsQ0FBQzthQUNWLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFaEIsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7Z0JBQ2pFLE1BQU0sRUFBRSxLQUFLLEVBQUMsSUFBSSxFQUFDLEVBQUU7b0JBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQUMsT0FBTztvQkFBQyxDQUFDO29CQUNqQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDckMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUMxRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNoRSxJQUFLLE1BQWMsRUFBRSxhQUFhLEVBQUUsQ0FBQzs0QkFDcEMsYUFBYSxFQUFFLENBQUM7d0JBQ2pCLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUM1QyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM1QixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7NEJBQzNELG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHdEQUF3RCxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2pJLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUNyRyxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUMsQ0FBQztZQUNILGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUMsQ0FBQyJ9