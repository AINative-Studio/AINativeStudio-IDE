/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import * as objects from '../../../base/common/objects.js';
import * as platform from '../../../base/common/platform.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import { USUAL_WORD_SEPARATORS } from '../core/wordHelper.js';
import * as nls from '../../../nls.js';
import product from '../../../platform/product/common/product.js';
/**
 * Configuration options for auto indentation in the editor
 */
export var EditorAutoIndentStrategy;
(function (EditorAutoIndentStrategy) {
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["None"] = 0] = "None";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Keep"] = 1] = "Keep";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Brackets"] = 2] = "Brackets";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Advanced"] = 3] = "Advanced";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Full"] = 4] = "Full";
})(EditorAutoIndentStrategy || (EditorAutoIndentStrategy = {}));
/**
 * @internal
 * The width of the minimap gutter, in pixels.
 */
export const MINIMAP_GUTTER_WIDTH = 8;
//#endregion
/**
 * An event describing that the configuration of the editor has changed.
 */
export class ConfigurationChangedEvent {
    /**
     * @internal
     */
    constructor(values) {
        this._values = values;
    }
    hasChanged(id) {
        return this._values[id];
    }
}
/**
 * @internal
 */
export class ComputeOptionsMemory {
    constructor() {
        this.stableMinimapLayoutInput = null;
        this.stableFitMaxMinimapScale = 0;
        this.stableFitRemainingWidth = 0;
    }
}
/**
 * @internal
 */
class BaseEditorOption {
    constructor(id, name, defaultValue, schema) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.schema = schema;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    compute(env, options, value) {
        return value;
    }
}
export class ApplyUpdateResult {
    constructor(newValue, didChange) {
        this.newValue = newValue;
        this.didChange = didChange;
    }
}
function applyUpdate(value, update) {
    if (typeof value !== 'object' || typeof update !== 'object' || !value || !update) {
        return new ApplyUpdateResult(update, value !== update);
    }
    if (Array.isArray(value) || Array.isArray(update)) {
        const arrayEquals = Array.isArray(value) && Array.isArray(update) && arrays.equals(value, update);
        return new ApplyUpdateResult(update, !arrayEquals);
    }
    let didChange = false;
    for (const key in update) {
        if (update.hasOwnProperty(key)) {
            const result = applyUpdate(value[key], update[key]);
            if (result.didChange) {
                value[key] = result.newValue;
                didChange = true;
            }
        }
    }
    return new ApplyUpdateResult(value, didChange);
}
/**
 * @internal
 */
class ComputedEditorOption {
    constructor(id) {
        this.schema = undefined;
        this.id = id;
        this.name = '_never_';
        this.defaultValue = undefined;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    validate(input) {
        return this.defaultValue;
    }
}
class SimpleEditorOption {
    constructor(id, name, defaultValue, schema) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.schema = schema;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        return input;
    }
    compute(env, options, value) {
        return value;
    }
}
/**
 * @internal
 */
export function boolean(value, defaultValue) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    if (value === 'false') {
        // treat the string 'false' as false
        return false;
    }
    return Boolean(value);
}
class EditorBooleanOption extends SimpleEditorOption {
    constructor(id, name, defaultValue, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'boolean';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
    }
    validate(input) {
        return boolean(input, this.defaultValue);
    }
}
/**
 * @internal
 */
export function clampedInt(value, defaultValue, minimum, maximum) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    let r = parseInt(value, 10);
    if (isNaN(r)) {
        return defaultValue;
    }
    r = Math.max(minimum, r);
    r = Math.min(maximum, r);
    return r | 0;
}
class EditorIntOption extends SimpleEditorOption {
    static clampedInt(value, defaultValue, minimum, maximum) {
        return clampedInt(value, defaultValue, minimum, maximum);
    }
    constructor(id, name, defaultValue, minimum, maximum, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'integer';
            schema.default = defaultValue;
            schema.minimum = minimum;
            schema.maximum = maximum;
        }
        super(id, name, defaultValue, schema);
        this.minimum = minimum;
        this.maximum = maximum;
    }
    validate(input) {
        return EditorIntOption.clampedInt(input, this.defaultValue, this.minimum, this.maximum);
    }
}
/**
 * @internal
 */
export function clampedFloat(value, defaultValue, minimum, maximum) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    const r = EditorFloatOption.float(value, defaultValue);
    return EditorFloatOption.clamp(r, minimum, maximum);
}
class EditorFloatOption extends SimpleEditorOption {
    static clamp(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    static float(value, defaultValue) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'undefined') {
            return defaultValue;
        }
        const r = parseFloat(value);
        return (isNaN(r) ? defaultValue : r);
    }
    constructor(id, name, defaultValue, validationFn, schema) {
        if (typeof schema !== 'undefined') {
            schema.type = 'number';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
        this.validationFn = validationFn;
    }
    validate(input) {
        return this.validationFn(EditorFloatOption.float(input, this.defaultValue));
    }
}
class EditorStringOption extends SimpleEditorOption {
    static string(value, defaultValue) {
        if (typeof value !== 'string') {
            return defaultValue;
        }
        return value;
    }
    constructor(id, name, defaultValue, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
    }
    validate(input) {
        return EditorStringOption.string(input, this.defaultValue);
    }
}
/**
 * @internal
 */
