/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import severity from '../../../../base/common/severity.js';
import { isObject, isString } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { ExpressionContainer } from './debugModel.js';
const MAX_REPL_LENGTH = 10000;
let topReplElementCounter = 0;
const getUniqueId = () => `topReplElement:${topReplElementCounter++}`;
/**
 * General case of data from DAP the `output` event. {@link ReplVariableElement}
 * is used instead only if there is a `variablesReference` with no `output` text.
 */
export class ReplOutputElement {
    constructor(session, id, value, severity, sourceData, expression) {
        this.session = session;
        this.id = id;
        this.value = value;
        this.severity = severity;
        this.sourceData = sourceData;
        this.expression = expression;
        this._count = 1;
        this._onDidChangeCount = new Emitter();
    }
    toString(includeSource = false) {
        let valueRespectCount = this.value;
        for (let i = 1; i < this.count; i++) {
            valueRespectCount += (valueRespectCount.endsWith('\n') ? '' : '\n') + this.value;
        }
        const sourceStr = (this.sourceData && includeSource) ? ` ${this.sourceData.source.name}` : '';
        return valueRespectCount + sourceStr;
    }
    getId() {
        return this.id;
    }
    getChildren() {
        return this.expression?.getChildren() || Promise.resolve([]);
    }
    set count(value) {
        this._count = value;
        this._onDidChangeCount.fire();
    }
    get count() {
        return this._count;
    }
    get onDidChangeCount() {
        return this._onDidChangeCount.event;
    }
    get hasChildren() {
        return !!this.expression?.hasChildren;
    }
}
/** Top-level variable logged via DAP output when there's no `output` string */
export class ReplVariableElement {
    constructor(session, expression, severity, sourceData) {
        this.session = session;
        this.expression = expression;
        this.severity = severity;
        this.sourceData = sourceData;
        this.id = generateUuid();
        this.hasChildren = expression.hasChildren;
    }
    getSession() {
        return this.session;
    }
    getChildren() {
        return this.expression.getChildren();
    }
    toString() {
        return this.expression.toString();
    }
    getId() {
        return this.id;
    }
}
export class RawObjectReplElement {
    static { this.MAX_CHILDREN = 1000; } // upper bound of children per value
    constructor(id, name, valueObj, sourceData, annotation) {
        this.id = id;
        this.name = name;
        this.valueObj = valueObj;
        this.sourceData = sourceData;
        this.annotation = annotation;
    }
    getId() {
        return this.id;
    }
    getSession() {
        return undefined;
    }
    get value() {
        if (this.valueObj === null) {
            return 'null';
        }
        else if (Array.isArray(this.valueObj)) {
            return `Array[${this.valueObj.length}]`;
        }
        else if (isObject(this.valueObj)) {
            return 'Object';
        }
        else if (isString(this.valueObj)) {
            return `"${this.valueObj}"`;
        }
        return String(this.valueObj) || '';
    }
    get hasChildren() {
        return (Array.isArray(this.valueObj) && this.valueObj.length > 0) || (isObject(this.valueObj) && Object.getOwnPropertyNames(this.valueObj).length > 0);
    }
    evaluateLazy() {
        throw new Error('Method not implemented.');
    }
    getChildren() {
        let result = [];
        if (Array.isArray(this.valueObj)) {
            result = this.valueObj.slice(0, RawObjectReplElement.MAX_CHILDREN)
                .map((v, index) => new RawObjectReplElement(`${this.id}:${index}`, String(index), v));
        }
        else if (isObject(this.valueObj)) {
            result = Object.getOwnPropertyNames(this.valueObj).slice(0, RawObjectReplElement.MAX_CHILDREN)
                .map((key, index) => new RawObjectReplElement(`${this.id}:${index}`, key, this.valueObj[key]));
        }
        return Promise.resolve(result);
    }
    toString() {
        return `${this.name}\n${this.value}`;
    }
}
export class ReplEvaluationInput {
    constructor(value) {
        this.value = value;
        this.id = generateUuid();
    }
    toString() {
        return this.value;
    }
    getId() {
        return this.id;
    }
}
export class ReplEvaluationResult extends ExpressionContainer {
    get available() {
        return this._available;
    }
    constructor(originalExpression) {
        super(undefined, undefined, 0, generateUuid());
        this.originalExpression = originalExpression;
        this._available = true;
    }
    async evaluateExpression(expression, session, stackFrame, context) {
        const result = await super.evaluateExpression(expression, session, stackFrame, context);
        this._available = result;
        return result;
    }
    toString() {
        return `${this.value}`;
    }
}
export class ReplGroup {
    static { this.COUNTER = 0; }
    constructor(session, name, autoExpand, sourceData) {
        this.session = session;
        this.name = name;
        this.autoExpand = autoExpand;
        this.sourceData = sourceData;
        this.children = [];
        this.ended = false;
        this.id = `replGroup:${ReplGroup.COUNTER++}`;
    }
    get hasChildren() {
        return true;
    }
    getId() {
        return this.id;
    }
    toString(includeSource = false) {
        const sourceStr = (includeSource && this.sourceData) ? ` ${this.sourceData.source.name}` : '';
        return this.name + sourceStr;
    }
    addChild(child) {
        const lastElement = this.children.length ? this.children[this.children.length - 1] : undefined;
        if (lastElement instanceof ReplGroup && !lastElement.hasEnded) {
            lastElement.addChild(child);
        }
        else {
            this.children.push(child);
        }
    }
    getChildren() {
        return this.children;
    }
    end() {
        const lastElement = this.children.length ? this.children[this.children.length - 1] : undefined;
        if (lastElement instanceof ReplGroup && !lastElement.hasEnded) {
            lastElement.end();
        }
        else {
            this.ended = true;
        }
    }
    get hasEnded() {
        return this.ended;
    }
}
function areSourcesEqual(first, second) {
    if (!first && !second) {
        return true;
    }
    if (first && second) {
        return first.column === second.column && first.lineNumber === second.lineNumber && first.source.uri.toString() === second.source.uri.toString();
    }
    return false;
}
export class ReplModel {
    constructor(configurationService) {
        this.configurationService = configurationService;
        this.replElements = [];
        this._onDidChangeElements = new Emitter();
        this.onDidChangeElements = this._onDidChangeElements.event;
    }
    getReplElements() {
        return this.replElements;
    }
    async addReplExpression(session, stackFrame, expression) {
        this.addReplElement(new ReplEvaluationInput(expression));
        const result = new ReplEvaluationResult(expression);
        await result.evaluateExpression(expression, session, stackFrame, 'repl');
        this.addReplElement(result);
    }
    appendToRepl(session, { output, expression, sev, source }) {
        const clearAnsiSequence = '\u001b[2J';
        const clearAnsiIndex = output.lastIndexOf(clearAnsiSequence);
        if (clearAnsiIndex !== -1) {
            // [2J is the ansi escape sequence for clearing the display http://ascii-table.com/ansi-escape-sequences.php
            this.removeReplExpressions();
            this.appendToRepl(session, { output: nls.localize('consoleCleared', "Console was cleared"), sev: severity.Ignore });
            output = output.substring(clearAnsiIndex + clearAnsiSequence.length);
        }
        if (expression) {
            // if there is an output string, prefer to show that, since the DA could
            // have formatted it nicely e.g. with ANSI color codes.
            this.addReplElement(output
                ? new ReplOutputElement(session, getUniqueId(), output, sev, source, expression)
                : new ReplVariableElement(session, expression, sev, source));
            return;
        }
        const previousElement = this.replElements.length ? this.replElements[this.replElements.length - 1] : undefined;
        if (previousElement instanceof ReplOutputElement && previousElement.severity === sev) {
            const config = this.configurationService.getValue('debug');
            if (previousElement.value === output && areSourcesEqual(previousElement.sourceData, source) && config.console.collapseIdenticalLines) {
                previousElement.count++;
                // No need to fire an event, just the count updates and badge will adjust automatically
                return;
            }
            if (!previousElement.value.endsWith('\n') && !previousElement.value.endsWith('\r\n') && previousElement.count === 1) {
                this.replElements[this.replElements.length - 1] = new ReplOutputElement(session, getUniqueId(), previousElement.value + output, sev, source);
                this._onDidChangeElements.fire(undefined);
                return;
            }
        }
        const element = new ReplOutputElement(session, getUniqueId(), output, sev, source);
        this.addReplElement(element);
    }
    startGroup(session, name, autoExpand, sourceData) {
        const group = new ReplGroup(session, name, autoExpand, sourceData);
        this.addReplElement(group);
    }
    endGroup() {
        const lastElement = this.replElements[this.replElements.length - 1];
        if (lastElement instanceof ReplGroup) {
            lastElement.end();
        }
    }
    addReplElement(newElement) {
        const lastElement = this.replElements.length ? this.replElements[this.replElements.length - 1] : undefined;
        if (lastElement instanceof ReplGroup && !lastElement.hasEnded) {
            lastElement.addChild(newElement);
        }
        else {
            this.replElements.push(newElement);
            if (this.replElements.length > MAX_REPL_LENGTH) {
                this.replElements.splice(0, this.replElements.length - MAX_REPL_LENGTH);
            }
        }
        this._onDidChangeElements.fire(newElement);
    }
    removeReplExpressions() {
        if (this.replElements.length > 0) {
            this.replElements = [];
            this._onDidChangeElements.fire(undefined);
        }
    }
    /** Returns a new REPL model that's a copy of this one. */
    clone() {
        const newRepl = new ReplModel(this.configurationService);
        newRepl.replElements = this.replElements.slice();
        return newRepl;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9yZXBsTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFHMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFdEQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDO0FBQzlCLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixxQkFBcUIsRUFBRSxFQUFFLENBQUM7QUFFdEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUs3QixZQUNRLE9BQXNCLEVBQ3JCLEVBQVUsRUFDWCxLQUFhLEVBQ2IsUUFBa0IsRUFDbEIsVUFBK0IsRUFDdEIsVUFBd0I7UUFMakMsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQUNyQixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1gsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsZUFBVSxHQUFWLFVBQVUsQ0FBcUI7UUFDdEIsZUFBVSxHQUFWLFVBQVUsQ0FBYztRQVRqQyxXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsc0JBQWlCLEdB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