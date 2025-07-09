/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class KeybindingIO {
    static writeKeybindingItem(out, item) {
        if (!item.resolvedKeybinding) {
            return;
        }
        const quotedSerializedKeybinding = JSON.stringify(item.resolvedKeybinding.getUserSettingsLabel());
        out.write(`{ "key": ${rightPaddedString(quotedSerializedKeybinding + ',', 25)} "command": `);
        const quotedSerializedWhen = item.when ? JSON.stringify(item.when.serialize()) : '';
        const quotedSerializeCommand = JSON.stringify(item.command);
        if (quotedSerializedWhen.length > 0) {
            out.write(`${quotedSerializeCommand},`);
            out.writeLine();
            out.write(`                                     "when": ${quotedSerializedWhen}`);
        }
        else {
            out.write(`${quotedSerializeCommand}`);
        }
        if (item.commandArgs) {
            out.write(',');
            out.writeLine();
            out.write(`                                     "args": ${JSON.stringify(item.commandArgs)}`);
        }
        out.write(' }');
    }
    static readUserKeybindingItem(input) {
        const keybinding = 'key' in input && typeof input.key === 'string'
            ? KeybindingParser.parseKeybinding(input.key)
            : null;
        const when = 'when' in input && typeof input.when === 'string'
            ? ContextKeyExpr.deserialize(input.when)
            : undefined;
        const command = 'command' in input && typeof input.command === 'string'
            ? input.command
            : null;
        const commandArgs = 'args' in input && typeof input.args !== 'undefined'
            ? input.args
            : undefined;
        return {
            keybinding,
            command,
            commandArgs,
            when,
            _sourceKey: 'key' in input && typeof input.key === 'string' ? input.key : undefined,
        };
    }
}
function rightPaddedString(str, minChars) {
    if (str.length < minChars) {
        return str + (new Array(minChars - str.length).join(' '));
    }
    return str;
}
export class OutputBuilder {
    constructor() {
        this._lines = [];
        this._currentLine = '';
    }
    write(str) {
        this._currentLine += str;
    }
    writeLine(str = '') {
        this._lines.push(this._currentLine + str);
        this._currentLine = '';
    }
    toString() {
        this.writeLine();
        return this._lines.join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0lPLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2NvbW1vbi9rZXliaW5kaW5nSU8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGNBQWMsRUFBd0IsTUFBTSxzREFBc0QsQ0FBQztBQVc1RyxNQUFNLE9BQU8sWUFBWTtJQUVqQixNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBa0IsRUFBRSxJQUE0QjtRQUNqRixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUNsRyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksaUJBQWlCLENBQUMsMEJBQTBCLEdBQUcsR0FBRyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUU3RixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDcEYsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1RCxJQUFJLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcs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