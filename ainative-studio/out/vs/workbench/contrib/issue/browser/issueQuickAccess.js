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
var IssueQuickAccess_1;
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IssueSource } from '../common/issue.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let IssueQuickAccess = class IssueQuickAccess extends PickerQuickAccessProvider {
    static { IssueQuickAccess_1 = this; }
    static { this.PREFIX = 'issue '; }
    constructor(menuService, contextKeyService, commandService, extensionService, productService) {
        super(IssueQuickAccess_1.PREFIX, { canAcceptInBackground: true });
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.commandService = commandService;
        this.extensionService = extensionService;
        this.productService = productService;
    }
    _getPicks(filter) {
        const issuePicksConst = new Array();
        const issuePicksParts = new Array();
        const extensionIdSet = new Set();
        // Add default items
        const productLabel = this.productService.nameLong;
        const marketPlaceLabel = localize("reportExtensionMarketplace", "Extension Marketplace");
        const productFilter = matchesFuzzy(filter, productLabel, true);
        const marketPlaceFilter = matchesFuzzy(filter, marketPlaceLabel, true);
        // Add product pick if product filter matches
        if (productFilter) {
            issuePicksConst.push({
                label: productLabel,
                ariaLabel: productLabel,
                highlights: { label: productFilter },
                accept: () => this.commandService.executeCommand('workbench.action.openIssueReporter', { issueSource: IssueSource.VSCode })
            });
        }
        // Add marketplace pick if marketplace filter matches
        if (marketPlaceFilter) {
            issuePicksConst.push({
                label: marketPlaceLabel,
                ariaLabel: marketPlaceLabel,
                highlights: { label: marketPlaceFilter },
                accept: () => this.commandService.executeCommand('workbench.action.openIssueReporter', { issueSource: IssueSource.Marketplace })
            });
        }
        issuePicksConst.push({ type: 'separator', label: localize('extensions', "Extensions") });
        // gets menu actions from contributed
        const actions = this.menuService.getMenuActions(MenuId.IssueReporter, this.contextKeyService, { renderShortTitle: true }).flatMap(entry => entry[1]);
        // create picks from contributed menu
        actions.forEach(action => {
            if ('source' in action.item && action.item.source) {
                extensionIdSet.add(action.item.source.id);
            }
            const pick = this._createPick(filter, action);
            if (pick) {
                issuePicksParts.push(pick);
            }
        });
        // create picks from extensions
        this.extensionService.extensions.forEach(extension => {
            if (!extension.isBuiltin) {
                const pick = this._createPick(filter, undefined, extension);
                const id = extension.identifier.value;
                if (pick && !extensionIdSet.has(id)) {
                    issuePicksParts.push(pick);
                }
                extensionIdSet.add(id);
            }
        });
        issuePicksParts.sort((a, b) => {
            const aLabel = a.label ?? '';
            const bLabel = b.label ?? '';
            return aLabel.localeCompare(bLabel);
        });
        return [...issuePicksConst, ...issuePicksParts];
    }
    _createPick(filter, action, extension) {
        const buttons = [{
                iconClass: ThemeIcon.asClassName(Codicon.info),
                tooltip: localize('contributedIssuePage', "Open Extension Page")
            }];
        let label;
        let trigger;
        let accept;
        if (action && 'source' in action.item && action.item.source) {
            label = action.item.source?.title;
            trigger = () => {
                if ('source' in action.item && action.item.source) {
                    this.commandService.executeCommand('extension.open', action.item.source.id);
                }
                return TriggerAction.CLOSE_PICKER;
            };
            accept = () => {
                action.run();
            };
        }
        else if (extension) {
            label = extension.displayName ?? extension.name;
            trigger = () => {
                this.commandService.executeCommand('extension.open', extension.identifier.value);
                return TriggerAction.CLOSE_PICKER;
            };
            accept = () => {
                this.commandService.executeCommand('workbench.action.openIssueReporter', extension.identifier.value);
            };
        }
        else {
            return undefined;
        }
        const highlights = matchesFuzzy(filter, label, true);
        if (highlights) {
            return {
                label,
                highlights: { label: highlights },
                buttons,
                trigger,
                accept
            };
        }
        return undefined;
    }
};
IssueQuickAccess = IssueQuickAccess_1 = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService),
    __param(2, ICommandService),
    __param(3, IExtensionService),
    __param(4, IProductService)
], IssueQuickAccess);
export { IssueQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9icm93c2VyL2lzc3VlUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBbUQsYUFBYSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDekssT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQXFDLE1BQU0sZ0RBQWdELENBQUM7QUFDekgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEseUJBQWlEOzthQUUvRSxXQUFNLEdBQUcsUUFBUSxBQUFYLENBQVk7SUFFekIsWUFDZ0MsV0FBeUIsRUFDbkIsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzdCLGdCQUFtQyxFQUNyQyxjQUErQjtRQUVqRSxLQUFLLENB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