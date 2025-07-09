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
var MainThreadOutputService_1;
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions, IOutputService, OUTPUT_VIEW_ID, OutputChannelUpdateMode } from '../../services/output/common/output.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Event } from '../../../base/common/event.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { isNumber } from '../../../base/common/types.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IStatusbarService } from '../../services/statusbar/browser/statusbar.js';
import { localize } from '../../../nls.js';
let MainThreadOutputService = class MainThreadOutputService extends Disposable {
    static { MainThreadOutputService_1 = this; }
    static { this._extensionIdPool = new Map(); }
    constructor(extHostContext, outputService, viewsService, configurationService, statusbarService) {
        super();
        this._outputStatusItem = this._register(new MutableDisposable());
        this._outputService = outputService;
        this._viewsService = viewsService;
        this._configurationService = configurationService;
        this._statusbarService = statusbarService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostOutputService);
        const setVisibleChannel = () => {
            const visibleChannel = this._viewsService.isViewVisible(OUTPUT_VIEW_ID) ? this._outputService.getActiveChannel() : undefined;
            this._proxy.$setVisibleChannel(visibleChannel ? visibleChannel.id : null);
            this._outputStatusItem.value = undefined;
        };
        this._register(Event.any(this._outputService.onActiveOutputChannel, Event.filter(this._viewsService.onDidChangeViewVisibility, ({ id }) => id === OUTPUT_VIEW_ID))(() => setVisibleChannel()));
        setVisibleChannel();
    }
    async $register(label, file, languageId, extensionId) {
        const idCounter = (MainThreadOutputService_1._extensionIdPool.get(extensionId) || 0) + 1;
        MainThreadOutputService_1._extensionIdPool.set(extensionId, idCounter);
        const id = `extension-output-${extensionId}-#${idCounter}-${label}`;
        const resource = URI.revive(file);
        Registry.as(Extensions.OutputChannels).registerChannel({ id, label, source: { resource }, log: false, languageId, extensionId });
        this._register(toDisposable(() => this.$dispose(id)));
        return id;
    }
    async $update(channelId, mode, till) {
        const channel = this._getChannel(channelId);
        if (channel) {
            if (mode === OutputChannelUpdateMode.Append) {
                channel.update(mode);
            }
            else if (isNumber(till)) {
                channel.update(mode, till);
            }
        }
    }
    async $reveal(channelId, preserveFocus) {
        const channel = this._getChannel(channelId);
        if (!channel) {
            return;
        }
        const viewsToShowQuietly = this._configurationService.getValue('workbench.view.showQuietly') ?? {};
        if (!this._viewsService.isViewVisible(OUTPUT_VIEW_ID) && viewsToShowQuietly[OUTPUT_VIEW_ID]) {
            this._showChannelQuietly(channel);
            return;
        }
        this._outputService.showChannel(channel.id, preserveFocus);
    }
    // Show status bar indicator
    _showChannelQuietly(channel) {
        const statusProperties = {
            name: localize('status.showOutput', "Show Output"),
            text: '$(output)',
            ariaLabel: localize('status.showOutputAria', "Show {0} Output Channel", channel.label),
            command: `workbench.action.output.show.${channel.id}`,
            tooltip: localize('status.showOutputTooltip', "Show {0} Output Channel", channel.label),
            kind: 'prominent'
        };
        if (!this._outputStatusItem.value) {
            this._outputStatusItem.value = this._statusbarService.addEntry(statusProperties, 'status.view.showQuietly', 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.notifications', priority: Number.NEGATIVE_INFINITY }, alignment: 0 /* StatusbarAlignment.LEFT */ });
        }
        else {
            this._outputStatusItem.value.update(statusProperties);
        }
    }
    async $close(channelId) {
        if (this._viewsService.isViewVisible(OUTPUT_VIEW_ID)) {
            const activeChannel = this._outputService.getActiveChannel();
            if (activeChannel && channelId === activeChannel.id) {
                this._viewsService.closeView(OUTPUT_VIEW_ID);
            }
        }
    }
    async $dispose(channelId) {
        const channel = this._getChannel(channelId);
        channel?.dispose();
    }
    _getChannel(channelId) {
        return this._outputService.getChannel(channelId);
    }
};
MainThreadOutputService = MainThreadOutputService_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadOutputService),
    __param(1, IOutputService),
    __param(2, IViewsService),
    __param(3, IConfigurationService),
    __param(4, IStatusbarService)
], MainThreadOutputService);
export { MainThreadOutputService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE91dHB1dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRPdXRwdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBMEIsY0FBYyxFQUFrQixjQUFjLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNySyxPQUFPLEVBQWdDLFdBQVcsRUFBNkIsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckksT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBaUIsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQTRDLGlCQUFpQixFQUFzQixNQUFNLCtDQUErQyxDQUFDO0FBQ2hKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUdwQyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O2FBRXZDLHFCQUFnQixHQUFH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