export function stringSet(value, defaultValue, allowedValues, renamedValues) {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    if (renamedValues && value in renamedValues) {
        return renamedValues[value];
    }
    if (allowedValues.indexOf(value) === -1) {
        return defaultValue;
    }
    return value;
}
class EditorStringEnumOption extends SimpleEditorOption {
    constructor(id, name, defaultValue, allowedValues, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.enum = allowedValues;
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
        this._allowedValues = allowedValues;
    }
    validate(input) {
        return stringSet(input, this.defaultValue, this._allowedValues);
    }
}
class EditorEnumOption extends BaseEditorOption {
    constructor(id, name, defaultValue, defaultStringValue, allowedValues, convert, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.enum = allowedValues;
            schema.default = defaultStringValue;
        }
        super(id, name, defaultValue, schema);
        this._allowedValues = allowedValues;
        this._convert = convert;
    }
    validate(input) {
        if (typeof input !== 'string') {
            return this.defaultValue;
        }
        if (this._allowedValues.indexOf(input) === -1) {
            return this.defaultValue;
        }
        return this._convert(input);
    }
}
//#endregion
//#region autoIndent
function _autoIndentFromString(autoIndent) {
    switch (autoIndent) {
        case 'none': return 0 /* EditorAutoIndentStrategy.None */;
        case 'keep': return 1 /* EditorAutoIndentStrategy.Keep */;
        case 'brackets': return 2 /* EditorAutoIndentStrategy.Brackets */;
        case 'advanced': return 3 /* EditorAutoIndentStrategy.Advanced */;
        case 'full': return 4 /* EditorAutoIndentStrategy.Full */;
    }
}
//#endregion
//#region accessibilitySupport
class EditorAccessibilitySupport extends BaseEditorOption {
    constructor() {
        super(2 /* EditorOption.accessibilitySupport */, 'accessibilitySupport', 0 /* AccessibilitySupport.Unknown */, {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            enumDescriptions: [
                nls.localize('accessibilitySupport.auto', "Use platform APIs to detect when a Screen Reader is attached."),
                nls.localize('accessibilitySupport.on', "Optimize for usage with a Screen Reader."),
                nls.localize('accessibilitySupport.off', "Assume a screen reader is not attached."),
            ],
            default: 'auto',
            tags: ['accessibility'],
            description: nls.localize('accessibilitySupport', "Controls if the UI should run in a mode where it is optimized for screen readers.")
        });
    }
    validate(input) {
        switch (input) {
            case 'auto': return 0 /* AccessibilitySupport.Unknown */;
            case 'off': return 1 /* AccessibilitySupport.Disabled */;
            case 'on': return 2 /* AccessibilitySupport.Enabled */;
        }
        return this.defaultValue;
    }
    compute(env, options, value) {
        if (value === 0 /* AccessibilitySupport.Unknown */) {
            // The editor reads the `accessibilitySupport` from the environment
            return env.accessibilitySupport;
        }
        return value;
    }
}
class EditorComments extends BaseEditorOption {
    constructor() {
        const defaults = {
            insertSpace: true,
            ignoreEmptyLines: true,
        };
        super(23 /* EditorOption.comments */, 'comments', defaults, {
            'editor.comments.insertSpace': {
                type: 'boolean',
                default: defaults.insertSpace,
                description: nls.localize('comments.insertSpace', "Controls whether a space character is inserted when commenting.")
            },
            'editor.comments.ignoreEmptyLines': {
                type: 'boolean',
                default: defaults.ignoreEmptyLines,
                description: nls.localize('comments.ignoreEmptyLines', 'Controls if empty lines should be ignored with toggle, add or remove actions for line comments.')
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            insertSpace: boolean(input.insertSpace, this.defaultValue.insertSpace),
            ignoreEmptyLines: boolean(input.ignoreEmptyLines, this.defaultValue.ignoreEmptyLines),
        };
    }
}
//#endregion
//#region cursorBlinking
/**
 * The kind of animation in which the editor's cursor should be rendered.
 */
export var TextEditorCursorBlinkingStyle;
(function (TextEditorCursorBlinkingStyle) {
    /**
     * Hidden
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Hidden"] = 0] = "Hidden";
    /**
     * Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Blink"] = 1] = "Blink";
    /**
     * Blinking with smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Smooth"] = 2] = "Smooth";
    /**
     * Blinking with prolonged filled state and smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Phase"] = 3] = "Phase";
    /**
     * Expand collapse animation on the y axis
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Expand"] = 4] = "Expand";
    /**
     * No-Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Solid"] = 5] = "Solid";
})(TextEditorCursorBlinkingStyle || (TextEditorCursorBlinkingStyle = {}));
/**
 * @internal
 */
export function cursorBlinkingStyleFromString(cursorBlinkingStyle) {
    switch (cursorBlinkingStyle) {
        case 'blink': return 1 /* TextEditorCursorBlinkingStyle.Blink */;
        case 'smooth': return 2 /* TextEditorCursorBlinkingStyle.Smooth */;
        case 'phase': return 3 /* TextEditorCursorBlinkingStyle.Phase */;
        case 'expand': return 4 /* TextEditorCursorBlinkingStyle.Expand */;
        case 'solid': return 5 /* TextEditorCursorBlinkingStyle.Solid */;
    }
}
//#endregion
//#region cursorStyle
/**
 * The style in which the editor's cursor should be rendered.
 */
export var TextEditorCursorStyle;
(function (TextEditorCursorStyle) {
    /**
     * As a vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Line"] = 1] = "Line";
    /**
     * As a block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Block"] = 2] = "Block";
    /**
     * As a horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Underline"] = 3] = "Underline";
    /**
     * As a thin vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["LineThin"] = 4] = "LineThin";
    /**
     * As an outlined block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["BlockOutline"] = 5] = "BlockOutline";
    /**
     * As a thin horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["UnderlineThin"] = 6] = "UnderlineThin";
})(TextEditorCursorStyle || (TextEditorCursorStyle = {}));
/**
 * @internal
 */
export function cursorStyleToString(cursorStyle) {
    switch (cursorStyle) {
        case TextEditorCursorStyle.Line: return 'line';
        case TextEditorCursorStyle.Block: return 'block';
        case TextEditorCursorStyle.Underline: return 'underline';
        case TextEditorCursorStyle.LineThin: return 'line-thin';
        case TextEditorCursorStyle.BlockOutline: return 'block-outline';
        case TextEditorCursorStyle.UnderlineThin: return 'underline-thin';
    }
}
/**
 * @internal
 */
export function cursorStyleFromString(cursorStyle) {
    switch (cursorStyle) {
        case 'line': return TextEditorCursorStyle.Line;
        case 'block': return TextEditorCursorStyle.Block;
        case 'underline': return TextEditorCursorStyle.Underline;
        case 'line-thin': return TextEditorCursorStyle.LineThin;
        case 'block-outline': return TextEditorCursorStyle.BlockOutline;
        case 'underline-thin': return TextEditorCursorStyle.UnderlineThin;
    }
}
//#endregion
//#region editorClassName
class EditorClassName extends ComputedEditorOption {
    constructor() {
        super(148 /* EditorOption.editorClassName */);
    }
    compute(env, options, _) {
        const classNames = ['monaco-editor'];
        if (options.get(41 /* EditorOption.extraEditorClassName */)) {
            classNames.push(options.get(41 /* EditorOption.extraEditorClassName */));
        }
        if (env.extraEditorClassName) {
            classNames.push(env.extraEditorClassName);
        }
        if (options.get(75 /* EditorOption.mouseStyle */) === 'default') {
            classNames.push('mouse-default');
        }
        else if (options.get(75 /* EditorOption.mouseStyle */) === 'copy') {
            classNames.push('mouse-copy');
        }
        if (options.get(116 /* EditorOption.showUnused */)) {
            classNames.push('showUnused');
        }
        if (options.get(145 /* EditorOption.showDeprecated */)) {
            classNames.push('showDeprecated');
        }
        return classNames.join(' ');
    }
}
//#endregion
//#region emptySelectionClipboard
class EditorEmptySelectionClipboard extends EditorBooleanOption {
    constructor() {
        super(38 /* EditorOption.emptySelectionClipboard */, 'emptySelectionClipboard', true, { description: nls.localize('emptySelectionClipboard', "Controls whether copying without a selection copies the current line.") });
    }
    compute(env, options, value) {
        return value && env.emptySelectionClipboard;
    }
}
class EditorFind extends BaseEditorOption {
    constructor() {
        const defaults = {
            cursorMoveOnType: true,
            seedSearchStringFromSelection: 'always',
            autoFindInSelection: 'never',
            globalFindClipboard: false,
            addExtraSpaceOnTop: true,
            loop: true,
            history: 'workspace',
            replaceHistory: 'workspace',
        };
        super(43 /* EditorOption.find */, 'find', defaults, {
            'editor.find.cursorMoveOnType': {
                type: 'boolean',
                default: defaults.cursorMoveOnType,
                description: nls.localize('find.cursorMoveOnType', "Controls whether the cursor should jump to find matches while typing.")
            },
            'editor.find.seedSearchStringFromSelection': {
                type: 'string',
                enum: ['never', 'always', 'selection'],
                default: defaults.seedSearchStringFromSelection,
                enumDescriptions: [
                    nls.localize('editor.find.seedSearchStringFromSelection.never', 'Never seed search string from the editor selection.'),
                    nls.localize('editor.find.seedSearchStringFromSelection.always', 'Always seed search string from the editor selection, including word at cursor position.'),
                    nls.localize('editor.find.seedSearchStringFromSelection.selection', 'Only seed search string from the editor selection.')
                ],
                description: nls.localize('find.seedSearchStringFromSelection', "Controls whether the search string in the Find Widget is seeded from the editor selection.")
            },
            'editor.find.autoFindInSelection': {
                type: 'string',
                enum: ['never', 'always', 'multiline'],
                default: defaults.autoFindInSelection,
                enumDescriptions: [
                    nls.localize('editor.find.autoFindInSelection.never', 'Never turn on Find in Selection automatically (default).'),
                    nls.localize('editor.find.autoFindInSelection.always', 'Always turn on Find in Selection automatically.'),
                    nls.localize('editor.find.autoFindInSelection.multiline', 'Turn on Find in Selection automatically when multiple lines of content are selected.')
                ],
                description: nls.localize('find.autoFindInSelection', "Controls the condition for turning on Find in Selection automatically.")
            },
            'editor.find.globalFindClipboard': {
                type: 'boolean',
                default: defaults.globalFindClipboard,
                description: nls.localize('find.globalFindClipboard', "Controls whether the Find Widget should read or modify the shared find clipboard on macOS."),
                included: platform.isMacintosh
            },
            'editor.find.addExtraSpaceOnTop': {
                type: 'boolean',
                default: defaults.addExtraSpaceOnTop,
                description: nls.localize('find.addExtraSpaceOnTop', "Controls whether the Find Widget should add extra lines on top of the editor. When true, you can scroll beyond the first line when the Find Widget is visible.")
            },
            'editor.find.loop': {
                type: 'boolean',
                default: defaults.loop,
                description: nls.localize('find.loop', "Controls whether the search automatically restarts from the beginning (or the end) when no further matches can be found.")
            },
            'editor.find.history': {
                type: 'string',
                enum: ['never', 'workspace'],
                default: 'workspace',
                enumDescriptions: [
                    nls.localize('editor.find.history.never', 'Do not store search history from the find widget.'),
                    nls.localize('editor.find.history.workspace', 'Store search history across the active workspace'),
                ],
                description: nls.localize('find.history', "Controls how the find widget history should be stored")
            },
            'editor.find.replaceHistory': {
                type: 'string',
                enum: ['never', 'workspace'],
                default: 'workspace',
                enumDescriptions: [
                    nls.localize('editor.find.replaceHistory.never', 'Do not store history from the replace widget.'),
                    nls.localize('editor.find.replaceHistory.workspace', 'Store replace history across the active workspace'),
                ],
                description: nls.localize('find.replaceHistory', "Controls how the replace widget history should be stored")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            cursorMoveOnType: boolean(input.cursorMoveOnType, this.defaultValue.cursorMoveOnType),
            seedSearchStringFromSelection: typeof _input.seedSearchStringFromSelection === 'boolean'
                ? (_input.seedSearchStringFromSelection ? 'always' : 'never')
                : stringSet(input.seedSearchStringFromSelection, this.defaultValue.seedSearchStringFromSelection, ['never', 'always', 'selection']),
            autoFindInSelection: typeof _input.autoFindInSelection === 'boolean'
                ? (_input.autoFindInSelection ? 'always' : 'never')
                : stringSet(input.autoFindInSelection, this.defaultValue.autoFindInSelection, ['never', 'always', 'multiline']),
            globalFindClipboard: boolean(input.globalFindClipboard, this.defaultValue.globalFindClipboard),
            addExtraSpaceOnTop: boolean(input.addExtraSpaceOnTop, this.defaultValue.addExtraSpaceOnTop),
            loop: boolean(input.loop, this.defaultValue.loop),
            history: stringSet(input.history, this.defaultValue.history, ['never', 'workspace']),
            replaceHistory: stringSet(input.replaceHistory, this.defaultValue.replaceHistory, ['never', 'workspace']),
        };
    }
}
//#endregion
//#region fontLigatures
/**
 * @internal
 */
export class EditorFontLigatures extends BaseEditorOption {
    static { this.OFF = '"liga" off, "calt" off'; }
    static { this.ON = '"liga" on, "calt" on'; }
    constructor() {
        super(53 /* EditorOption.fontLigatures */, 'fontLigatures', EditorFontLigatures.OFF, {
            anyOf: [
                {
                    type: 'boolean',
                    description: nls.localize('fontLigatures', "Enables/Disables font ligatures ('calt' and 'liga' font features). Change this to a string for fine-grained control of the 'font-feature-settings' CSS property."),
                },
                {
                    type: 'string',
                    description: nls.localize('fontFeatureSettings', "Explicit 'font-feature-settings' CSS property. A boolean can be passed instead if one only needs to turn on/off ligatures.")
                }
            ],
            description: nls.localize('fontLigaturesGeneral', "Configures font ligatures or font features. Can be either a boolean to enable/disable ligatures or a string for the value of the CSS 'font-feature-settings' property."),
            default: false
        });
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            if (input === 'false' || input.length === 0) {
                return EditorFontLigatures.OFF;
            }
            if (input === 'true') {
                return EditorFontLigatures.ON;
            }
            return input;
        }
        if (Boolean(input)) {
            return EditorFontLigatures.ON;
        }
        return EditorFontLigatures.OFF;
    }
}
//#endregion
//#region fontVariations
/**
 * @internal
 */
export class EditorFontVariations extends BaseEditorOption {
    // Text is laid out using default settings.
    static { this.OFF = 'normal'; }
    // Translate `fontWeight` config to the `font-variation-settings` CSS property.
    static { this.TRANSLATE = 'translate'; }
    constructor() {
        super(56 /* EditorOption.fontVariations */, 'fontVariations', EditorFontVariations.OFF, {
            anyOf: [
                {
                    type: 'boolean',
                    description: nls.localize('fontVariations', "Enables/Disables the translation from font-weight to font-variation-settings. Change this to a string for fine-grained control of the 'font-variation-settings' CSS property."),
                },
                {
                    type: 'string',
                    description: nls.localize('fontVariationSettings', "Explicit 'font-variation-settings' CSS property. A boolean can be passed instead if one only needs to translate font-weight to font-variation-settings.")
                }
            ],
            description: nls.localize('fontVariationsGeneral', "Configures font variations. Can be either a boolean to enable/disable the translation from font-weight to font-variation-settings or a string for the value of the CSS 'font-variation-settings' property."),
            default: false
        });
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            if (input === 'false') {
                return EditorFontVariations.OFF;
            }
            if (input === 'true') {
                return EditorFontVariations.TRANSLATE;
            }
            return input;
        }
        if (Boolean(input)) {
            return EditorFontVariations.TRANSLATE;
        }
        return EditorFontVariations.OFF;
    }
    compute(env, options, value) {
        // The value is computed from the fontWeight if it is true.
        // So take the result from env.fontInfo
        return env.fontInfo.fontVariationSettings;
    }
}
//#endregion
//#region fontInfo
class EditorFontInfo extends ComputedEditorOption {
    constructor() {
        super(52 /* EditorOption.fontInfo */);
    }
    compute(env, options, _) {
        return env.fontInfo;
    }
}
//#endregion
//#region effectiveCursorStyle
class EffectiveCursorStyle extends ComputedEditorOption {
    constructor() {
        super(147 /* EditorOption.effectiveCursorStyle */);
    }
    compute(env, options, _) {
        return env.inputMode === 'overtype' ?
            options.get(84 /* EditorOption.overtypeCursorStyle */) :
            options.get(28 /* EditorOption.cursorStyle */);
    }
}
//#endregion
//#region effectiveExperimentalEditContext
class EffectiveExperimentalEditContextEnabled extends ComputedEditorOption {
    constructor() {
        super(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
    }
    compute(env, options) {
        const editContextSupported = typeof globalThis.EditContext === 'function';
        return editContextSupported && options.get(37 /* EditorOption.experimentalEditContextEnabled */);
    }
}
//#endregion
//#region fontSize
class EditorFontSize extends SimpleEditorOption {
    constructor() {
        super(54 /* EditorOption.fontSize */, 'fontSize', EDITOR_FONT_DEFAULTS.fontSize, {
            type: 'number',
            minimum: 6,
            maximum: 100,
            default: EDITOR_FONT_DEFAULTS.fontSize,
            description: nls.localize('fontSize', "Controls the font size in pixels.")
        });
    }
    validate(input) {
        const r = EditorFloatOption.float(input, this.defaultValue);
        if (r === 0) {
            return EDITOR_FONT_DEFAULTS.fontSize;
        }
        return EditorFloatOption.clamp(r, 6, 100);
    }
    compute(env, options, value) {
        // The final fontSize respects the editor zoom level.
        // So take the result from env.fontInfo
        return env.fontInfo.fontSize;
    }
}
//#endregion
//#region fontWeight
class EditorFontWeight extends BaseEditorOption {
    static { this.SUGGESTION_VALUES = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']; }
    static { this.MINIMUM_VALUE = 1; }
    static { this.MAXIMUM_VALUE = 1000; }
    constructor() {
        super(55 /* EditorOption.fontWeight */, 'fontWeight', EDITOR_FONT_DEFAULTS.fontWeight, {
            anyOf: [
                {
                    type: 'number',
                    minimum: EditorFontWeight.MINIMUM_VALUE,
                    maximum: EditorFontWeight.MAXIMUM_VALUE,
                    errorMessage: nls.localize('fontWeightErrorMessage', "Only \"normal\" and \"bold\" keywords or numbers between 1 and 1000 are allowed.")
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
                },
                {
                    enum: EditorFontWeight.SUGGESTION_VALUES
                }
            ],
            default: EDITOR_FONT_DEFAULTS.fontWeight,
            description: nls.localize('fontWeight', "Controls the font weight. Accepts \"normal\" and \"bold\" keywords or numbers between 1 and 1000.")
        });
    }
    validate(input) {
        if (input === 'normal' || input === 'bold') {
            return input;
        }
        return String(EditorIntOption.clampedInt(input, EDITOR_FONT_DEFAULTS.fontWeight, EditorFontWeight.MINIMUM_VALUE, EditorFontWeight.MAXIMUM_VALUE));
    }
}
class EditorGoToLocation extends BaseEditorOption {
    constructor() {
        const defaults = {
            multiple: 'peek',
            multipleDefinitions: 'peek',
            multipleTypeDefinitions: 'peek',
            multipleDeclarations: 'peek',
            multipleImplementations: 'peek',
            multipleReferences: 'peek',
            multipleTests: 'peek',
            alternativeDefinitionCommand: 'editor.action.goToReferences',
            alternativeTypeDefinitionCommand: 'editor.action.goToReferences',
            alternativeDeclarationCommand: 'editor.action.goToReferences',
            alternativeImplementationCommand: '',
            alternativeReferenceCommand: '',
            alternativeTestsCommand: '',
        };
        const jsonSubset = {
            type: 'string',
            enum: ['peek', 'gotoAndPeek', 'goto'],
            default: defaults.multiple,
            enumDescriptions: [
                nls.localize('editor.gotoLocation.multiple.peek', 'Show Peek view of the results (default)'),
                nls.localize('editor.gotoLocation.multiple.gotoAndPeek', 'Go to the primary result and show a Peek view'),
                nls.localize('editor.gotoLocation.multiple.goto', 'Go to the primary result and enable Peek-less navigation to others')
            ]
        };
        const alternativeCommandOptions = ['', 'editor.action.referenceSearch.trigger', 'editor.action.goToReferences', 'editor.action.peekImplementation', 'editor.action.goToImplementation', 'editor.action.peekTypeDefinition', 'editor.action.goToTypeDefinition', 'editor.action.peekDeclaration', 'editor.action.revealDeclaration', 'editor.action.peekDefinition', 'editor.action.revealDefinitionAside', 'editor.action.revealDefinition'];
        super(60 /* EditorOption.gotoLocation */, 'gotoLocation', defaults, {
            'editor.gotoLocation.multiple': {
                deprecationMessage: nls.localize('editor.gotoLocation.multiple.deprecated', "This setting is deprecated, please use separate settings like 'editor.editor.gotoLocation.multipleDefinitions' or 'editor.editor.gotoLocation.multipleImplementations' instead."),
            },
            'editor.gotoLocation.multipleDefinitions': {
                description: nls.localize('editor.editor.gotoLocation.multipleDefinitions', "Controls the behavior the 'Go to Definition'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleTypeDefinitions': {
                description: nls.localize('editor.editor.gotoLocation.multipleTypeDefinitions', "Controls the behavior the 'Go to Type Definition'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleDeclarations': {
                description: nls.localize('editor.editor.gotoLocation.multipleDeclarations', "Controls the behavior the 'Go to Declaration'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleImplementations': {
                description: nls.localize('editor.editor.gotoLocation.multipleImplemenattions', "Controls the behavior the 'Go to Implementations'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleReferences': {
                description: nls.localize('editor.editor.gotoLocation.multipleReferences', "Controls the behavior the 'Go to References'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.alternativeDefinitionCommand': {
                type: 'string',
                default: defaults.alternativeDefinitionCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeDefinitionCommand', "Alternative command id that is being executed when the result of 'Go to Definition' is the current location.")
            },
            'editor.gotoLocation.alternativeTypeDefinitionCommand': {
                type: 'string',
                default: defaults.alternativeTypeDefinitionCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeTypeDefinitionCommand', "Alternative command id that is being executed when the result of 'Go to Type Definition' is the current location.")
            },
            'editor.gotoLocation.alternativeDeclarationCommand': {
                type: 'string',
                default: defaults.alternativeDeclarationCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeDeclarationCommand', "Alternative command id that is being executed when the result of 'Go to Declaration' is the current location.")
            },
            'editor.gotoLocation.alternativeImplementationCommand': {
                type: 'string',
                default: defaults.alternativeImplementationCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeImplementationCommand', "Alternative command id that is being executed when the result of 'Go to Implementation' is the current location.")
            },
            'editor.gotoLocation.alternativeReferenceCommand': {
                type: 'string',
                default: defaults.alternativeReferenceCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeReferenceCommand', "Alternative command id that is being executed when the result of 'Go to Reference' is the current location.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            multiple: stringSet(input.multiple, this.defaultValue.multiple, ['peek', 'gotoAndPeek', 'goto']),
            multipleDefinitions: input.multipleDefinitions ?? stringSet(input.multipleDefinitions, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleTypeDefinitions: input.multipleTypeDefinitions ?? stringSet(input.multipleTypeDefinitions, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleDeclarations: input.multipleDeclarations ?? stringSet(input.multipleDeclarations, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleImplementations: input.multipleImplementations ?? stringSet(input.multipleImplementations, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleReferences: input.multipleReferences ?? stringSet(input.multipleReferences, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleTests: input.multipleTests ?? stringSet(input.multipleTests, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            alternativeDefinitionCommand: EditorStringOption.string(input.alternativeDefinitionCommand, this.defaultValue.alternativeDefinitionCommand),
            alternativeTypeDefinitionCommand: EditorStringOption.string(input.alternativeTypeDefinitionCommand, this.defaultValue.alternativeTypeDefinitionCommand),
            alternativeDeclarationCommand: EditorStringOption.string(input.alternativeDeclarationCommand, this.defaultValue.alternativeDeclarationCommand),
            alternativeImplementationCommand: EditorStringOption.string(input.alternativeImplementationCommand, this.defaultValue.alternativeImplementationCommand),
            alternativeReferenceCommand: EditorStringOption.string(input.alternativeReferenceCommand, this.defaultValue.alternativeReferenceCommand),
            alternativeTestsCommand: EditorStringOption.string(input.alternativeTestsCommand, this.defaultValue.alternativeTestsCommand),
        };
    }
}
class EditorHover extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            delay: 300,
            hidingDelay: 300,
            sticky: true,
            above: true,
        };
        super(62 /* EditorOption.hover */, 'hover', defaults, {
            'editor.hover.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('hover.enabled', "Controls whether the hover is shown.")
            },
            'editor.hover.delay': {
                type: 'number',
                default: defaults.delay,
                minimum: 0,
                maximum: 10000,
                description: nls.localize('hover.delay', "Controls the delay in milliseconds after which the hover is shown.")
            },
            'editor.hover.sticky': {
                type: 'boolean',
                default: defaults.sticky,
                description: nls.localize('hover.sticky', "Controls whether the hover should remain visible when mouse is moved over it.")
            },
            'editor.hover.hidingDelay': {
                type: 'integer',
                minimum: 0,
                default: defaults.hidingDelay,
                description: nls.localize('hover.hidingDelay', "Controls the delay in milliseconds after which the hover is hidden. Requires `editor.hover.sticky` to be enabled.")
            },
            'editor.hover.above': {
                type: 'boolean',
                default: defaults.above,
                description: nls.localize('hover.above', "Prefer showing hovers above the line, if there's space.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            delay: EditorIntOption.clampedInt(input.delay, this.defaultValue.delay, 0, 10000),
            sticky: boolean(input.sticky, this.defaultValue.sticky),
            hidingDelay: EditorIntOption.clampedInt(input.hidingDelay, this.defaultValue.hidingDelay, 0, 600000),
            above: boolean(input.above, this.defaultValue.above),
        };
    }
}
export var RenderMinimap;
(function (RenderMinimap) {
    RenderMinimap[RenderMinimap["None"] = 0] = "None";
    RenderMinimap[RenderMinimap["Text"] = 1] = "Text";
    RenderMinimap[RenderMinimap["Blocks"] = 2] = "Blocks";
})(RenderMinimap || (RenderMinimap = {}));
/**
 * @internal
 */
export class EditorLayoutInfoComputer extends ComputedEditorOption {
    constructor() {
        super(151 /* EditorOption.layoutInfo */);
    }
    compute(env, options, _) {
        return EditorLayoutInfoComputer.computeLayout(options, {
            memory: env.memory,
            outerWidth: env.outerWidth,
            outerHeight: env.outerHeight,
            isDominatedByLongLines: env.isDominatedByLongLines,
            lineHeight: env.fontInfo.lineHeight,
            viewLineCount: env.viewLineCount,
            lineNumbersDigitCount: env.lineNumbersDigitCount,
            typicalHalfwidthCharacterWidth: env.fontInfo.typicalHalfwidthCharacterWidth,
            maxDigitWidth: env.fontInfo.maxDigitWidth,
            pixelRatio: env.pixelRatio,
            glyphMarginDecorationLaneCount: env.glyphMarginDecorationLaneCount
        });
    }
    static computeContainedMinimapLineCount(input) {
        const typicalViewportLineCount = input.height / input.lineHeight;
        const extraLinesBeforeFirstLine = Math.floor(input.paddingTop / input.lineHeight);
        let extraLinesBeyondLastLine = Math.floor(input.paddingBottom / input.lineHeight);
        if (input.scrollBeyondLastLine) {
            extraLinesBeyondLastLine = Math.max(extraLinesBeyondLastLine, typicalViewportLineCount - 1);
        }
        const desiredRatio = (extraLinesBeforeFirstLine + input.viewLineCount + extraLinesBeyondLastLine) / (input.pixelRatio * input.height);
        const minimapLineCount = Math.floor(input.viewLineCount / desiredRatio);
        return { typicalViewportLineCount, extraLinesBeforeFirstLine, extraLinesBeyondLastLine, desiredRatio, minimapLineCount };
    }
    static _computeMinimapLayout(input, memory) {
        const outerWidth = input.outerWidth;
        const outerHeight = input.outerHeight;
        const pixelRatio = input.pixelRatio;
        if (!input.minimap.enabled) {
            return {
                renderMinimap: 0 /* RenderMinimap.None */,
                minimapLeft: 0,
                minimapWidth: 0,
                minimapHeightIsEditorHeight: false,
                minimapIsSampling: false,
                minimapScale: 1,
                minimapLineHeight: 1,
                minimapCanvasInnerWidth: 0,
                minimapCanvasInnerHeight: Math.floor(pixelRatio * outerHeight),
                minimapCanvasOuterWidth: 0,
                minimapCanvasOuterHeight: outerHeight,
            };
        }
        // Can use memory if only the `viewLineCount` and `remainingWidth` have changed
        const stableMinimapLayoutInput = memory.stableMinimapLayoutInput;
        const couldUseMemory = (stableMinimapLayoutInput
            // && input.outerWidth === lastMinimapLayoutInput.outerWidth !!! INTENTIONAL OMITTED
            && input.outerHeight === stableMinimapLayoutInput.outerHeight
            && input.lineHeight === stableMinimapLayoutInput.lineHeight
            && input.typicalHalfwidthCharacterWidth === stableMinimapLayoutInput.typicalHalfwidthCharacterWidth
            && input.pixelRatio === stableMinimapLayoutInput.pixelRatio
            && input.scrollBeyondLastLine === stableMinimapLayoutInput.scrollBeyondLastLine
            && input.paddingTop === stableMinimapLayoutInput.paddingTop
            && input.paddingBottom === stableMinimapLayoutInput.paddingBottom
            && input.minimap.enabled === stableMinimapLayoutInput.minimap.enabled
            && input.minimap.side === stableMinimapLayoutInput.minimap.side
            && input.minimap.size === stableMinimapLayoutInput.minimap.size
            && input.minimap.showSlider === stableMinimapLayoutInput.minimap.showSlider
            && input.minimap.renderCharacters === stableMinimapLayoutInput.minimap.renderCharacters
            && input.minimap.maxColumn === stableMinimapLayoutInput.minimap.maxColumn
            && input.minimap.scale === stableMinimapLayoutInput.minimap.scale
            && input.verticalScrollbarWidth === stableMinimapLayoutInput.verticalScrollbarWidth
            // && input.viewLineCount === lastMinimapLayoutInput.viewLineCount !!! INTENTIONAL OMITTED
            // && input.remainingWidth === lastMinimapLayoutInput.remainingWidth !!! INTENTIONAL OMITTED
            && input.isViewportWrapping === stableMinimapLayoutInput.isViewportWrapping);
        const lineHeight = input.lineHeight;
        const typicalHalfwidthCharacterWidth = input.typicalHalfwidthCharacterWidth;
        const scrollBeyondLastLine = input.scrollBeyondLastLine;
        const minimapRenderCharacters = input.minimap.renderCharacters;
        let minimapScale = (pixelRatio >= 2 ? Math.round(input.minimap.scale * 2) : input.minimap.scale);
        const minimapMaxColumn = input.minimap.maxColumn;
        const minimapSize = input.minimap.size;
        const minimapSide = input.minimap.side;
        const verticalScrollbarWidth = input.verticalScrollbarWidth;
        const viewLineCount = input.viewLineCount;
        const remainingWidth = input.remainingWidth;
        const isViewportWrapping = input.isViewportWrapping;
        const baseCharHeight = minimapRenderCharacters ? 2 : 3;
        let minimapCanvasInnerHeight = Math.floor(pixelRatio * outerHeight);
        const minimapCanvasOuterHeight = minimapCanvasInnerHeight / pixelRatio;
        let minimapHeightIsEditorHeight = false;
        let minimapIsSampling = false;
        let minimapLineHeight = baseCharHeight * minimapScale;
        let minimapCharWidth = minimapScale / pixelRatio;
        let minimapWidthMultiplier = 1;
        if (minimapSize === 'fill' || minimapSize === 'fit') {
            const { typicalViewportLineCount, extraLinesBeforeFirstLine, extraLinesBeyondLastLine, desiredRatio, minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
                viewLineCount: viewLineCount,
                scrollBeyondLastLine: scrollBeyondLastLine,
                paddingTop: input.paddingTop,
                paddingBottom: input.paddingBottom,
                height: outerHeight,
                lineHeight: lineHeight,
                pixelRatio: pixelRatio
            });
            // ratio is intentionally not part of the layout to avoid the layout changing all the time
            // when doing sampling
            const ratio = viewLineCount / minimapLineCount;
            if (ratio > 1) {
                minimapHeightIsEditorHeight = true;
                minimapIsSampling = true;
                minimapScale = 1;
                minimapLineHeight = 1;
                minimapCharWidth = minimapScale / pixelRatio;
            }
            else {
                let fitBecomesFill = false;
                let maxMinimapScale = minimapScale + 1;
                if (minimapSize === 'fit') {
                    const effectiveMinimapHeight = Math.ceil((extraLinesBeforeFirstLine + viewLineCount + extraLinesBeyondLastLine) * minimapLineHeight);
                    if (isViewportWrapping && couldUseMemory && remainingWidth <= memory.stableFitRemainingWidth) {
                        // There is a loop when using `fit` and viewport wrapping:
                        // - view line count impacts minimap layout
                        // - minimap layout impacts viewport width
                        // - viewport width impacts view line count
                        // To break the loop, once we go to a smaller minimap scale, we try to stick with it.
                        fitBecomesFill = true;
                        maxMinimapScale = memory.stableFitMaxMinimapScale;
                    }
                    else {
                        fitBecomesFill = (effectiveMinimapHeight > minimapCanvasInnerHeight);
                    }
                }
                if (minimapSize === 'fill' || fitBecomesFill) {
                    minimapHeightIsEditorHeight = true;
                    const configuredMinimapScale = minimapScale;
                    minimapLineHeight = Math.min(lineHeight * pixelRatio, Math.max(1, Math.floor(1 / desiredRatio)));
                    if (isViewportWrapping && couldUseMemory && remainingWidth <= memory.stableFitRemainingWidth) {
                        // There is a loop when using `fill` and viewport wrapping:
                        // - view line count impacts minimap layout
                        // - minimap layout impacts viewport width
                        // - viewport width impacts view line count
                        // To break the loop, once we go to a smaller minimap scale, we try to stick with it.
                        maxMinimapScale = memory.stableFitMaxMinimapScale;
                    }
                    minimapScale = Math.min(maxMinimapScale, Math.max(1, Math.floor(minimapLineHeight / baseCharHeight)));
                    if (minimapScale > configuredMinimapScale) {
                        minimapWidthMultiplier = Math.min(2, minimapScale / configuredMinimapScale);
                    }
                    minimapCharWidth = minimapScale / pixelRatio / minimapWidthMultiplier;
                    minimapCanvasInnerHeight = Math.ceil((Math.max(typicalViewportLineCount, extraLinesBeforeFirstLine + viewLineCount + extraLinesBeyondLastLine)) * minimapLineHeight);
                    if (isViewportWrapping) {
                        // remember for next time
                        memory.stableMinimapLayoutInput = input;
                        memory.stableFitRemainingWidth = remainingWidth;
                        memory.stableFitMaxMinimapScale = minimapScale;
                    }
                    else {
                        memory.stableMinimapLayoutInput = null;
                        memory.stableFitRemainingWidth = 0;
                    }
                }
            }
        }
        // Given:
        // (leaving 2px for the cursor to have space after the last character)
        // viewportColumn = (contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth
        // minimapWidth = viewportColumn * minimapCharWidth
        // contentWidth = remainingWidth - minimapWidth
        // What are good values for contentWidth and minimapWidth ?
        // minimapWidth = ((contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth) * minimapCharWidth
        // typicalHalfwidthCharacterWidth * minimapWidth = (contentWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // typicalHalfwidthCharacterWidth * minimapWidth = (remainingWidth - minimapWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // (typicalHalfwidthCharacterWidth + minimapCharWidth) * minimapWidth = (remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // minimapWidth = ((remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth)
        const minimapMaxWidth = Math.floor(minimapMaxColumn * minimapCharWidth);
        const minimapWidth = Math.min(minimapMaxWidth, Math.max(0, Math.floor(((remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth))) + MINIMAP_GUTTER_WIDTH);
        let minimapCanvasInnerWidth = Math.floor(pixelRatio * minimapWidth);
        const minimapCanvasOuterWidth = minimapCanvasInnerWidth / pixelRatio;
        minimapCanvasInnerWidth = Math.floor(minimapCanvasInnerWidth * minimapWidthMultiplier);
        const renderMinimap = (minimapRenderCharacters ? 1 /* RenderMinimap.Text */ : 2 /* RenderMinimap.Blocks */);
        const minimapLeft = (minimapSide === 'left' ? 0 : (outerWidth - minimapWidth - verticalScrollbarWidth));
        return {
            renderMinimap,
            minimapLeft,
            minimapWidth,
            minimapHeightIsEditorHeight,
            minimapIsSampling,
            minimapScale,
            minimapLineHeight,
            minimapCanvasInnerWidth,
            minimapCanvasInnerHeight,
            minimapCanvasOuterWidth,
            minimapCanvasOuterHeight,
        };
    }
    static computeLayout(options, env) {
        const outerWidth = env.outerWidth | 0;
        const outerHeight = env.outerHeight | 0;
        const lineHeight = env.lineHeight | 0;
        const lineNumbersDigitCount = env.lineNumbersDigitCount | 0;
        const typicalHalfwidthCharacterWidth = env.typicalHalfwidthCharacterWidth;
        const maxDigitWidth = env.maxDigitWidth;
        const pixelRatio = env.pixelRatio;
        const viewLineCount = env.viewLineCount;
        const wordWrapOverride2 = options.get(142 /* EditorOption.wordWrapOverride2 */);
        const wordWrapOverride1 = (wordWrapOverride2 === 'inherit' ? options.get(141 /* EditorOption.wordWrapOverride1 */) : wordWrapOverride2);
        const wordWrap = (wordWrapOverride1 === 'inherit' ? options.get(137 /* EditorOption.wordWrap */) : wordWrapOverride1);
        const wordWrapColumn = options.get(140 /* EditorOption.wordWrapColumn */);
        const isDominatedByLongLines = env.isDominatedByLongLines;
        const showGlyphMargin = options.get(59 /* EditorOption.glyphMargin */);
        const showLineNumbers = (options.get(69 /* EditorOption.lineNumbers */).renderType !== 0 /* RenderLineNumbersType.Off */);
        const lineNumbersMinChars = options.get(70 /* EditorOption.lineNumbersMinChars */);
        const scrollBeyondLastLine = options.get(110 /* EditorOption.scrollBeyondLastLine */);
        const padding = options.get(88 /* EditorOption.padding */);
        const minimap = options.get(74 /* EditorOption.minimap */);
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        const verticalScrollbarWidth = scrollbar.verticalScrollbarSize;
        const verticalScrollbarHasArrows = scrollbar.verticalHasArrows;
        const scrollbarArrowSize = scrollbar.arrowSize;
        const horizontalScrollbarHeight = scrollbar.horizontalScrollbarSize;
        const folding = options.get(45 /* EditorOption.folding */);
        const showFoldingDecoration = options.get(115 /* EditorOption.showFoldingControls */) !== 'never';
        let lineDecorationsWidth = options.get(67 /* EditorOption.lineDecorationsWidth */);
        if (folding && showFoldingDecoration) {
            lineDecorationsWidth += 16;
        }
        let lineNumbersWidth = 0;
        if (showLineNumbers) {
            const digitCount = Math.max(lineNumbersDigitCount, lineNumbersMinChars);
            lineNumbersWidth = Math.round(digitCount * maxDigitWidth);
        }
        let glyphMarginWidth = 0;
        if (showGlyphMargin) {
            glyphMarginWidth = lineHeight * env.glyphMarginDecorationLaneCount;
        }
        let glyphMarginLeft = 0;
        let lineNumbersLeft = glyphMarginLeft + glyphMarginWidth;
        let decorationsLeft = lineNumbersLeft + lineNumbersWidth;
        let contentLeft = decorationsLeft + lineDecorationsWidth;
        const remainingWidth = outerWidth - glyphMarginWidth - lineNumbersWidth - lineDecorationsWidth;
        let isWordWrapMinified = false;
        let isViewportWrapping = false;
        let wrappingColumn = -1;
        if (wordWrapOverride1 === 'inherit' && isDominatedByLongLines) {
            // Force viewport width wrapping if model is dominated by long lines
            isWordWrapMinified = true;
            isViewportWrapping = true;
        }
        else if (wordWrap === 'on' || wordWrap === 'bounded') {
            isViewportWrapping = true;
        }
        else if (wordWrap === 'wordWrapColumn') {
            wrappingColumn = wordWrapColumn;
        }
        const minimapLayout = EditorLayoutInfoComputer._computeMinimapLayout({
            outerWidth: outerWidth,
            outerHeight: outerHeight,
            lineHeight: lineHeight,
            typicalHalfwidthCharacterWidth: typicalHalfwidthCharacterWidth,
            pixelRatio: pixelRatio,
            scrollBeyondLastLine: scrollBeyondLastLine,
            paddingTop: padding.top,
            paddingBottom: padding.bottom,
            minimap: minimap,
            verticalScrollbarWidth: verticalScrollbarWidth,
            viewLineCount: viewLineCount,
            remainingWidth: remainingWidth,
            isViewportWrapping: isViewportWrapping,
        }, env.memory || new ComputeOptionsMemory());
        if (minimapLayout.renderMinimap !== 0 /* RenderMinimap.None */ && minimapLayout.minimapLeft === 0) {
            // the minimap is rendered to the left, so move everything to the right
            glyphMarginLeft += minimapLayout.minimapWidth;
            lineNumbersLeft += minimapLayout.minimapWidth;
            decorationsLeft += minimapLayout.minimapWidth;
            contentLeft += minimapLayout.minimapWidth;
        }
        const contentWidth = remainingWidth - minimapLayout.minimapWidth;
        // (leaving 2px for the cursor to have space after the last character)
        const viewportColumn = Math.max(1, Math.floor((contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth));
        const verticalArrowSize = (verticalScrollbarHasArrows ? scrollbarArrowSize : 0);
        if (isViewportWrapping) {
            // compute the actual wrappingColumn
            wrappingColumn = Math.max(1, viewportColumn);
            if (wordWrap === 'bounded') {
                wrappingColumn = Math.min(wrappingColumn, wordWrapColumn);
            }
        }
        return {
            width: outerWidth,
            height: outerHeight,
            glyphMarginLeft: glyphMarginLeft,
            glyphMarginWidth: glyphMarginWidth,
            glyphMarginDecorationLaneCount: env.glyphMarginDecorationLaneCount,
            lineNumbersLeft: lineNumbersLeft,
            lineNumbersWidth: lineNumbersWidth,
            decorationsLeft: decorationsLeft,
            decorationsWidth: lineDecorationsWidth,
            contentLeft: contentLeft,
            contentWidth: contentWidth,
            minimap: minimapLayout,
            viewportColumn: viewportColumn,
            isWordWrapMinified: isWordWrapMinified,
            isViewportWrapping: isViewportWrapping,
            wrappingColumn: wrappingColumn,
            verticalScrollbarWidth: verticalScrollbarWidth,
            horizontalScrollbarHeight: horizontalScrollbarHeight,
            overviewRuler: {
                top: verticalArrowSize,
                width: verticalScrollbarWidth,
                height: (outerHeight - 2 * verticalArrowSize),
                right: 0
            }
        };
    }
}
//#endregion
//#region WrappingStrategy
class WrappingStrategy extends BaseEditorOption {
    constructor() {
        super(144 /* EditorOption.wrappingStrategy */, 'wrappingStrategy', 'simple', {
            'editor.wrappingStrategy': {
                enumDescriptions: [
                    nls.localize('wrappingStrategy.simple', "Assumes that all characters are of the same width. This is a fast algorithm that works correctly for monospace fonts and certain scripts (like Latin characters) where glyphs are of equal width."),
                    nls.localize('wrappingStrategy.advanced', "Delegates wrapping points computation to the browser. This is a slow algorithm, that might cause freezes for large files, but it works correctly in all cases.")
                ],
                type: 'string',
                enum: ['simple', 'advanced'],
                default: 'simple',
                description: nls.localize('wrappingStrategy', "Controls the algorithm that computes wrapping points. Note that when in accessibility mode, advanced will be used for the best experience.")
            }
        });
    }
    validate(input) {
        return stringSet(input, 'simple', ['simple', 'advanced']);
    }
    compute(env, options, value) {
        const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // if we know for a fact that a screen reader is attached, we switch our strategy to advanced to
            // help that the editor's wrapping points match the textarea's wrapping points
            return 'advanced';
        }
        return value;
    }
}
//#endregion
//#region lightbulb
export var ShowLightbulbIconMode;
(function (ShowLightbulbIconMode) {
    ShowLightbulbIconMode["Off"] = "off";
    ShowLightbulbIconMode["OnCode"] = "onCode";
    ShowLightbulbIconMode["On"] = "on";
})(ShowLightbulbIconMode || (ShowLightbulbIconMode = {}));
class EditorLightbulb extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: ShowLightbulbIconMode.OnCode };
        super(66 /* EditorOption.lightbulb */, 'lightbulb', defaults, {
            'editor.lightbulb.enabled': {
                type: 'string',
                enum: [ShowLightbulbIconMode.Off, ShowLightbulbIconMode.OnCode, ShowLightbulbIconMode.On],
                default: defaults.enabled,
                enumDescriptions: [
                    nls.localize('editor.lightbulb.enabled.off', 'Disable the code action menu.'),
                    nls.localize('editor.lightbulb.enabled.onCode', 'Show the code action menu when the cursor is on lines with code.'),
                    nls.localize('editor.lightbulb.enabled.on', 'Show the code action menu when the cursor is on lines with code or on empty lines.'),
                ],
                description: nls.localize('enabled', "Enables the Code Action lightbulb in the editor.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: stringSet(input.enabled, this.defaultValue.enabled, [ShowLightbulbIconMode.Off, ShowLightbulbIconMode.OnCode, ShowLightbulbIconMode.On])
        };
    }
}
class EditorStickyScroll extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, maxLineCount: 5, defaultModel: 'outlineModel', scrollWithEditor: true };
        super(120 /* EditorOption.stickyScroll */, 'stickyScroll', defaults, {
            'editor.stickyScroll.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('editor.stickyScroll.enabled', "Shows the nested current scopes during the scroll at the top of the editor.")
            },
            'editor.stickyScroll.maxLineCount': {
                type: 'number',
                default: defaults.maxLineCount,
                minimum: 1,
                maximum: 20,
                description: nls.localize('editor.stickyScroll.maxLineCount', "Defines the maximum number of sticky lines to show.")
            },
            'editor.stickyScroll.defaultModel': {
                type: 'string',
                enum: ['outlineModel', 'foldingProviderModel', 'indentationModel'],
                default: defaults.defaultModel,
                description: nls.localize('editor.stickyScroll.defaultModel', "Defines the model to use for determining which lines to stick. If the outline model does not exist, it will fall back on the folding provider model which falls back on the indentation model. This order is respected in all three cases.")
            },
            'editor.stickyScroll.scrollWithEditor': {
                type: 'boolean',
                default: defaults.scrollWithEditor,
                description: nls.localize('editor.stickyScroll.scrollWithEditor', "Enable scrolling of Sticky Scroll with the editor's horizontal scrollbar.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            maxLineCount: EditorIntOption.clampedInt(input.maxLineCount, this.defaultValue.maxLineCount, 1, 20),
            defaultModel: stringSet(input.defaultModel, this.defaultValue.defaultModel, ['outlineModel', 'foldingProviderModel', 'indentationModel']),
            scrollWithEditor: boolean(input.scrollWithEditor, this.defaultValue.scrollWithEditor)
        };
    }
}
class EditorInlayHints extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: 'on', fontSize: 0, fontFamily: '', padding: false, maximumLength: 43 };
        super(146 /* EditorOption.inlayHints */, 'inlayHints', defaults, {
            'editor.inlayHints.enabled': {
                type: 'string',
                default: defaults.enabled,
                description: nls.localize('inlayHints.enable', "Enables the inlay hints in the editor."),
                enum: ['on', 'onUnlessPressed', 'offUnlessPressed', 'off'],
                markdownEnumDescriptions: [
                    nls.localize('editor.inlayHints.on', "Inlay hints are enabled"),
                    nls.localize('editor.inlayHints.onUnlessPressed', "Inlay hints are showing by default and hide when holding {0}", platform.isMacintosh ? `Ctrl+Option` : `Ctrl+Alt`),
                    nls.localize('editor.inlayHints.offUnlessPressed', "Inlay hints are hidden by default and show when holding {0}", platform.isMacintosh ? `Ctrl+Option` : `Ctrl+Alt`),
                    nls.localize('editor.inlayHints.off', "Inlay hints are disabled"),
                ],
            },
            'editor.inlayHints.fontSize': {
                type: 'number',
                default: defaults.fontSize,
                markdownDescription: nls.localize('inlayHints.fontSize', "Controls font size of inlay hints in the editor. As default the {0} is used when the configured value is less than {1} or greater than the editor font size.", '`#editor.fontSize#`', '`5`')
            },
            'editor.inlayHints.fontFamily': {
                type: 'string',
                default: defaults.fontFamily,
                markdownDescription: nls.localize('inlayHints.fontFamily', "Controls font family of inlay hints in the editor. When set to empty, the {0} is used.", '`#editor.fontFamily#`')
            },
            'editor.inlayHints.padding': {
                type: 'boolean',
                default: defaults.padding,
                description: nls.localize('inlayHints.padding', "Enables the padding around the inlay hints in the editor.")
            },
            'editor.inlayHints.maximumLength': {
                type: 'number',
                default: defaults.maximumLength,
                markdownDescription: nls.localize('inlayHints.maximumLength', "Maximum overall length of inlay hints, for a single line, before they get truncated by the editor. Set to `0` to never truncate")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        if (typeof input.enabled === 'boolean') {
            input.enabled = input.enabled ? 'on' : 'off';
        }
        return {
            enabled: stringSet(input.enabled, this.defaultValue.enabled, ['on', 'off', 'offUnlessPressed', 'onUnlessPressed']),
            fontSize: EditorIntOption.clampedInt(input.fontSize, this.defaultValue.fontSize, 0, 100),
            fontFamily: EditorStringOption.string(input.fontFamily, this.defaultValue.fontFamily),
            padding: boolean(input.padding, this.defaultValue.padding),
            maximumLength: EditorIntOption.clampedInt(input.maximumLength, this.defaultValue.maximumLength, 0, Number.MAX_SAFE_INTEGER),
        };
    }
}
//#endregion
//#region lineDecorationsWidth
class EditorLineDecorationsWidth extends BaseEditorOption {
    constructor() {
        super(67 /* EditorOption.lineDecorationsWidth */, 'lineDecorationsWidth', 10);
    }
    validate(input) {
        if (typeof input === 'string' && /^\d+(\.\d+)?ch$/.test(input)) {
            const multiple = parseFloat(input.substring(0, input.length - 2));
            return -multiple; // negative numbers signal a multiple
        }
        else {
            return EditorIntOption.clampedInt(input, this.defaultValue, 0, 1000);
        }
    }
    compute(env, options, value) {
        if (value < 0) {
            // negative numbers signal a multiple
            return EditorIntOption.clampedInt(-value * env.fontInfo.typicalHalfwidthCharacterWidth, this.defaultValue, 0, 1000);
        }
        else {
            return value;
        }
    }
}
//#endregion
//#region lineHeight
class EditorLineHeight extends EditorFloatOption {
    constructor() {
        super(68 /* EditorOption.lineHeight */, 'lineHeight', EDITOR_FONT_DEFAULTS.lineHeight, x => EditorFloatOption.clamp(x, 0, 150), { markdownDescription: nls.localize('lineHeight', "Controls the line height. \n - Use 0 to automatically compute the line height from the font size.\n - Values between 0 and 8 will be used as a multiplier with the font size.\n - Values greater than or equal to 8 will be used as effective values.") });
    }
    compute(env, options, value) {
        // The lineHeight is computed from the fontSize if it is 0.
        // Moreover, the final lineHeight respects the editor zoom level.
        // So take the result from env.fontInfo
        return env.fontInfo.lineHeight;
    }
}
class EditorMinimap extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            size: 'proportional',
            side: 'right',
            showSlider: 'mouseover',
            autohide: false,
            renderCharacters: true,
            maxColumn: 120,
            scale: 1,
            showRegionSectionHeaders: true,
            showMarkSectionHeaders: true,
            markSectionHeaderRegex: '\\bMARK:\\s*(?<separator>\-?)\\s*(?<label>.*)$',
            sectionHeaderFontSize: 9,
            sectionHeaderLetterSpacing: 1,
        };
        super(74 /* EditorOption.minimap */, 'minimap', defaults, {
            'editor.minimap.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('minimap.enabled', "Controls whether the minimap is shown.")
            },
            'editor.minimap.autohide': {
                type: 'boolean',
                default: defaults.autohide,
                description: nls.localize('minimap.autohide', "Controls whether the minimap is hidden automatically.")
            },
            'editor.minimap.size': {
                type: 'string',
                enum: ['proportional', 'fill', 'fit'],
                enumDescriptions: [
                    nls.localize('minimap.size.proportional', "The minimap has the same size as the editor contents (and might scroll)."),
                    nls.localize('minimap.size.fill', "The minimap will stretch or shrink as necessary to fill the height of the editor (no scrolling)."),
                    nls.localize('minimap.size.fit', "The minimap will shrink as necessary to never be larger than the editor (no scrolling)."),
                ],
                default: defaults.size,
                description: nls.localize('minimap.size', "Controls the size of the minimap.")
            },
            'editor.minimap.side': {
                type: 'string',
                enum: ['left', 'right'],
                default: defaults.side,
                description: nls.localize('minimap.side', "Controls the side where to render the minimap.")
            },
            'editor.minimap.showSlider': {
                type: 'string',
                enum: ['always', 'mouseover'],
                default: defaults.showSlider,
                description: nls.localize('minimap.showSlider', "Controls when the minimap slider is shown.")
            },
            'editor.minimap.scale': {
                type: 'number',
                default: defaults.scale,
                minimum: 1,
                maximum: 3,
                enum: [1, 2, 3],
                description: nls.localize('minimap.scale', "Scale of content drawn in the minimap: 1, 2 or 3.")
            },
            'editor.minimap.renderCharacters': {
                type: 'boolean',
                default: defaults.renderCharacters,
                description: nls.localize('minimap.renderCharacters', "Render the actual characters on a line as opposed to color blocks.")
            },
            'editor.minimap.maxColumn': {
                type: 'number',
                default: defaults.maxColumn,
                description: nls.localize('minimap.maxColumn', "Limit the width of the minimap to render at most a certain number of columns.")
            },
            'editor.minimap.showRegionSectionHeaders': {
                type: 'boolean',
                default: defaults.showRegionSectionHeaders,
                description: nls.localize('minimap.showRegionSectionHeaders', "Controls whether named regions are shown as section headers in the minimap.")
            },
            'editor.minimap.showMarkSectionHeaders': {
                type: 'boolean',
                default: defaults.showMarkSectionHeaders,
                description: nls.localize('minimap.showMarkSectionHeaders', "Controls whether MARK: comments are shown as section headers in the minimap.")
            },
            'editor.minimap.markSectionHeaderRegex': {
                type: 'string',
                default: defaults.markSectionHeaderRegex,
                description: nls.localize('minimap.markSectionHeaderRegex', "Defines the regular expression used to find section headers in comments. The regex must contain a named match group `label` (written as `(?<label>.+)`) that encapsulates the section header, otherwise it will not work. Optionally you can include another match group named `separator`. Use \\n in the pattern to match multi-line headers."),
            },
            'editor.minimap.sectionHeaderFontSize': {
                type: 'number',
                default: defaults.sectionHeaderFontSize,
                description: nls.localize('minimap.sectionHeaderFontSize', "Controls the font size of section headers in the minimap.")
            },
            'editor.minimap.sectionHeaderLetterSpacing': {
                type: 'number',
                default: defaults.sectionHeaderLetterSpacing,
                description: nls.localize('minimap.sectionHeaderLetterSpacing', "Controls the amount of space (in pixels) between characters of section header. This helps the readability of the header in small font sizes.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        // Validate mark section header regex
        let markSectionHeaderRegex = this.defaultValue.markSectionHeaderRegex;
        const inputRegex = _input.markSectionHeaderRegex;
        if (typeof inputRegex === 'string') {
            try {
                new RegExp(inputRegex, 'd');
                markSectionHeaderRegex = inputRegex;
            }
            catch { }
        }
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            autohide: boolean(input.autohide, this.defaultValue.autohide),
            size: stringSet(input.size, this.defaultValue.size, ['proportional', 'fill', 'fit']),
            side: stringSet(input.side, this.defaultValue.side, ['right', 'left']),
            showSlider: stringSet(input.showSlider, this.defaultValue.showSlider, ['always', 'mouseover']),
            renderCharacters: boolean(input.renderCharacters, this.defaultValue.renderCharacters),
            scale: EditorIntOption.clampedInt(input.scale, 1, 1, 3),
            maxColumn: EditorIntOption.clampedInt(input.maxColumn, this.defaultValue.maxColumn, 1, 10000),
            showRegionSectionHeaders: boolean(input.showRegionSectionHeaders, this.defaultValue.showRegionSectionHeaders),
            showMarkSectionHeaders: boolean(input.showMarkSectionHeaders, this.defaultValue.showMarkSectionHeaders),
            markSectionHeaderRegex: markSectionHeaderRegex,
            sectionHeaderFontSize: EditorFloatOption.clamp(input.sectionHeaderFontSize ?? this.defaultValue.sectionHeaderFontSize, 4, 32),
            sectionHeaderLetterSpacing: EditorFloatOption.clamp(input.sectionHeaderLetterSpacing ?? this.defaultValue.sectionHeaderLetterSpacing, 0, 5),
        };
    }
}
//#endregion
//#region multiCursorModifier
function _multiCursorModifierFromString(multiCursorModifier) {
    if (multiCursorModifier === 'ctrlCmd') {
        return (platform.isMacintosh ? 'metaKey' : 'ctrlKey');
    }
    return 'altKey';
}
class EditorPadding extends BaseEditorOption {
    constructor() {
        super(88 /* EditorOption.padding */, 'padding', { top: 0, bottom: 0 }, {
            'editor.padding.top': {
                type: 'number',
                default: 0,
                minimum: 0,
                maximum: 1000,
                description: nls.localize('padding.top', "Controls the amount of space between the top edge of the editor and the first line.")
            },
            'editor.padding.bottom': {
                type: 'number',
                default: 0,
                minimum: 0,
                maximum: 1000,
                description: nls.localize('padding.bottom', "Controls the amount of space between the bottom edge of the editor and the last line.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            top: EditorIntOption.clampedInt(input.top, 0, 0, 1000),
            bottom: EditorIntOption.clampedInt(input.bottom, 0, 0, 1000)
        };
    }
}
class EditorParameterHints extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            cycle: true
        };
        super(90 /* EditorOption.parameterHints */, 'parameterHints', defaults, {
            'editor.parameterHints.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('parameterHints.enabled', "Enables a pop-up that shows parameter documentation and type information as you type.")
            },
            'editor.parameterHints.cycle': {
                type: 'boolean',
                default: defaults.cycle,
                description: nls.localize('parameterHints.cycle', "Controls whether the parameter hints menu cycles or closes when reaching the end of the list.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            cycle: boolean(input.cycle, this.defaultValue.cycle)
        };
    }
}
//#endregion
//#region pixelRatio
class EditorPixelRatio extends ComputedEditorOption {
    constructor() {
        super(149 /* EditorOption.pixelRatio */);
    }
    compute(env, options, _) {
        return env.pixelRatio;
    }
}
//#endregion
//#region
class PlaceholderOption extends BaseEditorOption {
    constructor() {
        super(92 /* EditorOption.placeholder */, 'placeholder', undefined);
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            return input;
        }
        return this.defaultValue;
    }
}
class EditorQuickSuggestions extends BaseEditorOption {
    constructor() {
        const defaults = {
            other: 'on',
            comments: 'off',
            strings: 'on' // Void changed this setting
        };
        const types = [
            { type: 'boolean' },
            {
                type: 'string',
                enum: ['on', 'inline', 'off'],
                enumDescriptions: [nls.localize('on', "Quick suggestions show inside the suggest widget"), nls.localize('inline', "Quick suggestions show as ghost text"), nls.localize('off', "Quick suggestions are disabled")]
            }
        ];
        super(94 /* EditorOption.quickSuggestions */, 'quickSuggestions', defaults, {
            type: 'object',
            additionalProperties: false,
            properties: {
                strings: {
                    anyOf: types,
                    default: defaults.strings,
                    description: nls.localize('quickSuggestions.strings', "Enable quick suggestions inside strings.")
                },
                comments: {
                    anyOf: types,
                    default: defaults.comments,
                    description: nls.localize('quickSuggestions.comments', "Enable quick suggestions inside comments.")
                },
                other: {
                    anyOf: types,
                    default: defaults.other,
                    description: nls.localize('quickSuggestions.other', "Enable quick suggestions outside of strings and comments.")
                },
            },
            default: defaults,
            markdownDescription: nls.localize('quickSuggestions', "Controls whether suggestions should automatically show up while typing. This can be controlled for typing in comments, strings, and other code. Quick suggestion can be configured to show as ghost text or with the suggest widget. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", '`#editor.suggestOnTriggerCharacters#`')
        });
        this.defaultValue = defaults;
    }
    validate(input) {
        if (typeof input === 'boolean') {
            // boolean -> all on/off
            const value = input ? 'on' : 'off';
            return { comments: value, strings: value, other: value };
        }
        if (!input || typeof input !== 'object') {
            // invalid object
            return this.defaultValue;
        }
        const { other, comments, strings } = input;
        const allowedValues = ['on', 'inline', 'off'];
        let validatedOther;
        let validatedComments;
        let validatedStrings;
        if (typeof other === 'boolean') {
            validatedOther = other ? 'on' : 'off';
        }
        else {
            validatedOther = stringSet(other, this.defaultValue.other, allowedValues);
        }
        if (typeof comments === 'boolean') {
            validatedComments = comments ? 'on' : 'off';
        }
        else {
            validatedComments = stringSet(comments, this.defaultValue.comments, allowedValues);
        }
        if (typeof strings === 'boolean') {
            validatedStrings = strings ? 'on' : 'off';
        }
        else {
            validatedStrings = stringSet(strings, this.defaultValue.strings, allowedValues);
        }
        return {
            other: validatedOther,
            comments: validatedComments,
            strings: validatedStrings
        };
    }
}
export var RenderLineNumbersType;
(function (RenderLineNumbersType) {
    RenderLineNumbersType[RenderLineNumbersType["Off"] = 0] = "Off";
    RenderLineNumbersType[RenderLineNumbersType["On"] = 1] = "On";
    RenderLineNumbersType[RenderLineNumbersType["Relative"] = 2] = "Relative";
    RenderLineNumbersType[RenderLineNumbersType["Interval"] = 3] = "Interval";
    RenderLineNumbersType[RenderLineNumbersType["Custom"] = 4] = "Custom";
})(RenderLineNumbersType || (RenderLineNumbersType = {}));
class EditorRenderLineNumbersOption extends BaseEditorOption {
    constructor() {
        super(69 /* EditorOption.lineNumbers */, 'lineNumbers', { renderType: 1 /* RenderLineNumbersType.On */, renderFn: null }, {
            type: 'string',
            enum: ['off', 'on', 'relative', 'interval'],
            enumDescriptions: [
                nls.localize('lineNumbers.off', "Line numbers are not rendered."),
                nls.localize('lineNumbers.on', "Line numbers are rendered as absolute number."),
                nls.localize('lineNumbers.relative', "Line numbers are rendered as distance in lines to cursor position."),
                nls.localize('lineNumbers.interval', "Line numbers are rendered every 10 lines.")
            ],
            default: 'on',
            description: nls.localize('lineNumbers', "Controls the display of line numbers.")
        });
    }
    validate(lineNumbers) {
        let renderType = this.defaultValue.renderType;
        let renderFn = this.defaultValue.renderFn;
        if (typeof lineNumbers !== 'undefined') {
            if (typeof lineNumbers === 'function') {
                renderType = 4 /* RenderLineNumbersType.Custom */;
                renderFn = lineNumbers;
            }
            else if (lineNumbers === 'interval') {
                renderType = 3 /* RenderLineNumbersType.Interval */;
            }
            else if (lineNumbers === 'relative') {
                renderType = 2 /* RenderLineNumbersType.Relative */;
            }
            else if (lineNumbers === 'on') {
                renderType = 1 /* RenderLineNumbersType.On */;
            }
            else {
                renderType = 0 /* RenderLineNumbersType.Off */;
            }
        }
        return {
            renderType,
            renderFn
        };
    }
}
//#endregion
//#region renderValidationDecorations
/**
 * @internal
 */
export function filterValidationDecorations(options) {
    const renderValidationDecorations = options.get(103 /* EditorOption.renderValidationDecorations */);
    if (renderValidationDecorations === 'editable') {
        return options.get(96 /* EditorOption.readOnly */);
    }
    return renderValidationDecorations === 'on' ? false : true;
}
class EditorRulers extends BaseEditorOption {
    constructor() {
        const defaults = [];
        const columnSchema = { type: 'number', description: nls.localize('rulers.size', "Number of monospace characters at which this editor ruler will render.") };
        super(107 /* EditorOption.rulers */, 'rulers', defaults, {
            type: 'array',
            items: {
                anyOf: [
                    columnSchema,
                    {
                        type: [
                            'object'
                        ],
                        properties: {
                            column: columnSchema,
                            color: {
                                type: 'string',
                                description: nls.localize('rulers.color', "Color of this editor ruler."),
                                format: 'color-hex'
                            }
                        }
                    }
                ]
            },
            default: defaults,
            description: nls.localize('rulers', "Render vertical rulers after a certain number of monospace characters. Use multiple values for multiple rulers. No rulers are drawn if array is empty.")
        });
    }
    validate(input) {
        if (Array.isArray(input)) {
            const rulers = [];
            for (const _element of input) {
                if (typeof _element === 'number') {
                    rulers.push({
                        column: EditorIntOption.clampedInt(_element, 0, 0, 10000),
                        color: null
                    });
                }
                else if (_element && typeof _element === 'object') {
                    const element = _element;
                    rulers.push({
                        column: EditorIntOption.clampedInt(element.column, 0, 0, 10000),
                        color: element.color
                    });
                }
            }
            rulers.sort((a, b) => a.column - b.column);
            return rulers;
        }
        return this.defaultValue;
    }
}
//#endregion
//#region readonly
/**
 * Configuration options for readonly message
 */
class ReadonlyMessage extends BaseEditorOption {
    constructor() {
        const defaults = undefined;
        super(97 /* EditorOption.readOnlyMessage */, 'readOnlyMessage', defaults);
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        return _input;
    }
}
function _scrollbarVisibilityFromString(visibility, defaultValue) {
    if (typeof visibility !== 'string') {
        return defaultValue;
    }
    switch (visibility) {
        case 'hidden': return 2 /* ScrollbarVisibility.Hidden */;
        case 'visible': return 3 /* ScrollbarVisibility.Visible */;
        default: return 1 /* ScrollbarVisibility.Auto */;
    }
}
class EditorScrollbar extends BaseEditorOption {
    constructor() {
        const defaults = {
            vertical: 1 /* ScrollbarVisibility.Auto */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            arrowSize: 11,
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            horizontalScrollbarSize: 12,
            horizontalSliderSize: 12,
            verticalScrollbarSize: 14,
            verticalSliderSize: 14,
            handleMouseWheel: true,
            alwaysConsumeMouseWheel: true,
            scrollByPage: false,
            ignoreHorizontalScrollbarInContentHeight: false,
        };
        super(108 /* EditorOption.scrollbar */, 'scrollbar', defaults, {
            'editor.scrollbar.vertical': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    nls.localize('scrollbar.vertical.auto', "The vertical scrollbar will be visible only when necessary."),
                    nls.localize('scrollbar.vertical.visible', "The vertical scrollbar will always be visible."),
                    nls.localize('scrollbar.vertical.fit', "The vertical scrollbar will always be hidden."),
                ],
                default: 'auto',
                description: nls.localize('scrollbar.vertical', "Controls the visibility of the vertical scrollbar.")
            },
            'editor.scrollbar.horizontal': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    nls.localize('scrollbar.horizontal.auto', "The horizontal scrollbar will be visible only when necessary."),
                    nls.localize('scrollbar.horizontal.visible', "The horizontal scrollbar will always be visible."),
                    nls.localize('scrollbar.horizontal.fit', "The horizontal scrollbar will always be hidden."),
                ],
                default: 'auto',
                description: nls.localize('scrollbar.horizontal', "Controls the visibility of the horizontal scrollbar.")
            },
            'editor.scrollbar.verticalScrollbarSize': {
                type: 'number',
                default: defaults.verticalScrollbarSize,
                description: nls.localize('scrollbar.verticalScrollbarSize', "The width of the vertical scrollbar.")
            },
            'editor.scrollbar.horizontalScrollbarSize': {
                type: 'number',
                default: defaults.horizontalScrollbarSize,
                description: nls.localize('scrollbar.horizontalScrollbarSize', "The height of the horizontal scrollbar.")
            },
            'editor.scrollbar.scrollByPage': {
                type: 'boolean',
                default: defaults.scrollByPage,
                description: nls.localize('scrollbar.scrollByPage', "Controls whether clicks scroll by page or jump to click position.")
            },
            'editor.scrollbar.ignoreHorizontalScrollbarInContentHeight': {
                type: 'boolean',
                default: defaults.ignoreHorizontalScrollbarInContentHeight,
                description: nls.localize('scrollbar.ignoreHorizontalScrollbarInContentHeight', "When set, the horizontal scrollbar will not increase the size of the editor's content.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        const horizontalScrollbarSize = EditorIntOption.clampedInt(input.horizontalScrollbarSize, this.defaultValue.horizontalScrollbarSize, 0, 1000);
        const verticalScrollbarSize = EditorIntOption.clampedInt(input.verticalScrollbarSize, this.defaultValue.verticalScrollbarSize, 0, 1000);
        return {
            arrowSize: EditorIntOption.clampedInt(input.arrowSize, this.defaultValue.arrowSize, 0, 1000),
            vertical: _scrollbarVisibilityFromString(input.vertical, this.defaultValue.vertical),
            horizontal: _scrollbarVisibilityFromString(input.horizontal, this.defaultValue.horizontal),
            useShadows: boolean(input.useShadows, this.defaultValue.useShadows),
            verticalHasArrows: boolean(input.verticalHasArrows, this.defaultValue.verticalHasArrows),
            horizontalHasArrows: boolean(input.horizontalHasArrows, this.defaultValue.horizontalHasArrows),
            handleMouseWheel: boolean(input.handleMouseWheel, this.defaultValue.handleMouseWheel),
            alwaysConsumeMouseWheel: boolean(input.alwaysConsumeMouseWheel, this.defaultValue.alwaysConsumeMouseWheel),
            horizontalScrollbarSize: horizontalScrollbarSize,
            horizontalSliderSize: EditorIntOption.clampedInt(input.horizontalSliderSize, horizontalScrollbarSize, 0, 1000),
            verticalScrollbarSize: verticalScrollbarSize,
            verticalSliderSize: EditorIntOption.clampedInt(input.verticalSliderSize, verticalScrollbarSize, 0, 1000),
            scrollByPage: boolean(input.scrollByPage, this.defaultValue.scrollByPage),
            ignoreHorizontalScrollbarInContentHeight: boolean(input.ignoreHorizontalScrollbarInContentHeight, this.defaultValue.ignoreHorizontalScrollbarInContentHeight),
        };
    }
}
/**
 * @internal
*/
export const inUntrustedWorkspace = 'inUntrustedWorkspace';
/**
 * @internal
 */
export const unicodeHighlightConfigKeys = {
    allowedCharacters: 'editor.unicodeHighlight.allowedCharacters',
    invisibleCharacters: 'editor.unicodeHighlight.invisibleCharacters',
    nonBasicASCII: 'editor.unicodeHighlight.nonBasicASCII',
    ambiguousCharacters: 'editor.unicodeHighlight.ambiguousCharacters',
    includeComments: 'editor.unicodeHighlight.includeComments',
    includeStrings: 'editor.unicodeHighlight.includeStrings',
    allowedLocales: 'editor.unicodeHighlight.allowedLocales',
};
class UnicodeHighlight extends BaseEditorOption {
    constructor() {
        const defaults = {
            nonBasicASCII: inUntrustedWorkspace,
            invisibleCharacters: true,
            ambiguousCharacters: true,
            includeComments: inUntrustedWorkspace,
            includeStrings: true,
            allowedCharacters: {},
            allowedLocales: { _os: true, _vscode: true },
        };
        super(130 /* EditorOption.unicodeHighlighting */, 'unicodeHighlight', defaults, {
            [unicodeHighlightConfigKeys.nonBasicASCII]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.nonBasicASCII,
                description: nls.localize('unicodeHighlight.nonBasicASCII', "Controls whether all non-basic ASCII characters are highlighted. Only characters between U+0020 and U+007E, tab, line-feed and carriage-return are considered basic ASCII.")
            },
            [unicodeHighlightConfigKeys.invisibleCharacters]: {
                restricted: true,
                type: 'boolean',
                default: defaults.invisibleCharacters,
                description: nls.localize('unicodeHighlight.invisibleCharacters', "Controls whether characters that just reserve space or have no width at all are highlighted.")
            },
            [unicodeHighlightConfigKeys.ambiguousCharacters]: {
                restricted: true,
                type: 'boolean',
                default: defaults.ambiguousCharacters,
                description: nls.localize('unicodeHighlight.ambiguousCharacters', "Controls whether characters are highlighted that can be confused with basic ASCII characters, except those that are common in the current user locale.")
            },
            [unicodeHighlightConfigKeys.includeComments]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.includeComments,
                description: nls.localize('unicodeHighlight.includeComments', "Controls whether characters in comments should also be subject to Unicode highlighting.")
            },
            [unicodeHighlightConfigKeys.includeStrings]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.includeStrings,
                description: nls.localize('unicodeHighlight.includeStrings', "Controls whether characters in strings should also be subject to Unicode highlighting.")
            },
            [unicodeHighlightConfigKeys.allowedCharacters]: {
                restricted: true,
                type: 'object',
                default: defaults.allowedCharacters,
                description: nls.localize('unicodeHighlight.allowedCharacters', "Defines allowed characters that are not being highlighted."),
                additionalProperties: {
                    type: 'boolean'
                }
            },
            [unicodeHighlightConfigKeys.allowedLocales]: {
                restricted: true,
                type: 'object',
                additionalProperties: {
                    type: 'boolean'
                },
                default: defaults.allowedLocales,
                description: nls.localize('unicodeHighlight.allowedLocales', "Unicode characters that are common in allowed locales are not being highlighted.")
            },
        });
    }
    applyUpdate(value, update) {
        let didChange = false;
        if (update.allowedCharacters && value) {
            // Treat allowedCharacters atomically
            if (!objects.equals(value.allowedCharacters, update.allowedCharacters)) {
                value = { ...value, allowedCharacters: update.allowedCharacters };
                didChange = true;
            }
        }
        if (update.allowedLocales && value) {
            // Treat allowedLocales atomically
            if (!objects.equals(value.allowedLocales, update.allowedLocales)) {
                value = { ...value, allowedLocales: update.allowedLocales };
                didChange = true;
            }
        }
        const result = super.applyUpdate(value, update);
        if (didChange) {
            return new ApplyUpdateResult(result.newValue, true);
        }
        return result;
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            nonBasicASCII: primitiveSet(input.nonBasicASCII, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            invisibleCharacters: boolean(input.invisibleCharacters, this.defaultValue.invisibleCharacters),
            ambiguousCharacters: boolean(input.ambiguousCharacters, this.defaultValue.ambiguousCharacters),
            includeComments: primitiveSet(input.includeComments, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            includeStrings: primitiveSet(input.includeStrings, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            allowedCharacters: this.validateBooleanMap(_input.allowedCharacters, this.defaultValue.allowedCharacters),
            allowedLocales: this.validateBooleanMap(_input.allowedLocales, this.defaultValue.allowedLocales),
        };
    }
    validateBooleanMap(map, defaultValue) {
        if ((typeof map !== 'object') || !map) {
            return defaultValue;
        }
        const result = {};
        for (const [key, value] of Object.entries(map)) {
            if (value === true) {
                result[key] = true;
            }
        }
        return result;
    }
}
/**
 * Configuration options for inline suggestions
 */
class InlineEditorSuggest extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            mode: 'subwordSmart',
            showToolbar: 'onHover',
            suppressSuggestions: false,
            keepOnBlur: false,
            fontFamily: 'default',
            syntaxHighlightingEnabled: true,
            edits: {
                enabled: true,
                showCollapsed: false,
                renderSideBySide: 'auto',
                allowCodeShifting: 'always',
                useMultiLineGhostText: true
            },
        };
        super(64 /* EditorOption.inlineSuggest */, 'inlineSuggest', defaults, {
            'editor.inlineSuggest.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('inlineSuggest.enabled', "Controls whether to automatically show inline suggestions in the editor.")
            },
            'editor.inlineSuggest.showToolbar': {
                type: 'string',
                default: defaults.showToolbar,
                enum: ['always', 'onHover', 'never'],
                enumDescriptions: [
                    nls.localize('inlineSuggest.showToolbar.always', "Show the inline suggestion toolbar whenever an inline suggestion is shown."),
                    nls.localize('inlineSuggest.showToolbar.onHover', "Show the inline suggestion toolbar when hovering over an inline suggestion."),
                    nls.localize('inlineSuggest.showToolbar.never', "Never show the inline suggestion toolbar."),
                ],
                description: nls.localize('inlineSuggest.showToolbar', "Controls when to show the inline suggestion toolbar."),
            },
            'editor.inlineSuggest.syntaxHighlightingEnabled': {
                type: 'boolean',
                default: defaults.syntaxHighlightingEnabled,
                description: nls.localize('inlineSuggest.syntaxHighlightingEnabled', "Controls whether to show syntax highlighting for inline suggestions in the editor."),
            },
            'editor.inlineSuggest.suppressSuggestions': {
                type: 'boolean',
                default: defaults.suppressSuggestions,
                description: nls.localize('inlineSuggest.suppressSuggestions', "Controls how inline suggestions interact with the suggest widget. If enabled, the suggest widget is not shown automatically when inline suggestions are available.")
            },
            'editor.inlineSuggest.fontFamily': {
                type: 'string',
                default: defaults.fontFamily,
                description: nls.localize('inlineSuggest.fontFamily', "Controls the font family of the inline suggestions.")
            },
            'editor.inlineSuggest.edits.allowCodeShifting': {
                type: 'string',
                default: defaults.edits.allowCodeShifting,
                description: nls.localize('inlineSuggest.edits.allowCodeShifting', "Controls whether showing a suggestion will shift the code to make space for the suggestion inline."),
                enum: ['always', 'horizontal', 'never'],
                tags: ['nextEditSuggestions']
            },
            'editor.inlineSuggest.edits.renderSideBySide': {
                type: 'string',
                default: defaults.edits.renderSideBySide,
                description: nls.localize('inlineSuggest.edits.renderSideBySide', "Controls whether larger suggestions can be shown side by side."),
                enum: ['auto', 'never'],
                enumDescriptions: [
                    nls.localize('editor.inlineSuggest.edits.renderSideBySide.auto', "Larger suggestions will show side by side if there is enough space, otherwise they will be shown below."),
                    nls.localize('editor.inlineSuggest.edits.renderSideBySide.never', "Larger suggestions are never shown side by side and will always be shown below."),
                ],
                tags: ['nextEditSuggestions']
            },
            'editor.inlineSuggest.edits.showCollapsed': {
                type: 'boolean',
                default: defaults.edits.showCollapsed,
                description: nls.localize('inlineSuggest.edits.showCollapsed', "Controls whether the suggestion will show as collapsed until jumping to it."),
                tags: ['nextEditSuggestions']
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            mode: stringSet(input.mode, this.defaultValue.mode, ['prefix', 'subword', 'subwordSmart']),
            showToolbar: stringSet(input.showToolbar, this.defaultValue.showToolbar, ['always', 'onHover', 'never']),
            suppressSuggestions: boolean(input.suppressSuggestions, this.defaultValue.suppressSuggestions),
            keepOnBlur: boolean(input.keepOnBlur, this.defaultValue.keepOnBlur),
            fontFamily: EditorStringOption.string(input.fontFamily, this.defaultValue.fontFamily),
            syntaxHighlightingEnabled: boolean(input.syntaxHighlightingEnabled, this.defaultValue.syntaxHighlightingEnabled),
            edits: {
                enabled: boolean(input.edits?.enabled, this.defaultValue.edits.enabled),
                showCollapsed: boolean(input.edits?.showCollapsed, this.defaultValue.edits.showCollapsed),
                allowCodeShifting: stringSet(input.edits?.allowCodeShifting, this.defaultValue.edits.allowCodeShifting, ['always', 'horizontal', 'never']),
                renderSideBySide: stringSet(input.edits?.renderSideBySide, this.defaultValue.edits.renderSideBySide, ['never', 'auto']),
                useMultiLineGhostText: boolean(input.edits?.useMultiLineGhostText, this.defaultValue.edits.useMultiLineGhostText),
            },
        };
    }
}
/**
 * Configuration options for inline suggestions
 */
class BracketPairColorization extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions.enabled,
            independentColorPoolPerBracketType: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions.independentColorPoolPerBracketType,
        };
        super(15 /* EditorOption.bracketPairColorization */, 'bracketPairColorization', defaults, {
            'editor.bracketPairColorization.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('bracketPairColorization.enabled', "Controls whether bracket pair colorization is enabled or not. Use {0} to override the bracket highlight colors.", '`#workbench.colorCustomizations#`')
            },
            'editor.bracketPairColorization.independentColorPoolPerBracketType': {
                type: 'boolean',
                default: defaults.independentColorPoolPerBracketType,
                description: nls.localize('bracketPairColorization.independentColorPoolPerBracketType', "Controls whether each bracket type has its own independent color pool.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            independentColorPoolPerBracketType: boolean(input.independentColorPoolPerBracketType, this.defaultValue.independentColorPoolPerBracketType),
        };
    }
}
/**
 * Configuration options for inline suggestions
 */
class GuideOptions extends BaseEditorOption {
    constructor() {
        const defaults = {
            bracketPairs: false,
            bracketPairsHorizontal: 'active',
            highlightActiveBracketPair: true,
            indentation: true,
            highlightActiveIndentation: true
        };
        super(16 /* EditorOption.guides */, 'guides', defaults, {
            'editor.guides.bracketPairs': {
                type: ['boolean', 'string'],
                enum: [true, 'active', false],
                enumDescriptions: [
                    nls.localize('editor.guides.bracketPairs.true', "Enables bracket pair guides."),
                    nls.localize('editor.guides.bracketPairs.active', "Enables bracket pair guides only for the active bracket pair."),
                    nls.localize('editor.guides.bracketPairs.false', "Disables bracket pair guides."),
                ],
                default: defaults.bracketPairs,
                description: nls.localize('editor.guides.bracketPairs', "Controls whether bracket pair guides are enabled or not.")
            },
            'editor.guides.bracketPairsHorizontal': {
                type: ['boolean', 'string'],
                enum: [true, 'active', false],
                enumDescriptions: [
                    nls.localize('editor.guides.bracketPairsHorizontal.true', "Enables horizontal guides as addition to vertical bracket pair guides."),
                    nls.localize('editor.guides.bracketPairsHorizontal.active', "Enables horizontal guides only for the active bracket pair."),
                    nls.localize('editor.guides.bracketPairsHorizontal.false', "Disables horizontal bracket pair guides."),
                ],
                default: defaults.bracketPairsHorizontal,
                description: nls.localize('editor.guides.bracketPairsHorizontal', "Controls whether horizontal bracket pair guides are enabled or not.")
            },
            'editor.guides.highlightActiveBracketPair': {
                type: 'boolean',
                default: defaults.highlightActiveBracketPair,
                description: nls.localize('editor.guides.highlightActiveBracketPair', "Controls whether the editor should highlight the active bracket pair.")
            },
            'editor.guides.indentation': {
                type: 'boolean',
                default: defaults.indentation,
                description: nls.localize('editor.guides.indentation', "Controls whether the editor should render indent guides.")
            },
            'editor.guides.highlightActiveIndentation': {
                type: ['boolean', 'string'],
                enum: [true, 'always', false],
                enumDescriptions: [
                    nls.localize('editor.guides.highlightActiveIndentation.true', "Highlights the active indent guide."),
                    nls.localize('editor.guides.highlightActiveIndentation.always', "Highlights the active indent guide even if bracket guides are highlighted."),
                    nls.localize('editor.guides.highlightActiveIndentation.false', "Do not highlight the active indent guide."),
                ],
                default: defaults.highlightActiveIndentation,
                description: nls.localize('editor.guides.highlightActiveIndentation', "Controls whether the editor should highlight the active indent guide.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            bracketPairs: primitiveSet(input.bracketPairs, this.defaultValue.bracketPairs, [true, false, 'active']),
            bracketPairsHorizontal: primitiveSet(input.bracketPairsHorizontal, this.defaultValue.bracketPairsHorizontal, [true, false, 'active']),
            highlightActiveBracketPair: boolean(input.highlightActiveBracketPair, this.defaultValue.highlightActiveBracketPair),
            indentation: boolean(input.indentation, this.defaultValue.indentation),
            highlightActiveIndentation: primitiveSet(input.highlightActiveIndentation, this.defaultValue.highlightActiveIndentation, [true, false, 'always']),
        };
    }
}
function primitiveSet(value, defaultValue, allowedValues) {
    const idx = allowedValues.indexOf(value);
    if (idx === -1) {
        return defaultValue;
    }
    return allowedValues[idx];
}
class EditorSuggest extends BaseEditorOption {
    constructor() {
        const defaults = {
            insertMode: 'insert',
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
            localityBonus: false,
            shareSuggestSelections: false,
            selectionMode: 'always',
            showIcons: true,
            showStatusBar: false,
            preview: false,
            previewMode: 'subwordSmart',
            showInlineDetails: true,
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showDeprecated: true,
            matchOnWordStartOnly: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: true,
            showUsers: true,
            showIssues: true,
        };
        super(123 /* EditorOption.suggest */, 'suggest', defaults, {
            'editor.suggest.insertMode': {
                type: 'string',
                enum: ['insert', 'replace'],
                enumDescriptions: [
                    nls.localize('suggest.insertMode.insert', "Insert suggestion without overwriting text right of the cursor."),
                    nls.localize('suggest.insertMode.replace', "Insert suggestion and overwrite text right of the cursor."),
                ],
                default: defaults.insertMode,
                description: nls.localize('suggest.insertMode', "Controls whether words are overwritten when accepting completions. Note that this depends on extensions opting into this feature.")
            },
            'editor.suggest.filterGraceful': {
                type: 'boolean',
                default: defaults.filterGraceful,
                description: nls.localize('suggest.filterGraceful', "Controls whether filtering and sorting suggestions accounts for small typos.")
            },
            'editor.suggest.localityBonus': {
                type: 'boolean',
                default: defaults.localityBonus,
                description: nls.localize('suggest.localityBonus', "Controls whether sorting favors words that appear close to the cursor.")
            },
            'editor.suggest.shareSuggestSelections': {
                type: 'boolean',
                default: defaults.shareSuggestSelections,
                markdownDescription: nls.localize('suggest.shareSuggestSelections', "Controls whether remembered suggestion selections are shared between multiple workspaces and windows (needs `#editor.suggestSelection#`).")
            },
            'editor.suggest.selectionMode': {
                type: 'string',
                enum: ['always', 'never', 'whenTriggerCharacter', 'whenQuickSuggestion'],
                enumDescriptions: [
                    nls.localize('suggest.insertMode.always', "Always select a suggestion when automatically triggering IntelliSense."),
                    nls.localize('suggest.insertMode.never', "Never select a suggestion when automatically triggering IntelliSense."),
                    nls.localize('suggest.insertMode.whenTriggerCharacter', "Select a suggestion only when triggering IntelliSense from a trigger character."),
                    nls.localize('suggest.insertMode.whenQuickSuggestion', "Select a suggestion only when triggering IntelliSense as you type."),
                ],
                default: defaults.selectionMode,
                markdownDescription: nls.localize('suggest.selectionMode', "Controls whether a suggestion is selected when the widget shows. Note that this only applies to automatically triggered suggestions ({0} and {1}) and that a suggestion is always selected when explicitly invoked, e.g via `Ctrl+Space`.", '`#editor.quickSuggestions#`', '`#editor.suggestOnTriggerCharacters#`')
            },
            'editor.suggest.snippetsPreventQuickSuggestions': {
                type: 'boolean',
                default: defaults.snippetsPreventQuickSuggestions,
                description: nls.localize('suggest.snippetsPreventQuickSuggestions', "Controls whether an active snippet prevents quick suggestions.")
            },
            'editor.suggest.showIcons': {
                type: 'boolean',
                default: defaults.showIcons,
                description: nls.localize('suggest.showIcons', "Controls whether to show or hide icons in suggestions.")
            },
            'editor.suggest.showStatusBar': {
                type: 'boolean',
                default: defaults.showStatusBar,
                description: nls.localize('suggest.showStatusBar', "Controls the visibility of the status bar at the bottom of the suggest widget.")
            },
            'editor.suggest.preview': {
                type: 'boolean',
                default: defaults.preview,
                description: nls.localize('suggest.preview', "Controls whether to preview the suggestion outcome in the editor.")
            },
            'editor.suggest.showInlineDetails': {
                type: 'boolean',
                default: defaults.showInlineDetails,
                description: nls.localize('suggest.showInlineDetails', "Controls whether suggest details show inline with the label or only in the details widget.")
            },
            'editor.suggest.maxVisibleSuggestions': {
                type: 'number',
                deprecationMessage: nls.localize('suggest.maxVisibleSuggestions.dep', "This setting is deprecated. The suggest widget can now be resized."),
            },
            'editor.suggest.filteredTypes': {
                type: 'object',
                deprecationMessage: nls.localize('deprecated', "This setting is deprecated, please use separate settings like 'editor.suggest.showKeywords' or 'editor.suggest.showSnippets' instead.")
            },
            'editor.suggest.showMethods': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showMethods', "When enabled IntelliSense shows `method`-suggestions.")
            },
            'editor.suggest.showFunctions': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFunctions', "When enabled IntelliSense shows `function`-suggestions.")
            },
            'editor.suggest.showConstructors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showConstructors', "When enabled IntelliSense shows `constructor`-suggestions.")
            },
            'editor.suggest.showDeprecated': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showDeprecated', "When enabled IntelliSense shows `deprecated`-suggestions.")
            },
            'editor.suggest.matchOnWordStartOnly': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.matchOnWordStartOnly', "When enabled IntelliSense filtering requires that the first character matches on a word start. For example, `c` on `Console` or `WebContext` but _not_ on `description`. When disabled IntelliSense will show more results but still sorts them by match quality.")
            },
            'editor.suggest.showFields': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFields', "When enabled IntelliSense shows `field`-suggestions.")
            },
            'editor.suggest.showVariables': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showVariables', "When enabled IntelliSense shows `variable`-suggestions.")
            },
            'editor.suggest.showClasses': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showClasss', "When enabled IntelliSense shows `class`-suggestions.")
            },
            'editor.suggest.showStructs': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showStructs', "When enabled IntelliSense shows `struct`-suggestions.")
            },
            'editor.suggest.showInterfaces': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showInterfaces', "When enabled IntelliSense shows `interface`-suggestions.")
            },
            'editor.suggest.showModules': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showModules', "When enabled IntelliSense shows `module`-suggestions.")
            },
            'editor.suggest.showProperties': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showPropertys', "When enabled IntelliSense shows `property`-suggestions.")
            },
            'editor.suggest.showEvents': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEvents', "When enabled IntelliSense shows `event`-suggestions.")
            },
            'editor.suggest.showOperators': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showOperators', "When enabled IntelliSense shows `operator`-suggestions.")
            },
            'editor.suggest.showUnits': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showUnits', "When enabled IntelliSense shows `unit`-suggestions.")
            },
            'editor.suggest.showValues': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showValues', "When enabled IntelliSense shows `value`-suggestions.")
            },
            'editor.suggest.showConstants': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showConstants', "When enabled IntelliSense shows `constant`-suggestions.")
            },
            'editor.suggest.showEnums': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEnums', "When enabled IntelliSense shows `enum`-suggestions.")
            },
            'editor.suggest.showEnumMembers': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEnumMembers', "When enabled IntelliSense shows `enumMember`-suggestions.")
            },
            'editor.suggest.showKeywords': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showKeywords', "When enabled IntelliSense shows `keyword`-suggestions.")
            },
            'editor.suggest.showWords': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showTexts', "When enabled IntelliSense shows `text`-suggestions.")
            },
            'editor.suggest.showColors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showColors', "When enabled IntelliSense shows `color`-suggestions.")
            },
            'editor.suggest.showFiles': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFiles', "When enabled IntelliSense shows `file`-suggestions.")
            },
            'editor.suggest.showReferences': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showReferences', "When enabled IntelliSense shows `reference`-suggestions.")
            },
            'editor.suggest.showCustomcolors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showCustomcolors', "When enabled IntelliSense shows `customcolor`-suggestions.")
            },
            'editor.suggest.showFolders': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFolders', "When enabled IntelliSense shows `folder`-suggestions.")
            },
            'editor.suggest.showTypeParameters': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showTypeParameters', "When enabled IntelliSense shows `typeParameter`-suggestions.")
            },
            'editor.suggest.showSnippets': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showSnippets', "When enabled IntelliSense shows `snippet`-suggestions.")
            },
            'editor.suggest.showUsers': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showUsers', "When enabled IntelliSense shows `user`-suggestions.")
            },
            'editor.suggest.showIssues': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showIssues', "When enabled IntelliSense shows `issues`-suggestions.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            insertMode: stringSet(input.insertMode, this.defaultValue.insertMode, ['insert', 'replace']),
            filterGraceful: boolean(input.filterGraceful, this.defaultValue.filterGraceful),
            snippetsPreventQuickSuggestions: boolean(input.snippetsPreventQuickSuggestions, this.defaultValue.filterGraceful),
            localityBonus: boolean(input.localityBonus, this.defaultValue.localityBonus),
            shareSuggestSelections: boolean(input.shareSuggestSelections, this.defaultValue.shareSuggestSelections),
            selectionMode: stringSet(input.selectionMode, this.defaultValue.selectionMode, ['always', 'never', 'whenQuickSuggestion', 'whenTriggerCharacter']),
            showIcons: boolean(input.showIcons, this.defaultValue.showIcons),
            showStatusBar: boolean(input.showStatusBar, this.defaultValue.showStatusBar),
            preview: boolean(input.preview, this.defaultValue.preview),
            previewMode: stringSet(input.previewMode, this.defaultValue.previewMode, ['prefix', 'subword', 'subwordSmart']),
            showInlineDetails: boolean(input.showInlineDetails, this.defaultValue.showInlineDetails),
            showMethods: boolean(input.showMethods, this.defaultValue.showMethods),
            showFunctions: boolean(input.showFunctions, this.defaultValue.showFunctions),
            showConstructors: boolean(input.showConstructors, this.defaultValue.showConstructors),
            showDeprecated: boolean(input.showDeprecated, this.defaultValue.showDeprecated),
            matchOnWordStartOnly: boolean(input.matchOnWordStartOnly, this.defaultValue.matchOnWordStartOnly),
            showFields: boolean(input.showFields, this.defaultValue.showFields),
            showVariables: boolean(input.showVariables, this.defaultValue.showVariables),
            showClasses: boolean(input.showClasses, this.defaultValue.showClasses),
            showStructs: boolean(input.showStructs, this.defaultValue.showStructs),
            showInterfaces: boolean(input.showInterfaces, this.defaultValue.showInterfaces),
            showModules: boolean(input.showModules, this.defaultValue.showModules),
            showProperties: boolean(input.showProperties, this.defaultValue.showProperties),
            showEvents: boolean(input.showEvents, this.defaultValue.showEvents),
            showOperators: boolean(input.showOperators, this.defaultValue.showOperators),
            showUnits: boolean(input.showUnits, this.defaultValue.showUnits),
            showValues: boolean(input.showValues, this.defaultValue.showValues),
            showConstants: boolean(input.showConstants, this.defaultValue.showConstants),
            showEnums: boolean(input.showEnums, this.defaultValue.showEnums),
            showEnumMembers: boolean(input.showEnumMembers, this.defaultValue.showEnumMembers),
            showKeywords: boolean(input.showKeywords, this.defaultValue.showKeywords),
            showWords: boolean(input.showWords, this.defaultValue.showWords),
            showColors: boolean(input.showColors, this.defaultValue.showColors),
            showFiles: boolean(input.showFiles, this.defaultValue.showFiles),
            showReferences: boolean(input.showReferences, this.defaultValue.showReferences),
            showFolders: boolean(input.showFolders, this.defaultValue.showFolders),
            showTypeParameters: boolean(input.showTypeParameters, this.defaultValue.showTypeParameters),
            showSnippets: boolean(input.showSnippets, this.defaultValue.showSnippets),
            showUsers: boolean(input.showUsers, this.defaultValue.showUsers),
            showIssues: boolean(input.showIssues, this.defaultValue.showIssues),
        };
    }
}
class SmartSelect extends BaseEditorOption {
    constructor() {
        super(118 /* EditorOption.smartSelect */, 'smartSelect', {
            selectLeadingAndTrailingWhitespace: true,
            selectSubwords: true,
        }, {
            'editor.smartSelect.selectLeadingAndTrailingWhitespace': {
                description: nls.localize('selectLeadingAndTrailingWhitespace', "Whether leading and trailing whitespace should always be selected."),
                default: true,
                type: 'boolean'
            },
            'editor.smartSelect.selectSubwords': {
                description: nls.localize('selectSubwords', "Whether subwords (like 'foo' in 'fooBar' or 'foo_bar') should be selected."),
                default: true,
                type: 'boolean'
            }
        });
    }
    validate(input) {
        if (!input || typeof input !== 'object') {
            return this.defaultValue;
        }
        return {
            selectLeadingAndTrailingWhitespace: boolean(input.selectLeadingAndTrailingWhitespace, this.defaultValue.selectLeadingAndTrailingWhitespace),
            selectSubwords: boolean(input.selectSubwords, this.defaultValue.selectSubwords),
        };
    }
}
//#endregion
//#region wordSegmenterLocales
/**
 * Locales used for segmenting lines into words when doing word related navigations or operations.
 *
 * Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.).
 */
