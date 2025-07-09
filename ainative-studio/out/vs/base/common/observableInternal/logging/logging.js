/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let globalObservableLogger;
export function addLogger(logger) {
    if (!globalObservableLogger) {
        globalObservableLogger = logger;
    }
    else if (globalObservableLogger instanceof ComposedLogger) {
        globalObservableLogger.loggers.push(logger);
    }
    else {
        globalObservableLogger = new ComposedLogger([globalObservableLogger, logger]);
    }
}
export function getLogger() {
    return globalObservableLogger;
}
let globalObservableLoggerFn = undefined;
export function setLogObservableFn(fn) {
    globalObservableLoggerFn = fn;
}
export function logObservable(obs) {
    if (globalObservableLoggerFn) {
        globalObservableLoggerFn(obs);
    }
}
class ComposedLogger {
    constructor(loggers) {
        this.loggers = loggers;
    }
    handleObservableCreated(observable) {
        for (const logger of this.loggers) {
            logger.handleObservableCreated(observable);
        }
    }
    handleOnListenerCountChanged(observable, newCount) {
        for (const logger of this.loggers) {
            logger.handleOnListenerCountChanged(observable, newCount);
        }
    }
    handleObservableUpdated(observable, info) {
        for (const logger of this.loggers) {
            logger.handleObservableUpdated(observable, info);
        }
    }
    handleAutorunCreated(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunCreated(autorun);
        }
    }
    handleAutorunDisposed(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunDisposed(autorun);
        }
    }
    handleAutorunDependencyChanged(autorun, observable, change) {
        for (const logger of this.loggers) {
            logger.handleAutorunDependencyChanged(autorun, observable, change);
        }
    }
    handleAutorunStarted(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunStarted(autorun);
        }
    }
    handleAutorunFinished(autorun) {
        for (const logger of this.loggers) {
            logger.handleAutorunFinished(autorun);
        }
    }
    handleDerivedDependencyChanged(derived, observable, change) {
        for (const logger of this.loggers) {
            logger.handleDerivedDependencyChanged(derived, observable, change);
        }
    }
    handleDerivedCleared(observable) {
        for (const logger of this.loggers) {
            logger.handleDerivedCleared(observable);
        }
    }
    handleBeginTransaction(transaction) {
        for (const logger of this.loggers) {
            logger.handleBeginTransaction(transaction);
        }
    }
    handleEndTransaction(transaction) {
        for (const logger of this.loggers) {
            logger.handleEndTransaction(transaction);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9sb2dnaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLElBQUksc0JBQXFELENBQUM7QUFFMUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxNQUF5QjtJQUNsRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM3QixzQkFBc0IsR0FBRyxNQUFNLENBQUM7SUFDakMsQ0FBQztTQUFNLElBQUksc0JBQXNCLFlBQVksY0FBYyxFQUFFLENBQUM7UUFDN0Qsc0JBQXNCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3QyxDQUFDO1NBQU0sQ0FBQztRQUNQLHNCQUFzQixHQUFHLElBQUksY0FBYyxDQUFDLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxTQUFTO0lBQ3hCLE9BQU8sc0JBQXNCLENBQUM7QUFDL0IsQ0FBQztBQUVELElBQUksd0JBQXdCLEdBQWtELFNBQVMsQ0FBQztBQUN4RixNQUFNLFVBQVUsa0JBQWtCLENBQUMsRUFBbUM7SUFDckUsd0JBQXdCLEdBQUcsRUFBRSxDQUFDO0FBQy9CLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQXFCO0lBQ2xELElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUM5Qix3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQixDQUFDO0FBQ0YsQ0FBQztBQTZCRCxNQUFNLGNBQWM7SUFDbkIsWUFDaUIsT0FBNEI7UUFBNUIsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7SUFDekMsQ0FBQztJQUVMLHVCQUF1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