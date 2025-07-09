/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHotReloadEnabled, registerHotReloadHandler } from './hotReload.js';
import { constObservable, observableSignalFromEvent, observableValue } from './observable.js';
export function readHotReloadableExport(value, reader) {
    observeHotReloadableExports([value], reader);
    return value;
}
export function observeHotReloadableExports(values, reader) {
    if (isHotReloadEnabled()) {
        const o = observableSignalFromEvent('reload', event => registerHotReloadHandler(({ oldExports }) => {
            if (![...Object.values(oldExports)].some(v => values.includes(v))) {
                return undefined;
            }
            return (_newExports) => {
                event(undefined);
                return true;
            };
        }));
        o.read(reader);
    }
}
const classes = new Map();
export function createHotClass(clazz) {
    if (!isHotReloadEnabled()) {
        return constObservable(clazz);
    }
    const id = clazz.name;
    let existing = classes.get(id);
    if (!existing) {
        existing = observableValue(id, clazz);
        classes.set(id, existing);
    }
    else {
        setTimeout(() => {
            existing.set(clazz, undefined);
        }, 0);
    }
    return existing;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG90UmVsb2FkSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9ob3RSZWxvYWRIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQTZDLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXpJLE1BQU0sVUFBVSx1QkFBdUIsQ0FBSSxLQUFRLEVBQUUsTUFBMkI7SUFDL0UsMkJBQTJCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsTUFBYSxFQUFFLE1BQTJCO0lBQ3JGLElBQUksa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxHQUFHLHlCQUF5QixDQUNsQyxRQUFRLEVBQ1IsS0FBSyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTtZQUNwRCxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbkUsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNqQixPQUFPLElBQUksQ0FBQztZQUNiLENBQUMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUNGLENBQUM7UUFDRixDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7QUFFaEUsTUFBTSxVQUFVLGNBQWMsQ0FBSSxLQUFRO0lBQ3pDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7UUFDM0IsT0FBTyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sRUFBRSxHQUFJLEtBQWEsQ0FBQyxJQUFJLENBQUM7SUFFL0IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixRQUFRLEdBQUcsZUFBZSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMzQixDQUFDO1NBQU0sQ0FBQztRQUNQLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixRQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQ0QsT0FBTyxRQUEwQixDQUFDO0FBQ25DLENBQUMifQ==