class WordSegmenterLocales extends BaseEditorOption {
    constructor() {
        const defaults = [];
        super(135 /* EditorOption.wordSegmenterLocales */, 'wordSegmenterLocales', defaults, {
            anyOf: [
                {
                    description: nls.localize('wordSegmenterLocales', "Locales to be used for word segmentation when doing word related navigations or operations. Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.)."),
                    type: 'string',
                }, {
                    description: nls.localize('wordSegmenterLocales', "Locales to be used for word segmentation when doing word related navigations or operations. Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.)."),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            ]
        });
    }
    validate(input) {
        if (typeof input === 'string') {
            input = [input];
        }
        if (Array.isArray(input)) {
            const validLocales = [];
            for (const locale of input) {
                if (typeof locale === 'string') {
                    try {
                        if (Intl.Segmenter.supportedLocalesOf(locale).length > 0) {
                            validLocales.push(locale);
                        }
                    }
                    catch {
                        // ignore invalid locales
                    }
                }
            }
            return validLocales;
        }
        return this.defaultValue;
    }
}
//#endregion
//#region wrappingIndent
/**
 * Describes how to indent wrapped lines.
 */
export var WrappingIndent;
(function (WrappingIndent) {
    /**
     * No indentation => wrapped lines begin at column 1.
     */
    WrappingIndent[WrappingIndent["None"] = 0] = "None";
    /**
     * Same => wrapped lines get the same indentation as the parent.
     */
    WrappingIndent[WrappingIndent["Same"] = 1] = "Same";
    /**
     * Indent => wrapped lines get +1 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["Indent"] = 2] = "Indent";
    /**
     * DeepIndent => wrapped lines get +2 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["DeepIndent"] = 3] = "DeepIndent";
})(WrappingIndent || (WrappingIndent = {}));
class WrappingIndentOption extends BaseEditorOption {
    constructor() {
        super(143 /* EditorOption.wrappingIndent */, 'wrappingIndent', 1 /* WrappingIndent.Same */, {
            'editor.wrappingIndent': {
                type: 'string',
                enum: ['none', 'same', 'indent', 'deepIndent'],
                enumDescriptions: [
                    nls.localize('wrappingIndent.none', "No indentation. Wrapped lines begin at column 1."),
                    nls.localize('wrappingIndent.same', "Wrapped lines get the same indentation as the parent."),
                    nls.localize('wrappingIndent.indent', "Wrapped lines get +1 indentation toward the parent."),
                    nls.localize('wrappingIndent.deepIndent', "Wrapped lines get +2 indentation toward the parent."),
                ],
                description: nls.localize('wrappingIndent', "Controls the indentation of wrapped lines."),
                default: 'same'
            }
        });
    }
    validate(input) {
        switch (input) {
            case 'none': return 0 /* WrappingIndent.None */;
            case 'same': return 1 /* WrappingIndent.Same */;
            case 'indent': return 2 /* WrappingIndent.Indent */;
            case 'deepIndent': return 3 /* WrappingIndent.DeepIndent */;
        }
        return 1 /* WrappingIndent.Same */;
    }
    compute(env, options, value) {
        const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // if we know for a fact that a screen reader is attached, we use no indent wrapping to
            // help that the editor's wrapping points match the textarea's wrapping points
            return 0 /* WrappingIndent.None */;
        }
        return value;
    }
}
class EditorWrappingInfoComputer extends ComputedEditorOption {
    constructor() {
        super(152 /* EditorOption.wrappingInfo */);
    }
    compute(env, options, _) {
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        return {
            isDominatedByLongLines: env.isDominatedByLongLines,
            isWordWrapMinified: layoutInfo.isWordWrapMinified,
            isViewportWrapping: layoutInfo.isViewportWrapping,
            wrappingColumn: layoutInfo.wrappingColumn,
        };
    }
}
class EditorDropIntoEditor extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, showDropSelector: 'afterDrop' };
        super(36 /* EditorOption.dropIntoEditor */, 'dropIntoEditor', defaults, {
            'editor.dropIntoEditor.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('dropIntoEditor.enabled', "Controls whether you can drag and drop a file into a text editor by holding down the `Shift` key (instead of opening the file in an editor)."),
            },
            'editor.dropIntoEditor.showDropSelector': {
                type: 'string',
                markdownDescription: nls.localize('dropIntoEditor.showDropSelector', "Controls if a widget is shown when dropping files into the editor. This widget lets you control how the file is dropped."),
                enum: [
                    'afterDrop',
                    'never'
                ],
                enumDescriptions: [
                    nls.localize('dropIntoEditor.showDropSelector.afterDrop', "Show the drop selector widget after a file is dropped into the editor."),
                    nls.localize('dropIntoEditor.showDropSelector.never', "Never show the drop selector widget. Instead the default drop provider is always used."),
                ],
                default: 'afterDrop',
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            showDropSelector: stringSet(input.showDropSelector, this.defaultValue.showDropSelector, ['afterDrop', 'never']),
        };
    }
}
class EditorPasteAs extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, showPasteSelector: 'afterPaste' };
        super(89 /* EditorOption.pasteAs */, 'pasteAs', defaults, {
            'editor.pasteAs.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('pasteAs.enabled', "Controls whether you can paste content in different ways."),
            },
            'editor.pasteAs.showPasteSelector': {
                type: 'string',
                markdownDescription: nls.localize('pasteAs.showPasteSelector', "Controls if a widget is shown when pasting content in to the editor. This widget lets you control how the file is pasted."),
                enum: [
                    'afterPaste',
                    'never'
                ],
                enumDescriptions: [
                    nls.localize('pasteAs.showPasteSelector.afterPaste', "Show the paste selector widget after content is pasted into the editor."),
                    nls.localize('pasteAs.showPasteSelector.never', "Never show the paste selector widget. Instead the default pasting behavior is always used."),
                ],
                default: 'afterPaste',
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            showPasteSelector: stringSet(input.showPasteSelector, this.defaultValue.showPasteSelector, ['afterPaste', 'never']),
        };
    }
}
//#endregion
const DEFAULT_WINDOWS_FONT_FAMILY = 'Consolas, \'Courier New\', monospace';
const DEFAULT_MAC_FONT_FAMILY = 'Menlo, Monaco, \'Courier New\', monospace';
const DEFAULT_LINUX_FONT_FAMILY = '\'Droid Sans Mono\', \'monospace\', monospace';
/**
 * @internal
 */
