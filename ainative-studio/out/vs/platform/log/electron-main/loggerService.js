/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceMap } from '../../../base/common/map.js';
import { Event } from '../../../base/common/event.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { ILoggerService, isLogLevel } from '../common/log.js';
import { LoggerService } from '../node/loggerService.js';
export const ILoggerMainService = refineServiceDecorator(ILoggerService);
export class LoggerMainService extends LoggerService {
    constructor() {
        super(...arguments);
        this.loggerResourcesByWindow = new ResourceMap();
    }
    createLogger(idOrResource, options, windowId) {
        if (windowId !== undefined) {
            this.loggerResourcesByWindow.set(this.toResource(idOrResource), windowId);
        }
        try {
            return super.createLogger(idOrResource, options);
        }
        catch (error) {
            this.loggerResourcesByWindow.delete(this.toResource(idOrResource));
            throw error;
        }
    }
    registerLogger(resource, windowId) {
        if (windowId !== undefined) {
            this.loggerResourcesByWindow.set(resource.resource, windowId);
        }
        super.registerLogger(resource);
    }
    deregisterLogger(resource) {
        this.loggerResourcesByWindow.delete(resource);
        super.deregisterLogger(resource);
    }
    getGlobalLoggers() {
        const resources = [];
        for (const resource of super.getRegisteredLoggers()) {
            if (!this.loggerResourcesByWindow.has(resource.resource)) {
                resources.push(resource);
            }
        }
        return resources;
    }
    getOnDidChangeLogLevelEvent(windowId) {
        return Event.filter(this.onDidChangeLogLevel, arg => isLogLevel(arg) || this.isInterestedLoggerResource(arg[0], windowId));
    }
    getOnDidChangeVisibilityEvent(windowId) {
        return Event.filter(this.onDidChangeVisibility, ([resource]) => this.isInterestedLoggerResource(resource, windowId));
    }
    getOnDidChangeLoggersEvent(windowId) {
        return Event.filter(Event.map(this.onDidChangeLoggers, e => {
            const r = {
                added: [...e.added].filter(loggerResource => this.isInterestedLoggerResource(loggerResource.resource, windowId)),
                removed: [...e.removed].filter(loggerResource => this.isInterestedLoggerResource(loggerResource.resource, windowId)),
            };
            return r;
        }), e => e.added.length > 0 || e.removed.length > 0);
    }
    deregisterLoggers(windowId) {
        for (const [resource, resourceWindow] of this.loggerResourcesByWindow) {
            if (resourceWindow === windowId) {
                this.deregisterLogger(resource);
            }
        }
    }
    isInterestedLoggerResource(resource, windowId) {
        const loggerWindowId = this.loggerResourcesByWindow.get(resource);
        return loggerWindowId === undefined || loggerWindowId === windowId;
    }
    dispose() {
        super.dispose();
        this.loggerResourcesByWindow.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvZWxlY3Ryb24tbWFpbi9sb2dnZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDckYsT0FBTyxFQUFtRSxjQUFjLEVBQVksVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXpELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLHNCQUFzQixDQUFxQyxjQUFjLENBQUMsQ0FBQztBQXNCN0csTUFBTSxPQUFPLGlCQUFrQixTQUFRLGFBQWE7SUFBcEQ7O1FBRWtCLDRCQUF1QixHQUFHLElBQUksV0FBVyxFQUFVLENBQUM7SUF3RXRFLENBQUM7SUF0RVMsWUFBWSxDQUFDLFlBQTBCLEVBQUUsT0FBd0IsRUFBRSxRQUFpQjtRQUM1RixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE9BQU8sS0FBSyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLHVC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