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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Breakpoint, DataBreakpoint, ExceptionBreakpoint, Expression, FunctionBreakpoint } from './debugModel.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { mapValues } from '../../../../base/common/objects.js';
const DEBUG_BREAKPOINTS_KEY = 'debug.breakpoint';
const DEBUG_FUNCTION_BREAKPOINTS_KEY = 'debug.functionbreakpoint';
const DEBUG_DATA_BREAKPOINTS_KEY = 'debug.databreakpoint';
const DEBUG_EXCEPTION_BREAKPOINTS_KEY = 'debug.exceptionbreakpoint';
const DEBUG_WATCH_EXPRESSIONS_KEY = 'debug.watchexpressions';
const DEBUG_CHOSEN_ENVIRONMENTS_KEY = 'debug.chosenenvironment';
const DEBUG_UX_STATE_KEY = 'debug.uxstate';
let DebugStorage = class DebugStorage extends Disposable {
    constructor(storageService, textFileService, uriIdentityService, logService) {
        super();
        this.storageService = storageService;
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.breakpoints = observableValue(this, this.loadBreakpoints());
        this.functionBreakpoints = observableValue(this, this.loadFunctionBreakpoints());
        this.exceptionBreakpoints = observableValue(this, this.loadExceptionBreakpoints());
        this.dataBreakpoints = observableValue(this, this.loadDataBreakpoints());
        this.watchExpressions = observableValue(this, this.loadWatchExpressions());
        this._register(storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, this._store)(e => {
            if (e.external) {
                switch (e.key) {
                    case DEBUG_BREAKPOINTS_KEY:
                        return this.breakpoints.set(this.loadBreakpoints(), undefined);
                    case DEBUG_FUNCTION_BREAKPOINTS_KEY:
                        return this.functionBreakpoints.set(this.loadFunctionBreakpoints(), undefined);
                    case DEBUG_EXCEPTION_BREAKPOINTS_KEY:
                        return this.exceptionBreakpoints.set(this.loadExceptionBreakpoints(), undefined);
                    case DEBUG_DATA_BREAKPOINTS_KEY:
                        return this.dataBreakpoints.set(this.loadDataBreakpoints(), undefined);
                    case DEBUG_WATCH_EXPRESSIONS_KEY:
                        return this.watchExpressions.set(this.loadWatchExpressions(), undefined);
                }
            }
        }));
    }
    loadDebugUxState() {
        return this.storageService.get(DEBUG_UX_STATE_KEY, 1 /* StorageScope.WORKSPACE */, 'default');
    }
    storeDebugUxState(value) {
        this.storageService.store(DEBUG_UX_STATE_KEY, value, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((breakpoint) => {
                breakpoint.uri = URI.revive(breakpoint.uri);
                return new Breakpoint(breakpoint, this.textFileService, this.uriIdentityService, this.logService, breakpoint.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadFunctionBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_FUNCTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((fb) => {
                return new FunctionBreakpoint(fb, fb.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadExceptionBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_EXCEPTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((exBreakpoint) => {
                return new ExceptionBreakpoint(exBreakpoint, exBreakpoint.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadDataBreakpoints() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_DATA_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((dbp) => {
                return new DataBreakpoint(dbp, dbp.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadWatchExpressions() {
        let result;
        try {
            result = JSON.parse(this.storageService.get(DEBUG_WATCH_EXPRESSIONS_KEY, 1 /* StorageScope.WORKSPACE */, '[]')).map((watchStoredData) => {
                return new Expression(watchStoredData.name, watchStoredData.id);
            });
        }
        catch (e) { }
        return result || [];
    }
    loadChosenEnvironments() {
        const obj = JSON.parse(this.storageService.get(DEBUG_CHOSEN_ENVIRONMENTS_KEY, 1 /* StorageScope.WORKSPACE */, '{}'));
        // back compat from when this was a string map:
        return mapValues(obj, (value) => typeof value === 'string' ? { type: value } : value);
    }
    storeChosenEnvironments(environments) {
        this.storageService.store(DEBUG_CHOSEN_ENVIRONMENTS_KEY, JSON.stringify(environments), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    storeWatchExpressions(watchExpressions) {
        if (watchExpressions.length) {
            this.storageService.store(DEBUG_WATCH_EXPRESSIONS_KEY, JSON.stringify(watchExpressions.map(we => ({ name: we.name, id: we.getId() }))), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_WATCH_EXPRESSIONS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
    storeBreakpoints(debugModel) {
        const breakpoints = debugModel.getBreakpoints();
        if (breakpoints.length) {
            this.storageService.store(DEBUG_BREAKPOINTS_KEY, JSON.stringify(breakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const functionBreakpoints = debugModel.getFunctionBreakpoints();
        if (functionBreakpoints.length) {
            this.storageService.store(DEBUG_FUNCTION_BREAKPOINTS_KEY, JSON.stringify(functionBreakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_FUNCTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const dataBreakpoints = debugModel.getDataBreakpoints().filter(dbp => dbp.canPersist);
        if (dataBreakpoints.length) {
            this.storageService.store(DEBUG_DATA_BREAKPOINTS_KEY, JSON.stringify(dataBreakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_DATA_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const exceptionBreakpoints = debugModel.getExceptionBreakpoints();
        if (exceptionBreakpoints.length) {
            this.storageService.store(DEBUG_EXCEPTION_BREAKPOINTS_KEY, JSON.stringify(exceptionBreakpoints), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_EXCEPTION_BREAKPOINTS_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
};
DebugStorage = __decorate([
    __param(0, IStorageService),
    __param(1, ITextFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], DebugStorage);
export { DebugStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnU3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3RixPQUFPLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFL0QsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQztBQUNqRCxNQUFNLDhCQUE4QixHQUFHLDBCQUEwQixDQUFDO0FBQ2xFLE1BQU0sMEJBQTBCLEdBQUcsc0JBQXNCLENBQUM7QUFDMUQsTUFBTSwrQkFBK0IsR0FBRywyQkFBMkIsQ0FBQztBQUNwRSxNQUFNLDJCQUEyQixHQUFHLHdCQUF3QixDQUFDO0FBQzdELE1BQU0sNkJBQTZCLEdBQUcseUJBQXlCLENBQUM7QUFDaEUsTUFBTSxrQkFBa0IsR0FBRyxlQUFl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