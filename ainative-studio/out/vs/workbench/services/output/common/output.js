/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Mime type used by the output editor.
 */
export const OUTPUT_MIME = 'text/x-code-output';
/**
 * Id used by the output editor.
 */
export const OUTPUT_MODE_ID = 'Log';
/**
 * Mime type used by the log output editor.
 */
export const LOG_MIME = 'text/x-code-log-output';
/**
 * Id used by the log output editor.
 */
export const LOG_MODE_ID = 'log';
/**
 * Output view id
 */
export const OUTPUT_VIEW_ID = 'workbench.panel.output';
export const CONTEXT_IN_OUTPUT = new RawContextKey('inOutput', false);
export const CONTEXT_ACTIVE_FILE_OUTPUT = new RawContextKey('activeLogOutput', false);
export const CONTEXT_ACTIVE_LOG_FILE_OUTPUT = new RawContextKey('activeLogOutput.isLog', false);
export const CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE = new RawContextKey('activeLogOutput.levelSettable', false);
export const CONTEXT_ACTIVE_OUTPUT_LEVEL = new RawContextKey('activeLogOutput.level', '');
export const CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT = new RawContextKey('activeLogOutput.levelIsDefault', false);
export const CONTEXT_OUTPUT_SCROLL_LOCK = new RawContextKey(`outputView.scrollLock`, false);
export const ACTIVE_OUTPUT_CHANNEL_CONTEXT = new RawContextKey('activeOutputChannel', '');
export const SHOW_TRACE_FILTER_CONTEXT = new RawContextKey('output.filter.trace', true);
export const SHOW_DEBUG_FILTER_CONTEXT = new RawContextKey('output.filter.debug', true);
export const SHOW_INFO_FILTER_CONTEXT = new RawContextKey('output.filter.info', true);
export const SHOW_WARNING_FILTER_CONTEXT = new RawContextKey('output.filter.warning', true);
export const SHOW_ERROR_FILTER_CONTEXT = new RawContextKey('output.filter.error', true);
export const OUTPUT_FILTER_FOCUS_CONTEXT = new RawContextKey('outputFilterFocus', false);
export const HIDE_CATEGORY_FILTER_CONTEXT = new RawContextKey('output.filter.categories', '');
export const IOutputService = createDecorator('outputService');
export var OutputChannelUpdateMode;
(function (OutputChannelUpdateMode) {
    OutputChannelUpdateMode[OutputChannelUpdateMode["Append"] = 1] = "Append";
    OutputChannelUpdateMode[OutputChannelUpdateMode["Replace"] = 2] = "Replace";
    OutputChannelUpdateMode[OutputChannelUpdateMode["Clear"] = 3] = "Clear";
})(OutputChannelUpdateMode || (OutputChannelUpdateMode = {}));
export const Extensions = {
    OutputChannels: 'workbench.contributions.outputChannels'
};
export function isSingleSourceOutputChannelDescriptor(descriptor) {
    return !!descriptor.source && !Array.isArray(descriptor.source);
}
export function isMultiSourceOutputChannelDescriptor(descriptor) {
    return Array.isArray(descriptor.source);
}
class OutputChannelRegistry {
    constructor() {
        this.channels = new Map();
        this._onDidRegisterChannel = new Emitter();
        this.onDidRegisterChannel = this._onDidRegisterChannel.event;
        this._onDidRemoveChannel = new Emitter();
        this.onDidRemoveChannel = this._onDidRemoveChannel.event;
        this._onDidUpdateChannelFiles = new Emitter();
        this.onDidUpdateChannelSources = this._onDidUpdateChannelFiles.event;
    }
    registerChannel(descriptor) {
        if (!this.channels.has(descriptor.id)) {
            this.channels.set(descriptor.id, descriptor);
            this._onDidRegisterChannel.fire(descriptor.id);
        }
    }
    getChannels() {
        const result = [];
        this.channels.forEach(value => result.push(value));
        return result;
    }
    getChannel(id) {
        return this.channels.get(id);
    }
    updateChannelSources(id, sources) {
        const channel = this.channels.get(id);
        if (channel && isMultiSourceOutputChannelDescriptor(channel)) {
            channel.source = sources;
            this._onDidUpdateChannelFiles.fire(channel);
        }
    }
    removeChannel(id) {
        const channel = this.channels.get(id);
        if (channel) {
            this.channels.delete(id);
            this._onDidRemoveChannel.fire(channel);
        }
    }
}
Registry.add(Extensions.OutputChannels, new OutputChannelRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9vdXRwdXQvY29tbW9uL291dHB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJN0Y7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUM7QUFFaEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDO0FBRWpEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQztBQUVqQzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQUV2RCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDL0UsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxhQUFhLENBQVUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDL0YsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsSUFBSSxhQUFhLENBQVUsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDekcsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQVUsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDdkgsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxhQUFhLENBQVMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbEcsTUFBTSxDQUFDLE1BQU0sc0NBQXNDLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDMUgsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxhQUFhLENBQVUsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDckcsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQVMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbEcsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQVUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDakcsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQVUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDakcsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxhQUFhLENBQVUsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDL0YsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxhQUFhLENBQVUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckcsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQVUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDakcsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxhQUFhLENBQVUsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEcsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxhQUFhLENBQVMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFldEcsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFH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