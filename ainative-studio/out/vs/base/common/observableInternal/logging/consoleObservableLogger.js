/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Derived } from '../derived.js';
import { addLogger } from './logging.js';
import { getClassName } from '../debugName.js';
let consoleObservableLogger;
export function logObservableToConsole(obs) {
    if (!consoleObservableLogger) {
        consoleObservableLogger = new ConsoleObservableLogger();
        addLogger(consoleObservableLogger);
    }
    consoleObservableLogger.addFilteredObj(obs);
}
export class ConsoleObservableLogger {
    constructor() {
        this.indentation = 0;
        this.changedObservablesSets = new WeakMap();
    }
    addFilteredObj(obj) {
        if (!this._filteredObjects) {
            this._filteredObjects = new Set();
        }
        this._filteredObjects.add(obj);
    }
    _isIncluded(obj) {
        return this._filteredObjects?.has(obj) ?? true;
    }
    textToConsoleArgs(text) {
        return consoleTextToArgs([
            normalText(repeat('|  ', this.indentation)),
            text,
        ]);
    }
    formatInfo(info) {
        if (!info.hadValue) {
            return [
                normalText(` `),
                styled(formatValue(info.newValue, 60), {
                    color: 'green',
                }),
                normalText(` (initial)`),
            ];
        }
        return info.didChange
            ? [
                normalText(` `),
                styled(formatValue(info.oldValue, 70), {
                    color: 'red',
                    strikeThrough: true,
                }),
                normalText(` `),
                styled(formatValue(info.newValue, 60), {
                    color: 'green',
                }),
            ]
            : [normalText(` (unchanged)`)];
    }
    handleObservableCreated(observable) {
        if (observable instanceof Derived) {
            const derived = observable;
            this.changedObservablesSets.set(derived, new Set());
            const debugTrackUpdating = false;
            if (debugTrackUpdating) {
                const updating = [];
                derived.__debugUpdating = updating;
                const existingBeginUpdate = derived.beginUpdate;
                derived.beginUpdate = (obs) => {
                    updating.push(obs);
                    return existingBeginUpdate.apply(derived, [obs]);
                };
                const existingEndUpdate = derived.endUpdate;
                derived.endUpdate = (obs) => {
                    const idx = updating.indexOf(obs);
                    if (idx === -1) {
                        console.error('endUpdate called without beginUpdate', derived.debugName, obs.debugName);
                    }
                    updating.splice(idx, 1);
                    return existingEndUpdate.apply(derived, [obs]);
                };
            }
        }
    }
    handleOnListenerCountChanged(observable, newCount) {
    }
    handleObservableUpdated(observable, info) {
        if (!this._isIncluded(observable)) {
            return;
        }
        if (observable instanceof Derived) {
            this._handleDerivedRecomputed(observable, info);
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('observable value changed'),
            styled(observable.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
        ]));
    }
    formatChanges(changes) {
        if (changes.size === 0) {
            return undefined;
        }
        return styled(' (changed deps: ' +
            [...changes].map((o) => o.debugName).join(', ') +
            ')', { color: 'gray' });
    }
    handleDerivedDependencyChanged(derived, observable, change) {
        if (!this._isIncluded(derived)) {
            return;
        }
        this.changedObservablesSets.get(derived)?.add(observable);
    }
    _handleDerivedRecomputed(derived, info) {
        if (!this._isIncluded(derived)) {
            return;
        }
        const changedObservables = this.changedObservablesSets.get(derived);
        if (!changedObservables) {
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('derived recomputed'),
            styled(derived.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
            this.formatChanges(changedObservables),
            { data: [{ fn: derived._debugNameData.referenceFn ?? derived._computeFn }] }
        ]));
        changedObservables.clear();
    }
    handleDerivedCleared(derived) {
        if (!this._isIncluded(derived)) {
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('derived cleared'),
            styled(derived.debugName, { color: 'BlueViolet' }),
        ]));
    }
    handleFromEventObservableTriggered(observable, info) {
        if (!this._isIncluded(observable)) {
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('observable from event triggered'),
            styled(observable.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
            { data: [{ fn: observable._getValue }] }
        ]));
    }
    handleAutorunCreated(autorun) {
        if (!this._isIncluded(autorun)) {
            return;
        }
        this.changedObservablesSets.set(autorun, new Set());
    }
    handleAutorunDisposed(autorun) {
    }
    handleAutorunDependencyChanged(autorun, observable, change) {
        if (!this._isIncluded(autorun)) {
            return;
        }
        this.changedObservablesSets.get(autorun).add(observable);
    }
    handleAutorunStarted(autorun) {
        const changedObservables = this.changedObservablesSets.get(autorun);
        if (!changedObservables) {
            return;
        }
        if (this._isIncluded(autorun)) {
            console.log(...this.textToConsoleArgs([
                formatKind('autorun'),
                styled(autorun.debugName, { color: 'BlueViolet' }),
                this.formatChanges(changedObservables),
                { data: [{ fn: autorun._debugNameData.referenceFn ?? autorun._runFn }] }
            ]));
        }
        changedObservables.clear();
        this.indentation++;
    }
    handleAutorunFinished(autorun) {
        this.indentation--;
    }
    handleBeginTransaction(transaction) {
        let transactionName = transaction.getDebugName();
        if (transactionName === undefined) {
            transactionName = '';
        }
        if (this._isIncluded(transaction)) {
            console.log(...this.textToConsoleArgs([
                formatKind('transaction'),
                styled(transactionName, { color: 'BlueViolet' }),
                { data: [{ fn: transaction._fn }] }
            ]));
        }
        this.indentation++;
    }
    handleEndTransaction() {
        this.indentation--;
    }
}
function consoleTextToArgs(text) {
    const styles = new Array();
    const data = [];
    let firstArg = '';
    function process(t) {
        if ('length' in t) {
            for (const item of t) {
                if (item) {
                    process(item);
                }
            }
        }
        else if ('text' in t) {
            firstArg += `%c${t.text}`;
            styles.push(t.style);
            if (t.data) {
                data.push(...t.data);
            }
        }
        else if ('data' in t) {
            data.push(...t.data);
        }
    }
    process(text);
    const result = [firstArg, ...styles];
    result.push(...data);
    return result;
}
function normalText(text) {
    return styled(text, { color: 'black' });
}
function formatKind(kind) {
    return styled(padStr(`${kind}: `, 10), { color: 'black', bold: true });
}
function styled(text, options = {
    color: 'black',
}) {
    function objToCss(styleObj) {
        return Object.entries(styleObj).reduce((styleString, [propName, propValue]) => {
            return `${styleString}${propName}:${propValue};`;
        }, '');
    }
    const style = {
        color: options.color,
    };
    if (options.strikeThrough) {
        style['text-decoration'] = 'line-through';
    }
    if (options.bold) {
        style['font-weight'] = 'bold';
    }
    return {
        text,
        style: objToCss(style),
    };
}
export function formatValue(value, availableLen) {
    switch (typeof value) {
        case 'number':
            return '' + value;
        case 'string':
            if (value.length + 2 <= availableLen) {
                return `"${value}"`;
            }
            return `"${value.substr(0, availableLen - 7)}"+...`;
        case 'boolean':
            return value ? 'true' : 'false';
        case 'undefined':
            return 'undefined';
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (Array.isArray(value)) {
                return formatArray(value, availableLen);
            }
            return formatObject(value, availableLen);
        case 'symbol':
            return value.toString();
        case 'function':
            return `[[Function${value.name ? ' ' + value.name : ''}]]`;
        default:
            return '' + value;
    }
}
function formatArray(value, availableLen) {
    let result = '[ ';
    let first = true;
    for (const val of value) {
        if (!first) {
            result += ', ';
        }
        if (result.length - 5 > availableLen) {
            result += '...';
            break;
        }
        first = false;
        result += `${formatValue(val, availableLen - result.length)}`;
    }
    result += ' ]';
    return result;
}
function formatObject(value, availableLen) {
    if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
        const val = value.toString();
        if (val.length <= availableLen) {
            return val;
        }
        return val.substring(0, availableLen - 3) + '...';
    }
    const className = getClassName(value);
    let result = className ? className + '(' : '{ ';
    let first = true;
    for (const [key, val] of Object.entries(value)) {
        if (!first) {
            result += ', ';
        }
        if (result.length - 5 > availableLen) {
            result += '...';
            break;
        }
        first = false;
        result += `${key}: ${formatValue(val, availableLen - result.length)}`;
    }
    result += className ? ')' : ' }';
    return result;
}
function repeat(str, count) {
    let result = '';
    for (let i = 1; i <= count; i++) {
        result += str;
    }
    return result;
}
function padStr(str, length) {
    while (str.length < length) {
        str += ' ';
    }
    return str;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZU9ic2VydmFibGVMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9jb25zb2xlT2JzZXJ2YWJsZUxvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3hDLE9BQU8sRUFBeUMsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUvQyxJQUFJLHVCQUE0RCxDQUFDO0FBRWpFLE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxHQUFxQjtJQUMzRCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM5Qix1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDeEQsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUNELHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUFwQztRQUNTLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBNkZQLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFDO0lBNEd4RixDQUFDO0lBck1PLGNBQWMsQ0FBQyxHQUFZO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRU8sV0FB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