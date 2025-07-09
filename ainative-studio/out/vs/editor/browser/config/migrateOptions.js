/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class EditorSettingMigration {
    static { this.items = []; }
    constructor(key, migrate) {
        this.key = key;
        this.migrate = migrate;
    }
    apply(options) {
        const value = EditorSettingMigration._read(options, this.key);
        const read = (key) => EditorSettingMigration._read(options, key);
        const write = (key, value) => EditorSettingMigration._write(options, key, value);
        this.migrate(value, read, write);
    }
    static _read(source, key) {
        if (typeof source === 'undefined') {
            return undefined;
        }
        const firstDotIndex = key.indexOf('.');
        if (firstDotIndex >= 0) {
            const firstSegment = key.substring(0, firstDotIndex);
            return this._read(source[firstSegment], key.substring(firstDotIndex + 1));
        }
        return source[key];
    }
    static _write(target, key, value) {
        const firstDotIndex = key.indexOf('.');
        if (firstDotIndex >= 0) {
            const firstSegment = key.substring(0, firstDotIndex);
            target[firstSegment] = target[firstSegment] || {};
            this._write(target[firstSegment], key.substring(firstDotIndex + 1), value);
            return;
        }
        target[key] = value;
    }
}
function registerEditorSettingMigration(key, migrate) {
    EditorSettingMigration.items.push(new EditorSettingMigration(key, migrate));
}
function registerSimpleEditorSettingMigration(key, values) {
    registerEditorSettingMigration(key, (value, read, write) => {
        if (typeof value !== 'undefined') {
            for (const [oldValue, newValue] of values) {
                if (value === oldValue) {
                    write(key, newValue);
                    return;
                }
            }
        }
    });
}
/**
 * Compatibility with old options
 */
