/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorunOpts, observableFromEventOpts } from '../../../base/common/observable.js';
/** Creates an observable update when a configuration key updates. */
export function observableConfigValue(key, defaultValue, configurationService) {
    return observableFromEventOpts({ debugName: () => `Configuration Key "${key}"`, }, (handleChange) => configurationService.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(key)) {
            handleChange(e);
        }
    }), () => configurationService.getValue(key) ?? defaultValue);
}
/** Update the configuration key with a value derived from observables. */
export function bindContextKey(key, service, computeValue) {
    const boundKey = key.bindTo(service);
    return autorunOpts({ debugName: () => `Set Context Key "${key.key}"` }, reader => {
        boundKey.set(computeValue(reader));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb2JzZXJ2YWJsZS9jb21tb24vcGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBd0IsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUloSCxxRUFBcUU7QUFDckUsTUFBTSxVQUFVLHFCQUFxQixDQUFJLEdBQVcsRUFBRSxZQUFlLEVBQUUsb0JBQTJDO0lBQ2pILE9BQU8sdUJBQXVCLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxHQUFHLEVBQ2hGLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNuRSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLEVBQ0YsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFJLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FDM0QsQ0FBQztBQUNILENBQUM7QUFFRCwwRUFBMEU7QUFDMUUsTUFBTSxVQUFVLGNBQWMsQ0FBNEIsR0FBcUIsRUFBRSxPQUEyQixFQUFFLFlBQW9DO0lBQ2pKLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsT0FBTyxXQUFXLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ2hGLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=