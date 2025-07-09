/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from './uri.js';
export function isRemoteConsoleLog(obj) {
    const entry = obj;
    return entry && typeof entry.type === 'string' && typeof entry.severity === 'string';
}
export function parse(entry) {
    const args = [];
    let stack;
    // Parse Entry
    try {
        const parsedArguments = JSON.parse(entry.arguments);
        // Check for special stack entry as last entry
        const stackArgument = parsedArguments[parsedArguments.length - 1];
        if (stackArgument && stackArgument.__$stack) {
            parsedArguments.pop(); // stack is handled specially
            stack = stackArgument.__$stack;
        }
        args.push(...parsedArguments);
    }
    catch (error) {
        args.push('Unable to log remote console arguments', entry.arguments);
    }
    return { args, stack };
}
export function getFirstFrame(arg0) {
    if (typeof arg0 !== 'string') {
        return getFirstFrame(parse(arg0).stack);
    }
    // Parse a source information out of the stack if we have one. Format can be:
    // at vscode.commands.registerCommand (/Users/someone/Desktop/test-ts/out/src/extension.js:18:17)
    // or
    // at /Users/someone/Desktop/test-ts/out/src/extension.js:18:17
    // or
    // at c:\Users\someone\Desktop\end-js\extension.js:19:17
    // or
    // at e.$executeContributedCommand(c:\Users\someone\Desktop\end-js\extension.js:19:17)
    const stack = arg0;
    if (stack) {
        const topFrame = findFirstFrame(stack);
        // at [^\/]* => line starts with "at" followed by any character except '/' (to not capture unix paths too late)
        // (?:(?:[a-zA-Z]+:)|(?:[\/])|(?:\\\\) => windows drive letter OR unix root OR unc root
        // (?:.+) => simple pattern for the path, only works because of the line/col pattern after
        // :(?:\d+):(?:\d+) => :line:column data
        const matches = /at [^\/]*((?:(?:[a-zA-Z]+:)|(?:[\/])|(?:\\\\))(?:.+)):(\d+):(\d+)/.exec(topFrame || '');
        if (matches && matches.length === 4) {
            return {
                uri: URI.file(matches[1]),
                line: Number(matches[2]),
                column: Number(matches[3])
            };
        }
    }
    return undefined;
}
function findFirstFrame(stack) {
    if (!stack) {
        return stack;
    }
    const newlineIndex = stack.indexOf('\n');
    if (newlineIndex === -1) {
        return stack;
    }
    return stack.substring(0, newlineIndex);
}
export function log(entry, label) {
    const { args, stack } = parse(entry);
    const isOneStringArg = typeof args[0] === 'string' && args.length === 1;
    let topFrame = findFirstFrame(stack);
    if (topFrame) {
        topFrame = `(${topFrame.trim()})`;
    }
    let consoleArgs = [];
    // First arg is a string
    if (typeof args[0] === 'string') {
        if (topFrame && isOneStringArg) {
            consoleArgs = [`%c[${label}] %c${args[0]} %c${topFrame}`, color('blue'), color(''), color('grey')];
        }
        else {
            consoleArgs = [`%c[${label}] %c${args[0]}`, color('blue'), color(''), ...args.slice(1)];
        }
    }
    // First arg is something else, just apply all
    else {
        consoleArgs = [`%c[${label}]%`, color('blue'), ...args];
    }
    // Stack: add to args unless already added
    if (topFrame && !isOneStringArg) {
        consoleArgs.push(topFrame);
    }
    // Log it
    if (typeof console[entry.severity] !== 'function') {
        throw new Error('Unknown console method');
    }
    console[entry.severity].apply(console, consoleArgs);
}
function color(color) {
    return `color: ${color}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb25zb2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFrQi9CLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFRO0lBQzFDLE1BQU0sS0FBSyxHQUFHLEdBQXdCLENBQUM7SUFFdkMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxPQUFPLEtBQUssQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDO0FBQ3RGLENBQUM7QUFFRCxNQUFNLFVBQVUsS0FBSyxDQUFDLEtBQXdCO0lBQzdDLE1BQU0sSUFBSSxHQUFVLEVBQUUsQ0FBQztJQUN2QixJQUFJLEtBQXlCLENBQUM7SUFFOUIsY0FBYztJQUNkLElBQUksQ0FBQztRQUNKLE1BQU0sZUFBZSxHQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTNELDhDQUE4QztRQUM5QyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQW1CLENBQUM7UUFDcEYsSUFBSSxhQUFhLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzdDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLDZCQUE2QjtZQUNwRCxLQUFLLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQztRQUNoQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsd0NB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