export const EDITOR_FONT_DEFAULTS = {
    fontFamily: (platform.isMacintosh ? DEFAULT_MAC_FONT_FAMILY : (platform.isLinux ? DEFAULT_LINUX_FONT_FAMILY : DEFAULT_WINDOWS_FONT_FAMILY)),
    fontWeight: 'normal',
    fontSize: (platform.isMacintosh ? 12 : 14),
    lineHeight: 0,
    letterSpacing: 0,
};
/**
 * @internal
 */
export const editorOptionsRegistry = [];
function register(option) {
    editorOptionsRegistry[option.id] = option;
    return option;
}
export var EditorOption;
(function (EditorOption) {
    EditorOption[EditorOption["acceptSuggestionOnCommitCharacter"] = 0] = "acceptSuggestionOnCommitCharacter";
    EditorOption[EditorOption["acceptSuggestionOnEnter"] = 1] = "acceptSuggestionOnEnter";
    EditorOption[EditorOption["accessibilitySupport"] = 2] = "accessibilitySupport";
    EditorOption[EditorOption["accessibilityPageSize"] = 3] = "accessibilityPageSize";
    EditorOption[EditorOption["ariaLabel"] = 4] = "ariaLabel";
    EditorOption[EditorOption["ariaRequired"] = 5] = "ariaRequired";
    EditorOption[EditorOption["autoClosingBrackets"] = 6] = "autoClosingBrackets";
    EditorOption[EditorOption["autoClosingComments"] = 7] = "autoClosingComments";
    EditorOption[EditorOption["screenReaderAnnounceInlineSuggestion"] = 8] = "screenReaderAnnounceInlineSuggestion";
    EditorOption[EditorOption["autoClosingDelete"] = 9] = "autoClosingDelete";
    EditorOption[EditorOption["autoClosingOvertype"] = 10] = "autoClosingOvertype";
    EditorOption[EditorOption["autoClosingQuotes"] = 11] = "autoClosingQuotes";
    EditorOption[EditorOption["autoIndent"] = 12] = "autoIndent";
    EditorOption[EditorOption["automaticLayout"] = 13] = "automaticLayout";
    EditorOption[EditorOption["autoSurround"] = 14] = "autoSurround";
    EditorOption[EditorOption["bracketPairColorization"] = 15] = "bracketPairColorization";
    EditorOption[EditorOption["guides"] = 16] = "guides";
    EditorOption[EditorOption["codeLens"] = 17] = "codeLens";
    EditorOption[EditorOption["codeLensFontFamily"] = 18] = "codeLensFontFamily";
    EditorOption[EditorOption["codeLensFontSize"] = 19] = "codeLensFontSize";
    EditorOption[EditorOption["colorDecorators"] = 20] = "colorDecorators";
    EditorOption[EditorOption["colorDecoratorsLimit"] = 21] = "colorDecoratorsLimit";
    EditorOption[EditorOption["columnSelection"] = 22] = "columnSelection";
    EditorOption[EditorOption["comments"] = 23] = "comments";
    EditorOption[EditorOption["contextmenu"] = 24] = "contextmenu";
    EditorOption[EditorOption["copyWithSyntaxHighlighting"] = 25] = "copyWithSyntaxHighlighting";
    EditorOption[EditorOption["cursorBlinking"] = 26] = "cursorBlinking";
    EditorOption[EditorOption["cursorSmoothCaretAnimation"] = 27] = "cursorSmoothCaretAnimation";
    EditorOption[EditorOption["cursorStyle"] = 28] = "cursorStyle";
    EditorOption[EditorOption["cursorSurroundingLines"] = 29] = "cursorSurroundingLines";
    EditorOption[EditorOption["cursorSurroundingLinesStyle"] = 30] = "cursorSurroundingLinesStyle";
    EditorOption[EditorOption["cursorWidth"] = 31] = "cursorWidth";
    EditorOption[EditorOption["disableLayerHinting"] = 32] = "disableLayerHinting";
    EditorOption[EditorOption["disableMonospaceOptimizations"] = 33] = "disableMonospaceOptimizations";
    EditorOption[EditorOption["domReadOnly"] = 34] = "domReadOnly";
    EditorOption[EditorOption["dragAndDrop"] = 35] = "dragAndDrop";
    EditorOption[EditorOption["dropIntoEditor"] = 36] = "dropIntoEditor";
    EditorOption[EditorOption["experimentalEditContextEnabled"] = 37] = "experimentalEditContextEnabled";
    EditorOption[EditorOption["emptySelectionClipboard"] = 38] = "emptySelectionClipboard";
    EditorOption[EditorOption["experimentalGpuAcceleration"] = 39] = "experimentalGpuAcceleration";
    EditorOption[EditorOption["experimentalWhitespaceRendering"] = 40] = "experimentalWhitespaceRendering";
    EditorOption[EditorOption["extraEditorClassName"] = 41] = "extraEditorClassName";
    EditorOption[EditorOption["fastScrollSensitivity"] = 42] = "fastScrollSensitivity";
    EditorOption[EditorOption["find"] = 43] = "find";
    EditorOption[EditorOption["fixedOverflowWidgets"] = 44] = "fixedOverflowWidgets";
    EditorOption[EditorOption["folding"] = 45] = "folding";
    EditorOption[EditorOption["foldingStrategy"] = 46] = "foldingStrategy";
    EditorOption[EditorOption["foldingHighlight"] = 47] = "foldingHighlight";
    EditorOption[EditorOption["foldingImportsByDefault"] = 48] = "foldingImportsByDefault";
    EditorOption[EditorOption["foldingMaximumRegions"] = 49] = "foldingMaximumRegions";
    EditorOption[EditorOption["unfoldOnClickAfterEndOfLine"] = 50] = "unfoldOnClickAfterEndOfLine";
    EditorOption[EditorOption["fontFamily"] = 51] = "fontFamily";
    EditorOption[EditorOption["fontInfo"] = 52] = "fontInfo";
    EditorOption[EditorOption["fontLigatures"] = 53] = "fontLigatures";
    EditorOption[EditorOption["fontSize"] = 54] = "fontSize";
    EditorOption[EditorOption["fontWeight"] = 55] = "fontWeight";
    EditorOption[EditorOption["fontVariations"] = 56] = "fontVariations";
    EditorOption[EditorOption["formatOnPaste"] = 57] = "formatOnPaste";
    EditorOption[EditorOption["formatOnType"] = 58] = "formatOnType";
    EditorOption[EditorOption["glyphMargin"] = 59] = "glyphMargin";
    EditorOption[EditorOption["gotoLocation"] = 60] = "gotoLocation";
    EditorOption[EditorOption["hideCursorInOverviewRuler"] = 61] = "hideCursorInOverviewRuler";
    EditorOption[EditorOption["hover"] = 62] = "hover";
    EditorOption[EditorOption["inDiffEditor"] = 63] = "inDiffEditor";
    EditorOption[EditorOption["inlineSuggest"] = 64] = "inlineSuggest";
    EditorOption[EditorOption["letterSpacing"] = 65] = "letterSpacing";
    EditorOption[EditorOption["lightbulb"] = 66] = "lightbulb";
    EditorOption[EditorOption["lineDecorationsWidth"] = 67] = "lineDecorationsWidth";
    EditorOption[EditorOption["lineHeight"] = 68] = "lineHeight";
    EditorOption[EditorOption["lineNumbers"] = 69] = "lineNumbers";
    EditorOption[EditorOption["lineNumbersMinChars"] = 70] = "lineNumbersMinChars";
    EditorOption[EditorOption["linkedEditing"] = 71] = "linkedEditing";
    EditorOption[EditorOption["links"] = 72] = "links";
    EditorOption[EditorOption["matchBrackets"] = 73] = "matchBrackets";
    EditorOption[EditorOption["minimap"] = 74] = "minimap";
    EditorOption[EditorOption["mouseStyle"] = 75] = "mouseStyle";
    EditorOption[EditorOption["mouseWheelScrollSensitivity"] = 76] = "mouseWheelScrollSensitivity";
    EditorOption[EditorOption["mouseWheelZoom"] = 77] = "mouseWheelZoom";
    EditorOption[EditorOption["multiCursorMergeOverlapping"] = 78] = "multiCursorMergeOverlapping";
    EditorOption[EditorOption["multiCursorModifier"] = 79] = "multiCursorModifier";
    EditorOption[EditorOption["multiCursorPaste"] = 80] = "multiCursorPaste";
    EditorOption[EditorOption["multiCursorLimit"] = 81] = "multiCursorLimit";
    EditorOption[EditorOption["occurrencesHighlight"] = 82] = "occurrencesHighlight";
    EditorOption[EditorOption["occurrencesHighlightDelay"] = 83] = "occurrencesHighlightDelay";
    EditorOption[EditorOption["overtypeCursorStyle"] = 84] = "overtypeCursorStyle";
    EditorOption[EditorOption["overtypeOnPaste"] = 85] = "overtypeOnPaste";
    EditorOption[EditorOption["overviewRulerBorder"] = 86] = "overviewRulerBorder";
    EditorOption[EditorOption["overviewRulerLanes"] = 87] = "overviewRulerLanes";
    EditorOption[EditorOption["padding"] = 88] = "padding";
    EditorOption[EditorOption["pasteAs"] = 89] = "pasteAs";
    EditorOption[EditorOption["parameterHints"] = 90] = "parameterHints";
    EditorOption[EditorOption["peekWidgetDefaultFocus"] = 91] = "peekWidgetDefaultFocus";
    EditorOption[EditorOption["placeholder"] = 92] = "placeholder";
    EditorOption[EditorOption["definitionLinkOpensInPeek"] = 93] = "definitionLinkOpensInPeek";
    EditorOption[EditorOption["quickSuggestions"] = 94] = "quickSuggestions";
    EditorOption[EditorOption["quickSuggestionsDelay"] = 95] = "quickSuggestionsDelay";
    EditorOption[EditorOption["readOnly"] = 96] = "readOnly";
    EditorOption[EditorOption["readOnlyMessage"] = 97] = "readOnlyMessage";
    EditorOption[EditorOption["renameOnType"] = 98] = "renameOnType";
    EditorOption[EditorOption["renderControlCharacters"] = 99] = "renderControlCharacters";
    EditorOption[EditorOption["renderFinalNewline"] = 100] = "renderFinalNewline";
    EditorOption[EditorOption["renderLineHighlight"] = 101] = "renderLineHighlight";
    EditorOption[EditorOption["renderLineHighlightOnlyWhenFocus"] = 102] = "renderLineHighlightOnlyWhenFocus";
    EditorOption[EditorOption["renderValidationDecorations"] = 103] = "renderValidationDecorations";
    EditorOption[EditorOption["renderWhitespace"] = 104] = "renderWhitespace";
    EditorOption[EditorOption["revealHorizontalRightPadding"] = 105] = "revealHorizontalRightPadding";
    EditorOption[EditorOption["roundedSelection"] = 106] = "roundedSelection";
    EditorOption[EditorOption["rulers"] = 107] = "rulers";
    EditorOption[EditorOption["scrollbar"] = 108] = "scrollbar";
    EditorOption[EditorOption["scrollBeyondLastColumn"] = 109] = "scrollBeyondLastColumn";
    EditorOption[EditorOption["scrollBeyondLastLine"] = 110] = "scrollBeyondLastLine";
    EditorOption[EditorOption["scrollPredominantAxis"] = 111] = "scrollPredominantAxis";
    EditorOption[EditorOption["selectionClipboard"] = 112] = "selectionClipboard";
    EditorOption[EditorOption["selectionHighlight"] = 113] = "selectionHighlight";
    EditorOption[EditorOption["selectOnLineNumbers"] = 114] = "selectOnLineNumbers";
    EditorOption[EditorOption["showFoldingControls"] = 115] = "showFoldingControls";
    EditorOption[EditorOption["showUnused"] = 116] = "showUnused";
    EditorOption[EditorOption["snippetSuggestions"] = 117] = "snippetSuggestions";
    EditorOption[EditorOption["smartSelect"] = 118] = "smartSelect";
    EditorOption[EditorOption["smoothScrolling"] = 119] = "smoothScrolling";
    EditorOption[EditorOption["stickyScroll"] = 120] = "stickyScroll";
    EditorOption[EditorOption["stickyTabStops"] = 121] = "stickyTabStops";
    EditorOption[EditorOption["stopRenderingLineAfter"] = 122] = "stopRenderingLineAfter";
    EditorOption[EditorOption["suggest"] = 123] = "suggest";
    EditorOption[EditorOption["suggestFontSize"] = 124] = "suggestFontSize";
    EditorOption[EditorOption["suggestLineHeight"] = 125] = "suggestLineHeight";
    EditorOption[EditorOption["suggestOnTriggerCharacters"] = 126] = "suggestOnTriggerCharacters";
    EditorOption[EditorOption["suggestSelection"] = 127] = "suggestSelection";
    EditorOption[EditorOption["tabCompletion"] = 128] = "tabCompletion";
    EditorOption[EditorOption["tabIndex"] = 129] = "tabIndex";
    EditorOption[EditorOption["unicodeHighlighting"] = 130] = "unicodeHighlighting";
    EditorOption[EditorOption["unusualLineTerminators"] = 131] = "unusualLineTerminators";
    EditorOption[EditorOption["useShadowDOM"] = 132] = "useShadowDOM";
    EditorOption[EditorOption["useTabStops"] = 133] = "useTabStops";
    EditorOption[EditorOption["wordBreak"] = 134] = "wordBreak";
    EditorOption[EditorOption["wordSegmenterLocales"] = 135] = "wordSegmenterLocales";
    EditorOption[EditorOption["wordSeparators"] = 136] = "wordSeparators";
    EditorOption[EditorOption["wordWrap"] = 137] = "wordWrap";
    EditorOption[EditorOption["wordWrapBreakAfterCharacters"] = 138] = "wordWrapBreakAfterCharacters";
    EditorOption[EditorOption["wordWrapBreakBeforeCharacters"] = 139] = "wordWrapBreakBeforeCharacters";
    EditorOption[EditorOption["wordWrapColumn"] = 140] = "wordWrapColumn";
    EditorOption[EditorOption["wordWrapOverride1"] = 141] = "wordWrapOverride1";
    EditorOption[EditorOption["wordWrapOverride2"] = 142] = "wordWrapOverride2";
    EditorOption[EditorOption["wrappingIndent"] = 143] = "wrappingIndent";
    EditorOption[EditorOption["wrappingStrategy"] = 144] = "wrappingStrategy";
    EditorOption[EditorOption["showDeprecated"] = 145] = "showDeprecated";
    EditorOption[EditorOption["inlayHints"] = 146] = "inlayHints";
    // Leave these at the end (because they have dependencies!)
    EditorOption[EditorOption["effectiveCursorStyle"] = 147] = "effectiveCursorStyle";
    EditorOption[EditorOption["editorClassName"] = 148] = "editorClassName";
    EditorOption[EditorOption["pixelRatio"] = 149] = "pixelRatio";
    EditorOption[EditorOption["tabFocusMode"] = 150] = "tabFocusMode";
    EditorOption[EditorOption["layoutInfo"] = 151] = "layoutInfo";
    EditorOption[EditorOption["wrappingInfo"] = 152] = "wrappingInfo";
    EditorOption[EditorOption["defaultColorDecorators"] = 153] = "defaultColorDecorators";
    EditorOption[EditorOption["colorDecoratorsActivatedOn"] = 154] = "colorDecoratorsActivatedOn";
    EditorOption[EditorOption["inlineCompletionsAccessibilityVerbose"] = 155] = "inlineCompletionsAccessibilityVerbose";
    EditorOption[EditorOption["effectiveExperimentalEditContextEnabled"] = 156] = "effectiveExperimentalEditContextEnabled";
})(EditorOption || (EditorOption = {}));
export const EditorOptions = {
    acceptSuggestionOnCommitCharacter: register(new EditorBooleanOption(0 /* EditorOption.acceptSuggestionOnCommitCharacter */, 'acceptSuggestionOnCommitCharacter', true, { markdownDescription: nls.localize('acceptSuggestionOnCommitCharacter', "Controls whether suggestions should be accepted on commit characters. For example, in JavaScript, the semi-colon (`;`) can be a commit character that accepts a suggestion and types that character.") })),
    acceptSuggestionOnEnter: register(new EditorStringEnumOption(1 /* EditorOption.acceptSuggestionOnEnter */, 'acceptSuggestionOnEnter', 'on', ['on', 'smart', 'off'], {
        markdownEnumDescriptions: [
            '',
            nls.localize('acceptSuggestionOnEnterSmart', "Only accept a suggestion with `Enter` when it makes a textual change."),
            ''
        ],
        markdownDescription: nls.localize('acceptSuggestionOnEnter', "Controls whether suggestions should be accepted on `Enter`, in addition to `Tab`. Helps to avoid ambiguity between inserting new lines or accepting suggestions.")
    })),
    accessibilitySupport: register(new EditorAccessibilitySupport()),
    accessibilityPageSize: register(new EditorIntOption(3 /* EditorOption.accessibilityPageSize */, 'accessibilityPageSize', 500, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('accessibilityPageSize', "Controls the number of lines in the editor that can be read out by a screen reader at once. When we detect a screen reader we automatically set the default to be 500. Warning: this has a performance implication for numbers larger than the default."),
        tags: ['accessibility']
    })),
    ariaLabel: register(new EditorStringOption(4 /* EditorOption.ariaLabel */, 'ariaLabel', nls.localize('editorViewAccessibleLabel', "Editor content"))),
    ariaRequired: register(new EditorBooleanOption(5 /* EditorOption.ariaRequired */, 'ariaRequired', false, undefined)),
    screenReaderAnnounceInlineSuggestion: register(new EditorBooleanOption(8 /* EditorOption.screenReaderAnnounceInlineSuggestion */, 'screenReaderAnnounceInlineSuggestion', true, {
        description: nls.localize('screenReaderAnnounceInlineSuggestion', "Control whether inline suggestions are announced by a screen reader."),
        tags: ['accessibility']
    })),
    autoClosingBrackets: register(new EditorStringEnumOption(6 /* EditorOption.autoClosingBrackets */, 'autoClosingBrackets', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingBrackets.languageDefined', "Use language configurations to determine when to autoclose brackets."),
            nls.localize('editor.autoClosingBrackets.beforeWhitespace', "Autoclose brackets only when the cursor is to the left of whitespace."),
            '',
        ],
        description: nls.localize('autoClosingBrackets', "Controls whether the editor should automatically close brackets after the user adds an opening bracket.")
    })),
    autoClosingComments: register(new EditorStringEnumOption(7 /* EditorOption.autoClosingComments */, 'autoClosingComments', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingComments.languageDefined', "Use language configurations to determine when to autoclose comments."),
            nls.localize('editor.autoClosingComments.beforeWhitespace', "Autoclose comments only when the cursor is to the left of whitespace."),
            '',
        ],
        description: nls.localize('autoClosingComments', "Controls whether the editor should automatically close comments after the user adds an opening comment.")
    })),
    autoClosingDelete: register(new EditorStringEnumOption(9 /* EditorOption.autoClosingDelete */, 'autoClosingDelete', 'auto', ['always', 'auto', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingDelete.auto', "Remove adjacent closing quotes or brackets only if they were automatically inserted."),
            '',
        ],
        description: nls.localize('autoClosingDelete', "Controls whether the editor should remove adjacent closing quotes or brackets when deleting.")
    })),
    autoClosingOvertype: register(new EditorStringEnumOption(10 /* EditorOption.autoClosingOvertype */, 'autoClosingOvertype', 'auto', ['always', 'auto', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingOvertype.auto', "Type over closing quotes or brackets only if they were automatically inserted."),
            '',
        ],
        description: nls.localize('autoClosingOvertype', "Controls whether the editor should type over closing quotes or brackets.")
    })),
    autoClosingQuotes: register(new EditorStringEnumOption(11 /* EditorOption.autoClosingQuotes */, 'autoClosingQuotes', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingQuotes.languageDefined', "Use language configurations to determine when to autoclose quotes."),
            nls.localize('editor.autoClosingQuotes.beforeWhitespace', "Autoclose quotes only when the cursor is to the left of whitespace."),
            '',
        ],
        description: nls.localize('autoClosingQuotes', "Controls whether the editor should automatically close quotes after the user adds an opening quote.")
    })),
    autoIndent: register(new EditorEnumOption(12 /* EditorOption.autoIndent */, 'autoIndent', 4 /* EditorAutoIndentStrategy.Full */, 'full', ['none', 'keep', 'brackets', 'advanced', 'full'], _autoIndentFromString, {
        enumDescriptions: [
            nls.localize('editor.autoIndent.none', "The editor will not insert indentation automatically."),
            nls.localize('editor.autoIndent.keep', "The editor will keep the current line's indentation."),
            nls.localize('editor.autoIndent.brackets', "The editor will keep the current line's indentation and honor language defined brackets."),
            nls.localize('editor.autoIndent.advanced', "The editor will keep the current line's indentation, honor language defined brackets and invoke special onEnterRules defined by languages."),
            nls.localize('editor.autoIndent.full', "The editor will keep the current line's indentation, honor language defined brackets, invoke special onEnterRules defined by languages, and honor indentationRules defined by languages."),
        ],
        description: nls.localize('autoIndent', "Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.")
    })),
    automaticLayout: register(new EditorBooleanOption(13 /* EditorOption.automaticLayout */, 'automaticLayout', false)),
    autoSurround: register(new EditorStringEnumOption(14 /* EditorOption.autoSurround */, 'autoSurround', 'languageDefined', ['languageDefined', 'quotes', 'brackets', 'never'], {
        enumDescriptions: [
            nls.localize('editor.autoSurround.languageDefined', "Use language configurations to determine when to automatically surround selections."),
            nls.localize('editor.autoSurround.quotes', "Surround with quotes but not brackets."),
            nls.localize('editor.autoSurround.brackets', "Surround with brackets but not quotes."),
            ''
        ],
        description: nls.localize('autoSurround', "Controls whether the editor should automatically surround selections when typing quotes or brackets.")
    })),
    bracketPairColorization: register(new BracketPairColorization()),
    bracketPairGuides: register(new GuideOptions()),
    stickyTabStops: register(new EditorBooleanOption(121 /* EditorOption.stickyTabStops */, 'stickyTabStops', false, { description: nls.localize('stickyTabStops', "Emulate selection behavior of tab characters when using spaces for indentation. Selection will stick to tab stops.") })),
    codeLens: register(new EditorBooleanOption(17 /* EditorOption.codeLens */, 'codeLens', true, { description: nls.localize('codeLens', "Controls whether the editor shows CodeLens.") })),
    codeLensFontFamily: register(new EditorStringOption(18 /* EditorOption.codeLensFontFamily */, 'codeLensFontFamily', '', { description: nls.localize('codeLensFontFamily', "Controls the font family for CodeLens.") })),
    codeLensFontSize: register(new EditorIntOption(19 /* EditorOption.codeLensFontSize */, 'codeLensFontSize', 0, 0, 100, {
        type: 'number',
        default: 0,
        minimum: 0,
        maximum: 100,
        markdownDescription: nls.localize('codeLensFontSize', "Controls the font size in pixels for CodeLens. When set to 0, 90% of `#editor.fontSize#` is used.")
    })),
    colorDecorators: register(new EditorBooleanOption(20 /* EditorOption.colorDecorators */, 'colorDecorators', true, { description: nls.localize('colorDecorators', "Controls whether the editor should render the inline color decorators and color picker.") })),
    colorDecoratorActivatedOn: register(new EditorStringEnumOption(154 /* EditorOption.colorDecoratorsActivatedOn */, 'colorDecoratorsActivatedOn', 'clickAndHover', ['clickAndHover', 'hover', 'click'], {
        enumDescriptions: [
            nls.localize('editor.colorDecoratorActivatedOn.clickAndHover', "Make the color picker appear both on click and hover of the color decorator"),
            nls.localize('editor.colorDecoratorActivatedOn.hover', "Make the color picker appear on hover of the color decorator"),
            nls.localize('editor.colorDecoratorActivatedOn.click', "Make the color picker appear on click of the color decorator")
        ],
        description: nls.localize('colorDecoratorActivatedOn', "Controls the condition to make a color picker appear from a color decorator.")
    })),
    colorDecoratorsLimit: register(new EditorIntOption(21 /* EditorOption.colorDecoratorsLimit */, 'colorDecoratorsLimit', 500, 1, 1000000, {
        markdownDescription: nls.localize('colorDecoratorsLimit', "Controls the max number of color decorators that can be rendered in an editor at once.")
    })),
    columnSelection: register(new EditorBooleanOption(22 /* EditorOption.columnSelection */, 'columnSelection', false, { description: nls.localize('columnSelection', "Enable that the selection with the mouse and keys is doing column selection.") })),
    comments: register(new EditorComments()),
    contextmenu: register(new EditorBooleanOption(24 /* EditorOption.contextmenu */, 'contextmenu', true)),
    copyWithSyntaxHighlighting: register(new EditorBooleanOption(25 /* EditorOption.copyWithSyntaxHighlighting */, 'copyWithSyntaxHighlighting', true, { description: nls.localize('copyWithSyntaxHighlighting', "Controls whether syntax highlighting should be copied into the clipboard.") })),
    cursorBlinking: register(new EditorEnumOption(26 /* EditorOption.cursorBlinking */, 'cursorBlinking', 1 /* TextEditorCursorBlinkingStyle.Blink */, 'blink', ['blink', 'smooth', 'phase', 'expand', 'solid'], cursorBlinkingStyleFromString, { description: nls.localize('cursorBlinking', "Control the cursor animation style.") })),
    cursorSmoothCaretAnimation: register(new EditorStringEnumOption(27 /* EditorOption.cursorSmoothCaretAnimation */, 'cursorSmoothCaretAnimation', 'off', ['off', 'explicit', 'on'], {
        enumDescriptions: [
            nls.localize('cursorSmoothCaretAnimation.off', "Smooth caret animation is disabled."),
            nls.localize('cursorSmoothCaretAnimation.explicit', "Smooth caret animation is enabled only when the user moves the cursor with an explicit gesture."),
            nls.localize('cursorSmoothCaretAnimation.on', "Smooth caret animation is always enabled.")
        ],
        description: nls.localize('cursorSmoothCaretAnimation', "Controls whether the smooth caret animation should be enabled.")
    })),
    cursorStyle: register(new EditorEnumOption(28 /* EditorOption.cursorStyle */, 'cursorStyle', TextEditorCursorStyle.Line, 'line', ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], cursorStyleFromString, { description: nls.localize('cursorStyle', "Controls the cursor style in insert input mode.") })),
    overtypeCursorStyle: register(new EditorEnumOption(84 /* EditorOption.overtypeCursorStyle */, 'overtypeCursorStyle', TextEditorCursorStyle.Block, 'block', ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], cursorStyleFromString, { description: nls.localize('overtypeCursorStyle', "Controls the cursor style in overtype input mode.") })),
    cursorSurroundingLines: register(new EditorIntOption(29 /* EditorOption.cursorSurroundingLines */, 'cursorSurroundingLines', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { description: nls.localize('cursorSurroundingLines', "Controls the minimal number of visible leading lines (minimum 0) and trailing lines (minimum 1) surrounding the cursor. Known as 'scrollOff' or 'scrollOffset' in some other editors.") })),
    cursorSurroundingLinesStyle: register(new EditorStringEnumOption(30 /* EditorOption.cursorSurroundingLinesStyle */, 'cursorSurroundingLinesStyle', 'default', ['default', 'all'], {
        enumDescriptions: [
            nls.localize('cursorSurroundingLinesStyle.default', "`cursorSurroundingLines` is enforced only when triggered via the keyboard or API."),
            nls.localize('cursorSurroundingLinesStyle.all', "`cursorSurroundingLines` is enforced always.")
        ],
        markdownDescription: nls.localize('cursorSurroundingLinesStyle', "Controls when `#editor.cursorSurroundingLines#` should be enforced.")
    })),
    cursorWidth: register(new EditorIntOption(31 /* EditorOption.cursorWidth */, 'cursorWidth', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { markdownDescription: nls.localize('cursorWidth', "Controls the width of the cursor when `#editor.cursorStyle#` is set to `line`.") })),
    disableLayerHinting: register(new EditorBooleanOption(32 /* EditorOption.disableLayerHinting */, 'disableLayerHinting', false)),
    disableMonospaceOptimizations: register(new EditorBooleanOption(33 /* EditorOption.disableMonospaceOptimizations */, 'disableMonospaceOptimizations', false)),
    domReadOnly: register(new EditorBooleanOption(34 /* EditorOption.domReadOnly */, 'domReadOnly', false)),
    dragAndDrop: register(new EditorBooleanOption(35 /* EditorOption.dragAndDrop */, 'dragAndDrop', true, { description: nls.localize('dragAndDrop', "Controls whether the editor should allow moving selections via drag and drop.") })),
    emptySelectionClipboard: register(new EditorEmptySelectionClipboard()),
    dropIntoEditor: register(new EditorDropIntoEditor()),
    experimentalEditContextEnabled: register(new EditorBooleanOption(37 /* EditorOption.experimentalEditContextEnabled */, 'experimentalEditContextEnabled', product.quality !== 'stable', {
        description: nls.localize('experimentalEditContextEnabled', "Sets whether the new experimental edit context should be used instead of the text area."),
        included: platform.isChrome || platform.isEdge || platform.isNative
    })),
    stickyScroll: register(new EditorStickyScroll()),
    experimentalGpuAcceleration: register(new EditorStringEnumOption(39 /* EditorOption.experimentalGpuAcceleration */, 'experimentalGpuAcceleration', 'off', ['off', 'on'], {
        tags: ['experimental'],
        enumDescriptions: [
            nls.localize('experimentalGpuAcceleration.off', "Use regular DOM-based rendering."),
            nls.localize('experimentalGpuAcceleration.on', "Use GPU acceleration."),
        ],
        description: nls.localize('experimentalGpuAcceleration', "Controls whether to use the experimental GPU acceleration to render the editor.")
    })),
    experimentalWhitespaceRendering: register(new EditorStringEnumOption(40 /* EditorOption.experimentalWhitespaceRendering */, 'experimentalWhitespaceRendering', 'svg', ['svg', 'font', 'off'], {
        enumDescriptions: [
            nls.localize('experimentalWhitespaceRendering.svg', "Use a new rendering method with svgs."),
            nls.localize('experimentalWhitespaceRendering.font', "Use a new rendering method with font characters."),
            nls.localize('experimentalWhitespaceRendering.off', "Use the stable rendering method."),
        ],
        description: nls.localize('experimentalWhitespaceRendering', "Controls whether whitespace is rendered with a new, experimental method.")
    })),
    extraEditorClassName: register(new EditorStringOption(41 /* EditorOption.extraEditorClassName */, 'extraEditorClassName', '')),
    fastScrollSensitivity: register(new EditorFloatOption(42 /* EditorOption.fastScrollSensitivity */, 'fastScrollSensitivity', 5, x => (x <= 0 ? 5 : x), { markdownDescription: nls.localize('fastScrollSensitivity', "Scrolling speed multiplier when pressing `Alt`.") })),
    find: register(new EditorFind()),
    fixedOverflowWidgets: register(new EditorBooleanOption(44 /* EditorOption.fixedOverflowWidgets */, 'fixedOverflowWidgets', false)),
    folding: register(new EditorBooleanOption(45 /* EditorOption.folding */, 'folding', true, { description: nls.localize('folding', "Controls whether the editor has code folding enabled.") })),
    foldingStrategy: register(new EditorStringEnumOption(46 /* EditorOption.foldingStrategy */, 'foldingStrategy', 'auto', ['auto', 'indentation'], {
        enumDescriptions: [
            nls.localize('foldingStrategy.auto', "Use a language-specific folding strategy if available, else the indentation-based one."),
            nls.localize('foldingStrategy.indentation', "Use the indentation-based folding strategy."),
        ],
        description: nls.localize('foldingStrategy', "Controls the strategy for computing folding ranges.")
    })),
    foldingHighlight: register(new EditorBooleanOption(47 /* EditorOption.foldingHighlight */, 'foldingHighlight', true, { description: nls.localize('foldingHighlight', "Controls whether the editor should highlight folded ranges.") })),
    foldingImportsByDefault: register(new EditorBooleanOption(48 /* EditorOption.foldingImportsByDefault */, 'foldingImportsByDefault', false, { description: nls.localize('foldingImportsByDefault', "Controls whether the editor automatically collapses import ranges.") })),
    foldingMaximumRegions: register(new EditorIntOption(49 /* EditorOption.foldingMaximumRegions */, 'foldingMaximumRegions', 5000, 10, 65000, // limit must be less than foldingRanges MAX_FOLDING_REGIONS
    { description: nls.localize('foldingMaximumRegions', "The maximum number of foldable regions. Increasing this value may result in the editor becoming less responsive when the current source has a large number of foldable regions.") })),
    unfoldOnClickAfterEndOfLine: register(new EditorBooleanOption(50 /* EditorOption.unfoldOnClickAfterEndOfLine */, 'unfoldOnClickAfterEndOfLine', false, { description: nls.localize('unfoldOnClickAfterEndOfLine', "Controls whether clicking on the empty content after a folded line will unfold the line.") })),
    fontFamily: register(new EditorStringOption(51 /* EditorOption.fontFamily */, 'fontFamily', EDITOR_FONT_DEFAULTS.fontFamily, { description: nls.localize('fontFamily', "Controls the font family.") })),
    fontInfo: register(new EditorFontInfo()),
    fontLigatures2: register(new EditorFontLigatures()),
    fontSize: register(new EditorFontSize()),
    fontWeight: register(new EditorFontWeight()),
    fontVariations: register(new EditorFontVariations()),
    formatOnPaste: register(new EditorBooleanOption(57 /* EditorOption.formatOnPaste */, 'formatOnPaste', false, { description: nls.localize('formatOnPaste', "Controls whether the editor should automatically format the pasted content. A formatter must be available and the formatter should be able to format a range in a document.") })),
    formatOnType: register(new EditorBooleanOption(58 /* EditorOption.formatOnType */, 'formatOnType', false, { description: nls.localize('formatOnType', "Controls whether the editor should automatically format the line after typing.") })),
    glyphMargin: register(new EditorBooleanOption(59 /* EditorOption.glyphMargin */, 'glyphMargin', true, { description: nls.localize('glyphMargin', "Controls whether the editor should render the vertical glyph margin. Glyph margin is mostly used for debugging.") })),
    gotoLocation: register(new EditorGoToLocation()),
    hideCursorInOverviewRuler: register(new EditorBooleanOption(61 /* EditorOption.hideCursorInOverviewRuler */, 'hideCursorInOverviewRuler', false, { description: nls.localize('hideCursorInOverviewRuler', "Controls whether the cursor should be hidden in the overview ruler.") })),
    hover: register(new EditorHover()),
    inDiffEditor: register(new EditorBooleanOption(63 /* EditorOption.inDiffEditor */, 'inDiffEditor', false)),
    letterSpacing: register(new EditorFloatOption(65 /* EditorOption.letterSpacing */, 'letterSpacing', EDITOR_FONT_DEFAULTS.letterSpacing, x => EditorFloatOption.clamp(x, -5, 20), { description: nls.localize('letterSpacing', "Controls the letter spacing in pixels.") })),
    lightbulb: register(new EditorLightbulb()),
    lineDecorationsWidth: register(new EditorLineDecorationsWidth()),
    lineHeight: register(new EditorLineHeight()),
    lineNumbers: register(new EditorRenderLineNumbersOption()),
    lineNumbersMinChars: register(new EditorIntOption(70 /* EditorOption.lineNumbersMinChars */, 'lineNumbersMinChars', 5, 1, 300)),
    linkedEditing: register(new EditorBooleanOption(71 /* EditorOption.linkedEditing */, 'linkedEditing', false, { description: nls.localize('linkedEditing', "Controls whether the editor has linked editing enabled. Depending on the language, related symbols such as HTML tags, are updated while editing.") })),
    links: register(new EditorBooleanOption(72 /* EditorOption.links */, 'links', true, { description: nls.localize('links', "Controls whether the editor should detect links and make them clickable.") })),
    matchBrackets: register(new EditorStringEnumOption(73 /* EditorOption.matchBrackets */, 'matchBrackets', 'always', ['always', 'near', 'never'], { description: nls.localize('matchBrackets', "Highlight matching brackets.") })),
    minimap: register(new EditorMinimap()),
    mouseStyle: register(new EditorStringEnumOption(75 /* EditorOption.mouseStyle */, 'mouseStyle', 'text', ['text', 'default', 'copy'])),
    mouseWheelScrollSensitivity: register(new EditorFloatOption(76 /* EditorOption.mouseWheelScrollSensitivity */, 'mouseWheelScrollSensitivity', 1, x => (x === 0 ? 1 : x), { markdownDescription: nls.localize('mouseWheelScrollSensitivity', "A multiplier to be used on the `deltaX` and `deltaY` of mouse wheel scroll events.") })),
    mouseWheelZoom: register(new EditorBooleanOption(77 /* EditorOption.mouseWheelZoom */, 'mouseWheelZoom', false, {
        markdownDescription: platform.isMacintosh
            ? nls.localize('mouseWheelZoom.mac', "Zoom the font of the editor when using mouse wheel and holding `Cmd`.")
            : nls.localize('mouseWheelZoom', "Zoom the font of the editor when using mouse wheel and holding `Ctrl`.")
    })),
    multiCursorMergeOverlapping: register(new EditorBooleanOption(78 /* EditorOption.multiCursorMergeOverlapping */, 'multiCursorMergeOverlapping', true, { description: nls.localize('multiCursorMergeOverlapping', "Merge multiple cursors when they are overlapping.") })),
    multiCursorModifier: register(new EditorEnumOption(79 /* EditorOption.multiCursorModifier */, 'multiCursorModifier', 'altKey', 'alt', ['ctrlCmd', 'alt'], _multiCursorModifierFromString, {
        markdownEnumDescriptions: [
            nls.localize('multiCursorModifier.ctrlCmd', "Maps to `Control` on Windows and Linux and to `Command` on macOS."),
            nls.localize('multiCursorModifier.alt', "Maps to `Alt` on Windows and Linux and to `Option` on macOS.")
        ],
        markdownDescription: nls.localize({
            key: 'multiCursorModifier',
            comment: [
                '- `ctrlCmd` refers to a value the setting can take and should not be localized.',
                '- `Control` and `Command` refer to the modifier keys Ctrl or Cmd on the keyboard and can be localized.'
            ]
        }, "The modifier to be used to add multiple cursors with the mouse. The Go to Definition and Open Link mouse gestures will adapt such that they do not conflict with the [multicursor modifier](https://code.visualstudio.com/docs/editor/codebasics#_multicursor-modifier).")
    })),
    multiCursorPaste: register(new EditorStringEnumOption(80 /* EditorOption.multiCursorPaste */, 'multiCursorPaste', 'spread', ['spread', 'full'], {
        markdownEnumDescriptions: [
            nls.localize('multiCursorPaste.spread', "Each cursor pastes a single line of the text."),
            nls.localize('multiCursorPaste.full', "Each cursor pastes the full text.")
        ],
        markdownDescription: nls.localize('multiCursorPaste', "Controls pasting when the line count of the pasted text matches the cursor count.")
    })),
    multiCursorLimit: register(new EditorIntOption(81 /* EditorOption.multiCursorLimit */, 'multiCursorLimit', 10000, 1, 100000, {
        markdownDescription: nls.localize('multiCursorLimit', "Controls the max number of cursors that can be in an active editor at once.")
    })),
    occurrencesHighlight: register(new EditorStringEnumOption(82 /* EditorOption.occurrencesHighlight */, 'occurrencesHighlight', 'singleFile', ['off', 'singleFile', 'multiFile'], {
        markdownEnumDescriptions: [
            nls.localize('occurrencesHighlight.off', "Does not highlight occurrences."),
            nls.localize('occurrencesHighlight.singleFile', "Highlights occurrences only in the current file."),
            nls.localize('occurrencesHighlight.multiFile', "Experimental: Highlights occurrences across all valid open files.")
        ],
        markdownDescription: nls.localize('occurrencesHighlight', "Controls whether occurrences should be highlighted across open files.")
    })),
    occurrencesHighlightDelay: register(new EditorIntOption(83 /* EditorOption.occurrencesHighlightDelay */, 'occurrencesHighlightDelay', 0, 0, 2000, {
        description: nls.localize('occurrencesHighlightDelay', "Controls the delay in milliseconds after which occurrences are highlighted."),
        tags: ['preview']
    })),
    overtypeOnPaste: register(new EditorBooleanOption(85 /* EditorOption.overtypeOnPaste */, 'overtypeOnPaste', true, { description: nls.localize('overtypeOnPaste', "Controls whether pasting should overtype.") })),
    overviewRulerBorder: register(new EditorBooleanOption(86 /* EditorOption.overviewRulerBorder */, 'overviewRulerBorder', true, { description: nls.localize('overviewRulerBorder', "Controls whether a border should be drawn around the overview ruler.") })),
    overviewRulerLanes: register(new EditorIntOption(87 /* EditorOption.overviewRulerLanes */, 'overviewRulerLanes', 3, 0, 3)),
    padding: register(new EditorPadding()),
    pasteAs: register(new EditorPasteAs()),
    parameterHints: register(new EditorParameterHints()),
    peekWidgetDefaultFocus: register(new EditorStringEnumOption(91 /* EditorOption.peekWidgetDefaultFocus */, 'peekWidgetDefaultFocus', 'tree', ['tree', 'editor'], {
        enumDescriptions: [
            nls.localize('peekWidgetDefaultFocus.tree', "Focus the tree when opening peek"),
            nls.localize('peekWidgetDefaultFocus.editor', "Focus the editor when opening peek")
        ],
        description: nls.localize('peekWidgetDefaultFocus', "Controls whether to focus the inline editor or the tree in the peek widget.")
    })),
    placeholder: register(new PlaceholderOption()),
    definitionLinkOpensInPeek: register(new EditorBooleanOption(93 /* EditorOption.definitionLinkOpensInPeek */, 'definitionLinkOpensInPeek', false, { description: nls.localize('definitionLinkOpensInPeek', "Controls whether the Go to Definition mouse gesture always opens the peek widget.") })),
    quickSuggestions: register(new EditorQuickSuggestions()),
    quickSuggestionsDelay: register(new EditorIntOption(95 /* EditorOption.quickSuggestionsDelay */, 'quickSuggestionsDelay', 10, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { description: nls.localize('quickSuggestionsDelay', "Controls the delay in milliseconds after which quick suggestions will show up.") })),
    readOnly: register(new EditorBooleanOption(96 /* EditorOption.readOnly */, 'readOnly', false)),
    readOnlyMessage: register(new ReadonlyMessage()),
    renameOnType: register(new EditorBooleanOption(98 /* EditorOption.renameOnType */, 'renameOnType', false, { description: nls.localize('renameOnType', "Controls whether the editor auto renames on type."), markdownDeprecationMessage: nls.localize('renameOnTypeDeprecate', "Deprecated, use `editor.linkedEditing` instead.") })),
    renderControlCharacters: register(new EditorBooleanOption(99 /* EditorOption.renderControlCharacters */, 'renderControlCharacters', true, { description: nls.localize('renderControlCharacters', "Controls whether the editor should render control characters."), restricted: true })),
    renderFinalNewline: register(new EditorStringEnumOption(100 /* EditorOption.renderFinalNewline */, 'renderFinalNewline', (platform.isLinux ? 'dimmed' : 'on'), ['off', 'on', 'dimmed'], { description: nls.localize('renderFinalNewline', "Render last line number when the file ends with a newline.") })),
    renderLineHighlight: register(new EditorStringEnumOption(101 /* EditorOption.renderLineHighlight */, 'renderLineHighlight', 'line', ['none', 'gutter', 'line', 'all'], {
        enumDescriptions: [
            '',
            '',
            '',
            nls.localize('renderLineHighlight.all', "Highlights both the gutter and the current line."),
        ],
        description: nls.localize('renderLineHighlight', "Controls how the editor should render the current line highlight.")
    })),
    renderLineHighlightOnlyWhenFocus: register(new EditorBooleanOption(102 /* EditorOption.renderLineHighlightOnlyWhenFocus */, 'renderLineHighlightOnlyWhenFocus', false, { description: nls.localize('renderLineHighlightOnlyWhenFocus', "Controls if the editor should render the current line highlight only when the editor is focused.") })),
    renderValidationDecorations: register(new EditorStringEnumOption(103 /* EditorOption.renderValidationDecorations */, 'renderValidationDecorations', 'editable', ['editable', 'on', 'off'])),
    renderWhitespace: register(new EditorStringEnumOption(104 /* EditorOption.renderWhitespace */, 'renderWhitespace', 'selection', ['none', 'boundary', 'selection', 'trailing', 'all'], {
        enumDescriptions: [
            '',
            nls.localize('renderWhitespace.boundary', "Render whitespace characters except for single spaces between words."),
            nls.localize('renderWhitespace.selection', "Render whitespace characters only on selected text."),
            nls.localize('renderWhitespace.trailing', "Render only trailing whitespace characters."),
            ''
        ],
        description: nls.localize('renderWhitespace', "Controls how the editor should render whitespace characters.")
    })),
    revealHorizontalRightPadding: register(new EditorIntOption(105 /* EditorOption.revealHorizontalRightPadding */, 'revealHorizontalRightPadding', 15, 0, 1000)),
    roundedSelection: register(new EditorBooleanOption(106 /* EditorOption.roundedSelection */, 'roundedSelection', true, { description: nls.localize('roundedSelection', "Controls whether selections should have rounded corners.") })),
    rulers: register(new EditorRulers()),
    scrollbar: register(new EditorScrollbar()),
    scrollBeyondLastColumn: register(new EditorIntOption(109 /* EditorOption.scrollBeyondLastColumn */, 'scrollBeyondLastColumn', 4, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { description: nls.localize('scrollBeyondLastColumn', "Controls the number of extra characters beyond which the editor will scroll horizontally.") })),
    scrollBeyondLastLine: register(new EditorBooleanOption(110 /* EditorOption.scrollBeyondLastLine */, 'scrollBeyondLastLine', true, { description: nls.localize('scrollBeyondLastLine', "Controls whether the editor will scroll beyond the last line.") })),
    scrollPredominantAxis: register(new EditorBooleanOption(111 /* EditorOption.scrollPredominantAxis */, 'scrollPredominantAxis', true, { description: nls.localize('scrollPredominantAxis', "Scroll only along the predominant axis when scrolling both vertically and horizontally at the same time. Prevents horizontal drift when scrolling vertically on a trackpad.") })),
    selectionClipboard: register(new EditorBooleanOption(112 /* EditorOption.selectionClipboard */, 'selectionClipboard', true, {
        description: nls.localize('selectionClipboard', "Controls whether the Linux primary clipboard should be supported."),
        included: platform.isLinux
    })),
    selectionHighlight: register(new EditorBooleanOption(113 /* EditorOption.selectionHighlight */, 'selectionHighlight', true, { description: nls.localize('selectionHighlight', "Controls whether the editor should highlight matches similar to the selection.") })),
    selectOnLineNumbers: register(new EditorBooleanOption(114 /* EditorOption.selectOnLineNumbers */, 'selectOnLineNumbers', true)),
    showFoldingControls: register(new EditorStringEnumOption(115 /* EditorOption.showFoldingControls */, 'showFoldingControls', 'mouseover', ['always', 'never', 'mouseover'], {
        enumDescriptions: [
            nls.localize('showFoldingControls.always', "Always show the folding controls."),
            nls.localize('showFoldingControls.never', "Never show the folding controls and reduce the gutter size."),
            nls.localize('showFoldingControls.mouseover', "Only show the folding controls when the mouse is over the gutter."),
        ],
        description: nls.localize('showFoldingControls', "Controls when the folding controls on the gutter are shown.")
    })),
    showUnused: register(new EditorBooleanOption(116 /* EditorOption.showUnused */, 'showUnused', true, { description: nls.localize('showUnused', "Controls fading out of unused code.") })),
    showDeprecated: register(new EditorBooleanOption(145 /* EditorOption.showDeprecated */, 'showDeprecated', true, { description: nls.localize('showDeprecated', "Controls strikethrough deprecated variables.") })),
    inlayHints: register(new EditorInlayHints()),
    snippetSuggestions: register(new EditorStringEnumOption(117 /* EditorOption.snippetSuggestions */, 'snippetSuggestions', 'inline', ['top', 'bottom', 'inline', 'none'], {
        enumDescriptions: [
            nls.localize('snippetSuggestions.top', "Show snippet suggestions on top of other suggestions."),
            nls.localize('snippetSuggestions.bottom', "Show snippet suggestions below other suggestions."),
            nls.localize('snippetSuggestions.inline', "Show snippets suggestions with other suggestions."),
            nls.localize('snippetSuggestions.none', "Do not show snippet suggestions."),
        ],
        description: nls.localize('snippetSuggestions', "Controls whether snippets are shown with other suggestions and how they are sorted.")
    })),
    smartSelect: register(new SmartSelect()),
    smoothScrolling: register(new EditorBooleanOption(119 /* EditorOption.smoothScrolling */, 'smoothScrolling', false, { description: nls.localize('smoothScrolling', "Controls whether the editor will scroll using an animation.") })),
    stopRenderingLineAfter: register(new EditorIntOption(122 /* EditorOption.stopRenderingLineAfter */, 'stopRenderingLineAfter', 10000, -1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)),
    suggest: register(new EditorSuggest()),
    inlineSuggest: register(new InlineEditorSuggest()),
    inlineCompletionsAccessibilityVerbose: register(new EditorBooleanOption(155 /* EditorOption.inlineCompletionsAccessibilityVerbose */, 'inlineCompletionsAccessibilityVerbose', false, { description: nls.localize('inlineCompletionsAccessibilityVerbose', "Controls whether the accessibility hint should be provided to screen reader users when an inline completion is shown.") })),
    suggestFontSize: register(new EditorIntOption(124 /* EditorOption.suggestFontSize */, 'suggestFontSize', 0, 0, 1000, { markdownDescription: nls.localize('suggestFontSize', "Font size for the suggest widget. When set to {0}, the value of {1} is used.", '`0`', '`#editor.fontSize#`') })),
    suggestLineHeight: register(new EditorIntOption(125 /* EditorOption.suggestLineHeight */, 'suggestLineHeight', 0, 0, 1000, { markdownDescription: nls.localize('suggestLineHeight', "Line height for the suggest widget. When set to {0}, the value of {1} is used. The minimum value is 8.", '`0`', '`#editor.lineHeight#`') })),
    suggestOnTriggerCharacters: register(new EditorBooleanOption(126 /* EditorOption.suggestOnTriggerCharacters */, 'suggestOnTriggerCharacters', true, { description: nls.localize('suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters.") })),
    suggestSelection: register(new EditorStringEnumOption(127 /* EditorOption.suggestSelection */, 'suggestSelection', 'first', ['first', 'recentlyUsed', 'recentlyUsedByPrefix'], {
        markdownEnumDescriptions: [
            nls.localize('suggestSelection.first', "Always select the first suggestion."),
            nls.localize('suggestSelection.recentlyUsed', "Select recent suggestions unless further typing selects one, e.g. `console.| -> console.log` because `log` has been completed recently."),
            nls.localize('suggestSelection.recentlyUsedByPrefix', "Select suggestions based on previous prefixes that have completed those suggestions, e.g. `co -> console` and `con -> const`."),
        ],
        description: nls.localize('suggestSelection', "Controls how suggestions are pre-selected when showing the suggest list.")
    })),
    tabCompletion: register(new EditorStringEnumOption(128 /* EditorOption.tabCompletion */, 'tabCompletion', 'off', ['on', 'off', 'onlySnippets'], {
        enumDescriptions: [
            nls.localize('tabCompletion.on', "Tab complete will insert the best matching suggestion when pressing tab."),
            nls.localize('tabCompletion.off', "Disable tab completions."),
            nls.localize('tabCompletion.onlySnippets', "Tab complete snippets when their prefix match. Works best when 'quickSuggestions' aren't enabled."),
        ],
        description: nls.localize('tabCompletion', "Enables tab completions.")
    })),
    tabIndex: register(new EditorIntOption(129 /* EditorOption.tabIndex */, 'tabIndex', 0, -1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)),
    unicodeHighlight: register(new UnicodeHighlight()),
    unusualLineTerminators: register(new EditorStringEnumOption(131 /* EditorOption.unusualLineTerminators */, 'unusualLineTerminators', 'prompt', ['auto', 'off', 'prompt'], {
        enumDescriptions: [
            nls.localize('unusualLineTerminators.auto', "Unusual line terminators are automatically removed."),
            nls.localize('unusualLineTerminators.off', "Unusual line terminators are ignored."),
            nls.localize('unusualLineTerminators.prompt', "Unusual line terminators prompt to be removed."),
        ],
        description: nls.localize('unusualLineTerminators', "Remove unusual line terminators that might cause problems.")
    })),
    useShadowDOM: register(new EditorBooleanOption(132 /* EditorOption.useShadowDOM */, 'useShadowDOM', true)),
    useTabStops: register(new EditorBooleanOption(133 /* EditorOption.useTabStops */, 'useTabStops', true, { description: nls.localize('useTabStops', "Spaces and tabs are inserted and deleted in alignment with tab stops.") })),
    wordBreak: register(new EditorStringEnumOption(134 /* EditorOption.wordBreak */, 'wordBreak', 'normal', ['normal', 'keepAll'], {
        markdownEnumDescriptions: [
            nls.localize('wordBreak.normal', "Use the default line break rule."),
            nls.localize('wordBreak.keepAll', "Word breaks should not be used for Chinese/Japanese/Korean (CJK) text. Non-CJK text behavior is the same as for normal."),
        ],
        description: nls.localize('wordBreak', "Controls the word break rules used for Chinese/Japanese/Korean (CJK) text.")
    })),
    wordSegmenterLocales: register(new WordSegmenterLocales()),
    wordSeparators: register(new EditorStringOption(136 /* EditorOption.wordSeparators */, 'wordSeparators', USUAL_WORD_SEPARATORS, { description: nls.localize('wordSeparators', "Characters that will be used as word separators when doing word related navigations or operations.") })),
    wordWrap: register(new EditorStringEnumOption(137 /* EditorOption.wordWrap */, 'wordWrap', 'off', ['off', 'on', 'wordWrapColumn', 'bounded'], {
        markdownEnumDescriptions: [
            nls.localize('wordWrap.off', "Lines will never wrap."),
            nls.localize('wordWrap.on', "Lines will wrap at the viewport width."),
            nls.localize({
                key: 'wordWrap.wordWrapColumn',
                comment: [
                    '- `editor.wordWrapColumn` refers to a different setting and should not be localized.'
                ]
            }, "Lines will wrap at `#editor.wordWrapColumn#`."),
            nls.localize({
                key: 'wordWrap.bounded',
                comment: [
                    '- viewport means the edge of the visible window size.',
                    '- `editor.wordWrapColumn` refers to a different setting and should not be localized.'
                ]
            }, "Lines will wrap at the minimum of viewport and `#editor.wordWrapColumn#`."),
        ],
        description: nls.localize({
            key: 'wordWrap',
            comment: [
                '- \'off\', \'on\', \'wordWrapColumn\' and \'bounded\' refer to values the setting can take and should not be localized.',
                '- `editor.wordWrapColumn` refers to a different setting and should not be localized.'
            ]
        }, "Controls how lines should wrap.")
    })),
    wordWrapBreakAfterCharacters: register(new EditorStringOption(138 /* EditorOption.wordWrapBreakAfterCharacters */, 'wordWrapBreakAfterCharacters', 
    // allow-any-unicode-next-line
    ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣')),
    wordWrapBreakBeforeCharacters: register(new EditorStringOption(139 /* EditorOption.wordWrapBreakBeforeCharacters */, 'wordWrapBreakBeforeCharacters', 
    // allow-any-unicode-next-line
    '([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋')),
    wordWrapColumn: register(new EditorIntOption(140 /* EditorOption.wordWrapColumn */, 'wordWrapColumn', 80, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        markdownDescription: nls.localize({
            key: 'wordWrapColumn',
            comment: [
                '- `editor.wordWrap` refers to a different setting and should not be localized.',
                '- \'wordWrapColumn\' and \'bounded\' refer to values the different setting can take and should not be localized.'
            ]
        }, "Controls the wrapping column of the editor when `#editor.wordWrap#` is `wordWrapColumn` or `bounded`.")
    })),
    wordWrapOverride1: register(new EditorStringEnumOption(141 /* EditorOption.wordWrapOverride1 */, 'wordWrapOverride1', 'inherit', ['off', 'on', 'inherit'])),
    wordWrapOverride2: register(new EditorStringEnumOption(142 /* EditorOption.wordWrapOverride2 */, 'wordWrapOverride2', 'inherit', ['off', 'on', 'inherit'])),
    // Leave these at the end (because they have dependencies!)
    effectiveCursorStyle: register(new EffectiveCursorStyle()),
    editorClassName: register(new EditorClassName()),
    defaultColorDecorators: register(new EditorStringEnumOption(153 /* EditorOption.defaultColorDecorators */, 'defaultColorDecorators', 'auto', ['auto', 'always', 'never'], {
        enumDescriptions: [
            nls.localize('editor.defaultColorDecorators.auto', "Show default color decorators only when no extension provides colors decorators."),
            nls.localize('editor.defaultColorDecorators.always', "Always show default color decorators."),
            nls.localize('editor.defaultColorDecorators.never', "Never show default color decorators."),
        ],
        description: nls.localize('defaultColorDecorators', "Controls whether inline color decorations should be shown using the default document color provider.")
    })),
    pixelRatio: register(new EditorPixelRatio()),
    tabFocusMode: register(new EditorBooleanOption(150 /* EditorOption.tabFocusMode */, 'tabFocusMode', false, { markdownDescription: nls.localize('tabFocusMode', "Controls whether the editor receives tabs or defers them to the workbench for navigation.") })),
    layoutInfo: register(new EditorLayoutInfoComputer()),
    wrappingInfo: register(new EditorWrappingInfoComputer()),
    wrappingIndent: register(new WrappingIndentOption()),
    wrappingStrategy: register(new WrappingStrategy()),
    effectiveExperimentalEditContextEnabled: register(new EffectiveExperimentalEditContextEnabled())
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29uZmlnL2VkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUd6RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFJN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUd2QyxPQUFPLE9BQU8sTUFBTSw2Q0FBNkMsQ0FBQztBQW1CbEU7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0Isd0JBTWpCO0FBTkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHVFQUFRLENBQUE7SUFDUix1RUFBUSxDQUFBO0lBQ1IsK0VBQVksQ0FBQTtJQUNaLCtFQUFZLENBQUE7SUFDWix1RUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQU5pQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBTXpDO0FBcXVCRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUM7QUF3SnRDLFlBQVk7QUFFWjs7R0FFRztBQUNILE1BQU0sT0FBTyx5QkFBeUI7SUFFckM7O09BRUc7SUFDSCxZQUFZLE1BQWlCO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFDTSxVQUFVLENBQUMsRUFBZ0I7UUFDakMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUs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