export function migrateOptions(options) {
    EditorSettingMigration.items.forEach(migration => migration.apply(options));
}
registerSimpleEditorSettingMigration('wordWrap', [[true, 'on'], [false, 'off']]);
registerSimpleEditorSettingMigration('lineNumbers', [[true, 'on'], [false, 'off']]);
registerSimpleEditorSettingMigration('cursorBlinking', [['visible', 'solid']]);
registerSimpleEditorSettingMigration('renderWhitespace', [[true, 'boundary'], [false, 'none']]);
registerSimpleEditorSettingMigration('renderLineHighlight', [[true, 'line'], [false, 'none']]);
registerSimpleEditorSettingMigration('acceptSuggestionOnEnter', [[true, 'on'], [false, 'off']]);
registerSimpleEditorSettingMigration('tabCompletion', [[false, 'off'], [true, 'onlySnippets']]);
registerSimpleEditorSettingMigration('hover', [[true, { enabled: true }], [false, { enabled: false }]]);
registerSimpleEditorSettingMigration('parameterHints', [[true, { enabled: true }], [false, { enabled: false }]]);
registerSimpleEditorSettingMigration('autoIndent', [[false, 'advanced'], [true, 'full']]);
registerSimpleEditorSettingMigration('matchBrackets', [[true, 'always'], [false, 'never']]);
registerSimpleEditorSettingMigration('renderFinalNewline', [[true, 'on'], [false, 'off']]);
registerSimpleEditorSettingMigration('cursorSmoothCaretAnimation', [[true, 'on'], [false, 'off']]);
registerSimpleEditorSettingMigration('occurrencesHighlight', [[true, 'singleFile'], [false, 'off']]);
registerSimpleEditorSettingMigration('wordBasedSuggestions', [[true, 'matchingDocuments'], [false, 'off']]);
registerSimpleEditorSettingMigration('defaultColorDecorators', [[true, 'auto'], [false, 'never']]);
registerEditorSettingMigration('autoClosingBrackets', (value, read, write) => {
    if (value === false) {
        write('autoClosingBrackets', 'never');
        if (typeof read('autoClosingQuotes') === 'undefined') {
            write('autoClosingQuotes', 'never');
        }
        if (typeof read('autoSurround') === 'undefined') {
            write('autoSurround', 'never');
        }
    }
});
registerEditorSettingMigration('renderIndentGuides', (value, read, write) => {
    if (typeof value !== 'undefined') {
        write('renderIndentGuides', undefined);
        if (typeof read('guides.indentation') === 'undefined') {
            write('guides.indentation', !!value);
        }
    }
});
registerEditorSettingMigration('highlightActiveIndentGuide', (value, read, write) => {
    if (typeof value !== 'undefined') {
        write('highlightActiveIndentGuide', undefined);
        if (typeof read('guides.highlightActiveIndentation') === 'undefined') {
            write('guides.highlightActiveIndentation', !!value);
        }
    }
});
const suggestFilteredTypesMapping = {
    method: 'showMethods',
    function: 'showFunctions',
    constructor: 'showConstructors',
    deprecated: 'showDeprecated',
    field: 'showFields',
    variable: 'showVariables',
    class: 'showClasses',
    struct: 'showStructs',
    interface: 'showInterfaces',
    module: 'showModules',
    property: 'showProperties',
    event: 'showEvents',
    operator: 'showOperators',
    unit: 'showUnits',
    value: 'showValues',
    constant: 'showConstants',
    enum: 'showEnums',
    enumMember: 'showEnumMembers',
    keyword: 'showKeywords',
    text: 'showWords',
    color: 'showColors',
    file: 'showFiles',
    reference: 'showReferences',
    folder: 'showFolders',
    typeParameter: 'showTypeParameters',
    snippet: 'showSnippets',
};
registerEditorSettingMigration('suggest.filteredTypes', (value, read, write) => {
    if (value && typeof value === 'object') {
        for (const entry of Object.entries(suggestFilteredTypesMapping)) {
            const v = value[entry[0]];
            if (v === false) {
                if (typeof read(`suggest.${entry[1]}`) === 'undefined') {
                    write(`suggest.${entry[1]}`, false);
                }
            }
        }
        write('suggest.filteredTypes', undefined);
    }
});
registerEditorSettingMigration('quickSuggestions', (input, read, write) => {
    if (typeof input === 'boolean') {
        const value = input ? 'on' : 'off';
        const newValue = { comments: value, strings: value, other: value };
        write('quickSuggestions', newValue);
    }
});
// Sticky Scroll
registerEditorSettingMigration('experimental.stickyScroll.enabled', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('experimental.stickyScroll.enabled', undefined);
        if (typeof read('stickyScroll.enabled') === 'undefined') {
            write('stickyScroll.enabled', value);
        }
    }
});
registerEditorSettingMigration('experimental.stickyScroll.maxLineCount', (value, read, write) => {
    if (typeof value === 'number') {
        write('experimental.stickyScroll.maxLineCount', undefined);
        if (typeof read('stickyScroll.maxLineCount') === 'undefined') {
            write('stickyScroll.maxLineCount', value);
        }
    }
});
// Code Actions on Save
registerEditorSettingMigration('codeActionsOnSave', (value, read, write) => {
    if (value && typeof value === 'object') {
        let toBeModified = false;
        const newValue = {};
        for (const entry of Object.entries(value)) {
            if (typeof entry[1] === 'boolean') {
                toBeModified = true;
                newValue[entry[0]] = entry[1] ? 'explicit' : 'never';
            }
            else {
                newValue[entry[0]] = entry[1];
            }
        }
        if (toBeModified) {
            write(`codeActionsOnSave`, newValue);
        }
    }
});
// Migrate Quick Fix Settings
registerEditorSettingMigration('codeActionWidget.includeNearbyQuickfixes', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('codeActionWidget.includeNearbyQuickfixes', undefined);
        if (typeof read('codeActionWidget.includeNearbyQuickFixes') === 'undefined') {
            write('codeActionWidget.includeNearbyQuickFixes', value);
        }
    }
});
// Migrate the lightbulb settings
registerEditorSettingMigration('lightbulb.enabled', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('lightbulb.enabled', value ? undefined : 'off');
    }
});
// NES Code Shifting
registerEditorSettingMigration('inlineSuggest.edits.codeShifting', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('inlineSuggest.edits.codeShifting', undefined);
        write('inlineSuggest.edits.allowCodeShifting', value ? 'always' : 'never');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0ZU9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29uZmlnL21pZ3JhdGVPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBWWhHLE1BQU0sT0FBTyxzQkFBc0I7YUFFcEIsVUFBSyxHQUE2QixFQUFFLENBQUM7SUFFbkQsWUFDaUIsR0FBVyxFQUNYLE9BQTRFO1FBRDVFLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxZQUFPLEdBQVAsT0FBTyxDQUFxRTtJQUN6RixDQUFDO0lBRUwsS0FBSyxDQUFDLE9BQVk7UUFDakIsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBVSxFQUFFLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBVyxFQUFFLEdBQVc7UUFDNUMsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztR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