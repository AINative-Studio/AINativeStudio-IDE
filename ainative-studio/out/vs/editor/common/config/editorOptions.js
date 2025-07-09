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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvbmZpZy9lZGl0b3JPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFHekQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBSTdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzlELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFHdkMsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFtQmxFOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHdCQU1qQjtBQU5ELFdBQWtCLHdCQUF3QjtJQUN6Qyx1RUFBUSxDQUFBO0lBQ1IsdUVBQVEsQ0FBQTtJQUNSLCtFQUFZLENBQUE7SUFDWiwrRUFBWSxDQUFBO0lBQ1osdUVBQVEsQ0FBQTtBQUNULENBQUMsRUFOaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQU16QztBQXF1QkQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO0FBd0p0QyxZQUFZO0FBRVo7O0dBRUc7QUFDSCxNQUFNLE9BQU8seUJBQXlCO0lBRXJDOztPQUVHO0lBQ0gsWUFBWSxNQUFpQjtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBQ00sVUFBVSxDQUFDLEVBQWdCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0Q7QUErQkQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO0lBTWhDO1FBQ0MsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBa0NEOztHQUVHO0FBQ0gsTUFBZSxnQkFBZ0I7SUFPOUIsWUFBWSxFQUFLLEVBQUUsSUFBd0IsRUFBRSxZQUFlLEVBQUUsTUFBd0Y7UUFDckosSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRU0sV0FBVyxDQUFDLEtBQW9CLEVBQUUsTUFBUztRQUNqRCxPQUFPLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUlNLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBUTtRQUNuRixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsWUFDaUIsUUFBVyxFQUNYLFNBQWtCO1FBRGxCLGFBQVEsR0FBUixRQUFRLENBQUc7UUFDWCxjQUFTLEdBQVQsU0FBUyxDQUFTO0lBQy9CLENBQUM7Q0FDTDtBQUVELFNBQVMsV0FBVyxDQUFJLEtBQW9CLEVBQUUsTUFBUztJQUN0RCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNsRixPQUFPLElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEcsT0FBTyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFDRCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDdEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMxQixJQUFLLE1BQXFCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNwRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7Z0JBQzdCLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFlLG9CQUFvQjtJQU9sQyxZQUFZLEVBQUs7UUFGRCxXQUFNLEdBQTZDLFNBQVMsQ0FBQztRQUc1RSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEdBQVEsU0FBUyxDQUFDO0lBQ3BDLENBQUM7SUFFTSxXQUFXLENBQUMsS0FBb0IsRUFBRSxNQUFTO1FBQ2pELE9BQU8sV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQVU7UUFDekIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7Q0FHRDtBQUVELE1BQU0sa0JBQWtCO0lBT3ZCLFlBQVksRUFBSyxFQUFFLElBQXdCLEVBQUUsWUFBZSxFQUFFLE1BQXFDO1FBQ2xHLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVNLFdBQVcsQ0FBQyxLQUFvQixFQUFFLE1BQVM7UUFDakQsT0FBTyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxRQUFRLENBQUMsS0FBVTtRQUN6QixJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsT0FBTyxLQUFZLENBQUM7SUFDckIsQ0FBQztJQUVNLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBUTtRQUNuRixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBQyxLQUFVLEVBQUUsWUFBcUI7SUFDeEQsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNsQyxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBQ0QsSUFBSSxLQUFLLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDdkIsb0NBQW9DO1FBQ3BDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxNQUFNLG1CQUE0QyxTQUFRLGtCQUE4QjtJQUV2RixZQUFZLEVBQUssRUFBRSxJQUE4QixFQUFFLFlBQXFCLEVBQUUsU0FBbUQsU0FBUztRQUNySSxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDO1FBQy9CLENBQUM7UUFDRCxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVlLFFBQVEsQ0FBQyxLQUFVO1FBQ2xDLE9BQU8sT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFJLEtBQVUsRUFBRSxZQUFlLEVBQUUsT0FBZSxFQUFFLE9BQWU7SUFDMUYsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNsQyxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBQ0QsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1QixJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUNELENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6QixDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sZUFBd0MsU0FBUSxrQkFBNkI7SUFFM0UsTUFBTSxDQUFDLFVBQVUsQ0FBSSxLQUFVLEVBQUUsWUFBZSxFQUFFLE9BQWUsRUFBRSxPQUFlO1FBQ3hGLE9BQU8sVUFBVSxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFLRCxZQUFZLEVBQUssRUFBRSxJQUE2QixFQUFFLFlBQW9CLEVBQUUsT0FBZSxFQUFFLE9BQWUsRUFBRSxTQUFtRCxTQUFTO1FBQ3JLLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7WUFDeEIsTUFBTSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUM7WUFDOUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDekIsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDMUIsQ0FBQztRQUNELEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRWUsUUFBUSxDQUFDLEtBQVU7UUFDbEMsT0FBTyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pGLENBQUM7Q0FDRDtBQUNEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBbUIsS0FBVSxFQUFFLFlBQWUsRUFBRSxPQUFlLEVBQUUsT0FBZTtJQUMzRyxJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxNQUFNLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZELE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQUVELE1BQU0saUJBQTBDLFNBQVEsa0JBQTZCO0lBRTdFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBUyxFQUFFLEdBQVcsRUFBRSxHQUFXO1FBQ3RELElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ2IsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQVUsRUFBRSxZQUFvQjtRQUNuRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbEMsT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFJRCxZQUFZLEVBQUssRUFBRSxJQUE2QixFQUFFLFlBQW9CLEVBQUUsWUFBdUMsRUFBRSxNQUFxQztRQUNySixJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ3ZCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDO1FBQy9CLENBQUM7UUFDRCxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbEMsQ0FBQztJQUVlLFFBQVEsQ0FBQyxLQUFVO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7Q0FDRDtBQUVELE1BQU0sa0JBQTJDLFNBQVEsa0JBQTZCO0lBRTlFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBVSxFQUFFLFlBQW9CO1FBQ3BELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0IsT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELFlBQVksRUFBSyxFQUFFLElBQTZCLEVBQUUsWUFBb0IsRUFBRSxTQUFtRCxTQUFTO1FBQ25JLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7WUFDdkIsTUFBTSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUM7UUFDL0IsQ0FBQztRQUNELEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRWUsUUFBUSxDQUFDLEtBQVU7UUFDbEMsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1RCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQUksS0FBb0IsRUFBRSxZQUFlLEVBQUUsYUFBK0IsRUFBRSxhQUFpQztJQUNySSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxJQUFJLGFBQWEsSUFBSSxLQUFLLElBQUksYUFBYSxFQUFFLENBQUM7UUFDN0MsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUNELElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3pDLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLHNCQUFpRSxTQUFRLGtCQUF3QjtJQUl0RyxZQUFZLEVBQUssRUFBRSxJQUF3QixFQUFFLFlBQWUsRUFBRSxhQUErQixFQUFFLFNBQW1ELFNBQVM7UUFDMUosSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUN2QixNQUFNLENBQUMsSUFBSSxHQUFRLGFBQWEsQ0FBQztZQUNqQyxNQUFNLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQztRQUMvQixDQUFDO1FBQ0QsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFDO0lBQ3JDLENBQUM7SUFFZSxRQUFRLENBQUMsS0FBVTtRQUNsQyxPQUFPLFNBQVMsQ0FBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDcEUsQ0FBQztDQUNEO0FBRUQsTUFBTSxnQkFBOEQsU0FBUSxnQkFBeUI7SUFLcEcsWUFBWSxFQUFLLEVBQUUsSUFBd0IsRUFBRSxZQUFlLEVBQUUsa0JBQTBCLEVBQUUsYUFBa0IsRUFBRSxPQUF3QixFQUFFLFNBQW1ELFNBQVM7UUFDbk0sSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUN2QixNQUFNLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQztZQUM1QixNQUFNLENBQUMsT0FBTyxHQUFHLGtCQUFrQixDQUFDO1FBQ3JDLENBQUM7UUFDRCxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDekIsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFVO1FBQ3pCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQU0sS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRUQsWUFBWTtBQUVaLG9CQUFvQjtBQUVwQixTQUFTLHFCQUFxQixDQUFDLFVBQThEO0lBQzVGLFFBQVEsVUFBVSxFQUFFLENBQUM7UUFDcEIsS0FBSyxNQUFNLENBQUMsQ0FBQyw2Q0FBcUM7UUFDbEQsS0FBSyxNQUFNLENBQUMsQ0FBQyw2Q0FBcUM7UUFDbEQsS0FBSyxVQUFVLENBQUMsQ0FBQyxpREFBeUM7UUFDMUQsS0FBSyxVQUFVLENBQUMsQ0FBQyxpREFBeUM7UUFDMUQsS0FBSyxNQUFNLENBQUMsQ0FBQyw2Q0FBcUM7SUFDbkQsQ0FBQztBQUNGLENBQUM7QUFFRCxZQUFZO0FBRVosOEJBQThCO0FBRTlCLE1BQU0sMEJBQTJCLFNBQVEsZ0JBQWdHO0lBRXhJO1FBQ0MsS0FBSyw0Q0FDK0Isc0JBQXNCLHdDQUN6RDtZQUNDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7WUFDM0IsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsK0RBQStELENBQUM7Z0JBQzFHLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsMENBQTBDLENBQUM7Z0JBQ25GLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUseUNBQXlDLENBQUM7YUFDbkY7WUFDRCxPQUFPLEVBQUUsTUFBTTtZQUNmLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUN2QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxtRkFBbUYsQ0FBQztTQUN0SSxDQUNELENBQUM7SUFDSCxDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQVU7UUFDekIsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssTUFBTSxDQUFDLENBQUMsNENBQW9DO1lBQ2pELEtBQUssS0FBSyxDQUFDLENBQUMsNkNBQXFDO1lBQ2pELEtBQUssSUFBSSxDQUFDLENBQUMsNENBQW9DO1FBQ2hELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVlLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBMkI7UUFDL0csSUFBSSxLQUFLLHlDQUFpQyxFQUFFLENBQUM7WUFDNUMsbUVBQW1FO1lBQ25FLE9BQU8sR0FBRyxDQUFDLG9CQUFvQixDQUFDO1FBQ2pDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQTJCRCxNQUFNLGNBQWUsU0FBUSxnQkFBc0Y7SUFFbEg7UUFDQyxNQUFNLFFBQVEsR0FBMEI7WUFDdkMsV0FBVyxFQUFFLElBQUk7WUFDakIsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFDO1FBQ0YsS0FBSyxpQ0FDbUIsVUFBVSxFQUFFLFFBQVEsRUFDM0M7WUFDQyw2QkFBNkIsRUFBRTtnQkFDOUIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxXQUFXO2dCQUM3QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxpRUFBaUUsQ0FBQzthQUNwSDtZQUNELGtDQUFrQyxFQUFFO2dCQUNuQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGdCQUFnQjtnQkFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsaUdBQWlHLENBQUM7YUFDeko7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRU0sUUFBUSxDQUFDLE1BQVc7UUFDMUIsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDMUIsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQWdDLENBQUM7UUFDL0MsT0FBTztZQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUN0RSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUM7U0FDckYsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFWix3QkFBd0I7QUFFeEI7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsNkJBeUJqQjtBQXpCRCxXQUFrQiw2QkFBNkI7SUFDOUM7O09BRUc7SUFDSCxxRkFBVSxDQUFBO0lBQ1Y7O09BRUc7SUFDSCxtRkFBUyxDQUFBO0lBQ1Q7O09BRUc7SUFDSCxxRkFBVSxDQUFBO0lBQ1Y7O09BRUc7SUFDSCxtRkFBUyxDQUFBO0lBQ1Q7O09BRUc7SUFDSCxxRkFBVSxDQUFBO0lBQ1Y7O09BRUc7SUFDSCxtRkFBUyxDQUFBO0FBQ1YsQ0FBQyxFQXpCaUIsNkJBQTZCLEtBQTdCLDZCQUE2QixRQXlCOUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxtQkFBc0U7SUFDbkgsUUFBUSxtQkFBbUIsRUFBRSxDQUFDO1FBQzdCLEtBQUssT0FBTyxDQUFDLENBQUMsbURBQTJDO1FBQ3pELEtBQUssUUFBUSxDQUFDLENBQUMsb0RBQTRDO1FBQzNELEtBQUssT0FBTyxDQUFDLENBQUMsbURBQTJDO1FBQ3pELEtBQUssUUFBUSxDQUFDLENBQUMsb0RBQTRDO1FBQzNELEtBQUssT0FBTyxDQUFDLENBQUMsbURBQTJDO0lBQzFELENBQUM7QUFDRixDQUFDO0FBRUQsWUFBWTtBQUVaLHFCQUFxQjtBQUVyQjs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHFCQXlCWDtBQXpCRCxXQUFZLHFCQUFxQjtJQUNoQzs7T0FFRztJQUNILGlFQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILG1FQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILDJFQUFhLENBQUE7SUFDYjs7T0FFRztJQUNILHlFQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILGlGQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gsbUZBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQXpCVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBeUJoQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFdBQWtDO0lBQ3JFLFFBQVEsV0FBVyxFQUFFLENBQUM7UUFDckIsS0FBSyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQztRQUMvQyxLQUFLLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDO1FBQ2pELEtBQUsscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxXQUFXLENBQUM7UUFDekQsS0FBSyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLFdBQVcsQ0FBQztRQUN4RCxLQUFLLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sZUFBZSxDQUFDO1FBQ2hFLEtBQUsscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxnQkFBZ0IsQ0FBQztJQUNuRSxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUFDLFdBQThGO0lBQ25JLFFBQVEsV0FBVyxFQUFFLENBQUM7UUFDckIsS0FBSyxNQUFNLENBQUMsQ0FBQyxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQztRQUMvQyxLQUFLLE9BQU8sQ0FBQyxDQUFDLE9BQU8scUJBQXFCLENBQUMsS0FBSyxDQUFDO1FBQ2pELEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxxQkFBcUIsQ0FBQyxTQUFTLENBQUM7UUFDekQsS0FBSyxXQUFXLENBQUMsQ0FBQyxPQUFPLHFCQUFxQixDQUFDLFFBQVEsQ0FBQztRQUN4RCxLQUFLLGVBQWUsQ0FBQyxDQUFDLE9BQU8scUJBQXFCLENBQUMsWUFBWSxDQUFDO1FBQ2hFLEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLHFCQUFxQixDQUFDLGFBQWEsQ0FBQztJQUNuRSxDQUFDO0FBQ0YsQ0FBQztBQUVELFlBQVk7QUFFWix5QkFBeUI7QUFFekIsTUFBTSxlQUFnQixTQUFRLG9CQUEwRDtJQUV2RjtRQUNDLEtBQUssd0NBQThCLENBQUM7SUFDckMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsQ0FBUztRQUNwRixNQUFNLFVBQVUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JDLElBQUksT0FBTyxDQUFDLEdBQUcsNENBQW1DLEVBQUUsQ0FBQztZQUNwRCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLDRDQUFtQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELElBQUksR0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDOUIsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsR0FBRyxrQ0FBeUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4RCxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzVELFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLEdBQUcsbUNBQXlCLEVBQUUsQ0FBQztZQUMxQyxVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLHVDQUE2QixFQUFFLENBQUM7WUFDOUMsVUFBVSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQztDQUNEO0FBRUQsWUFBWTtBQUVaLGlDQUFpQztBQUVqQyxNQUFNLDZCQUE4QixTQUFRLG1CQUF5RDtJQUVwRztRQUNDLEtBQUssZ0RBQ2tDLHlCQUF5QixFQUFFLElBQUksRUFDckUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSx1RUFBdUUsQ0FBQyxFQUFFLENBQ2pJLENBQUM7SUFDSCxDQUFDO0lBRWUsT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0IsRUFBRSxLQUFjO1FBQ2xHLE9BQU8sS0FBSyxJQUFJLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztJQUM3QyxDQUFDO0NBQ0Q7QUFvREQsTUFBTSxVQUFXLFNBQVEsZ0JBQTBFO0lBRWxHO1FBQ0MsTUFBTSxRQUFRLEdBQXNCO1lBQ25DLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsNkJBQTZCLEVBQUUsUUFBUTtZQUN2QyxtQkFBbUIsRUFBRSxPQUFPO1lBQzVCLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixJQUFJLEVBQUUsSUFBSTtZQUNWLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLGNBQWMsRUFBRSxXQUFXO1NBQzNCLENBQUM7UUFDRixLQUFLLDZCQUNlLE1BQU0sRUFBRSxRQUFRLEVBQ25DO1lBQ0MsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsZ0JBQWdCO2dCQUNsQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx1RUFBdUUsQ0FBQzthQUMzSDtZQUNELDJDQUEyQyxFQUFFO2dCQUM1QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQztnQkFDdEMsT0FBTyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkI7Z0JBQy9DLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGlEQUFpRCxFQUFFLHFEQUFxRCxDQUFDO29CQUN0SCxHQUFHLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxFQUFFLHlGQUF5RixDQUFDO29CQUMzSixHQUFHLENBQUMsUUFBUSxDQUFDLHFEQUFxRCxFQUFFLG9EQUFvRCxDQUFDO2lCQUN6SDtnQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSw0RkFBNEYsQ0FBQzthQUM3SjtZQUNELGlDQUFpQyxFQUFFO2dCQUNsQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQztnQkFDdEMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUI7Z0JBQ3JDLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLDBEQUEwRCxDQUFDO29CQUNqSCxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLGlEQUFpRCxDQUFDO29CQUN6RyxHQUFHLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLHNGQUFzRixDQUFDO2lCQUNqSjtnQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx3RUFBd0UsQ0FBQzthQUMvSDtZQUNELGlDQUFpQyxFQUFFO2dCQUNsQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLG1CQUFtQjtnQkFDckMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsNEZBQTRGLENBQUM7Z0JBQ25KLFFBQVEsRUFBRSxRQUFRLENBQUMsV0FBVzthQUM5QjtZQUNELGdDQUFnQyxFQUFFO2dCQUNqQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGtCQUFrQjtnQkFDcEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsZ0tBQWdLLENBQUM7YUFDdE47WUFDRCxrQkFBa0IsRUFBRTtnQkFDbkIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUN0QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsMEhBQTBILENBQUM7YUFDbEs7WUFDRCxxQkFBcUIsRUFBRTtnQkFDdEIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLFdBQVc7Z0JBQ3BCLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLG1EQUFtRCxDQUFDO29CQUM5RixHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLGtEQUFrRCxDQUFDO2lCQUNqRztnQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsdURBQXVELENBQUM7YUFDbEc7WUFDRCw0QkFBNEIsRUFBRTtnQkFDN0IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLFdBQVc7Z0JBQ3BCLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLCtDQUErQyxDQUFDO29CQUNqRyxHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLG1EQUFtRCxDQUFDO2lCQUN6RztnQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSwwREFBMEQsQ0FBQzthQUM1RztTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBNEIsQ0FBQztRQUMzQyxPQUFPO1lBQ04sZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO1lBQ3JGLDZCQUE2QixFQUFFLE9BQU8sTUFBTSxDQUFDLDZCQUE2QixLQUFLLFNBQVM7Z0JBQ3ZGLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQzdELENBQUMsQ0FBQyxTQUFTLENBQW1DLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLDZCQUE2QixFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN0SyxtQkFBbUIsRUFBRSxPQUFPLE1BQU0sQ0FBQyxtQkFBbUIsS0FBSyxTQUFTO2dCQUNuRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNuRCxDQUFDLENBQUMsU0FBUyxDQUFtQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDbEosbUJBQW1CLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDO1lBQzlGLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQztZQUMzRixJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDakQsT0FBTyxFQUFFLFNBQVMsQ0FBd0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMzRyxjQUFjLEVBQUUsU0FBUyxDQUF3QixLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1NBQ2hJLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosdUJBQXVCO0FBRXZCOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGdCQUFzRTthQUVoRyxRQUFHLEdBQUcsd0JBQXdCLENBQUM7YUFDL0IsT0FBRSxHQUFHLHNCQUFzQixDQUFDO0lBRTFDO1FBQ0MsS0FBSyxzQ0FDd0IsZUFBZSxFQUFFLG1CQUFtQixDQUFDLEdBQUcsRUFDcEU7WUFDQyxLQUFLLEVBQUU7Z0JBQ047b0JBQ0MsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGtLQUFrSyxDQUFDO2lCQUM5TTtnQkFDRDtvQkFDQyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw0SEFBNEgsQ0FBQztpQkFDOUs7YUFDRDtZQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHdLQUF3SyxDQUFDO1lBQzNOLE9BQU8sRUFBRSxLQUFLO1NBQ2QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFVO1FBQ3pCLElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLElBQUksS0FBSyxLQUFLLE9BQU8sSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztZQUNoQyxDQUFDO1lBQ0QsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3RCLE9BQU8sbUJBQW1CLENBQUMsRUFBRSxDQUFDO1lBQy9CLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sbUJBQW1CLENBQUMsRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFDRCxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztJQUNoQyxDQUFDOztBQUdGLFlBQVk7QUFFWix3QkFBd0I7QUFFeEI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsZ0JBQXVFO0lBQ2hILDJDQUEyQzthQUM3QixRQUFHLEdBQUcsUUFBUSxDQUFDO0lBRTdCLCtFQUErRTthQUNqRSxjQUFTLEdBQUcsV0FBVyxDQUFDO0lBRXRDO1FBQ0MsS0FBSyx1Q0FDeUIsZ0JBQWdCLEVBQUUsb0JBQW9CLENBQUMsR0FBRyxFQUN2RTtZQUNDLEtBQUssRUFBRTtnQkFDTjtvQkFDQyxJQUFJLEVBQUUsU0FBUztvQkFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSwrS0FBK0ssQ0FBQztpQkFDNU47Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUseUpBQXlKLENBQUM7aUJBQzdNO2FBQ0Q7WUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSw0TUFBNE0sQ0FBQztZQUNoUSxPQUFPLEVBQUUsS0FBSztTQUNkLENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsS0FBVTtRQUN6QixJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvQixJQUFJLEtBQUssS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxvQkFBb0IsQ0FBQyxHQUFHLENBQUM7WUFDakMsQ0FBQztZQUNELElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN0QixPQUFPLG9CQUFvQixDQUFDLFNBQVMsQ0FBQztZQUN2QyxDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQixPQUFPLG9CQUFvQixDQUFDLFNBQVMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxvQkFBb0IsQ0FBQyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVlLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBYTtRQUNqRywyREFBMkQ7UUFDM0QsdUNBQXVDO1FBQ3ZDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxDQUFDOztBQUdGLFlBQVk7QUFFWixrQkFBa0I7QUFFbEIsTUFBTSxjQUFlLFNBQVEsb0JBQXFEO0lBRWpGO1FBQ0MsS0FBSyxnQ0FBdUIsQ0FBQztJQUM5QixDQUFDO0lBRU0sT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0IsRUFBRSxDQUFXO1FBQ3RGLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQztJQUNyQixDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosOEJBQThCO0FBRTlCLE1BQU0sb0JBQXFCLFNBQVEsb0JBQThFO0lBRWhIO1FBQ0MsS0FBSyw2Q0FBbUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0IsRUFBRSxDQUF3QjtRQUNuRyxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLEdBQUcsMkNBQWtDLENBQUMsQ0FBQztZQUMvQyxPQUFPLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztJQUN4QyxDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosMENBQTBDO0FBRTFDLE1BQU0sdUNBQXdDLFNBQVEsb0JBQW1GO0lBRXhJO1FBQ0MsS0FBSyxnRUFBc0QsQ0FBQztJQUM3RCxDQUFDO0lBRU0sT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0I7UUFDekUsTUFBTSxvQkFBb0IsR0FBRyxPQUFRLFVBQWtCLENBQUMsV0FBVyxLQUFLLFVBQVUsQ0FBQztRQUNuRixPQUFPLG9CQUFvQixJQUFJLE9BQU8sQ0FBQyxHQUFHLHNEQUE2QyxDQUFDO0lBQ3pGLENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFWixrQkFBa0I7QUFFbEIsTUFBTSxjQUFlLFNBQVEsa0JBQWlEO0lBRTdFO1FBQ0MsS0FBSyxpQ0FDbUIsVUFBVSxFQUFFLG9CQUFvQixDQUFDLFFBQVEsRUFDaEU7WUFDQyxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1lBQ1YsT0FBTyxFQUFFLEdBQUc7WUFDWixPQUFPLEVBQUUsb0JBQW9CLENBQUMsUUFBUTtZQUN0QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsbUNBQW1DLENBQUM7U0FDMUUsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVlLFFBQVEsQ0FBQyxLQUFVO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2IsT0FBTyxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7UUFDdEMsQ0FBQztRQUNELE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUNlLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBYTtRQUNqRyxxREFBcUQ7UUFDckQsdUNBQXVDO1FBQ3ZDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQsWUFBWTtBQUVaLG9CQUFvQjtBQUVwQixNQUFNLGdCQUFpQixTQUFRLGdCQUF5RDthQUN4RSxzQkFBaUIsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN0RyxrQkFBYSxHQUFHLENBQUMsQ0FBQzthQUNsQixrQkFBYSxHQUFHLElBQUksQ0FBQztJQUVwQztRQUNDLEtBQUssbUNBQ3FCLFlBQVksRUFBRSxvQkFBb0IsQ0FBQyxVQUFVLEVBQ3RFO1lBQ0MsS0FBSyxFQUFFO2dCQUNOO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxhQUFhO29CQUN2QyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsYUFBYTtvQkFDdkMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsa0ZBQWtGLENBQUM7aUJBQ3hJO2dCQUNEO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxzQ0FBc0M7aUJBQy9DO2dCQUNEO29CQUNDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUI7aUJBQ3hDO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsb0JBQW9CLENBQUMsVUFBVTtZQUN4QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsbUdBQW1HLENBQUM7U0FDNUksQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFVO1FBQ3pCLElBQUksS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ25KLENBQUM7O0FBb0NGLE1BQU0sa0JBQW1CLFNBQVEsZ0JBQXNGO0lBRXRIO1FBQ0MsTUFBTSxRQUFRLEdBQXdCO1lBQ3JDLFFBQVEsRUFBRSxNQUFNO1lBQ2hCLG1CQUFtQixFQUFFLE1BQU07WUFDM0IsdUJBQXVCLEVBQUUsTUFBTTtZQUMvQixvQkFBb0IsRUFBRSxNQUFNO1lBQzVCLHVCQUF1QixFQUFFLE1BQU07WUFDL0Isa0JBQWtCLEVBQUUsTUFBTTtZQUMxQixhQUFhLEVBQUUsTUFBTTtZQUNyQiw0QkFBNEIsRUFBRSw4QkFBOEI7WUFDNUQsZ0NBQWdDLEVBQUUsOEJBQThCO1lBQ2hFLDZCQUE2QixFQUFFLDhCQUE4QjtZQUM3RCxnQ0FBZ0MsRUFBRSxFQUFFO1lBQ3BDLDJCQUEyQixFQUFFLEVBQUU7WUFDL0IsdUJBQXVCLEVBQUUsRUFBRTtTQUMzQixDQUFDO1FBQ0YsTUFBTSxVQUFVLEdBQWdCO1lBQy9CLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUM7WUFDckMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQzFCLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHlDQUF5QyxDQUFDO2dCQUM1RixHQUFHLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLCtDQUErQyxDQUFDO2dCQUN6RyxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLG9FQUFvRSxDQUFDO2FBQ3ZIO1NBQ0QsQ0FBQztRQUNGLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsdUNBQXVDLEVBQUUsOEJBQThCLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsK0JBQStCLEVBQUUsaUNBQWlDLEVBQUUsOEJBQThCLEVBQUUscUNBQXFDLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUM3YSxLQUFLLHFDQUN1QixjQUFjLEVBQUUsUUFBUSxFQUNuRDtZQUNDLDhCQUE4QixFQUFFO2dCQUMvQixrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGlMQUFpTCxDQUFDO2FBQzlQO1lBQ0QseUNBQXlDLEVBQUU7Z0JBQzFDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdEQUFnRCxFQUFFLDRGQUE0RixDQUFDO2dCQUN6SyxHQUFHLFVBQVU7YUFDYjtZQUNELDZDQUE2QyxFQUFFO2dCQUM5QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvREFBb0QsRUFBRSxpR0FBaUcsQ0FBQztnQkFDbEwsR0FBRyxVQUFVO2FBQ2I7WUFDRCwwQ0FBMEMsRUFBRTtnQkFDM0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaURBQWlELEVBQUUsNkZBQTZGLENBQUM7Z0JBQzNLLEdBQUcsVUFBVTthQUNiO1lBQ0QsNkNBQTZDLEVBQUU7Z0JBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9EQUFvRCxFQUFFLGlHQUFpRyxDQUFDO2dCQUNsTCxHQUFHLFVBQVU7YUFDYjtZQUNELHdDQUF3QyxFQUFFO2dCQUN6QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSw0RkFBNEYsQ0FBQztnQkFDeEssR0FBRyxVQUFVO2FBQ2I7WUFDRCxrREFBa0QsRUFBRTtnQkFDbkQsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEI7Z0JBQzlDLElBQUksRUFBRSx5QkFBeUI7Z0JBQy9CLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLDhHQUE4RyxDQUFDO2FBQ3pLO1lBQ0Qsc0RBQXNELEVBQUU7Z0JBQ3ZELElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsZ0NBQWdDO2dCQUNsRCxJQUFJLEVBQUUseUJBQXlCO2dCQUMvQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxtSEFBbUgsQ0FBQzthQUNsTDtZQUNELG1EQUFtRCxFQUFFO2dCQUNwRCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLDZCQUE2QjtnQkFDL0MsSUFBSSxFQUFFLHlCQUF5QjtnQkFDL0IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsK0dBQStHLENBQUM7YUFDM0s7WUFDRCxzREFBc0QsRUFBRTtnQkFDdkQsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0M7Z0JBQ2xELElBQUksRUFBRSx5QkFBeUI7Z0JBQy9CLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLGtIQUFrSCxDQUFDO2FBQ2pMO1lBQ0QsaURBQWlELEVBQUU7Z0JBQ2xELElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsMkJBQTJCO2dCQUM3QyxJQUFJLEVBQUUseUJBQXlCO2dCQUMvQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw2R0FBNkcsQ0FBQzthQUN2SztTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBOEIsQ0FBQztRQUM3QyxPQUFPO1lBQ04sUUFBUSxFQUFFLFNBQVMsQ0FBcUIsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDcEgsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLG1CQUFtQixJQUFJLFNBQVMsQ0FBcUIsS0FBSyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbkosdUJBQXVCLEVBQUUsS0FBSyxDQUFDLHVCQUF1QixJQUFJLFNBQVMsQ0FBcUIsS0FBSyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDL0osb0JBQW9CLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixJQUFJLFNBQVMsQ0FBcUIsS0FBSyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdEosdUJBQXVCLEVBQUUsS0FBSyxDQUFDLHVCQUF1QixJQUFJLFNBQVMsQ0FBcUIsS0FBSyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDL0osa0JBQWtCLEVBQUUsS0FBSyxDQUFDLGtCQUFrQixJQUFJLFNBQVMsQ0FBcUIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDaEosYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhLElBQUksU0FBUyxDQUFxQixLQUFLLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakksNEJBQTRCLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLDRCQUE0QixDQUFDO1lBQzNJLGdDQUFnQyxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQ0FBZ0MsQ0FBQztZQUN2Siw2QkFBNkIsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsNkJBQTZCLENBQUM7WUFDOUksZ0NBQWdDLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGdDQUFnQyxDQUFDO1lBQ3ZKLDJCQUEyQixFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQywyQkFBMkIsQ0FBQztZQUN4SSx1QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUM7U0FDNUgsQ0FBQztJQUNILENBQUM7Q0FDRDtBQTBDRCxNQUFNLFdBQVksU0FBUSxnQkFBNkU7SUFFdEc7UUFDQyxNQUFNLFFBQVEsR0FBdUI7WUFDcEMsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLEVBQUUsR0FBRztZQUNWLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLE1BQU0sRUFBRSxJQUFJO1lBQ1osS0FBSyxFQUFFLElBQUk7U0FDWCxDQUFDO1FBQ0YsS0FBSyw4QkFDZ0IsT0FBTyxFQUFFLFFBQVEsRUFDckM7WUFDQyxzQkFBc0IsRUFBRTtnQkFDdkIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsc0NBQXNDLENBQUM7YUFDbEY7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUN2QixPQUFPLEVBQUUsQ0FBQztnQkFDVixPQUFPLEVBQUUsS0FBSztnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsb0VBQW9FLENBQUM7YUFDOUc7WUFDRCxxQkFBcUIsRUFBRTtnQkFDdEIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUN4QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsK0VBQStFLENBQUM7YUFDMUg7WUFDRCwwQkFBMEIsRUFBRTtnQkFDM0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxXQUFXO2dCQUM3QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxtSEFBbUgsQ0FBQzthQUNuSztZQUNELG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3ZCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSx5REFBeUQsQ0FBQzthQUNuRztTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBNkIsQ0FBQztRQUM1QyxPQUFPO1lBQ04sT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzFELEtBQUssRUFBRSxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQztZQUNqRixNQUFNLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7WUFDdkQsV0FBVyxFQUFFLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO1lBQ3BHLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztTQUNwRCxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBNEJELE1BQU0sQ0FBTixJQUFrQixhQUlqQjtBQUpELFdBQWtCLGFBQWE7SUFDOUIsaURBQVEsQ0FBQTtJQUNSLGlEQUFRLENBQUE7SUFDUixxREFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUppQixhQUFhLEtBQWIsYUFBYSxRQUk5QjtBQXFLRDs7R0FFRztBQUNILE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxvQkFBK0Q7SUFFNUc7UUFDQyxLQUFLLG1DQUF5QixDQUFDO0lBQ2hDLENBQUM7SUFFTSxPQUFPLENBQUMsR0FBMEIsRUFBRSxPQUErQixFQUFFLENBQW1CO1FBQzlGLE9BQU8sd0JBQXdCLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRTtZQUN0RCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07WUFDbEIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVO1lBQzFCLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVztZQUM1QixzQkFBc0IsRUFBRSxHQUFHLENBQUMsc0JBQXNCO1lBQ2xELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVU7WUFDbkMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhO1lBQ2hDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxxQkFBcUI7WUFDaEQsOEJBQThCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEI7WUFDM0UsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYTtZQUN6QyxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVU7WUFDMUIsOEJBQThCLEVBQUUsR0FBRyxDQUFDLDhCQUE4QjtTQUNsRSxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sTUFBTSxDQUFDLGdDQUFnQyxDQUFDLEtBUTlDO1FBQ0EsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDakUsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xGLElBQUksd0JBQXdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRixJQUFJLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsd0JBQXdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0YsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLENBQUMseUJBQXlCLEdBQUcsS0FBSyxDQUFDLGFBQWEsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEksTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO0lBQzFILENBQUM7SUFFTyxNQUFNLENBQUMscUJBQXFCLENBQUMsS0FBMEIsRUFBRSxNQUE0QjtRQUM1RixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDdEMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUVwQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QixPQUFPO2dCQUNOLGFBQWEsNEJBQW9CO2dCQUNqQyxXQUFXLEVBQUUsQ0FBQztnQkFDZCxZQUFZLEVBQUUsQ0FBQztnQkFDZiwyQkFBMkIsRUFBRSxLQUFLO2dCQUNsQyxpQkFBaUIsRUFBRSxLQUFLO2dCQUN4QixZQUFZLEVBQUUsQ0FBQztnQkFDZixpQkFBaUIsRUFBRSxDQUFDO2dCQUNwQix1QkFBdUIsRUFBRSxDQUFDO2dCQUMxQix3QkFBd0IsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7Z0JBQzlELHVCQUF1QixFQUFFLENBQUM7Z0JBQzFCLHdCQUF3QixFQUFFLFdBQVc7YUFDckMsQ0FBQztRQUNILENBQUM7UUFFRCwrRUFBK0U7UUFDL0UsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLENBQUMsd0JBQXdCLENBQUM7UUFDakUsTUFBTSxjQUFjLEdBQUcsQ0FDdEIsd0JBQXdCO1lBQ3hCLG9GQUFvRjtlQUNqRixLQUFLLENBQUMsV0FBVyxLQUFLLHdCQUF3QixDQUFDLFdBQVc7ZUFDMUQsS0FBSyxDQUFDLFVBQVUsS0FBSyx3QkFBd0IsQ0FBQyxVQUFVO2VBQ3hELEtBQUssQ0FBQyw4QkFBOEIsS0FBSyx3QkFBd0IsQ0FBQyw4QkFBOEI7ZUFDaEcsS0FBSyxDQUFDLFVBQVUsS0FBSyx3QkFBd0IsQ0FBQyxVQUFVO2VBQ3hELEtBQUssQ0FBQyxvQkFBb0IsS0FBSyx3QkFBd0IsQ0FBQyxvQkFBb0I7ZUFDNUUsS0FBSyxDQUFDLFVBQVUsS0FBSyx3QkFBd0IsQ0FBQyxVQUFVO2VBQ3hELEtBQUssQ0FBQyxhQUFhLEtBQUssd0JBQXdCLENBQUMsYUFBYTtlQUM5RCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sS0FBSyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsT0FBTztlQUNsRSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsSUFBSTtlQUM1RCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsSUFBSTtlQUM1RCxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsVUFBVTtlQUN4RSxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixLQUFLLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0I7ZUFDcEYsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEtBQUssd0JBQXdCLENBQUMsT0FBTyxDQUFDLFNBQVM7ZUFDdEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssd0JBQXdCLENBQUMsT0FBTyxDQUFDLEtBQUs7ZUFDOUQsS0FBSyxDQUFDLHNCQUFzQixLQUFLLHdCQUF3QixDQUFDLHNCQUFzQjtZQUNuRiwwRkFBMEY7WUFDMUYsNEZBQTRGO2VBQ3pGLEtBQUssQ0FBQyxrQkFBa0IsS0FBSyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FDM0UsQ0FBQztRQUVGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDcEMsTUFBTSw4QkFBOEIsR0FBRyxLQUFLLENBQUMsOEJBQThCLENBQUM7UUFDNUUsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUM7UUFDeEQsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1FBQy9ELElBQUksWUFBWSxHQUFHLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqRyxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQ2pELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3ZDLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDO1FBQzVELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFDMUMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztRQUM1QyxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztRQUVwRCxNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQztRQUNwRSxNQUFNLHdCQUF3QixHQUFHLHdCQUF3QixHQUFHLFVBQVUsQ0FBQztRQUN2RSxJQUFJLDJCQUEyQixHQUFHLEtBQUssQ0FBQztRQUN4QyxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLGlCQUFpQixHQUFHLGNBQWMsR0FBRyxZQUFZLENBQUM7UUFDdEQsSUFBSSxnQkFBZ0IsR0FBRyxZQUFZLEdBQUcsVUFBVSxDQUFDO1FBQ2pELElBQUksc0JBQXNCLEdBQVcsQ0FBQyxDQUFDO1FBRXZDLElBQUksV0FBVyxLQUFLLE1BQU0sSUFBSSxXQUFXLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDckQsTUFBTSxFQUFFLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLHdCQUF3QixDQUFDLGdDQUFnQyxDQUFDO2dCQUNuTCxhQUFhLEVBQUUsYUFBYTtnQkFDNUIsb0JBQW9CLEVBQUUsb0JBQW9CO2dCQUMxQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVU7Z0JBQzVCLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYTtnQkFDbEMsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLFVBQVUsRUFBRSxVQUFVO2dCQUN0QixVQUFVLEVBQUUsVUFBVTthQUN0QixDQUFDLENBQUM7WUFDSCwwRkFBMEY7WUFDMUYsc0JBQXNCO1lBQ3RCLE1BQU0sS0FBSyxHQUFHLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQztZQUUvQyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDZiwyQkFBMkIsR0FBRyxJQUFJLENBQUM7Z0JBQ25DLGlCQUFpQixHQUFHLElBQUksQ0FBQztnQkFDekIsWUFBWSxHQUFHLENBQUMsQ0FBQztnQkFDakIsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixnQkFBZ0IsR0FBRyxZQUFZLEdBQUcsVUFBVSxDQUFDO1lBQzlDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQzNCLElBQUksZUFBZSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUM7Z0JBRXZDLElBQUksV0FBVyxLQUFLLEtBQUssRUFBRSxDQUFDO29CQUMzQixNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyx5QkFBeUIsR0FBRyxhQUFhLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO29CQUNySSxJQUFJLGtCQUFrQixJQUFJLGNBQWMsSUFBSSxjQUFjLElBQUksTUFBTSxDQUFDLHVCQUF1QixFQUFFLENBQUM7d0JBQzlGLDBEQUEwRDt3QkFDMUQsMkNBQTJDO3dCQUMzQywwQ0FBMEM7d0JBQzFDLDJDQUEyQzt3QkFDM0MscUZBQXFGO3dCQUNyRixjQUFjLEdBQUcsSUFBSSxDQUFDO3dCQUN0QixlQUFlLEdBQUcsTUFBTSxDQUFDLHdCQUF3QixDQUFDO29CQUNuRCxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsY0FBYyxHQUFHLENBQUMsc0JBQXNCLEdBQUcsd0JBQXdCLENBQUMsQ0FBQztvQkFDdEUsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksV0FBVyxLQUFLLE1BQU0sSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDOUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDO29CQUNuQyxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQztvQkFDNUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDakcsSUFBSSxrQkFBa0IsSUFBSSxjQUFjLElBQUksY0FBYyxJQUFJLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO3dCQUM5RiwyREFBMkQ7d0JBQzNELDJDQUEyQzt3QkFDM0MsMENBQTBDO3dCQUMxQywyQ0FBMkM7d0JBQzNDLHFGQUFxRjt3QkFDckYsZUFBZSxHQUFHLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQztvQkFDbkQsQ0FBQztvQkFDRCxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RHLElBQUksWUFBWSxHQUFHLHNCQUFzQixFQUFFLENBQUM7d0JBQzNDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO29CQUM3RSxDQUFDO29CQUNELGdCQUFnQixHQUFHLFlBQVksR0FBRyxVQUFVLEdBQUcsc0JBQXNCLENBQUM7b0JBQ3RFLHdCQUF3QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixHQUFHLGFBQWEsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztvQkFDckssSUFBSSxrQkFBa0IsRUFBRSxDQUFDO3dCQUN4Qix5QkFBeUI7d0JBQ3pCLE1BQU0sQ0FBQyx3QkFBd0IsR0FBRyxLQUFLLENBQUM7d0JBQ3hDLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxjQUFjLENBQUM7d0JBQ2hELE1BQU0sQ0FBQyx3QkFBd0IsR0FBRyxZQUFZLENBQUM7b0JBQ2hELENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO3dCQUN2QyxNQUFNLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxDQUFDO29CQUNwQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELFNBQVM7UUFDVCxzRUFBc0U7UUFDdEUsZ0dBQWdHO1FBQ2hHLG1EQUFtRDtRQUNuRCwrQ0FBK0M7UUFDL0MsMkRBQTJEO1FBRTNELG1IQUFtSDtRQUNuSCxpSEFBaUg7UUFDakgsa0lBQWtJO1FBQ2xJLHdJQUF3STtRQUN4SSwwSUFBMEk7UUFFMUksTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztRQUV6TixJQUFJLHVCQUF1QixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sdUJBQXVCLEdBQUcsdUJBQXVCLEdBQUcsVUFBVSxDQUFDO1FBQ3JFLHVCQUF1QixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsc0JBQXNCLENBQUMsQ0FBQztRQUV2RixNQUFNLGFBQWEsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUMsNEJBQW9CLENBQUMsNkJBQXFCLENBQUMsQ0FBQztRQUM1RixNQUFNLFdBQVcsR0FBRyxDQUFDLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsWUFBWSxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUV4RyxPQUFPO1lBQ04sYUFBYTtZQUNiLFdBQVc7WUFDWCxZQUFZO1lBQ1osMkJBQTJCO1lBQzNCLGlCQUFpQjtZQUNqQixZQUFZO1lBQ1osaUJBQWlCO1lBQ2pCLHVCQUF1QjtZQUN2Qix3QkFBd0I7WUFDeEIsdUJBQXVCO1lBQ3ZCLHdCQUF3QjtTQUN4QixDQUFDO0lBQ0gsQ0FBQztJQUVNLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBK0IsRUFBRSxHQUFnQztRQUM1RixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUM7UUFDNUQsTUFBTSw4QkFBOEIsR0FBRyxHQUFHLENBQUMsOEJBQThCLENBQUM7UUFDMUUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQztRQUN4QyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUM7UUFFeEMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRywwQ0FBZ0MsQ0FBQztRQUN0RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsaUJBQWlCLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRywwQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM5SCxNQUFNLFFBQVEsR0FBRyxDQUFDLGlCQUFpQixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsaUNBQXVCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFNUcsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsdUNBQTZCLENBQUM7UUFDaEUsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUM7UUFFMUQsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQTBCLENBQUM7UUFDOUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQyxVQUFVLHNDQUE4QixDQUFDLENBQUM7UUFDekcsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRywyQ0FBa0MsQ0FBQztRQUMxRSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDZDQUFtQyxDQUFDO1FBQzVFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLCtCQUFzQixDQUFDO1FBQ2xELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLCtCQUFzQixDQUFDO1FBRWxELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF3QixDQUFDO1FBQ3RELE1BQU0sc0JBQXNCLEdBQUcsU0FBUyxDQUFDLHFCQUFxQixDQUFDO1FBQy9ELE1BQU0sMEJBQTBCLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1FBQy9ELE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztRQUMvQyxNQUFNLHlCQUF5QixHQUFHLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQztRQUVwRSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRywrQkFBc0IsQ0FBQztRQUNsRCxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDRDQUFrQyxLQUFLLE9BQU8sQ0FBQztRQUV4RixJQUFJLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDRDQUFtQyxDQUFDO1FBQzFFLElBQUksT0FBTyxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDdEMsb0JBQW9CLElBQUksRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFFRCxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUN6QixJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUN4RSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDekIsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixnQkFBZ0IsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLDhCQUE4QixDQUFDO1FBQ3BFLENBQUM7UUFFRCxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxlQUFlLEdBQUcsZUFBZSxHQUFHLGdCQUFnQixDQUFDO1FBQ3pELElBQUksZUFBZSxHQUFHLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQztRQUN6RCxJQUFJLFdBQVcsR0FBRyxlQUFlLEdBQUcsb0JBQW9CLENBQUM7UUFFekQsTUFBTSxjQUFjLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixHQUFHLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDO1FBRS9GLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQy9CLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQy9CLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXhCLElBQUksaUJBQWlCLEtBQUssU0FBUyxJQUFJLHNCQUFzQixFQUFFLENBQUM7WUFDL0Qsb0VBQW9FO1lBQ3BFLGtCQUFrQixHQUFHLElBQUksQ0FBQztZQUMxQixrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDM0IsQ0FBQzthQUFNLElBQUksUUFBUSxLQUFLLElBQUksSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEQsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBQzNCLENBQUM7YUFBTSxJQUFJLFFBQVEsS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDakMsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLHdCQUF3QixDQUFDLHFCQUFxQixDQUFDO1lBQ3BFLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLDhCQUE4QixFQUFFLDhCQUE4QjtZQUM5RCxVQUFVLEVBQUUsVUFBVTtZQUN0QixvQkFBb0IsRUFBRSxvQkFBb0I7WUFDMUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ3ZCLGFBQWEsRUFBRSxPQUFPLENBQUMsTUFBTTtZQUM3QixPQUFPLEVBQUUsT0FBTztZQUNoQixzQkFBc0IsRUFBRSxzQkFBc0I7WUFDOUMsYUFBYSxFQUFFLGFBQWE7WUFDNUIsY0FBYyxFQUFFLGNBQWM7WUFDOUIsa0JBQWtCLEVBQUUsa0JBQWtCO1NBQ3RDLEVBQUUsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUU3QyxJQUFJLGFBQWEsQ0FBQyxhQUFhLCtCQUF1QixJQUFJLGFBQWEsQ0FBQyxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0YsdUVBQXVFO1lBQ3ZFLGVBQWUsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDO1lBQzlDLGVBQWUsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDO1lBQzlDLGVBQWUsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDO1lBQzlDLFdBQVcsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDO1FBQzNDLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxjQUFjLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQztRQUVqRSxzRUFBc0U7UUFDdEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksR0FBRyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsR0FBRyw4QkFBOEIsQ0FBQyxDQUFDLENBQUM7UUFFN0gsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEYsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLG9DQUFvQztZQUNwQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDN0MsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzVCLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMzRCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLLEVBQUUsVUFBVTtZQUNqQixNQUFNLEVBQUUsV0FBVztZQUVuQixlQUFlLEVBQUUsZUFBZTtZQUNoQyxnQkFBZ0IsRUFBRSxnQkFBZ0I7WUFDbEMsOEJBQThCLEVBQUUsR0FBRyxDQUFDLDhCQUE4QjtZQUVsRSxlQUFlLEVBQUUsZUFBZTtZQUNoQyxnQkFBZ0IsRUFBRSxnQkFBZ0I7WUFFbEMsZUFBZSxFQUFFLGVBQWU7WUFDaEMsZ0JBQWdCLEVBQUUsb0JBQW9CO1lBRXRDLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLFlBQVksRUFBRSxZQUFZO1lBRTFCLE9BQU8sRUFBRSxhQUFhO1lBRXRCLGNBQWMsRUFBRSxjQUFjO1lBRTlCLGtCQUFrQixFQUFFLGtCQUFrQjtZQUN0QyxrQkFBa0IsRUFBRSxrQkFBa0I7WUFDdEMsY0FBYyxFQUFFLGNBQWM7WUFFOUIsc0JBQXNCLEVBQUUsc0JBQXNCO1lBQzlDLHlCQUF5QixFQUFFLHlCQUF5QjtZQUVwRCxhQUFhLEVBQUU7Z0JBQ2QsR0FBRyxFQUFFLGlCQUFpQjtnQkFDdEIsS0FBSyxFQUFFLHNCQUFzQjtnQkFDN0IsTUFBTSxFQUFFLENBQUMsV0FBVyxHQUFHLENBQUMsR0FBRyxpQkFBaUIsQ0FBQztnQkFDN0MsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosMEJBQTBCO0FBQzFCLE1BQU0sZ0JBQWlCLFNBQVEsZ0JBQTZGO0lBRTNIO1FBQ0MsS0FBSywwQ0FBZ0Msa0JBQWtCLEVBQUUsUUFBUSxFQUNoRTtZQUNDLHlCQUF5QixFQUFFO2dCQUMxQixnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxtTUFBbU0sQ0FBQztvQkFDNU8sR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxnS0FBZ0ssQ0FBQztpQkFDM007Z0JBQ0QsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLFFBQVE7Z0JBQ2pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDRJQUE0SSxDQUFDO2FBQzNMO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFVO1FBQ3pCLE9BQU8sU0FBUyxDQUF3QixLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVlLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBNEI7UUFDaEgsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRywyQ0FBbUMsQ0FBQztRQUM1RSxJQUFJLG9CQUFvQix5Q0FBaUMsRUFBRSxDQUFDO1lBQzNELGdHQUFnRztZQUNoRyw4RUFBOEU7WUFDOUUsT0FBTyxVQUFVLENBQUM7UUFDbkIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBQ0QsWUFBWTtBQUVaLG1CQUFtQjtBQUVuQixNQUFNLENBQU4sSUFBWSxxQkFJWDtBQUpELFdBQVkscUJBQXFCO0lBQ2hDLG9DQUFXLENBQUE7SUFDWCwwQ0FBaUIsQ0FBQTtJQUNqQixrQ0FBUyxDQUFBO0FBQ1YsQ0FBQyxFQUpXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJaEM7QUFxQkQsTUFBTSxlQUFnQixTQUFRLGdCQUF5RjtJQUV0SDtRQUNDLE1BQU0sUUFBUSxHQUEyQixFQUFFLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuRixLQUFLLGtDQUNvQixXQUFXLEVBQUUsUUFBUSxFQUM3QztZQUNDLDBCQUEwQixFQUFFO2dCQUMzQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLENBQUMsTUFBTSxFQUFFLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztnQkFDekYsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwrQkFBK0IsQ0FBQztvQkFDN0UsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxrRUFBa0UsQ0FBQztvQkFDbkgsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxvRkFBb0YsQ0FBQztpQkFDakk7Z0JBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLGtEQUFrRCxDQUFDO2FBQ3hGO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFpQyxDQUFDO1FBQ2hELE9BQU87WUFDTixPQUFPLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLENBQUMsTUFBTSxFQUFFLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2pKLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUE4QkQsTUFBTSxrQkFBbUIsU0FBUSxnQkFBa0c7SUFFbEk7UUFDQyxNQUFNLFFBQVEsR0FBOEIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNySSxLQUFLLHNDQUN1QixjQUFjLEVBQUUsUUFBUSxFQUNuRDtZQUNDLDZCQUE2QixFQUFFO2dCQUM5QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDZFQUE2RSxDQUFDO2FBQ3ZJO1lBQ0Qsa0NBQWtDLEVBQUU7Z0JBQ25DLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsWUFBWTtnQkFDOUIsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUscURBQXFELENBQUM7YUFDcEg7WUFDRCxrQ0FBa0MsRUFBRTtnQkFDbkMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDO2dCQUNsRSxPQUFPLEVBQUUsUUFBUSxDQUFDLFlBQVk7Z0JBQzlCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLDRPQUE0TyxDQUFDO2FBQzNTO1lBQ0Qsc0NBQXNDLEVBQUU7Z0JBQ3ZDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsZ0JBQWdCO2dCQUNsQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSwyRUFBMkUsQ0FBQzthQUM5STtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBb0MsQ0FBQztRQUNuRCxPQUFPO1lBQ04sT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzFELFlBQVksRUFBRSxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRyxZQUFZLEVBQUUsU0FBUyxDQUErRCxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDdk0sZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO1NBQ3JGLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUE4Q0QsTUFBTSxnQkFBaUIsU0FBUSxnQkFBNEY7SUFFMUg7UUFDQyxNQUFNLFFBQVEsR0FBNEIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUM1SCxLQUFLLG9DQUNxQixZQUFZLEVBQUUsUUFBUSxFQUMvQztZQUNDLDJCQUEyQixFQUFFO2dCQUM1QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHdDQUF3QyxDQUFDO2dCQUN4RixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxDQUFDO2dCQUMxRCx3QkFBd0IsRUFBRTtvQkFDekIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx5QkFBeUIsQ0FBQztvQkFDL0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSw4REFBOEQsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztvQkFDcEssR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSw2REFBNkQsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztvQkFDcEssR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSwwQkFBMEIsQ0FBQztpQkFDakU7YUFDRDtZQUNELDRCQUE0QixFQUFFO2dCQUM3QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVE7Z0JBQzFCLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsOEpBQThKLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxDQUFDO2FBQ3RQO1lBQ0QsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsVUFBVTtnQkFDNUIsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx3RkFBd0YsRUFBRSx1QkFBdUIsQ0FBQzthQUM3SztZQUNELDJCQUEyQixFQUFFO2dCQUM1QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDJEQUEyRCxDQUFDO2FBQzVHO1lBQ0QsaUNBQWlDLEVBQUU7Z0JBQ2xDLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYTtnQkFDL0IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxpSUFBaUksQ0FBQzthQUNoTTtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBa0MsQ0FBQztRQUNqRCxJQUFJLE9BQU8sS0FBSyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzlDLENBQUM7UUFDRCxPQUFPO1lBQ04sT0FBTyxFQUFFLFNBQVMsQ0FBd0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUN6SyxRQUFRLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUM7WUFDeEYsVUFBVSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQ3JGLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUMxRCxhQUFhLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7U0FDM0gsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFWiw4QkFBOEI7QUFFOUIsTUFBTSwwQkFBMkIsU0FBUSxnQkFBNEU7SUFFcEg7UUFDQyxLQUFLLDZDQUFvQyxzQkFBc0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQVU7UUFDekIsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEUsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMscUNBQXFDO1FBQ3hELENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RSxDQUFDO0lBQ0YsQ0FBQztJQUVlLE9BQU8sQ0FBQyxHQUEwQixFQUFFLE9BQStCLEVBQUUsS0FBYTtRQUNqRyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLHFDQUFxQztZQUNyQyxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNySCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFWixvQkFBb0I7QUFFcEIsTUFBTSxnQkFBaUIsU0FBUSxpQkFBMEM7SUFFeEU7UUFDQyxLQUFLLG1DQUNxQixZQUFZLEVBQ3JDLG9CQUFvQixDQUFDLFVBQVUsRUFDL0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsRUFDdkMsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSx1UEFBdVAsQ0FBQyxFQUFFLENBQzVTLENBQUM7SUFDSCxDQUFDO0lBRWUsT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0IsRUFBRSxLQUFhO1FBQ2pHLDJEQUEyRDtRQUMzRCxpRUFBaUU7UUFDakUsdUNBQXVDO1FBQ3ZDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7SUFDaEMsQ0FBQztDQUNEO0FBa0ZELE1BQU0sYUFBYyxTQUFRLGdCQUFtRjtJQUU5RztRQUNDLE1BQU0sUUFBUSxHQUF5QjtZQUN0QyxPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxjQUFjO1lBQ3BCLElBQUksRUFBRSxPQUFPO1lBQ2IsVUFBVSxFQUFFLFdBQVc7WUFDdkIsUUFBUSxFQUFFLEtBQUs7WUFDZixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsS0FBSyxFQUFFLENBQUM7WUFDUix3QkFBd0IsRUFBRSxJQUFJO1lBQzlCLHNCQUFzQixFQUFFLElBQUk7WUFDNUIsc0JBQXNCLEVBQUUsZ0RBQWdEO1lBQ3hFLHFCQUFxQixFQUFFLENBQUM7WUFDeEIsMEJBQTBCLEVBQUUsQ0FBQztTQUM3QixDQUFDO1FBQ0YsS0FBSyxnQ0FDa0IsU0FBUyxFQUFFLFFBQVEsRUFDekM7WUFDQyx3QkFBd0IsRUFBRTtnQkFDekIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx3Q0FBd0MsQ0FBQzthQUN0RjtZQUNELHlCQUF5QixFQUFFO2dCQUMxQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVE7Z0JBQzFCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHVEQUF1RCxDQUFDO2FBQ3RHO1lBQ0QscUJBQXFCLEVBQUU7Z0JBQ3RCLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDO2dCQUNyQyxnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwwRUFBMEUsQ0FBQztvQkFDckgsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxrR0FBa0csQ0FBQztvQkFDckksR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx5RkFBeUYsQ0FBQztpQkFDM0g7Z0JBQ0QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUN0QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsbUNBQW1DLENBQUM7YUFDOUU7WUFDRCxxQkFBcUIsRUFBRTtnQkFDdEIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztnQkFDdkIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUN0QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZ0RBQWdELENBQUM7YUFDM0Y7WUFDRCwyQkFBMkIsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQztnQkFDN0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUM1QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0Q0FBNEMsQ0FBQzthQUM3RjtZQUNELHNCQUFzQixFQUFFO2dCQUN2QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3ZCLE9BQU8sRUFBRSxDQUFDO2dCQUNWLE9BQU8sRUFBRSxDQUFDO2dCQUNWLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxtREFBbUQsQ0FBQzthQUMvRjtZQUNELGlDQUFpQyxFQUFFO2dCQUNsQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGdCQUFnQjtnQkFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsb0VBQW9FLENBQUM7YUFDM0g7WUFDRCwwQkFBMEIsRUFBRTtnQkFDM0IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTO2dCQUMzQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwrRUFBK0UsQ0FBQzthQUMvSDtZQUNELHlDQUF5QyxFQUFFO2dCQUMxQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLHdCQUF3QjtnQkFDMUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUsNkVBQTZFLENBQUM7YUFDNUk7WUFDRCx1Q0FBdUMsRUFBRTtnQkFDeEMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0I7Z0JBQ3hDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLDhFQUE4RSxDQUFDO2FBQzNJO1lBQ0QsdUNBQXVDLEVBQUU7Z0JBQ3hDLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCO2dCQUN4QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxpVkFBaVYsQ0FBQzthQUM5WTtZQUNELHNDQUFzQyxFQUFFO2dCQUN2QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLHFCQUFxQjtnQkFDdkMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsMkRBQTJELENBQUM7YUFDdkg7WUFDRCwyQ0FBMkMsRUFBRTtnQkFDNUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQywwQkFBMEI7Z0JBQzVDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLDhJQUE4SSxDQUFDO2FBQy9NO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUErQixDQUFDO1FBRTlDLHFDQUFxQztRQUNyQyxJQUFJLHNCQUFzQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUM7UUFDdEUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLHNCQUFzQixDQUFDO1FBQ2pELElBQUksT0FBTyxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDO2dCQUNKLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDNUIsc0JBQXNCLEdBQUcsVUFBVSxDQUFDO1lBQ3JDLENBQUM7WUFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ1osQ0FBQztRQUVELE9BQU87WUFDTixPQUFPLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7WUFDMUQsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1lBQzdELElBQUksRUFBRSxTQUFTLENBQWtDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3JILElBQUksRUFBRSxTQUFTLENBQW1CLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDeEYsVUFBVSxFQUFFLFNBQVMsQ0FBeUIsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN0SCxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUM7WUFDckYsS0FBSyxFQUFFLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2RCxTQUFTLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUM7WUFDN0Ysd0JBQXdCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLHdCQUF3QixDQUFDO1lBQzdHLHNCQUFzQixFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQztZQUN2RyxzQkFBc0IsRUFBRSxzQkFBc0I7WUFDOUMscUJBQXFCLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0gsMEJBQTBCLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDM0ksQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFWiw2QkFBNkI7QUFFN0IsU0FBUyw4QkFBOEIsQ0FBQyxtQkFBc0M7SUFDN0UsSUFBSSxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN2QyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDakIsQ0FBQztBQXlCRCxNQUFNLGFBQWMsU0FBUSxnQkFBMkY7SUFFdEg7UUFDQyxLQUFLLGdDQUNrQixTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDdEQ7WUFDQyxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLHFGQUFxRixDQUFDO2FBQy9IO1lBQ0QsdUJBQXVCLEVBQUU7Z0JBQ3hCLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxDQUFDO2dCQUNWLE9BQU8sRUFBRSxDQUFDO2dCQUNWLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHVGQUF1RixDQUFDO2FBQ3BJO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUErQixDQUFDO1FBRTlDLE9BQU87WUFDTixHQUFHLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDO1lBQ3RELE1BQU0sRUFBRSxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDNUQsQ0FBQztJQUNILENBQUM7Q0FDRDtBQTBCRCxNQUFNLG9CQUFxQixTQUFRLGdCQUF3RztJQUUxSTtRQUNDLE1BQU0sUUFBUSxHQUFpQztZQUM5QyxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssRUFBRSxJQUFJO1NBQ1gsQ0FBQztRQUNGLEtBQUssdUNBQ3lCLGdCQUFnQixFQUFFLFFBQVEsRUFDdkQ7WUFDQywrQkFBK0IsRUFBRTtnQkFDaEMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx1RkFBdUYsQ0FBQzthQUM1STtZQUNELDZCQUE2QixFQUFFO2dCQUM5QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3ZCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLCtGQUErRixDQUFDO2FBQ2xKO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFxQyxDQUFDO1FBQ3BELE9BQU87WUFDTixPQUFPLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7WUFDMUQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1NBQ3BELENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosb0JBQW9CO0FBRXBCLE1BQU0sZ0JBQWlCLFNBQVEsb0JBQXFEO0lBRW5GO1FBQ0MsS0FBSyxtQ0FBeUIsQ0FBQztJQUNoQyxDQUFDO0lBRU0sT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0IsRUFBRSxDQUFTO1FBQ3BGLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN2QixDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosU0FBUztBQUVULE1BQU0saUJBQWtCLFNBQVEsZ0JBQWtGO0lBQ2pIO1FBQ0MsS0FBSyxvQ0FBMkIsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTSxRQUFRLENBQUMsS0FBVTtRQUN6QixJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztDQUNEO0FBc0JELE1BQU0sc0JBQXVCLFNBQVEsZ0JBQW9IO0lBSXhKO1FBQ0MsTUFBTSxRQUFRLEdBQW9DO1lBQ2pELEtBQUssRUFBRSxJQUFJO1lBQ1gsUUFBUSxFQUFFLEtBQUs7WUFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLDRCQUE0QjtTQUMxQyxDQUFDO1FBQ0YsTUFBTSxLQUFLLEdBQWtCO1lBQzVCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUNuQjtnQkFDQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztnQkFDN0IsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxrREFBa0QsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLHNDQUFzQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQzthQUNqTjtTQUNELENBQUM7UUFDRixLQUFLLHlDQUFnQyxrQkFBa0IsRUFBRSxRQUFRLEVBQUU7WUFDbEUsSUFBSSxFQUFFLFFBQVE7WUFDZCxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUU7b0JBQ1IsS0FBSyxFQUFFLEtBQUs7b0JBQ1osT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO29CQUN6QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSwwQ0FBMEMsQ0FBQztpQkFDakc7Z0JBQ0QsUUFBUSxFQUFFO29CQUNULEtBQUssRUFBRSxLQUFLO29CQUNaLE9BQU8sRUFBRSxRQUFRLENBQUMsUUFBUTtvQkFDMUIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsMkNBQTJDLENBQUM7aUJBQ25HO2dCQUNELEtBQUssRUFBRTtvQkFDTixLQUFLLEVBQUUsS0FBSztvQkFDWixPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUs7b0JBQ3ZCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDJEQUEyRCxDQUFDO2lCQUNoSDthQUNEO1lBQ0QsT0FBTyxFQUFFLFFBQVE7WUFDakIsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSwwVUFBMFUsRUFBRSx1Q0FBdUMsQ0FBQztTQUMxYSxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQztJQUM5QixDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQVU7UUFDekIsSUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoQyx3QkFBd0I7WUFDeEIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNuQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUMxRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxpQkFBaUI7WUFDakIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBOEIsS0FBTSxDQUFDO1FBQ3ZFLE1BQU0sYUFBYSxHQUE0QixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkUsSUFBSSxjQUFxQyxDQUFDO1FBQzFDLElBQUksaUJBQXdDLENBQUM7UUFDN0MsSUFBSSxnQkFBdUMsQ0FBQztRQUU1QyxJQUFJLE9BQU8sS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZDLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYyxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUNELElBQUksT0FBTyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM3QyxDQUFDO2FBQU0sQ0FBQztZQUNQLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUNELElBQUksT0FBTyxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUMzQyxDQUFDO2FBQU0sQ0FBQztZQUNQLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUNELE9BQU87WUFDTixLQUFLLEVBQUUsY0FBYztZQUNyQixRQUFRLEVBQUUsaUJBQWlCO1lBQzNCLE9BQU8sRUFBRSxnQkFBZ0I7U0FDekIsQ0FBQztJQUNILENBQUM7Q0FDRDtBQVFELE1BQU0sQ0FBTixJQUFrQixxQkFNakI7QUFORCxXQUFrQixxQkFBcUI7SUFDdEMsK0RBQU8sQ0FBQTtJQUNQLDZEQUFNLENBQUE7SUFDTix5RUFBWSxDQUFBO0lBQ1oseUVBQVksQ0FBQTtJQUNaLHFFQUFVLENBQUE7QUFDWCxDQUFDLEVBTmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFNdEM7QUFPRCxNQUFNLDZCQUE4QixTQUFRLGdCQUFtRztJQUU5STtRQUNDLEtBQUssb0NBQ3NCLGFBQWEsRUFBRSxFQUFFLFVBQVUsa0NBQTBCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUNqRztZQUNDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDO1lBQzNDLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGdDQUFnQyxDQUFDO2dCQUNqRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLCtDQUErQyxDQUFDO2dCQUMvRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG9FQUFvRSxDQUFDO2dCQUMxRyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDJDQUEyQyxDQUFDO2FBQ2pGO1lBQ0QsT0FBTyxFQUFFLElBQUk7WUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsdUNBQXVDLENBQUM7U0FDakYsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxXQUFnQjtRQUMvQixJQUFJLFVBQVUsR0FBMEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7UUFDckUsSUFBSSxRQUFRLEdBQTRDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBRW5GLElBQUksT0FBTyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDeEMsSUFBSSxPQUFPLFdBQVcsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDdkMsVUFBVSx1Q0FBK0IsQ0FBQztnQkFDMUMsUUFBUSxHQUFHLFdBQVcsQ0FBQztZQUN4QixDQUFDO2lCQUFNLElBQUksV0FBVyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUN2QyxVQUFVLHlDQUFpQyxDQUFDO1lBQzdDLENBQUM7aUJBQU0sSUFBSSxXQUFXLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ3ZDLFVBQVUseUNBQWlDLENBQUM7WUFDN0MsQ0FBQztpQkFBTSxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDakMsVUFBVSxtQ0FBMkIsQ0FBQztZQUN2QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxvQ0FBNEIsQ0FBQztZQUN4QyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixVQUFVO1lBQ1YsUUFBUTtTQUNSLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVoscUNBQXFDO0FBRXJDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUFDLE9BQStCO0lBQzFFLE1BQU0sMkJBQTJCLEdBQUcsT0FBTyxDQUFDLEdBQUcsb0RBQTBDLENBQUM7SUFDMUYsSUFBSSwyQkFBMkIsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUNoRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDO0lBQzNDLENBQUM7SUFDRCxPQUFPLDJCQUEyQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDNUQsQ0FBQztBQVdELE1BQU0sWUFBYSxTQUFRLGdCQUFnRjtJQUUxRztRQUNDLE1BQU0sUUFBUSxHQUFtQixFQUFFLENBQUM7UUFDcEMsTUFBTSxZQUFZLEdBQWdCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsd0VBQXdFLENBQUMsRUFBRSxDQUFDO1FBQ3pLLEtBQUssZ0NBQ2lCLFFBQVEsRUFBRSxRQUFRLEVBQ3ZDO1lBQ0MsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFO29CQUNOLFlBQVk7b0JBQ1o7d0JBQ0MsSUFBSSxFQUFFOzRCQUNMLFFBQVE7eUJBQ1I7d0JBQ0QsVUFBVSxFQUFFOzRCQUNYLE1BQU0sRUFBRSxZQUFZOzRCQUNwQixLQUFLLEVBQUU7Z0NBQ04sSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLDZCQUE2QixDQUFDO2dDQUN4RSxNQUFNLEVBQUUsV0FBVzs2QkFDbkI7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtZQUNELE9BQU8sRUFBRSxRQUFRO1lBQ2pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSx3SkFBd0osQ0FBQztTQUM3TCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQVU7UUFDekIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQztZQUNsQyxLQUFLLE1BQU0sUUFBUSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUM5QixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNYLE1BQU0sRUFBRSxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQzt3QkFDekQsS0FBSyxFQUFFLElBQUk7cUJBQ1gsQ0FBQyxDQUFDO2dCQUNKLENBQUM7cUJBQU0sSUFBSSxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3JELE1BQU0sT0FBTyxHQUFHLFFBQXdCLENBQUM7b0JBQ3pDLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsTUFBTSxFQUFFLGVBQWUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQzt3QkFDL0QsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO3FCQUNwQixDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFWixrQkFBa0I7QUFFbEI7O0dBRUc7QUFDSCxNQUFNLGVBQWdCLFNBQVEsZ0JBQXdHO0lBQ3JJO1FBQ0MsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBRTNCLEtBQUssd0NBQzBCLGlCQUFpQixFQUFFLFFBQVEsQ0FDekQsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsT0FBTyxNQUF5QixDQUFDO0lBQ2xDLENBQUM7Q0FDRDtBQTJHRCxTQUFTLDhCQUE4QixDQUFDLFVBQThCLEVBQUUsWUFBaUM7SUFDeEcsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBQ0QsUUFBUSxVQUFVLEVBQUUsQ0FBQztRQUNwQixLQUFLLFFBQVEsQ0FBQyxDQUFDLDBDQUFrQztRQUNqRCxLQUFLLFNBQVMsQ0FBQyxDQUFDLDJDQUFtQztRQUNuRCxPQUFPLENBQUMsQ0FBQyx3Q0FBZ0M7SUFDMUMsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLGVBQWdCLFNBQVEsZ0JBQWlHO0lBRTlIO1FBQ0MsTUFBTSxRQUFRLEdBQW1DO1lBQ2hELFFBQVEsa0NBQTBCO1lBQ2xDLFVBQVUsa0NBQTBCO1lBQ3BDLFNBQVMsRUFBRSxFQUFFO1lBQ2IsVUFBVSxFQUFFLElBQUk7WUFDaEIsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLHVCQUF1QixFQUFFLEVBQUU7WUFDM0Isb0JBQW9CLEVBQUUsRUFBRTtZQUN4QixxQkFBcUIsRUFBRSxFQUFFO1lBQ3pCLGtCQUFrQixFQUFFLEVBQUU7WUFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0Qix1QkFBdUIsRUFBRSxJQUFJO1lBQzdCLFlBQVksRUFBRSxLQUFLO1lBQ25CLHdDQUF3QyxFQUFFLEtBQUs7U0FDL0MsQ0FBQztRQUNGLEtBQUssbUNBQ29CLFdBQVcsRUFBRSxRQUFRLEVBQzdDO1lBQ0MsMkJBQTJCLEVBQUU7Z0JBQzVCLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDO2dCQUNuQyxnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSw2REFBNkQsQ0FBQztvQkFDdEcsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxnREFBZ0QsQ0FBQztvQkFDNUYsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwrQ0FBK0MsQ0FBQztpQkFDdkY7Z0JBQ0QsT0FBTyxFQUFFLE1BQU07Z0JBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsb0RBQW9ELENBQUM7YUFDckc7WUFDRCw2QkFBNkIsRUFBRTtnQkFDOUIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUM7Z0JBQ25DLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLCtEQUErRCxDQUFDO29CQUMxRyxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGtEQUFrRCxDQUFDO29CQUNoRyxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGlEQUFpRCxDQUFDO2lCQUMzRjtnQkFDRCxPQUFPLEVBQUUsTUFBTTtnQkFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxzREFBc0QsQ0FBQzthQUN6RztZQUNELHdDQUF3QyxFQUFFO2dCQUN6QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLHFCQUFxQjtnQkFDdkMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsc0NBQXNDLENBQUM7YUFDcEc7WUFDRCwwQ0FBMEMsRUFBRTtnQkFDM0MsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUI7Z0JBQ3pDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHlDQUF5QyxDQUFDO2FBQ3pHO1lBQ0QsK0JBQStCLEVBQUU7Z0JBQ2hDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsWUFBWTtnQkFDOUIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsbUVBQW1FLENBQUM7YUFDeEg7WUFDRCwyREFBMkQsRUFBRTtnQkFDNUQsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyx3Q0FBd0M7Z0JBQzFELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9EQUFvRCxFQUFFLHdGQUF3RixDQUFDO2FBQ3pLO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFpQyxDQUFDO1FBQ2hELE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUksTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4SSxPQUFPO1lBQ04sU0FBUyxFQUFFLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDO1lBQzVGLFFBQVEsRUFBRSw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO1lBQ3BGLFVBQVUsRUFBRSw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQzFGLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNuRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7WUFDeEYsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDO1lBQzlGLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQztZQUNyRix1QkFBdUIsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUM7WUFDMUcsdUJBQXVCLEVBQUUsdUJBQXVCO1lBQ2hELG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLENBQUMsRUFBRSxJQUFJLENBQUM7WUFDOUcscUJBQXFCLEVBQUUscUJBQXFCO1lBQzVDLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxJQUFJLENBQUM7WUFDeEcsWUFBWSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3pFLHdDQUF3QyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyx3Q0FBd0MsQ0FBQztTQUM3SixDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBUUQ7O0VBRUU7QUFDRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBeUIsc0JBQXNCLENBQUM7QUFnRGpGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUc7SUFDekMsaUJBQWlCLEVBQUUsMkNBQTJDO0lBQzlELG1CQUFtQixFQUFFLDZDQUE2QztJQUNsRSxhQUFhLEVBQUUsdUNBQXVDO0lBQ3RELG1CQUFtQixFQUFFLDZDQUE2QztJQUNsRSxlQUFlLEVBQUUseUNBQXlDO0lBQzFELGNBQWMsRUFBRSx3Q0FBd0M7SUFDeEQsY0FBYyxFQUFFLHdDQUF3QztDQUN4RCxDQUFDO0FBRUYsTUFBTSxnQkFBaUIsU0FBUSxnQkFBNkc7SUFDM0k7UUFDQyxNQUFNLFFBQVEsR0FBb0M7WUFDakQsYUFBYSxFQUFFLG9CQUFvQjtZQUNuQyxtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLG9CQUFvQjtZQUNyQyxjQUFjLEVBQUUsSUFBSTtZQUNwQixpQkFBaUIsRUFBRSxFQUFFO1lBQ3JCLGNBQWMsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUM1QyxDQUFDO1FBRUYsS0FBSyw2Q0FDOEIsa0JBQWtCLEVBQUUsUUFBUSxFQUM5RDtZQUNDLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQzNDLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO2dCQUMzQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixDQUFDO2dCQUN6QyxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWE7Z0JBQy9CLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLDRLQUE0SyxDQUFDO2FBQ3pPO1lBQ0QsQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO2dCQUNqRCxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUI7Z0JBQ3JDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLDhGQUE4RixDQUFDO2FBQ2pLO1lBQ0QsQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO2dCQUNqRCxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUI7Z0JBQ3JDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLHdKQUF3SixDQUFDO2FBQzNOO1lBQ0QsQ0FBQywwQkFBMEIsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDN0MsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Z0JBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsb0JBQW9CLENBQUM7Z0JBQ3pDLE9BQU8sRUFBRSxRQUFRLENBQUMsZUFBZTtnQkFDakMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUseUZBQXlGLENBQUM7YUFDeEo7WUFDRCxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUM1QyxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQztnQkFDM0IsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsQ0FBQztnQkFDekMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxjQUFjO2dCQUNoQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSx3RkFBd0YsQ0FBQzthQUN0SjtZQUNELENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDL0MsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsaUJBQWlCO2dCQUNuQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSw0REFBNEQsQ0FBQztnQkFDN0gsb0JBQW9CLEVBQUU7b0JBQ3JCLElBQUksRUFBRSxTQUFTO2lCQUNmO2FBQ0Q7WUFDRCxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUM1QyxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2Qsb0JBQW9CLEVBQUU7b0JBQ3JCLElBQUksRUFBRSxTQUFTO2lCQUNmO2dCQUNELE9BQU8sRUFBRSxRQUFRLENBQUMsY0FBYztnQkFDaEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsa0ZBQWtGLENBQUM7YUFDaEo7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRWUsV0FBVyxDQUFDLEtBQStELEVBQUUsTUFBb0Q7UUFDaEosSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLElBQUksTUFBTSxDQUFDLGlCQUFpQixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3ZDLHFDQUFxQztZQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDeEUsS0FBSyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ2xFLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxjQUFjLElBQUksS0FBSyxFQUFFLENBQUM7WUFDcEMsa0NBQWtDO1lBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xFLEtBQUssR0FBRyxFQUFFLEdBQUcsS0FBSyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzVELFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFrQyxDQUFDO1FBQ2pELE9BQU87WUFDTixhQUFhLEVBQUUsWUFBWSxDQUFpQyxLQUFLLENBQUMsYUFBYSxFQUFFLG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQzNJLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQztZQUM5RixtQkFBbUIsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUM7WUFDOUYsZUFBZSxFQUFFLFlBQVksQ0FBaUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUMvSSxjQUFjLEVBQUUsWUFBWSxDQUFpQyxLQUFLLENBQUMsY0FBYyxFQUFFLG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQzdJLGlCQUFpQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztZQUN6RyxjQUFjLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUM7U0FDaEcsQ0FBQztJQUNILENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxHQUFZLEVBQUUsWUFBa0M7UUFDMUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdkMsT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUF5QixFQUFFLENBQUM7UUFDeEMsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUNwQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEO0FBZ0VEOztHQUVHO0FBQ0gsTUFBTSxtQkFBb0IsU0FBUSxnQkFBaUc7SUFDbEk7UUFDQyxNQUFNLFFBQVEsR0FBaUM7WUFDOUMsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsY0FBYztZQUNwQixXQUFXLEVBQUUsU0FBUztZQUN0QixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLHlCQUF5QixFQUFFLElBQUk7WUFDL0IsS0FBSyxFQUFFO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGFBQWEsRUFBRSxLQUFLO2dCQUNwQixnQkFBZ0IsRUFBRSxNQUFNO2dCQUN4QixpQkFBaUIsRUFBRSxRQUFRO2dCQUMzQixxQkFBcUIsRUFBRSxJQUFJO2FBQzNCO1NBQ0QsQ0FBQztRQUVGLEtBQUssc0NBQ3dCLGVBQWUsRUFBRSxRQUFRLEVBQ3JEO1lBQ0MsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsMEVBQTBFLENBQUM7YUFDOUg7WUFDRCxrQ0FBa0MsRUFBRTtnQkFDbkMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxXQUFXO2dCQUM3QixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQztnQkFDcEMsZ0JBQWdCLEVBQUU7b0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUsNEVBQTRFLENBQUM7b0JBQzlILEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsNkVBQTZFLENBQUM7b0JBQ2hJLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsMkNBQTJDLENBQUM7aUJBQzVGO2dCQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHNEQUFzRCxDQUFDO2FBQzlHO1lBQ0QsZ0RBQWdELEVBQUU7Z0JBQ2pELElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMseUJBQXlCO2dCQUMzQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxvRkFBb0YsQ0FBQzthQUMxSjtZQUNELDBDQUEwQyxFQUFFO2dCQUMzQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLG1CQUFtQjtnQkFDckMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsb0tBQW9LLENBQUM7YUFDcE87WUFDRCxpQ0FBaUMsRUFBRTtnQkFDbEMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUM1QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxxREFBcUQsQ0FBQzthQUM1RztZQUNELDhDQUE4QyxFQUFFO2dCQUMvQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxpQkFBaUI7Z0JBQ3pDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLG9HQUFvRyxDQUFDO2dCQUN4SyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQztnQkFDdkMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUM7YUFDN0I7WUFDRCw2Q0FBNkMsRUFBRTtnQkFDOUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCO2dCQUN4QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxnRUFBZ0UsQ0FBQztnQkFDbkksSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztnQkFDdkIsZ0JBQWdCLEVBQUU7b0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0RBQWtELEVBQUUseUdBQXlHLENBQUM7b0JBQzNLLEdBQUcsQ0FBQyxRQUFRLENBQUMsbURBQW1ELEVBQUUsaUZBQWlGLENBQUM7aUJBQ3BKO2dCQUNELElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDO2FBQzdCO1lBQ0QsMENBQTBDLEVBQUU7Z0JBQzNDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWE7Z0JBQ3JDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLDZFQUE2RSxDQUFDO2dCQUM3SSxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQzthQUM3QjtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBK0IsQ0FBQztRQUM5QyxPQUFPO1lBQ04sT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzFELElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDMUYsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN4RyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUM7WUFDOUYsVUFBVSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQ25FLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNyRix5QkFBeUIsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUM7WUFDaEgsS0FBSyxFQUFFO2dCQUNOLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO2dCQUN2RSxhQUFhLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztnQkFDekYsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMxSSxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdkgscUJBQXFCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUM7YUFDakg7U0FDRCxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBdUJEOztHQUVHO0FBQ0gsTUFBTSx1QkFBd0IsU0FBUSxnQkFBK0g7SUFDcEs7UUFDQyxNQUFNLFFBQVEsR0FBMkM7WUFDeEQsT0FBTyxFQUFFLHFCQUFxQixDQUFDLDhCQUE4QixDQUFDLE9BQU87WUFDckUsa0NBQWtDLEVBQUUscUJBQXFCLENBQUMsOEJBQThCLENBQUMsa0NBQWtDO1NBQzNILENBQUM7UUFFRixLQUFLLGdEQUNrQyx5QkFBeUIsRUFBRSxRQUFRLEVBQ3pFO1lBQ0Msd0NBQXdDLEVBQUU7Z0JBQ3pDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxpSEFBaUgsRUFBRSxtQ0FBbUMsQ0FBQzthQUM1TjtZQUNELG1FQUFtRSxFQUFFO2dCQUNwRSxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGtDQUFrQztnQkFDcEQsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNERBQTRELEVBQUUsd0VBQXdFLENBQUM7YUFDaks7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRU0sUUFBUSxDQUFDLE1BQVc7UUFDMUIsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDMUIsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQXlDLENBQUM7UUFDeEQsT0FBTztZQUNOLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUMxRCxrQ0FBa0MsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsa0NBQWtDLENBQUM7U0FDM0ksQ0FBQztJQUNILENBQUM7Q0FDRDtBQTJDRDs7R0FFRztBQUNILE1BQU0sWUFBYSxTQUFRLGdCQUE0RTtJQUN0RztRQUNDLE1BQU0sUUFBUSxHQUEwQjtZQUN2QyxZQUFZLEVBQUUsS0FBSztZQUNuQixzQkFBc0IsRUFBRSxRQUFRO1lBQ2hDLDBCQUEwQixFQUFFLElBQUk7WUFFaEMsV0FBVyxFQUFFLElBQUk7WUFDakIsMEJBQTBCLEVBQUUsSUFBSTtTQUNoQyxDQUFDO1FBRUYsS0FBSywrQkFDaUIsUUFBUSxFQUFFLFFBQVEsRUFDdkM7WUFDQyw0QkFBNEIsRUFBRTtnQkFDN0IsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQztnQkFDM0IsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUM7Z0JBQzdCLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDhCQUE4QixDQUFDO29CQUMvRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLCtEQUErRCxDQUFDO29CQUNsSCxHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLCtCQUErQixDQUFDO2lCQUNqRjtnQkFDRCxPQUFPLEVBQUUsUUFBUSxDQUFDLFlBQVk7Z0JBQzlCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDBEQUEwRCxDQUFDO2FBQ25IO1lBQ0Qsc0NBQXNDLEVBQUU7Z0JBQ3ZDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Z0JBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO2dCQUM3QixnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsRUFBRSx3RUFBd0UsQ0FBQztvQkFDbkksR0FBRyxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSw2REFBNkQsQ0FBQztvQkFDMUgsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSwwQ0FBMEMsQ0FBQztpQkFDdEc7Z0JBQ0QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0I7Z0JBQ3hDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLHFFQUFxRSxDQUFDO2FBQ3hJO1lBQ0QsMENBQTBDLEVBQUU7Z0JBQzNDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsMEJBQTBCO2dCQUM1QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSx1RUFBdUUsQ0FBQzthQUM5STtZQUNELDJCQUEyQixFQUFFO2dCQUM1QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLFdBQVc7Z0JBQzdCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDBEQUEwRCxDQUFDO2FBQ2xIO1lBQ0QsMENBQTBDLEVBQUU7Z0JBQzNDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Z0JBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO2dCQUM3QixnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxxQ0FBcUMsQ0FBQztvQkFDcEcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSw0RUFBNEUsQ0FBQztvQkFDN0ksR0FBRyxDQUFDLFFBQVEsQ0FBQyxnREFBZ0QsRUFBRSwyQ0FBMkMsQ0FBQztpQkFDM0c7Z0JBQ0QsT0FBTyxFQUFFLFFBQVEsQ0FBQywwQkFBMEI7Z0JBRTVDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLHVFQUF1RSxDQUFDO2FBQzlJO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFXO1FBQzFCLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUF3QixDQUFDO1FBQ3ZDLE9BQU87WUFDTixZQUFZLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZHLHNCQUFzQixFQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDckksMEJBQTBCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDO1lBRW5ILFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUN0RSwwQkFBMEIsRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ2pKLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLFlBQVksQ0FBNkIsS0FBYyxFQUFFLFlBQWUsRUFBRSxhQUFrQjtJQUNwRyxNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQVksQ0FBQyxDQUFDO0lBQ2hELElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDaEIsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUNELE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFpTEQsTUFBTSxhQUFjLFNBQVEsZ0JBQStFO0lBRTFHO1FBQ0MsTUFBTSxRQUFRLEdBQTJCO1lBQ3hDLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLCtCQUErQixFQUFFLEtBQUs7WUFDdEMsYUFBYSxFQUFFLEtBQUs7WUFDcEIsc0JBQXNCLEVBQUUsS0FBSztZQUM3QixhQUFhLEVBQUUsUUFBUTtZQUN2QixTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxLQUFLO1lBQ3BCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsV0FBVyxFQUFFLGNBQWM7WUFDM0IsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixXQUFXLEVBQUUsSUFBSTtZQUNqQixhQUFhLEVBQUUsSUFBSTtZQUNuQixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLG9CQUFvQixFQUFFLElBQUk7WUFDMUIsVUFBVSxFQUFFLElBQUk7WUFDaEIsYUFBYSxFQUFFLElBQUk7WUFDbkIsV0FBVyxFQUFFLElBQUk7WUFDakIsV0FBVyxFQUFFLElBQUk7WUFDakIsY0FBYyxFQUFFLElBQUk7WUFDcEIsV0FBVyxFQUFFLElBQUk7WUFDakIsY0FBYyxFQUFFLElBQUk7WUFDcEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsYUFBYSxFQUFFLElBQUk7WUFDbkIsU0FBUyxFQUFFLElBQUk7WUFDZixVQUFVLEVBQUUsSUFBSTtZQUNoQixhQUFhLEVBQUUsSUFBSTtZQUNuQixTQUFTLEVBQUUsSUFBSTtZQUNmLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsVUFBVSxFQUFFLElBQUk7WUFDaEIsU0FBUyxFQUFFLElBQUk7WUFDZixjQUFjLEVBQUUsSUFBSTtZQUNwQixXQUFXLEVBQUUsSUFBSTtZQUNqQixrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsVUFBVSxFQUFFLElBQUk7U0FDaEIsQ0FBQztRQUNGLEtBQUssaUNBQ2tCLFNBQVMsRUFBRSxRQUFRLEVBQ3pDO1lBQ0MsMkJBQTJCLEVBQUU7Z0JBQzVCLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUM7Z0JBQzNCLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlFQUFpRSxDQUFDO29CQUM1RyxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDJEQUEyRCxDQUFDO2lCQUN2RztnQkFDRCxPQUFPLEVBQUUsUUFBUSxDQUFDLFVBQVU7Z0JBQzVCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG1JQUFtSSxDQUFDO2FBQ3BMO1lBQ0QsK0JBQStCLEVBQUU7Z0JBQ2hDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsY0FBYztnQkFDaEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsOEVBQThFLENBQUM7YUFDbkk7WUFDRCw4QkFBOEIsRUFBRTtnQkFDL0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhO2dCQUMvQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx3RUFBd0UsQ0FBQzthQUM1SDtZQUNELHVDQUF1QyxFQUFFO2dCQUN4QyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLHNCQUFzQjtnQkFDeEMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSwySUFBMkksQ0FBQzthQUNoTjtZQUNELDhCQUE4QixFQUFFO2dCQUMvQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixDQUFDO2dCQUN4RSxnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx3RUFBd0UsQ0FBQztvQkFDbkgsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx1RUFBdUUsQ0FBQztvQkFDakgsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxpRkFBaUYsQ0FBQztvQkFDMUksR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxvRUFBb0UsQ0FBQztpQkFDNUg7Z0JBQ0QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhO2dCQUMvQixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLDJPQUEyTyxFQUFFLDZCQUE2QixFQUFFLHVDQUF1QyxDQUFDO2FBQy9XO1lBQ0QsZ0RBQWdELEVBQUU7Z0JBQ2pELElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsK0JBQStCO2dCQUNqRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxnRUFBZ0UsQ0FBQzthQUN0STtZQUNELDBCQUEwQixFQUFFO2dCQUMzQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLFNBQVM7Z0JBQzNCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHdEQUF3RCxDQUFDO2FBQ3hHO1lBQ0QsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYTtnQkFDL0IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsZ0ZBQWdGLENBQUM7YUFDcEk7WUFDRCx3QkFBd0IsRUFBRTtnQkFDekIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxtRUFBbUUsQ0FBQzthQUNqSDtZQUNELGtDQUFrQyxFQUFFO2dCQUNuQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGlCQUFpQjtnQkFDbkMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsNEZBQTRGLENBQUM7YUFDcEo7WUFDRCxzQ0FBc0MsRUFBRTtnQkFDdkMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2Qsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxvRUFBb0UsQ0FBQzthQUMzSTtZQUNELDhCQUE4QixFQUFFO2dCQUMvQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSx1SUFBdUksQ0FBQzthQUN2TDtZQUNELDRCQUE0QixFQUFFO2dCQUM3QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHVEQUF1RCxDQUFDO2FBQ3hIO1lBQ0QsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUseURBQXlELENBQUM7YUFDNUg7WUFDRCxpQ0FBaUMsRUFBRTtnQkFDbEMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSw0REFBNEQsQ0FBQzthQUNsSTtZQUNELCtCQUErQixFQUFFO2dCQUNoQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLDJEQUEyRCxDQUFDO2FBQy9IO1lBQ0QscUNBQXFDLEVBQUU7Z0JBQ3RDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUsbVFBQW1RLENBQUM7YUFDN1U7WUFDRCwyQkFBMkIsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxzREFBc0QsQ0FBQzthQUN0SDtZQUNELDhCQUE4QixFQUFFO2dCQUMvQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHlEQUF5RCxDQUFDO2FBQzVIO1lBQ0QsNEJBQTRCLEVBQUU7Z0JBQzdCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsc0RBQXNELENBQUM7YUFDdEg7WUFDRCw0QkFBNEIsRUFBRTtnQkFDN0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx1REFBdUQsQ0FBQzthQUN4SDtZQUNELCtCQUErQixFQUFFO2dCQUNoQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLDBEQUEwRCxDQUFDO2FBQzlIO1lBQ0QsNEJBQTRCLEVBQUU7Z0JBQzdCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsdURBQXVELENBQUM7YUFDeEg7WUFDRCwrQkFBK0IsRUFBRTtnQkFDaEMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx5REFBeUQsQ0FBQzthQUM1SDtZQUNELDJCQUEyQixFQUFFO2dCQUM1QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHNEQUFzRCxDQUFDO2FBQ3RIO1lBQ0QsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUseURBQXlELENBQUM7YUFDNUg7WUFDRCwwQkFBMEIsRUFBRTtnQkFDM0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxxREFBcUQsQ0FBQzthQUNwSDtZQUNELDJCQUEyQixFQUFFO2dCQUM1QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHNEQUFzRCxDQUFDO2FBQ3RIO1lBQ0QsOEJBQThCLEVBQUU7Z0JBQy9CLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUseURBQXlELENBQUM7YUFDNUg7WUFDRCwwQkFBMEIsRUFBRTtnQkFDM0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxxREFBcUQsQ0FBQzthQUNwSDtZQUNELGdDQUFnQyxFQUFFO2dCQUNqQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLDJEQUEyRCxDQUFDO2FBQ2hJO1lBQ0QsNkJBQTZCLEVBQUU7Z0JBQzlCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsd0RBQXdELENBQUM7YUFDMUg7WUFDRCwwQkFBMEIsRUFBRTtnQkFDM0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxxREFBcUQsQ0FBQzthQUNwSDtZQUNELDJCQUEyQixFQUFFO2dCQUM1QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHNEQUFzRCxDQUFDO2FBQ3RIO1lBQ0QsMEJBQTBCLEVBQUU7Z0JBQzNCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUscURBQXFELENBQUM7YUFDcEg7WUFDRCwrQkFBK0IsRUFBRTtnQkFDaEMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSwwREFBMEQsQ0FBQzthQUM5SDtZQUNELGlDQUFpQyxFQUFFO2dCQUNsQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDREQUE0RCxDQUFDO2FBQ2xJO1lBQ0QsNEJBQTRCLEVBQUU7Z0JBQzdCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsdURBQXVELENBQUM7YUFDeEg7WUFDRCxtQ0FBbUMsRUFBRTtnQkFDcEMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSw4REFBOEQsQ0FBQzthQUN0STtZQUNELDZCQUE2QixFQUFFO2dCQUM5QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHdEQUF3RCxDQUFDO2FBQzFIO1lBQ0QsMEJBQTBCLEVBQUU7Z0JBQzNCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUscURBQXFELENBQUM7YUFDcEg7WUFDRCwyQkFBMkIsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx1REFBdUQsQ0FBQzthQUN2SDtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBeUIsQ0FBQztRQUN4QyxPQUFPO1lBQ04sVUFBVSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVGLGNBQWMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQztZQUMvRSwrQkFBK0IsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO1lBQ2pILGFBQWEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztZQUM1RSxzQkFBc0IsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUM7WUFDdkcsYUFBYSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBQ2xKLFNBQVMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztZQUNoRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFDNUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzFELFdBQVcsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDL0csaUJBQWlCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1lBQ3hGLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUN0RSxhQUFhLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFDNUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO1lBQ3JGLGNBQWMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQztZQUMvRSxvQkFBb0IsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUM7WUFDakcsVUFBVSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQ25FLGFBQWEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztZQUM1RSxXQUFXLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUM7WUFDdEUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO1lBQ3RFLGNBQWMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQztZQUMvRSxXQUFXLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUM7WUFDdEUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO1lBQy9FLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNuRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFDNUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1lBQ2hFLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNuRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFDNUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1lBQ2hFLGVBQWUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQztZQUNsRixZQUFZLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7WUFDekUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1lBQ2hFLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNuRSxTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUM7WUFDaEUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO1lBQy9FLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUN0RSxrQkFBa0IsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUM7WUFDM0YsWUFBWSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3pFLFNBQVMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztZQUNoRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7U0FDbkUsQ0FBQztJQUNILENBQUM7Q0FDRDtBQWdCRCxNQUFNLFdBQVksU0FBUSxnQkFBbUY7SUFFNUc7UUFDQyxLQUFLLHFDQUNzQixhQUFhLEVBQ3ZDO1lBQ0Msa0NBQWtDLEVBQUUsSUFBSTtZQUN4QyxjQUFjLEVBQUUsSUFBSTtTQUNwQixFQUNEO1lBQ0MsdURBQXVELEVBQUU7Z0JBQ3hELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLG9FQUFvRSxDQUFDO2dCQUNySSxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsU0FBUzthQUNmO1lBQ0QsbUNBQW1DLEVBQUU7Z0JBQ3BDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDRFQUE0RSxDQUFDO2dCQUN6SCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsU0FBUzthQUNmO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFVO1FBQ3pCLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUM7UUFDRCxPQUFPO1lBQ04sa0NBQWtDLEVBQUUsT0FBTyxDQUFFLEtBQTZCLENBQUMsa0NBQWtDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxrQ0FBa0MsQ0FBQztZQUNwSyxjQUFjLEVBQUUsT0FBTyxDQUFFLEtBQTZCLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO1NBQ3hHLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBRVosOEJBQThCO0FBRTlCOzs7O0dBSUc7QUFDSCxNQUFNLG9CQUFxQixTQUFRLGdCQUFnRjtJQUNsSDtRQUNDLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUU5QixLQUFLLDhDQUMrQixzQkFBc0IsRUFBRSxRQUFRLEVBQ25FO1lBQ0MsS0FBSyxFQUFFO2dCQUNOO29CQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG9NQUFvTSxDQUFDO29CQUN2UCxJQUFJLEVBQUUsUUFBUTtpQkFDZCxFQUFFO29CQUNGLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG9NQUFvTSxDQUFDO29CQUN2UCxJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7aUJBQ0Q7YUFDRDtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsS0FBVTtRQUN6QixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pCLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7WUFDbEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDaEMsSUFBSSxDQUFDO3dCQUNKLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQzFELFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQzNCLENBQUM7b0JBQ0YsQ0FBQztvQkFBQyxNQUFNLENBQUM7d0JBQ1IseUJBQXlCO29CQUMxQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFHRCxZQUFZO0FBRVosd0JBQXdCO0FBRXhCOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGNBaUJqQjtBQWpCRCxXQUFrQixjQUFjO0lBQy9COztPQUVHO0lBQ0gsbURBQVEsQ0FBQTtJQUNSOztPQUVHO0lBQ0gsbURBQVEsQ0FBQTtJQUNSOztPQUVHO0lBQ0gsdURBQVUsQ0FBQTtJQUNWOztPQUVHO0lBQ0gsK0RBQWMsQ0FBQTtBQUNmLENBQUMsRUFqQmlCLGNBQWMsS0FBZCxjQUFjLFFBaUIvQjtBQUVELE1BQU0sb0JBQXFCLFNBQVEsZ0JBQXdHO0lBRTFJO1FBQ0MsS0FBSyx3Q0FBOEIsZ0JBQWdCLCtCQUNsRDtZQUNDLHVCQUF1QixFQUFFO2dCQUN4QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUM7Z0JBQzlDLGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGtEQUFrRCxDQUFDO29CQUN2RixHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHVEQUF1RCxDQUFDO29CQUM1RixHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHFEQUFxRCxDQUFDO29CQUM1RixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHFEQUFxRCxDQUFDO2lCQUNoRztnQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSw0Q0FBNEMsQ0FBQztnQkFDekYsT0FBTyxFQUFFLE1BQU07YUFDZjtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsS0FBVTtRQUN6QixRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNLENBQUMsQ0FBQyxtQ0FBMkI7WUFDeEMsS0FBSyxNQUFNLENBQUMsQ0FBQyxtQ0FBMkI7WUFDeEMsS0FBSyxRQUFRLENBQUMsQ0FBQyxxQ0FBNkI7WUFDNUMsS0FBSyxZQUFZLENBQUMsQ0FBQyx5Q0FBaUM7UUFDckQsQ0FBQztRQUNELG1DQUEyQjtJQUM1QixDQUFDO0lBRWUsT0FBTyxDQUFDLEdBQTBCLEVBQUUsT0FBK0IsRUFBRSxLQUFxQjtRQUN6RyxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDJDQUFtQyxDQUFDO1FBQzVFLElBQUksb0JBQW9CLHlDQUFpQyxFQUFFLENBQUM7WUFDM0QsdUZBQXVGO1lBQ3ZGLDhFQUE4RTtZQUM5RSxtQ0FBMkI7UUFDNUIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBYUQsTUFBTSwwQkFBMkIsU0FBUSxvQkFBbUU7SUFFM0c7UUFDQyxLQUFLLHFDQUEyQixDQUFDO0lBQ2xDLENBQUM7SUFFTSxPQUFPLENBQUMsR0FBMEIsRUFBRSxPQUErQixFQUFFLENBQXFCO1FBQ2hHLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFDO1FBRXhELE9BQU87WUFDTixzQkFBc0IsRUFBRSxHQUFHLENBQUMsc0JBQXNCO1lBQ2xELGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0I7WUFDakQsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQjtZQUNqRCxjQUFjLEVBQUUsVUFBVSxDQUFDLGNBQWM7U0FDekMsQ0FBQztJQUNILENBQUM7Q0FDRDtBQTRCRCxNQUFNLG9CQUFxQixTQUFRLGdCQUFrRztJQUVwSTtRQUNDLE1BQU0sUUFBUSxHQUFnQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLENBQUM7UUFDL0YsS0FBSyx1Q0FDeUIsZ0JBQWdCLEVBQUUsUUFBUSxFQUN2RDtZQUNDLCtCQUErQixFQUFFO2dCQUNoQyxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsOElBQThJLENBQUM7YUFDM007WUFDRCx3Q0FBd0MsRUFBRTtnQkFDekMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSwwSEFBMEgsQ0FBQztnQkFDaE0sSUFBSSxFQUFFO29CQUNMLFdBQVc7b0JBQ1gsT0FBTztpQkFDUDtnQkFDRCxnQkFBZ0IsRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsRUFBRSx3RUFBd0UsQ0FBQztvQkFDbkksR0FBRyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSx3RkFBd0YsQ0FBQztpQkFDL0k7Z0JBQ0QsT0FBTyxFQUFFLFdBQVc7YUFDcEI7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRU0sUUFBUSxDQUFDLE1BQVc7UUFDMUIsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDMUIsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQWdDLENBQUM7UUFDL0MsT0FBTztZQUNOLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUMxRCxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDL0csQ0FBQztJQUNILENBQUM7Q0FDRDtBQTRCRCxNQUFNLGFBQWMsU0FBUSxnQkFBNkU7SUFFeEc7UUFDQyxNQUFNLFFBQVEsR0FBeUIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxDQUFDO1FBQzFGLEtBQUssZ0NBQ2tCLFNBQVMsRUFBRSxRQUFRLEVBQ3pDO1lBQ0Msd0JBQXdCLEVBQUU7Z0JBQ3pCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSwyREFBMkQsQ0FBQzthQUNqSDtZQUNELGtDQUFrQyxFQUFFO2dCQUNuQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDJIQUEySCxDQUFDO2dCQUMzTCxJQUFJLEVBQUU7b0JBQ0wsWUFBWTtvQkFDWixPQUFPO2lCQUNQO2dCQUNELGdCQUFnQixFQUFFO29CQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLHlFQUF5RSxDQUFDO29CQUMvSCxHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDRGQUE0RixDQUFDO2lCQUM3STtnQkFDRCxPQUFPLEVBQUUsWUFBWTthQUNyQjtTQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBVztRQUMxQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBeUIsQ0FBQztRQUN4QyxPQUFPO1lBQ04sT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzFELGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNuSCxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQsWUFBWTtBQUVaLE1BQU0sMkJBQTJCLEdBQUcsc0NBQXNDLENBQUM7QUFDM0UsTUFBTSx1QkFBdUIsR0FBRywyQ0FBMkMsQ0FBQztBQUM1RSxNQUFNLHlCQUF5QixHQUFHLCtDQUErQyxDQUFDO0FBRWxGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUc7SUFDbkMsVUFBVSxFQUFFLENBQ1gsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQzdIO0lBQ0QsVUFBVSxFQUFFLFFBQVE7SUFDcEIsUUFBUSxFQUFFLENBQ1QsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzlCO0lBQ0QsVUFBVSxFQUFFLENBQUM7SUFDYixhQUFhLEVBQUUsQ0FBQztDQUNoQixDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBdUMsRUFBRSxDQUFDO0FBRTVFLFNBQVMsUUFBUSxDQUE0QixNQUEyQjtJQUN2RSxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQzFDLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixZQStKakI7QUEvSkQsV0FBa0IsWUFBWTtJQUM3Qix5R0FBaUMsQ0FBQTtJQUNqQyxxRkFBdUIsQ0FBQTtJQUN2QiwrRUFBb0IsQ0FBQTtJQUNwQixpRkFBcUIsQ0FBQTtJQUNyQix5REFBUyxDQUFBO0lBQ1QsK0RBQVksQ0FBQTtJQUNaLDZFQUFtQixDQUFBO0lBQ25CLDZFQUFtQixDQUFBO0lBQ25CLCtHQUFvQyxDQUFBO0lBQ3BDLHlFQUFpQixDQUFBO0lBQ2pCLDhFQUFtQixDQUFBO0lBQ25CLDBFQUFpQixDQUFBO0lBQ2pCLDREQUFVLENBQUE7SUFDVixzRUFBZSxDQUFBO0lBQ2YsZ0VBQVksQ0FBQTtJQUNaLHNGQUF1QixDQUFBO0lBQ3ZCLG9EQUFNLENBQUE7SUFDTix3REFBUSxDQUFBO0lBQ1IsNEVBQWtCLENBQUE7SUFDbEIsd0VBQWdCLENBQUE7SUFDaEIsc0VBQWUsQ0FBQTtJQUNmLGdGQUFvQixDQUFBO0lBQ3BCLHNFQUFlLENBQUE7SUFDZix3REFBUSxDQUFBO0lBQ1IsOERBQVcsQ0FBQTtJQUNYLDRGQUEwQixDQUFBO0lBQzFCLG9FQUFjLENBQUE7SUFDZCw0RkFBMEIsQ0FBQTtJQUMxQiw4REFBVyxDQUFBO0lBQ1gsb0ZBQXNCLENBQUE7SUFDdEIsOEZBQTJCLENBQUE7SUFDM0IsOERBQVcsQ0FBQTtJQUNYLDhFQUFtQixDQUFBO0lBQ25CLGtHQUE2QixDQUFBO0lBQzdCLDhEQUFXLENBQUE7SUFDWCw4REFBVyxDQUFBO0lBQ1gsb0VBQWMsQ0FBQTtJQUNkLG9HQUE4QixDQUFBO0lBQzlCLHNGQUF1QixDQUFBO0lBQ3ZCLDhGQUEyQixDQUFBO0lBQzNCLHNHQUErQixDQUFBO0lBQy9CLGdGQUFvQixDQUFBO0lBQ3BCLGtGQUFxQixDQUFBO0lBQ3JCLGdEQUFJLENBQUE7SUFDSixnRkFBb0IsQ0FBQTtJQUNwQixzREFBTyxDQUFBO0lBQ1Asc0VBQWUsQ0FBQTtJQUNmLHdFQUFnQixDQUFBO0lBQ2hCLHNGQUF1QixDQUFBO0lBQ3ZCLGtGQUFxQixDQUFBO0lBQ3JCLDhGQUEyQixDQUFBO0lBQzNCLDREQUFVLENBQUE7SUFDVix3REFBUSxDQUFBO0lBQ1Isa0VBQWEsQ0FBQTtJQUNiLHdEQUFRLENBQUE7SUFDUiw0REFBVSxDQUFBO0lBQ1Ysb0VBQWMsQ0FBQTtJQUNkLGtFQUFhLENBQUE7SUFDYixnRUFBWSxDQUFBO0lBQ1osOERBQVcsQ0FBQTtJQUNYLGdFQUFZLENBQUE7SUFDWiwwRkFBeUIsQ0FBQTtJQUN6QixrREFBSyxDQUFBO0lBQ0wsZ0VBQVksQ0FBQTtJQUNaLGtFQUFhLENBQUE7SUFDYixrRUFBYSxDQUFBO0lBQ2IsMERBQVMsQ0FBQTtJQUNULGdGQUFvQixDQUFBO0lBQ3BCLDREQUFVLENBQUE7SUFDViw4REFBVyxDQUFBO0lBQ1gsOEVBQW1CLENBQUE7SUFDbkIsa0VBQWEsQ0FBQTtJQUNiLGtEQUFLLENBQUE7SUFDTCxrRUFBYSxDQUFBO0lBQ2Isc0RBQU8sQ0FBQTtJQUNQLDREQUFVLENBQUE7SUFDViw4RkFBMkIsQ0FBQTtJQUMzQixvRUFBYyxDQUFBO0lBQ2QsOEZBQTJCLENBQUE7SUFDM0IsOEVBQW1CLENBQUE7SUFDbkIsd0VBQWdCLENBQUE7SUFDaEIsd0VBQWdCLENBQUE7SUFDaEIsZ0ZBQW9CLENBQUE7SUFDcEIsMEZBQXlCLENBQUE7SUFDekIsOEVBQW1CLENBQUE7SUFDbkIsc0VBQWUsQ0FBQTtJQUNmLDhFQUFtQixDQUFBO0lBQ25CLDRFQUFrQixDQUFBO0lBQ2xCLHNEQUFPLENBQUE7SUFDUCxzREFBTyxDQUFBO0lBQ1Asb0VBQWMsQ0FBQTtJQUNkLG9GQUFzQixDQUFBO0lBQ3RCLDhEQUFXLENBQUE7SUFDWCwwRkFBeUIsQ0FBQTtJQUN6Qix3RUFBZ0IsQ0FBQTtJQUNoQixrRkFBcUIsQ0FBQTtJQUNyQix3REFBUSxDQUFBO0lBQ1Isc0VBQWUsQ0FBQTtJQUNmLGdFQUFZLENBQUE7SUFDWixzRkFBdUIsQ0FBQTtJQUN2Qiw2RUFBa0IsQ0FBQTtJQUNsQiwrRUFBbUIsQ0FBQTtJQUNuQix5R0FBZ0MsQ0FBQTtJQUNoQywrRkFBMkIsQ0FBQTtJQUMzQix5RUFBZ0IsQ0FBQTtJQUNoQixpR0FBNEIsQ0FBQTtJQUM1Qix5RUFBZ0IsQ0FBQTtJQUNoQixxREFBTSxDQUFBO0lBQ04sMkRBQVMsQ0FBQTtJQUNULHFGQUFzQixDQUFBO0lBQ3RCLGlGQUFvQixDQUFBO0lBQ3BCLG1GQUFxQixDQUFBO0lBQ3JCLDZFQUFrQixDQUFBO0lBQ2xCLDZFQUFrQixDQUFBO0lBQ2xCLCtFQUFtQixDQUFBO0lBQ25CLCtFQUFtQixDQUFBO0lBQ25CLDZEQUFVLENBQUE7SUFDViw2RUFBa0IsQ0FBQTtJQUNsQiwrREFBVyxDQUFBO0lBQ1gsdUVBQWUsQ0FBQTtJQUNmLGlFQUFZLENBQUE7SUFDWixxRUFBYyxDQUFBO0lBQ2QscUZBQXNCLENBQUE7SUFDdEIsdURBQU8sQ0FBQTtJQUNQLHVFQUFlLENBQUE7SUFDZiwyRUFBaUIsQ0FBQTtJQUNqQiw2RkFBMEIsQ0FBQTtJQUMxQix5RUFBZ0IsQ0FBQTtJQUNoQixtRUFBYSxDQUFBO0lBQ2IseURBQVEsQ0FBQTtJQUNSLCtFQUFtQixDQUFBO0lBQ25CLHFGQUFzQixDQUFBO0lBQ3RCLGlFQUFZLENBQUE7SUFDWiwrREFBVyxDQUFBO0lBQ1gsMkRBQVMsQ0FBQTtJQUNULGlGQUFvQixDQUFBO0lBQ3BCLHFFQUFjLENBQUE7SUFDZCx5REFBUSxDQUFBO0lBQ1IsaUdBQTRCLENBQUE7SUFDNUIsbUdBQTZCLENBQUE7SUFDN0IscUVBQWMsQ0FBQTtJQUNkLDJFQUFpQixDQUFBO0lBQ2pCLDJFQUFpQixDQUFBO0lBQ2pCLHFFQUFjLENBQUE7SUFDZCx5RUFBZ0IsQ0FBQTtJQUNoQixxRUFBYyxDQUFBO0lBQ2QsNkRBQVUsQ0FBQTtJQUNWLDJEQUEyRDtJQUMzRCxpRkFBb0IsQ0FBQTtJQUNwQix1RUFBZSxDQUFBO0lBQ2YsNkRBQVUsQ0FBQTtJQUNWLGlFQUFZLENBQUE7SUFDWiw2REFBVSxDQUFBO0lBQ1YsaUVBQVksQ0FBQTtJQUNaLHFGQUFzQixDQUFBO0lBQ3RCLDZGQUEwQixDQUFBO0lBQzFCLG1IQUFxQyxDQUFBO0lBQ3JDLHVIQUF1QyxDQUFBO0FBQ3hDLENBQUMsRUEvSmlCLFlBQVksS0FBWixZQUFZLFFBK0o3QjtBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRztJQUM1QixpQ0FBaUMsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIseURBQ2xCLG1DQUFtQyxFQUFFLElBQUksRUFDekYsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHNNQUFzTSxDQUFDLEVBQUUsQ0FDbFIsQ0FBQztJQUNGLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiwrQ0FDckIseUJBQXlCLEVBQy9ELElBQThCLEVBQzlCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQVUsRUFDL0I7UUFDQyx3QkFBd0IsRUFBRTtZQUN6QixFQUFFO1lBQ0YsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx1RUFBdUUsQ0FBQztZQUNySCxFQUFFO1NBQ0Y7UUFDRCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLGtLQUFrSyxDQUFDO0tBQ2hPLENBQ0QsQ0FBQztJQUNGLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUM7SUFDaEUscUJBQXFCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSw2Q0FBcUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMscURBQ3RIO1FBQ0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUseVBBQXlQLENBQUM7UUFDN1MsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDO0tBQ3ZCLENBQUMsQ0FBQztJQUNKLFNBQVMsRUFBRSxRQUFRLENBQUMsSUFBSSxrQkFBa0IsaUNBQ2pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGdCQUFnQixDQUFDLENBQ2hHLENBQUM7SUFDRixZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLG9DQUNsQixjQUFjLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FDM0QsQ0FBQztJQUNGLG9DQUFvQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQiw0REFDbEIsc0NBQXNDLEVBQUUsSUFBSSxFQUMvRjtRQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLHNFQUFzRSxDQUFDO1FBQ3pJLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQztLQUN2QixDQUNELENBQUM7SUFDRixtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsMkNBQ3JCLHFCQUFxQixFQUN2RCxpQkFBZ0YsRUFDaEYsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxDQUFVLEVBQ25FO1FBQ0MsZ0JBQWdCLEVBQUU7WUFDakIsRUFBRTtZQUNGLEdBQUcsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsc0VBQXNFLENBQUM7WUFDbEksR0FBRyxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSx1RUFBdUUsQ0FBQztZQUNwSSxFQUFFO1NBQ0Y7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx5R0FBeUcsQ0FBQztLQUMzSixDQUNELENBQUM7SUFDRixtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsMkNBQ3JCLHFCQUFxQixFQUN2RCxpQkFBZ0YsRUFDaEYsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxDQUFVLEVBQ25FO1FBQ0MsZ0JBQWdCLEVBQUU7WUFDakIsRUFBRTtZQUNGLEdBQUcsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsc0VBQXNFLENBQUM7WUFDbEksR0FBRyxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSx1RUFBdUUsQ0FBQztZQUNwSSxFQUFFO1NBQ0Y7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx5R0FBeUcsQ0FBQztLQUMzSixDQUNELENBQUM7SUFDRixpQkFBaUIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IseUNBQ3JCLG1CQUFtQixFQUNuRCxNQUFxQyxFQUNyQyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFVLEVBQ3BDO1FBQ0MsZ0JBQWdCLEVBQUU7WUFDakIsRUFBRTtZQUNGLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsc0ZBQXNGLENBQUM7WUFDckksRUFBRTtTQUNGO1FBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsOEZBQThGLENBQUM7S0FDOUksQ0FDRCxDQUFDO0lBQ0YsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLElBQUksc0JBQXNCLDRDQUNyQixxQkFBcUIsRUFDdkQsTUFBcUMsRUFDckMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBVSxFQUNwQztRQUNDLGdCQUFnQixFQUFFO1lBQ2pCLEVBQUU7WUFDRixHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGdGQUFnRixDQUFDO1lBQ2pJLEVBQUU7U0FDRjtRQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDBFQUEwRSxDQUFDO0tBQzVILENBQ0QsQ0FBQztJQUNGLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiwwQ0FDckIsbUJBQW1CLEVBQ25ELGlCQUFnRixFQUNoRixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLENBQVUsRUFDbkU7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixFQUFFO1lBQ0YsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxvRUFBb0UsQ0FBQztZQUM5SCxHQUFHLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLHFFQUFxRSxDQUFDO1lBQ2hJLEVBQUU7U0FDRjtRQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFHQUFxRyxDQUFDO0tBQ3JKLENBQ0QsQ0FBQztJQUNGLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxnQkFBZ0IsbUNBQ2YsWUFBWSx5Q0FDTixNQUFNLEVBQ3JDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUNoRCxxQkFBcUIsRUFDckI7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHVEQUF1RCxDQUFDO1lBQy9GLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsc0RBQXNELENBQUM7WUFDOUYsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSwwRkFBMEYsQ0FBQztZQUN0SSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDRJQUE0SSxDQUFDO1lBQ3hMLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMExBQTBMLENBQUM7U0FDbE87UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsdUhBQXVILENBQUM7S0FDaEssQ0FDRCxDQUFDO0lBQ0YsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQix3Q0FDbEIsaUJBQWlCLEVBQUUsS0FBSyxDQUN0RCxDQUFDO0lBQ0YsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixxQ0FDckIsY0FBYyxFQUN6QyxpQkFBd0UsRUFDeEUsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBVSxFQUMzRDtRQUNDLGdCQUFnQixFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUscUZBQXFGLENBQUM7WUFDMUksR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx3Q0FBd0MsQ0FBQztZQUNwRixHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHdDQUF3QyxDQUFDO1lBQ3RGLEVBQUU7U0FDRjtRQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxzR0FBc0csQ0FBQztLQUNqSixDQUNELENBQUM7SUFDRix1QkFBdUIsRUFBRSxRQUFRLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO0lBQ2hFLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDO0lBQy9DLGNBQWMsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsd0NBQ2xCLGdCQUFnQixFQUFFLEtBQUssRUFDcEQsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxvSEFBb0gsQ0FBQyxFQUFFLENBQ3JLLENBQUM7SUFDRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLGlDQUNsQixVQUFVLEVBQUUsSUFBSSxFQUN2QyxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSw2Q0FBNkMsQ0FBQyxFQUFFLENBQ3hGLENBQUM7SUFDRixrQkFBa0IsRUFBRSxRQUFRLENBQUMsSUFBSSxrQkFBa0IsMkNBQ2pCLG9CQUFvQixFQUFFLEVBQUUsRUFDekQsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx3Q0FBd0MsQ0FBQyxFQUFFLENBQzdGLENBQUM7SUFDRixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLHlDQUFnQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtRQUM1RyxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxDQUFDO1FBQ1YsT0FBTyxFQUFFLENBQUM7UUFDVixPQUFPLEVBQUUsR0FBRztRQUNaLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUdBQW1HLENBQUM7S0FDMUosQ0FBQyxDQUFDO0lBQ0gsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQix3Q0FDbEIsaUJBQWlCLEVBQUUsSUFBSSxFQUNyRCxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHlGQUF5RixDQUFDLEVBQUUsQ0FDM0ksQ0FBQztJQUNGLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixvREFBMEMsNEJBQTRCLEVBQUUsZUFBc0QsRUFBRSxDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFVLEVBQUU7UUFDM08sZ0JBQWdCLEVBQUU7WUFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnREFBZ0QsRUFBRSw2RUFBNkUsQ0FBQztZQUM3SSxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDhEQUE4RCxDQUFDO1lBQ3RILEdBQUcsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsOERBQThELENBQUM7U0FDdEg7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSw4RUFBOEUsQ0FBQztLQUN0SSxDQUFDLENBQUM7SUFDSCxvQkFBb0IsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLDZDQUNkLHNCQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUMxRTtRQUNDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsd0ZBQXdGLENBQUM7S0FDbkosQ0FDRCxDQUFDO0lBQ0YsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQix3Q0FDbEIsaUJBQWlCLEVBQUUsS0FBSyxFQUN0RCxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLDhFQUE4RSxDQUFDLEVBQUUsQ0FDaEksQ0FBQztJQUNGLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQztJQUN4QyxXQUFXLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLG9DQUNsQixhQUFhLEVBQUUsSUFBSSxDQUM3QyxDQUFDO0lBQ0YsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLG1EQUNsQiw0QkFBNEIsRUFBRSxJQUFJLEVBQzNFLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsMkVBQTJFLENBQUMsRUFBRSxDQUN4SSxDQUFDO0lBQ0YsY0FBYyxFQUFFLFFBQVEsQ0FBQyxJQUFJLGdCQUFnQix1Q0FDZixnQkFBZ0IsK0NBQ1IsT0FBTyxFQUM1QyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFDL0MsNkJBQTZCLEVBQzdCLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUscUNBQXFDLENBQUMsRUFBRSxDQUN0RixDQUFDO0lBQ0YsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLElBQUksc0JBQXNCLG1EQUNyQiw0QkFBNEIsRUFDckUsS0FBa0MsRUFDbEMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBVSxFQUNsQztRQUNDLGdCQUFnQixFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUscUNBQXFDLENBQUM7WUFDckYsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxpR0FBaUcsQ0FBQztZQUN0SixHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLDJDQUEyQyxDQUFDO1NBQzFGO1FBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsZ0VBQWdFLENBQUM7S0FDekgsQ0FDRCxDQUFDO0lBQ0YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxJQUFJLGdCQUFnQixvQ0FDZixhQUFhLEVBQ3ZDLHFCQUFxQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQ2xDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxFQUM5RSxxQkFBcUIsRUFDckIsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsaURBQWlELENBQUMsRUFBRSxDQUMvRixDQUFDO0lBQ0YsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLElBQUksZ0JBQWdCLDRDQUNmLHFCQUFxQixFQUN2RCxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUNwQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsRUFDOUUscUJBQXFCLEVBQ3JCLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsbURBQW1ELENBQUMsRUFBRSxDQUN6RyxDQUFDO0lBQ0Ysc0JBQXNCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSwrQ0FDZCx3QkFBd0IsRUFDN0QsQ0FBQyxFQUFFLENBQUMscURBQ0osRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx1TEFBdUwsQ0FBQyxFQUFFLENBQ2hQLENBQUM7SUFDRiwyQkFBMkIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0Isb0RBQ3JCLDZCQUE2QixFQUN2RSxTQUE4QixFQUM5QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQVUsRUFDM0I7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG1GQUFtRixDQUFDO1lBQ3hJLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsOENBQThDLENBQUM7U0FDL0Y7UUFDRCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHFFQUFxRSxDQUFDO0tBQ3ZJLENBQ0QsQ0FBQztJQUNGLFdBQVcsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLG9DQUNkLGFBQWEsRUFDdkMsQ0FBQyxFQUFFLENBQUMscURBQ0osRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxnRkFBZ0YsQ0FBQyxFQUFFLENBQ3RJLENBQUM7SUFDRixtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsNENBQ2xCLHFCQUFxQixFQUFFLEtBQUssQ0FDOUQsQ0FBQztJQUNGLDZCQUE2QixFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixzREFDbEIsK0JBQStCLEVBQUUsS0FBSyxDQUNsRixDQUFDO0lBQ0YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixvQ0FDbEIsYUFBYSxFQUFFLEtBQUssQ0FDOUMsQ0FBQztJQUNGLFdBQVcsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsb0NBQ2xCLGFBQWEsRUFBRSxJQUFJLEVBQzdDLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLCtFQUErRSxDQUFDLEVBQUUsQ0FDN0gsQ0FBQztJQUNGLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxJQUFJLDZCQUE2QixFQUFFLENBQUM7SUFDdEUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLENBQUM7SUFDcEQsOEJBQThCLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLHVEQUNsQixnQ0FBZ0MsRUFBRSxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFDM0c7UUFDQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSx5RkFBeUYsQ0FBQztRQUN0SixRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRO0tBQ25FLENBQ0QsQ0FBQztJQUNGLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0lBQ2hELDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixvREFDckIsNkJBQTZCLEVBQ3ZFLEtBQXFCLEVBQ3JCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBVSxFQUN0QjtRQUNDLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQztRQUN0QixnQkFBZ0IsRUFBRTtZQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGtDQUFrQyxDQUFDO1lBQ25GLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsdUJBQXVCLENBQUM7U0FDdkU7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxpRkFBaUYsQ0FBQztLQUMzSSxDQUNELENBQUM7SUFDRiwrQkFBK0IsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0Isd0RBQ3JCLGlDQUFpQyxFQUMvRSxLQUErQixFQUMvQixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFVLEVBQy9CO1FBQ0MsZ0JBQWdCLEVBQUU7WUFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSx1Q0FBdUMsQ0FBQztZQUM1RixHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLGtEQUFrRCxDQUFDO1lBQ3hHLEdBQUcsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUsa0NBQWtDLENBQUM7U0FDdkY7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSwwRUFBMEUsQ0FBQztLQUN4SSxDQUNELENBQUM7SUFDRixvQkFBb0IsRUFBRSxRQUFRLENBQUMsSUFBSSxrQkFBa0IsNkNBQ2pCLHNCQUFzQixFQUFFLEVBQUUsQ0FDN0QsQ0FBQztJQUNGLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyxJQUFJLGlCQUFpQiw4Q0FDaEIsdUJBQXVCLEVBQzNELENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDeEIsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGlEQUFpRCxDQUFDLEVBQUUsQ0FDakgsQ0FBQztJQUNGLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztJQUNoQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsNkNBQ2xCLHNCQUFzQixFQUFFLEtBQUssQ0FDaEUsQ0FBQztJQUNGLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsZ0NBQ2xCLFNBQVMsRUFBRSxJQUFJLEVBQ3JDLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLHVEQUF1RCxDQUFDLEVBQUUsQ0FDakcsQ0FBQztJQUNGLGVBQWUsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0Isd0NBQ3JCLGlCQUFpQixFQUMvQyxNQUFnQyxFQUNoQyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQVUsRUFDaEM7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHdGQUF3RixDQUFDO1lBQzlILEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsNkNBQTZDLENBQUM7U0FDMUY7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxxREFBcUQsQ0FBQztLQUNuRyxDQUNELENBQUM7SUFDRixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIseUNBQ2xCLGtCQUFrQixFQUFFLElBQUksRUFDdkQsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSw2REFBNkQsQ0FBQyxFQUFFLENBQ2hILENBQUM7SUFDRix1QkFBdUIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsZ0RBQ2xCLHlCQUF5QixFQUFFLEtBQUssRUFDdEUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxvRUFBb0UsQ0FBQyxFQUFFLENBQzlILENBQUM7SUFDRixxQkFBcUIsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLDhDQUNkLHVCQUF1QixFQUMzRCxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSw0REFBNEQ7SUFDN0UsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpTEFBaUwsQ0FBQyxFQUFFLENBQ3pPLENBQUM7SUFDRiwyQkFBMkIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsb0RBQ2xCLDZCQUE2QixFQUFFLEtBQUssRUFDOUUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwwRkFBMEYsQ0FBQyxFQUFFLENBQ3hKLENBQUM7SUFDRixVQUFVLEVBQUUsUUFBUSxDQUFDLElBQUksa0JBQWtCLG1DQUNqQixZQUFZLEVBQUUsb0JBQW9CLENBQUMsVUFBVSxFQUN0RSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSwyQkFBMkIsQ0FBQyxFQUFFLENBQ3hFLENBQUM7SUFDRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7SUFDeEMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbkQsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO0lBQ3hDLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO0lBQzVDLGNBQWMsRUFBRSxRQUFRLENBQUMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBQ3BELGFBQWEsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsc0NBQ2xCLGVBQWUsRUFBRSxLQUFLLEVBQ2xELEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLDZLQUE2SyxDQUFDLEVBQUUsQ0FDN04sQ0FBQztJQUNGLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIscUNBQ2xCLGNBQWMsRUFBRSxLQUFLLEVBQ2hELEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGdGQUFnRixDQUFDLEVBQUUsQ0FDL0gsQ0FBQztJQUNGLFdBQVcsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsb0NBQ2xCLGFBQWEsRUFBRSxJQUFJLEVBQzdDLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGlIQUFpSCxDQUFDLEVBQUUsQ0FDL0osQ0FBQztJQUNGLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0lBQ2hELHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixrREFDbEIsMkJBQTJCLEVBQUUsS0FBSyxFQUMxRSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHFFQUFxRSxDQUFDLEVBQUUsQ0FDakksQ0FBQztJQUNGLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztJQUNsQyxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLHFDQUNsQixjQUFjLEVBQUUsS0FBSyxDQUNoRCxDQUFDO0lBQ0YsYUFBYSxFQUFFLFFBQVEsQ0FBQyxJQUFJLGlCQUFpQixzQ0FDaEIsZUFBZSxFQUMzQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUMzRSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSx3Q0FBd0MsQ0FBQyxFQUFFLENBQ3hGLENBQUM7SUFDRixTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLElBQUksMEJBQTBCLEVBQUUsQ0FBQztJQUNoRSxVQUFVLEVBQUUsUUFBUSxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUM1QyxXQUFXLEVBQUUsUUFBUSxDQUFDLElBQUksNkJBQTZCLEVBQUUsQ0FBQztJQUMxRCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLDRDQUNkLHFCQUFxQixFQUN2RCxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FDVCxDQUFDO0lBQ0YsYUFBYSxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixzQ0FDbEIsZUFBZSxFQUFFLEtBQUssRUFDbEQsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsa0pBQWtKLENBQUMsRUFBRSxDQUNsTSxDQUFDO0lBQ0YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQiw4QkFDbEIsT0FBTyxFQUFFLElBQUksRUFDakMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsMEVBQTBFLENBQUMsRUFBRSxDQUNsSCxDQUFDO0lBQ0YsYUFBYSxFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixzQ0FDckIsZUFBZSxFQUMzQyxRQUF1QyxFQUN2QyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFVLEVBQ3BDLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLDhCQUE4QixDQUFDLEVBQUUsQ0FDOUUsQ0FBQztJQUNGLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUN0QyxVQUFVLEVBQUUsUUFBUSxDQUFDLElBQUksc0JBQXNCLG1DQUNyQixZQUFZLEVBQ3JDLE1BQXFDLEVBQ3JDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQVUsQ0FDcEMsQ0FBQztJQUNGLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxJQUFJLGlCQUFpQixvREFDaEIsNkJBQTZCLEVBQ3ZFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDekIsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLG9GQUFvRixDQUFDLEVBQUUsQ0FDMUosQ0FBQztJQUNGLGNBQWMsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsdUNBQ2xCLGdCQUFnQixFQUFFLEtBQUssRUFDcEQ7UUFDQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsV0FBVztZQUN4QyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx1RUFBdUUsQ0FBQztZQUM3RyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx3RUFBd0UsQ0FBQztLQUMzRyxDQUNELENBQUM7SUFDRiwyQkFBMkIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsb0RBQ2xCLDZCQUE2QixFQUFFLElBQUksRUFDN0UsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxtREFBbUQsQ0FBQyxFQUFFLENBQ2pILENBQUM7SUFDRixtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxnQkFBZ0IsNENBQ2YscUJBQXFCLEVBQ3ZELFFBQVEsRUFBRSxLQUFLLEVBQ2YsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQ2xCLDhCQUE4QixFQUM5QjtRQUNDLHdCQUF3QixFQUFFO1lBQ3pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsbUVBQW1FLENBQUM7WUFDaEgsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSw4REFBOEQsQ0FBQztTQUN2RztRQUNELG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDakMsR0FBRyxFQUFFLHFCQUFxQjtZQUMxQixPQUFPLEVBQUU7Z0JBQ1IsaUZBQWlGO2dCQUNqRix3R0FBd0c7YUFDeEc7U0FDRCxFQUFFLDBRQUEwUSxDQUFDO0tBQzlRLENBQ0QsQ0FBQztJQUNGLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQix5Q0FDckIsa0JBQWtCLEVBQ2pELFFBQTZCLEVBQzdCLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBVSxFQUMzQjtRQUNDLHdCQUF3QixFQUFFO1lBQ3pCLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsK0NBQStDLENBQUM7WUFDeEYsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtQ0FBbUMsQ0FBQztTQUMxRTtRQUNELG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUZBQW1GLENBQUM7S0FDMUksQ0FDRCxDQUFDO0lBQ0YsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSx5Q0FDZCxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFDbkU7UUFDQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDZFQUE2RSxDQUFDO0tBQ3BJLENBQ0QsQ0FBQztJQUNGLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiw2Q0FDckIsc0JBQXNCLEVBQ3pELFlBQWtELEVBQ2xELENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxXQUFXLENBQVUsRUFDM0M7UUFDQyx3QkFBd0IsRUFBRTtZQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGlDQUFpQyxDQUFDO1lBQzNFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsa0RBQWtELENBQUM7WUFDbkcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxtRUFBbUUsQ0FBQztTQUNuSDtRQUNELG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsdUVBQXVFLENBQUM7S0FDbEksQ0FDRCxDQUFDO0lBQ0YseUJBQXlCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSxrREFDZCwyQkFBMkIsRUFDbkUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQ1Y7UUFDQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSw2RUFBNkUsQ0FBQztRQUNySSxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakIsQ0FDRCxDQUFDO0lBQ0YsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQix3Q0FDbEIsaUJBQWlCLEVBQUUsSUFBSSxFQUNyRCxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLDJDQUEyQyxDQUFDLEVBQUUsQ0FDN0YsQ0FBQztJQUNGLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQiw0Q0FDbEIscUJBQXFCLEVBQUUsSUFBSSxFQUM3RCxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHNFQUFzRSxDQUFDLEVBQUUsQ0FDNUgsQ0FBQztJQUNGLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxJQUFJLGVBQWUsMkNBQ2Qsb0JBQW9CLEVBQ3JELENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUNQLENBQUM7SUFDRixPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksYUFBYSxFQUFFLENBQUM7SUFDdEMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDO0lBQ3RDLGNBQWMsRUFBRSxRQUFRLENBQUMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBQ3BELHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiwrQ0FDckIsd0JBQXdCLEVBQzdELE1BQTJCLEVBQzNCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBVSxFQUMzQjtRQUNDLGdCQUFnQixFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsa0NBQWtDLENBQUM7WUFDL0UsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxvQ0FBb0MsQ0FBQztTQUNuRjtRQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDZFQUE2RSxDQUFDO0tBQ2xJLENBQ0QsQ0FBQztJQUNGLFdBQVcsRUFBRSxRQUFRLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQzlDLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixrREFDbEIsMkJBQTJCLEVBQUUsS0FBSyxFQUMxRSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLG1GQUFtRixDQUFDLEVBQUUsQ0FDL0ksQ0FBQztJQUNGLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUM7SUFDeEQscUJBQXFCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSw4Q0FDZCx1QkFBdUIsRUFDM0QsRUFBRSxFQUFFLENBQUMscURBQ0wsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxnRkFBZ0YsQ0FBQyxFQUFFLENBQ3hJLENBQUM7SUFDRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLGlDQUNsQixVQUFVLEVBQUUsS0FBSyxDQUN4QyxDQUFDO0lBQ0YsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ2hELFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIscUNBQ2xCLGNBQWMsRUFBRSxLQUFLLEVBQ2hELEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLG1EQUFtRCxDQUFDLEVBQUUsMEJBQTBCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpREFBaUQsQ0FBQyxFQUFFLENBQ3hOLENBQUM7SUFDRix1QkFBdUIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsZ0RBQ2xCLHlCQUF5QixFQUFFLElBQUksRUFDckUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSwrREFBK0QsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDM0ksQ0FBQztJQUNGLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiw0Q0FDckIsb0JBQW9CLEVBQ3JELENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQTRCLEVBQy9ELENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLENBQVUsRUFDaEMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0REFBNEQsQ0FBQyxFQUFFLENBQ2pILENBQUM7SUFDRixtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsNkNBQ3JCLHFCQUFxQixFQUN2RCxNQUE0QyxFQUM1QyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBVSxFQUMxQztRQUNDLGdCQUFnQixFQUFFO1lBQ2pCLEVBQUU7WUFDRixFQUFFO1lBQ0YsRUFBRTtZQUNGLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsa0RBQWtELENBQUM7U0FDM0Y7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtRUFBbUUsQ0FBQztLQUNySCxDQUNELENBQUM7SUFDRixnQ0FBZ0MsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsMERBQ2xCLGtDQUFrQyxFQUFFLEtBQUssRUFDeEYsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxrR0FBa0csQ0FBQyxFQUFFLENBQ3JLLENBQUM7SUFDRiwyQkFBMkIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IscURBQ3JCLDZCQUE2QixFQUN2RSxVQUF1QyxFQUN2QyxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFVLENBQ2xDLENBQUM7SUFDRixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsMENBQ3JCLGtCQUFrQixFQUNqRCxXQUFxRSxFQUNyRSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQVUsRUFDN0Q7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixFQUFFO1lBQ0YsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxzRUFBc0UsQ0FBQztZQUNqSCxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHFEQUFxRCxDQUFDO1lBQ2pHLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsNkNBQTZDLENBQUM7WUFDeEYsRUFBRTtTQUNGO1FBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsOERBQThELENBQUM7S0FDN0csQ0FDRCxDQUFDO0lBQ0YsNEJBQTRCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSxzREFDZCw4QkFBOEIsRUFDekUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQ1gsQ0FBQztJQUNGLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQiwwQ0FDbEIsa0JBQWtCLEVBQUUsSUFBSSxFQUN2RCxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDBEQUEwRCxDQUFDLEVBQUUsQ0FDN0csQ0FBQztJQUNGLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUNwQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSxnREFDZCx3QkFBd0IsRUFDN0QsQ0FBQyxFQUFFLENBQUMscURBQ0osRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwyRkFBMkYsQ0FBQyxFQUFFLENBQ3BKLENBQUM7SUFDRixvQkFBb0IsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsOENBQ2xCLHNCQUFzQixFQUFFLElBQUksRUFDL0QsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSwrREFBK0QsQ0FBQyxFQUFFLENBQ3RILENBQUM7SUFDRixxQkFBcUIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsK0NBQ2xCLHVCQUF1QixFQUFFLElBQUksRUFDakUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSw2S0FBNkssQ0FBQyxFQUFFLENBQ3JPLENBQUM7SUFDRixrQkFBa0IsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsNENBQ2xCLG9CQUFvQixFQUFFLElBQUksRUFDM0Q7UUFDQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxtRUFBbUUsQ0FBQztRQUNwSCxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU87S0FDMUIsQ0FDRCxDQUFDO0lBQ0Ysa0JBQWtCLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLDRDQUNsQixvQkFBb0IsRUFBRSxJQUFJLEVBQzNELEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsZ0ZBQWdGLENBQUMsRUFBRSxDQUNySSxDQUFDO0lBQ0YsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLDZDQUNsQixxQkFBcUIsRUFBRSxJQUFJLENBQzdELENBQUM7SUFDRixtQkFBbUIsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsNkNBQ3JCLHFCQUFxQixFQUN2RCxXQUErQyxFQUMvQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFVLEVBQ3pDO1FBQ0MsZ0JBQWdCLEVBQUU7WUFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxtQ0FBbUMsQ0FBQztZQUMvRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDZEQUE2RCxDQUFDO1lBQ3hHLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsbUVBQW1FLENBQUM7U0FDbEg7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw2REFBNkQsQ0FBQztLQUMvRyxDQUNELENBQUM7SUFDRixVQUFVLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLG9DQUNsQixZQUFZLEVBQUUsSUFBSSxFQUMzQyxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxxQ0FBcUMsQ0FBQyxFQUFFLENBQ2xGLENBQUM7SUFDRixjQUFjLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLHdDQUNsQixnQkFBZ0IsRUFBRSxJQUFJLEVBQ25ELEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsOENBQThDLENBQUMsRUFBRSxDQUMvRixDQUFDO0lBQ0YsVUFBVSxFQUFFLFFBQVEsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7SUFDNUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLElBQUksc0JBQXNCLDRDQUNyQixvQkFBb0IsRUFDckQsUUFBZ0QsRUFDaEQsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQVUsRUFDNUM7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHVEQUF1RCxDQUFDO1lBQy9GLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsbURBQW1ELENBQUM7WUFDOUYsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxtREFBbUQsQ0FBQztZQUM5RixHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLGtDQUFrQyxDQUFDO1NBQzNFO1FBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUscUZBQXFGLENBQUM7S0FDdEksQ0FDRCxDQUFDO0lBQ0YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ3hDLGVBQWUsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIseUNBQ2xCLGlCQUFpQixFQUFFLEtBQUssRUFDdEQsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSw2REFBNkQsQ0FBQyxFQUFFLENBQy9HLENBQUM7SUFDRixzQkFBc0IsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLGdEQUNkLHdCQUF3QixFQUM3RCxLQUFLLEVBQUUsQ0FBQyxDQUFDLG9EQUNULENBQUM7SUFDRixPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksYUFBYSxFQUFFLENBQUM7SUFDdEMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDbEQscUNBQXFDLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLCtEQUFxRCx1Q0FBdUMsRUFBRSxLQUFLLEVBQ3pLLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsdUhBQXVILENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbE0sZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLGVBQWUseUNBQ2QsaUJBQWlCLEVBQy9DLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUNWLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSw4RUFBOEUsRUFBRSxLQUFLLEVBQUUscUJBQXFCLENBQUMsRUFBRSxDQUN0SyxDQUFDO0lBQ0YsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSwyQ0FDZCxtQkFBbUIsRUFDbkQsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQ1YsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHdHQUF3RyxFQUFFLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLENBQ3BNLENBQUM7SUFDRiwwQkFBMEIsRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsb0RBQ2xCLDRCQUE0QixFQUFFLElBQUksRUFDM0UsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSwyRkFBMkYsQ0FBQyxFQUFFLENBQ3hKLENBQUM7SUFDRixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsMENBQ3JCLGtCQUFrQixFQUNqRCxPQUE0RCxFQUM1RCxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsc0JBQXNCLENBQVUsRUFDMUQ7UUFDQyx3QkFBd0IsRUFBRTtZQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHFDQUFxQyxDQUFDO1lBQzdFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUseUlBQXlJLENBQUM7WUFDeEwsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSwrSEFBK0gsQ0FBQztTQUN0TDtRQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDBFQUEwRSxDQUFDO0tBQ3pILENBQ0QsQ0FBQztJQUNGLGFBQWEsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsdUNBQ3JCLGVBQWUsRUFDM0MsS0FBc0MsRUFDdEMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBVSxFQUN0QztRQUNDLGdCQUFnQixFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsMEVBQTBFLENBQUM7WUFDNUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwwQkFBMEIsQ0FBQztZQUM3RCxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLG1HQUFtRyxDQUFDO1NBQy9JO1FBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLDBCQUEwQixDQUFDO0tBQ3RFLENBQ0QsQ0FBQztJQUNGLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLGtDQUNkLFVBQVUsRUFDakMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxvREFDTCxDQUFDO0lBQ0YsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUNsRCxzQkFBc0IsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsZ0RBQ3JCLHdCQUF3QixFQUM3RCxRQUFxQyxFQUNyQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFVLEVBQ2xDO1FBQ0MsZ0JBQWdCLEVBQUU7WUFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxxREFBcUQsQ0FBQztZQUNsRyxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHVDQUF1QyxDQUFDO1lBQ25GLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsZ0RBQWdELENBQUM7U0FDL0Y7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSw0REFBNEQsQ0FBQztLQUNqSCxDQUNELENBQUM7SUFDRixZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksbUJBQW1CLHNDQUNsQixjQUFjLEVBQUUsSUFBSSxDQUMvQyxDQUFDO0lBQ0YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixxQ0FDbEIsYUFBYSxFQUFFLElBQUksRUFDN0MsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsdUVBQXVFLENBQUMsRUFBRSxDQUNySCxDQUFDO0lBQ0YsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixtQ0FDckIsV0FBVyxFQUNuQyxRQUFnQyxFQUNoQyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQVUsRUFDOUI7UUFDQyx3QkFBd0IsRUFBRTtZQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLGtDQUFrQyxDQUFDO1lBQ3BFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUseUhBQXlILENBQUM7U0FDNUo7UUFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsNEVBQTRFLENBQUM7S0FDcEgsQ0FDRCxDQUFDO0lBQ0Ysb0JBQW9CLEVBQUUsUUFBUSxDQUFDLElBQUksb0JBQW9CLEVBQUUsQ0FBQztJQUMxRCxjQUFjLEVBQUUsUUFBUSxDQUFDLElBQUksa0JBQWtCLHdDQUNqQixnQkFBZ0IsRUFBRSxxQkFBcUIsRUFDcEUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxvR0FBb0csQ0FBQyxFQUFFLENBQ3JKLENBQUM7SUFDRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksc0JBQXNCLGtDQUNyQixVQUFVLEVBQ2pDLEtBQW9ELEVBQ3BELENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQVUsRUFDbkQ7UUFDQyx3QkFBd0IsRUFBRTtZQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSx3QkFBd0IsQ0FBQztZQUN0RCxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSx3Q0FBd0MsQ0FBQztZQUNyRSxHQUFHLENBQUMsUUFBUSxDQUFDO2dCQUNaLEdBQUcsRUFBRSx5QkFBeUI7Z0JBQzlCLE9BQU8sRUFBRTtvQkFDUixzRkFBc0Y7aUJBQ3RGO2FBQ0QsRUFBRSwrQ0FBK0MsQ0FBQztZQUNuRCxHQUFHLENBQUMsUUFBUSxDQUFDO2dCQUNaLEdBQUcsRUFBRSxrQkFBa0I7Z0JBQ3ZCLE9BQU8sRUFBRTtvQkFDUix1REFBdUQ7b0JBQ3ZELHNGQUFzRjtpQkFDdEY7YUFDRCxFQUFFLDJFQUEyRSxDQUFDO1NBQy9FO1FBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDekIsR0FBRyxFQUFFLFVBQVU7WUFDZixPQUFPLEVBQUU7Z0JBQ1IseUhBQXlIO2dCQUN6SCxzRkFBc0Y7YUFDdEY7U0FDRCxFQUFFLGlDQUFpQyxDQUFDO0tBQ3JDLENBQ0QsQ0FBQztJQUNGLDRCQUE0QixFQUFFLFFBQVEsQ0FBQyxJQUFJLGtCQUFrQixzREFDakIsOEJBQThCO0lBQ3pFLDhCQUE4QjtJQUM5Qix1R0FBdUcsQ0FDdkcsQ0FBQztJQUNGLDZCQUE2QixFQUFFLFFBQVEsQ0FBQyxJQUFJLGtCQUFrQix1REFDakIsK0JBQStCO0lBQzNFLDhCQUE4QjtJQUM5Qix3QkFBd0IsQ0FDeEIsQ0FBQztJQUNGLGNBQWMsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLHdDQUNkLGdCQUFnQixFQUM3QyxFQUFFLEVBQUUsQ0FBQyxxREFDTDtRQUNDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDakMsR0FBRyxFQUFFLGdCQUFnQjtZQUNyQixPQUFPLEVBQUU7Z0JBQ1IsZ0ZBQWdGO2dCQUNoRixrSEFBa0g7YUFDbEg7U0FDRCxFQUFFLHVHQUF1RyxDQUFDO0tBQzNHLENBQ0QsQ0FBQztJQUNGLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiwyQ0FDckIsbUJBQW1CLEVBQ25ELFNBQXFDLEVBQ3JDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLENBQVUsQ0FDakMsQ0FBQztJQUNGLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQiwyQ0FDckIsbUJBQW1CLEVBQ25ELFNBQXFDLEVBQ3JDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLENBQVUsQ0FDakMsQ0FBQztJQUVGLDJEQUEyRDtJQUMzRCxvQkFBb0IsRUFBRSxRQUFRLENBQUMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBQzFELGVBQWUsRUFBRSxRQUFRLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNoRCxzQkFBc0IsRUFBRSxRQUFRLENBQUMsSUFBSSxzQkFBc0IsZ0RBQ3JCLHdCQUF3QixFQUFFLE1BQXFDLEVBQ3BHLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQVUsRUFDcEM7UUFDQyxnQkFBZ0IsRUFBRTtZQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLGtGQUFrRixDQUFDO1lBQ3RJLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsdUNBQXVDLENBQUM7WUFDN0YsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxzQ0FBc0MsQ0FBQztTQUMzRjtRQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHNHQUFzRyxDQUFDO0tBQzNKLENBQ0QsQ0FBQztJQUNGLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO0lBQzVDLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxtQkFBbUIsc0NBQTRCLGNBQWMsRUFBRSxLQUFLLEVBQzlGLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsMkZBQTJGLENBQUMsRUFBRSxDQUNsSixDQUFDO0lBQ0YsVUFBVSxFQUFFLFFBQVEsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUM7SUFDcEQsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUM7SUFDeEQsY0FBYyxFQUFFLFFBQVEsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLENBQUM7SUFDcEQsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUNsRCx1Q0FBdUMsRUFBRSxRQUFRLENBQUMsSUFBSSx1Q0FBdUMsRUFBRSxDQUFDO0NBQ2hHLENBQUMifQ==