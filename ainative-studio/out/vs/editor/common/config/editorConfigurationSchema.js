/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { diffEditorDefaultOptions } from './diffEditor.js';
import { editorOptionsRegistry } from './editorOptions.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import * as nls from '../../../nls.js';
import { Extensions } from '../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../platform/registry/common/platform.js';
export const editorConfigurationBaseNode = Object.freeze({
    id: 'editor',
    order: 5,
    type: 'object',
    title: nls.localize('editorConfigurationTitle', "Editor"),
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
});
const editorConfiguration = {
    ...editorConfigurationBaseNode,
    properties: {
        'editor.tabSize': {
            type: 'number',
            default: EDITOR_MODEL_DEFAULTS.tabSize,
            minimum: 1,
            maximum: 16,
            markdownDescription: nls.localize('tabSize', "The number of spaces a tab is equal to. This setting is overridden based on the file contents when {0} is on.", '`#editor.detectIndentation#`')
        },
        'editor.indentSize': {
            'anyOf': [
                {
                    type: 'string',
                    enum: ['tabSize']
                },
                {
                    type: 'number',
                    minimum: 1
                }
            ],
            default: 'tabSize',
            markdownDescription: nls.localize('indentSize', "The number of spaces used for indentation or `\"tabSize\"` to use the value from `#editor.tabSize#`. This setting is overridden based on the file contents when `#editor.detectIndentation#` is on.")
        },
        'editor.insertSpaces': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.insertSpaces,
            markdownDescription: nls.localize('insertSpaces', "Insert spaces when pressing `Tab`. This setting is overridden based on the file contents when {0} is on.", '`#editor.detectIndentation#`')
        },
        'editor.detectIndentation': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.detectIndentation,
            markdownDescription: nls.localize('detectIndentation', "Controls whether {0} and {1} will be automatically detected when a file is opened based on the file contents.", '`#editor.tabSize#`', '`#editor.insertSpaces#`')
        },
        'editor.trimAutoWhitespace': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
            description: nls.localize('trimAutoWhitespace', "Remove trailing auto inserted whitespace.")
        },
        'editor.largeFileOptimizations': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.largeFileOptimizations,
            description: nls.localize('largeFileOptimizations', "Special handling for large files to disable certain memory intensive features.")
        },
        'editor.wordBasedSuggestions': {
            enum: ['off', 'currentDocument', 'matchingDocuments', 'allDocuments'],
            default: 'matchingDocuments',
            enumDescriptions: [
                nls.localize('wordBasedSuggestions.off', 'Turn off Word Based Suggestions.'),
                nls.localize('wordBasedSuggestions.currentDocument', 'Only suggest words from the active document.'),
                nls.localize('wordBasedSuggestions.matchingDocuments', 'Suggest words from all open documents of the same language.'),
                nls.localize('wordBasedSuggestions.allDocuments', 'Suggest words from all open documents.')
            ],
            description: nls.localize('wordBasedSuggestions', "Controls whether completions should be computed based on words in the document and from which documents they are computed.")
        },
        'editor.semanticHighlighting.enabled': {
            enum: [true, false, 'configuredByTheme'],
            enumDescriptions: [
                nls.localize('semanticHighlighting.true', 'Semantic highlighting enabled for all color themes.'),
                nls.localize('semanticHighlighting.false', 'Semantic highlighting disabled for all color themes.'),
                nls.localize('semanticHighlighting.configuredByTheme', 'Semantic highlighting is configured by the current color theme\'s `semanticHighlighting` setting.')
            ],
            default: 'configuredByTheme',
            description: nls.localize('semanticHighlighting.enabled', "Controls whether the semanticHighlighting is shown for the languages that support it.")
        },
        'editor.stablePeek': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('stablePeek', "Keep peek editors open even when double-clicking their content or when hitting `Escape`.")
        },
        'editor.maxTokenizationLineLength': {
            type: 'integer',
            default: 20_000,
            description: nls.localize('maxTokenizationLineLength', "Lines above this length will not be tokenized for performance reasons")
        },
        'editor.experimental.asyncTokenization': {
            type: 'boolean',
            default: true,
            description: nls.localize('editor.experimental.asyncTokenization', "Controls whether the tokenization should happen asynchronously on a web worker."),
            tags: ['experimental'],
        },
        'editor.experimental.asyncTokenizationLogging': {
            type: 'boolean',
            default: false,
            description: nls.localize('editor.experimental.asyncTokenizationLogging', "Controls whether async tokenization should be logged. For debugging only."),
        },
        'editor.experimental.asyncTokenizationVerification': {
            type: 'boolean',
            default: false,
            description: nls.localize('editor.experimental.asyncTokenizationVerification', "Controls whether async tokenization should be verified against legacy background tokenization. Might slow down tokenization. For debugging only."),
            tags: ['experimental'],
        },
        'editor.experimental.treeSitterTelemetry': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.treeSitterTelemetry', "Controls whether tree sitter parsing should be turned on and telemetry collected. Setting `editor.experimental.preferTreeSitter` for specific languages will take precedence."),
            tags: ['experimental', 'onExP']
        },
        'editor.experimental.preferTreeSitter.css': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.css', "Controls whether tree sitter parsing should be turned on for css. This will take precedence over `editor.experimental.treeSitterTelemetry` for css."),
            tags: ['experimental', 'onExP']
        },
        'editor.experimental.preferTreeSitter.typescript': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.typescript', "Controls whether tree sitter parsing should be turned on for typescript. This will take precedence over `editor.experimental.treeSitterTelemetry` for typescript."),
            tags: ['experimental', 'onExP']
        },
        'editor.experimental.preferTreeSitter.ini': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.ini', "Controls whether tree sitter parsing should be turned on for ini. This will take precedence over `editor.experimental.treeSitterTelemetry` for ini."),
            tags: ['experimental', 'onExP']
        },
        'editor.experimental.preferTreeSitter.regex': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.regex', "Controls whether tree sitter parsing should be turned on for regex. This will take precedence over `editor.experimental.treeSitterTelemetry` for regex."),
            tags: ['experimental', 'onExP']
        },
        'editor.language.brackets': {
            type: ['array', 'null'],
            default: null, // We want to distinguish the empty array from not configured.
            description: nls.localize('schema.brackets', 'Defines the bracket symbols that increase or decrease the indentation.'),
            items: {
                type: 'array',
                items: [
                    {
                        type: 'string',
                        description: nls.localize('schema.openBracket', 'The opening bracket character or string sequence.')
                    },
                    {
                        type: 'string',
                        description: nls.localize('schema.closeBracket', 'The closing bracket character or string sequence.')
                    }
                ]
            }
        },
        'editor.language.colorizedBracketPairs': {
            type: ['array', 'null'],
            default: null, // We want to distinguish the empty array from not configured.
            description: nls.localize('schema.colorizedBracketPairs', 'Defines the bracket pairs that are colorized by their nesting level if bracket pair colorization is enabled.'),
            items: {
                type: 'array',
                items: [
                    {
                        type: 'string',
                        description: nls.localize('schema.openBracket', 'The opening bracket character or string sequence.')
                    },
                    {
                        type: 'string',
                        description: nls.localize('schema.closeBracket', 'The closing bracket character or string sequence.')
                    }
                ]
            }
        },
        'diffEditor.maxComputationTime': {
            type: 'number',
            default: diffEditorDefaultOptions.maxComputationTime,
            description: nls.localize('maxComputationTime', "Timeout in milliseconds after which diff computation is cancelled. Use 0 for no timeout.")
        },
        'diffEditor.maxFileSize': {
            type: 'number',
            default: diffEditorDefaultOptions.maxFileSize,
            description: nls.localize('maxFileSize', "Maximum file size in MB for which to compute diffs. Use 0 for no limit.")
        },
        'diffEditor.renderSideBySide': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderSideBySide,
            description: nls.localize('sideBySide', "Controls whether the diff editor shows the diff side by side or inline.")
        },
        'diffEditor.renderSideBySideInlineBreakpoint': {
            type: 'number',
            default: diffEditorDefaultOptions.renderSideBySideInlineBreakpoint,
            description: nls.localize('renderSideBySideInlineBreakpoint', "If the diff editor width is smaller than this value, the inline view is used.")
        },
        'diffEditor.useInlineViewWhenSpaceIsLimited': {
            type: 'boolean',
            default: diffEditorDefaultOptions.useInlineViewWhenSpaceIsLimited,
            description: nls.localize('useInlineViewWhenSpaceIsLimited', "If enabled and the editor width is too small, the inline view is used.")
        },
        'diffEditor.renderMarginRevertIcon': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderMarginRevertIcon,
            description: nls.localize('renderMarginRevertIcon', "When enabled, the diff editor shows arrows in its glyph margin to revert changes.")
        },
        'diffEditor.renderGutterMenu': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderGutterMenu,
            description: nls.localize('renderGutterMenu', "When enabled, the diff editor shows a special gutter for revert and stage actions.")
        },
        'diffEditor.ignoreTrimWhitespace': {
            type: 'boolean',
            default: diffEditorDefaultOptions.ignoreTrimWhitespace,
            description: nls.localize('ignoreTrimWhitespace', "When enabled, the diff editor ignores changes in leading or trailing whitespace.")
        },
        'diffEditor.renderIndicators': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderIndicators,
            description: nls.localize('renderIndicators', "Controls whether the diff editor shows +/- indicators for added/removed changes.")
        },
        'diffEditor.codeLens': {
            type: 'boolean',
            default: diffEditorDefaultOptions.diffCodeLens,
            description: nls.localize('codeLens', "Controls whether the editor shows CodeLens.")
        },
        'diffEditor.wordWrap': {
            type: 'string',
            enum: ['off', 'on', 'inherit'],
            default: diffEditorDefaultOptions.diffWordWrap,
            markdownEnumDescriptions: [
                nls.localize('wordWrap.off', "Lines will never wrap."),
                nls.localize('wordWrap.on', "Lines will wrap at the viewport width."),
                nls.localize('wordWrap.inherit', "Lines will wrap according to the {0} setting.", '`#editor.wordWrap#`'),
            ]
        },
        'diffEditor.diffAlgorithm': {
            type: 'string',
            enum: ['legacy', 'advanced'],
            default: diffEditorDefaultOptions.diffAlgorithm,
            markdownEnumDescriptions: [
                nls.localize('diffAlgorithm.legacy', "Uses the legacy diffing algorithm."),
                nls.localize('diffAlgorithm.advanced', "Uses the advanced diffing algorithm."),
            ]
        },
        'diffEditor.hideUnchangedRegions.enabled': {
            type: 'boolean',
            default: diffEditorDefaultOptions.hideUnchangedRegions.enabled,
            markdownDescription: nls.localize('hideUnchangedRegions.enabled', "Controls whether the diff editor shows unchanged regions."),
        },
        'diffEditor.hideUnchangedRegions.revealLineCount': {
            type: 'integer',
            default: diffEditorDefaultOptions.hideUnchangedRegions.revealLineCount,
            markdownDescription: nls.localize('hideUnchangedRegions.revealLineCount', "Controls how many lines are used for unchanged regions."),
            minimum: 1,
        },
        'diffEditor.hideUnchangedRegions.minimumLineCount': {
            type: 'integer',
            default: diffEditorDefaultOptions.hideUnchangedRegions.minimumLineCount,
            markdownDescription: nls.localize('hideUnchangedRegions.minimumLineCount', "Controls how many lines are used as a minimum for unchanged regions."),
            minimum: 1,
        },
        'diffEditor.hideUnchangedRegions.contextLineCount': {
            type: 'integer',
            default: diffEditorDefaultOptions.hideUnchangedRegions.contextLineCount,
            markdownDescription: nls.localize('hideUnchangedRegions.contextLineCount', "Controls how many lines are used as context when comparing unchanged regions."),
            minimum: 1,
        },
        'diffEditor.experimental.showMoves': {
            type: 'boolean',
            default: diffEditorDefaultOptions.experimental.showMoves,
            markdownDescription: nls.localize('showMoves', "Controls whether the diff editor should show detected code moves.")
        },
        'diffEditor.experimental.showEmptyDecorations': {
            type: 'boolean',
            default: diffEditorDefaultOptions.experimental.showEmptyDecorations,
            description: nls.localize('showEmptyDecorations', "Controls whether the diff editor shows empty decorations to see where characters got inserted or deleted."),
        },
        'diffEditor.experimental.useTrueInlineView': {
            type: 'boolean',
            default: diffEditorDefaultOptions.experimental.useTrueInlineView,
            description: nls.localize('useTrueInlineView', "If enabled and the editor uses the inline view, word changes are rendered inline."),
        },
    }
};
function isConfigurationPropertySchema(x) {
    return (typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined');
}
// Add properties from the Editor Option Registry
for (const editorOption of editorOptionsRegistry) {
    const schema = editorOption.schema;
    if (typeof schema !== 'undefined') {
        if (isConfigurationPropertySchema(schema)) {
            // This is a single schema contribution
            editorConfiguration.properties[`editor.${editorOption.name}`] = schema;
        }
        else {
            for (const key in schema) {
                if (Object.hasOwnProperty.call(schema, key)) {
                    editorConfiguration.properties[key] = schema[key];
                }
            }
        }
    }
}
let cachedEditorConfigurationKeys = null;
function getEditorConfigurationKeys() {
    if (cachedEditorConfigurationKeys === null) {
        cachedEditorConfigurationKeys = Object.create(null);
        Object.keys(editorConfiguration.properties).forEach((prop) => {
            cachedEditorConfigurationKeys[prop] = true;
        });
    }
    return cachedEditorConfigurationKeys;
}
export function isEditorConfigurationKey(key) {
    const editorConfigurationKeys = getEditorConfigurationKeys();
    return (editorConfigurationKeys[`editor.${key}`] || false);
}
export function isDiffEditorConfigurationKey(key) {
    const editorConfigurationKeys = getEditorConfigurationKeys();
    return (editorConfigurationKeys[`diffEditor.${key}`] || false);
}
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration(editorConfiguration);
export async function registerEditorFontConfigurations(getFontSnippets) {
    const editorKeysWithFont = ['editor.fontFamily'];
    const fontSnippets = await getFontSnippets();
    for (const key of editorKeysWithFont) {
        if (editorConfiguration.properties && editorConfiguration.properties[key]) {
            editorConfiguration.properties[key].defaultSnippets = fontSnippets;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29uZmlnL2VkaXRvckNvbmZpZ3VyYXRpb25TY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQXNCLFVBQVUsRUFBNEUsTUFBTSxpRUFBaUUsQ0FBQztBQUMzTCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFekUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBcUI7SUFDNUUsRUFBRSxFQUFFLFFBQVE7SUFDWixLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDO0lBQ3pELEtBQUssaURBQXlDO0NBQzlDLENBQUMsQ0FBQztBQUVILE1BQU0sbUJBQW1CLEdBQXVCO0lBQy9DLEdBQUcsMkJBQTJCO0lBQzlCLFVBQVUsRUFBRTtRQUNYLGdCQUFnQixFQUFFO1lBQ2pCLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLHFCQUFxQixDQUFDLE9BQU87WUFDdEMsT0FBTyxFQUFFLENBQUM7WUFDVixPQUFPLEVBQUUsRUFBRTtZQUNYLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFR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