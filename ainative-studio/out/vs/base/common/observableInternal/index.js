/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// This is a facade for the observable implementation. Only import from here!
export { observableValueOpts } from './api.js';
export { autorun, autorunDelta, autorunHandleChanges, autorunOpts, autorunWithStore, autorunWithStoreHandleChanges } from './autorun.js';
export { asyncTransaction, disposableObservableValue, globalTransaction, observableValue, subtransaction, transaction, TransactionImpl, } from './base.js';
export { derived, derivedDisposable, derivedHandleChanges, derivedOpts, derivedWithSetter, derivedWithStore } from './derived.js';
export { ObservableLazy, ObservableLazyPromise, ObservablePromise, PromiseResult, } from './promise.js';
export { derivedWithCancellationToken, waitForState } from './utilsCancellation.js';
export { constObservable, debouncedObservableDeprecated, derivedConstOnceDefined, derivedObservableWithCache, derivedObservableWithWritableCache, keepObserved, latestChangedValue, mapObservableArrayCached, observableFromEvent, observableFromEventOpts, observableFromPromise, observableFromValueWithChangeEvent, observableSignal, observableSignalFromEvent, recomputeInitiallyAndOnChange, runOnChange, runOnChangeWithStore, signalFromObservable, ValueWithChangeEventFromObservable, wasEventTriggeredRecently, } from './utils.js';
import { addLogger, setLogObservableFn } from './logging/logging.js';
import { ConsoleObservableLogger, logObservableToConsole } from './logging/consoleObservableLogger.js';
import { DevToolsLogger } from './logging/debugger/devToolsLogger.js';
import { env } from '../process.js';
setLogObservableFn(logObservableToConsole);
// Remove "//" in the next line to enable logging
const enableLogging = false;
if (enableLogging) {
    addLogger(new ConsoleObservableLogger());
}
if (env && env['VSCODE_DEV_DEBUG']) {
    // To debug observables you also need the extension "ms-vscode.debug-value-editor"
    addLogger(DevToolsLogger.getInstance());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZFQUE2RTtBQUU3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxlQUFlLEdBQXNMLE1BQU0sV0FBVyxDQUFDO0FBQzlVLE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLDZCQUE2QixFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLGtDQUFrQyxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxxQkFBcUIsRUFBRSxrQ0FBa0MsRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsa0NBQWtDLEVBQUUseUJBQXlCLEdBQTJCLE1BQU0sWUFBWSxDQUFDO0FBR3ZpQixPQUFPLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFcEMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUUzQyxpREFBaUQ7QUFDakQsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUV6QjtBQUVGLElBQUksYUFBYSxFQUFFLENBQUM7SUFDbkIsU0FBUyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFFRCxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO0lBQ3BDLGtGQUFrRjtJQUNsRixTQUFTLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDekMsQ0FBQyJ9