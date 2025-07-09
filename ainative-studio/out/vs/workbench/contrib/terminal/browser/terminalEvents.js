/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DynamicListEventMultiplexer, Event, EventMultiplexer } from '../../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
export function createInstanceCapabilityEventMultiplexer(currentInstances, onAddInstance, onRemoveInstance, capabilityId, getEvent) {
    const store = new DisposableStore();
    const multiplexer = store.add(new EventMultiplexer());
    const capabilityListeners = store.add(new DisposableMap());
    function addCapability(instance, capability) {
        const listener = multiplexer.add(Event.map(getEvent(capability), data => ({ instance, data })));
        let instanceCapabilityListeners = capabilityListeners.get(instance.instanceId);
        if (!instanceCapabilityListeners) {
            instanceCapabilityListeners = new DisposableMap();
            capabilityListeners.set(instance.instanceId, instanceCapabilityListeners);
        }
        instanceCapabilityListeners.set(capability, listener);
    }
    // Existing instances
    for (const instance of currentInstances) {
        const capability = instance.capabilities.get(capabilityId);
        if (capability) {
            addCapability(instance, capability);
        }
    }
    // Removed instances
    store.add(onRemoveInstance(instance => {
        capabilityListeners.deleteAndDispose(instance.instanceId);
    }));
    // Added capabilities
    const addCapabilityMultiplexer = store.add(new DynamicListEventMultiplexer(currentInstances, onAddInstance, onRemoveInstance, instance => Event.map(instance.capabilities.onDidAddCapability, changeEvent => ({ instance, changeEvent }))));
    store.add(addCapabilityMultiplexer.event(e => {
        if (e.changeEvent.id === capabilityId) {
            addCapability(e.instance, e.changeEvent.capability);
        }
    }));
    // Removed capabilities
    const removeCapabilityMultiplexer = store.add(new DynamicListEventMultiplexer(currentInstances, onAddInstance, onRemoveInstance, instance => Event.map(instance.capabilities.onDidRemoveCapability, changeEvent => ({ instance, changeEvent }))));
    store.add(removeCapabilityMultiplexer.event(e => {
        if (e.changeEvent.id === capabilityId) {
            capabilityListeners.get(e.instance.instanceId)?.deleteAndDispose(e.changeEvent.id);
        }
    }));
    return {
        dispose: () => store.dispose(),
        event: multiplexer.event
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFdmVudHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEV2ZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFnQyxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFHbkcsTUFBTSxVQUFVLHdDQUF3QyxDQUN2RCxnQkFBcUMsRUFDckMsYUFBdUMsRUFDdkMsZ0JBQTBDLEVBQzFDLFlBQWUsRUFDZixRQUFpRTtJQUVqRSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ3BDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBNEMsQ0FBQyxDQUFDO0lBQ2hHLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGFBQWEsRUFBcUUsQ0FBQyxDQUFDO0lBRTlILFNBQVMsYUFBYSxDQUFDLFFBQTJCLEVBQUUsVUFBeUM7UUFDNUYsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEcsSUFBSSwyQkFBMkIsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQywyQkFBMkIsRUFB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