/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../base/browser/window.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { splitLines } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import './standalone-tokens.css';
import { FontMeasurements } from '../../browser/config/fontMeasurements.js';
import { EditorCommand } from '../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { createWebWorker as actualCreateWebWorker } from './standaloneWebWorker.js';
import { ApplyUpdateResult, ConfigurationChangedEvent, EditorOptions } from '../../common/config/editorOptions.js';
import { EditorZoom } from '../../common/config/editorZoom.js';
import { BareFontInfo, FontInfo } from '../../common/config/fontInfo.js';
import { EditorType } from '../../common/editorCommon.js';
import * as languages from '../../common/languages.js';
import { ILanguageService } from '../../common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../common/languages/modesRegistry.js';
import { NullState, nullTokenize } from '../../common/languages/nullTokenize.js';
import { FindMatch, TextModelResolvedOptions } from '../../common/model.js';
import { IModelService } from '../../common/services/model.js';
import * as standaloneEnums from '../../common/standalone/standaloneEnums.js';
import { Colorizer } from './colorizer.js';
import { StandaloneDiffEditor2, StandaloneEditor, createTextModel } from './standaloneCodeEditor.js';
import { StandaloneKeybindingService, StandaloneServices } from './standaloneServices.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { MenuId, MenuRegistry } from '../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { MultiDiffEditorWidget } from '../../browser/widget/multiDiffEditor/multiDiffEditorWidget.js';
/**
 * Create a new editor under `domElement`.
 * `domElement` should be empty (not contain other dom nodes).
 * The editor will read the size of `domElement`.
 */
export function create(domElement, options, override) {
    const instantiationService = StandaloneServices.initialize(override || {});
    return instantiationService.createInstance(StandaloneEditor, domElement, options);
}
/**
 * Emitted when an editor is created.
 * Creating a diff editor might cause this listener to be invoked with the two editors.
 * @event
 */
export function onDidCreateEditor(listener) {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.onCodeEditorAdd((editor) => {
        listener(editor);
    });
}
/**
 * Emitted when an diff editor is created.
 * @event
 */
export function onDidCreateDiffEditor(listener) {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.onDiffEditorAdd((editor) => {
        listener(editor);
    });
}
/**
 * Get all the created editors.
 */
export function getEditors() {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.listCodeEditors();
}
/**
 * Get all the created diff editors.
 */
export function getDiffEditors() {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.listDiffEditors();
}
/**
 * Create a new diff editor under `domElement`.
 * `domElement` should be empty (not contain other dom nodes).
 * The editor will read the size of `domElement`.
 */
export function createDiffEditor(domElement, options, override) {
    const instantiationService = StandaloneServices.initialize(override || {});
    return instantiationService.createInstance(StandaloneDiffEditor2, domElement, options);
}
export function createMultiFileDiffEditor(domElement, override) {
    const instantiationService = StandaloneServices.initialize(override || {});
    return new MultiDiffEditorWidget(domElement, {}, instantiationService);
}
/**
 * Add a command.
 */
export function addCommand(descriptor) {
    if ((typeof descriptor.id !== 'string') || (typeof descriptor.run !== 'function')) {
        throw new Error('Invalid command descriptor, `id` and `run` are required properties!');
    }
    return CommandsRegistry.registerCommand(descriptor.id, descriptor.run);
}
/**
 * Add an action to all editors.
 */
export function addEditorAction(descriptor) {
    if ((typeof descriptor.id !== 'string') || (typeof descriptor.label !== 'string') || (typeof descriptor.run !== 'function')) {
        throw new Error('Invalid action descriptor, `id`, `label` and `run` are required properties!');
    }
    const precondition = ContextKeyExpr.deserialize(descriptor.precondition);
    const run = (accessor, ...args) => {
        return EditorCommand.runEditorCommand(accessor, args, precondition, (accessor, editor, args) => Promise.resolve(descriptor.run(editor, ...args)));
    };
    const toDispose = new DisposableStore();
    // Register the command
    toDispose.add(CommandsRegistry.registerCommand(descriptor.id, run));
    // Register the context menu item
    if (descriptor.contextMenuGroupId) {
        const menuItem = {
            command: {
                id: descriptor.id,
                title: descriptor.label
            },
            when: precondition,
            group: descriptor.contextMenuGroupId,
            order: descriptor.contextMenuOrder || 0
        };
        toDispose.add(MenuRegistry.appendMenuItem(MenuId.EditorContext, menuItem));
    }
    // Register the keybindings
    if (Array.isArray(descriptor.keybindings)) {
        const keybindingService = StandaloneServices.get(IKeybindingService);
        if (!(keybindingService instanceof StandaloneKeybindingService)) {
            console.warn('Cannot add keybinding because the editor is configured with an unrecognized KeybindingService');
        }
        else {
            const keybindingsWhen = ContextKeyExpr.and(precondition, ContextKeyExpr.deserialize(descriptor.keybindingContext));
            toDispose.add(keybindingService.addDynamicKeybindings(descriptor.keybindings.map((keybinding) => {
                return {
                    keybinding,
                    command: descriptor.id,
                    when: keybindingsWhen
                };
            })));
        }
    }
    return toDispose;
}
/**
 * Add a keybinding rule.
 */
export function addKeybindingRule(rule) {
    return addKeybindingRules([rule]);
}
/**
 * Add keybinding rules.
 */
export function addKeybindingRules(rules) {
    const keybindingService = StandaloneServices.get(IKeybindingService);
    if (!(keybindingService instanceof StandaloneKeybindingService)) {
        console.warn('Cannot add keybinding because the editor is configured with an unrecognized KeybindingService');
        return Disposable.None;
    }
    return keybindingService.addDynamicKeybindings(rules.map((rule) => {
        return {
            keybinding: rule.keybinding,
            command: rule.command,
            commandArgs: rule.commandArgs,
            when: ContextKeyExpr.deserialize(rule.when),
        };
    }));
}
/**
 * Create a new editor model.
 * You can specify the language that should be set for this model or let the language be inferred from the `uri`.
 */
export function createModel(value, language, uri) {
    const languageService = StandaloneServices.get(ILanguageService);
    const languageId = languageService.getLanguageIdByMimeType(language) || language;
    return createTextModel(StandaloneServices.get(IModelService), languageService, value, languageId, uri);
}
/**
 * Change the language for a model.
 */
export function setModelLanguage(model, mimeTypeOrLanguageId) {
    const languageService = StandaloneServices.get(ILanguageService);
    const languageId = languageService.getLanguageIdByMimeType(mimeTypeOrLanguageId) || mimeTypeOrLanguageId || PLAINTEXT_LANGUAGE_ID;
    model.setLanguage(languageService.createById(languageId));
}
/**
 * Set the markers for a model.
 */
export function setModelMarkers(model, owner, markers) {
    if (model) {
        const markerService = StandaloneServices.get(IMarkerService);
        markerService.changeOne(owner, model.uri, markers);
    }
}
/**
 * Remove all markers of an owner.
 */
export function removeAllMarkers(owner) {
    const markerService = StandaloneServices.get(IMarkerService);
    markerService.changeAll(owner, []);
}
/**
 * Get markers for owner and/or resource
 *
 * @returns list of markers
 */
export function getModelMarkers(filter) {
    const markerService = StandaloneServices.get(IMarkerService);
    return markerService.read(filter);
}
/**
 * Emitted when markers change for a model.
 * @event
 */
export function onDidChangeMarkers(listener) {
    const markerService = StandaloneServices.get(IMarkerService);
    return markerService.onMarkerChanged(listener);
}
/**
 * Get the model that has `uri` if it exists.
 */
export function getModel(uri) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.getModel(uri);
}
/**
 * Get all the created models.
 */
export function getModels() {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.getModels();
}
/**
 * Emitted when a model is created.
 * @event
 */
export function onDidCreateModel(listener) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.onModelAdded(listener);
}
/**
 * Emitted right before a model is disposed.
 * @event
 */
export function onWillDisposeModel(listener) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.onModelRemoved(listener);
}
/**
 * Emitted when a different language is set to a model.
 * @event
 */
export function onDidChangeModelLanguage(listener) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.onModelLanguageChanged((e) => {
        listener({
            model: e.model,
            oldLanguage: e.oldLanguageId
        });
    });
}
/**
 * Create a new web worker that has model syncing capabilities built in.
 * Specify an AMD module to load that will `create` an object that will be proxied.
 */
export function createWebWorker(opts) {
    return actualCreateWebWorker(StandaloneServices.get(IModelService), opts);
}
/**
 * Colorize the contents of `domNode` using attribute `data-lang`.
 */
export function colorizeElement(domNode, options) {
    const languageService = StandaloneServices.get(ILanguageService);
    const themeService = StandaloneServices.get(IStandaloneThemeService);
    return Colorizer.colorizeElement(themeService, languageService, domNode, options).then(() => {
        themeService.registerEditorContainer(domNode);
    });
}
/**
 * Colorize `text` using language `languageId`.
 */
export function colorize(text, languageId, options) {
    const languageService = StandaloneServices.get(ILanguageService);
    const themeService = StandaloneServices.get(IStandaloneThemeService);
    themeService.registerEditorContainer(mainWindow.document.body);
    return Colorizer.colorize(languageService, text, languageId, options);
}
/**
 * Colorize a line in a model.
 */
export function colorizeModelLine(model, lineNumber, tabSize = 4) {
    const themeService = StandaloneServices.get(IStandaloneThemeService);
    themeService.registerEditorContainer(mainWindow.document.body);
    return Colorizer.colorizeModelLine(model, lineNumber, tabSize);
}
/**
 * @internal
 */
function getSafeTokenizationSupport(language) {
    const tokenizationSupport = languages.TokenizationRegistry.get(language);
    if (tokenizationSupport) {
        return tokenizationSupport;
    }
    return {
        getInitialState: () => NullState,
        tokenize: (line, hasEOL, state) => nullTokenize(language, state)
    };
}
/**
 * Tokenize `text` using language `languageId`
 */
export function tokenize(text, languageId) {
    // Needed in order to get the mode registered for subsequent look-ups
    languages.TokenizationRegistry.getOrCreate(languageId);
    const tokenizationSupport = getSafeTokenizationSupport(languageId);
    const lines = splitLines(text);
    const result = [];
    let state = tokenizationSupport.getInitialState();
    for (let i = 0, len = lines.length; i < len; i++) {
        const line = lines[i];
        const tokenizationResult = tokenizationSupport.tokenize(line, true, state);
        result[i] = tokenizationResult.tokens;
        state = tokenizationResult.endState;
    }
    return result;
}
/**
 * Define a new theme or update an existing theme.
 */
export function defineTheme(themeName, themeData) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    standaloneThemeService.defineTheme(themeName, themeData);
}
/**
 * Switches to a theme.
 */
export function setTheme(themeName) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    standaloneThemeService.setTheme(themeName);
}
/**
 * Clears all cached font measurements and triggers re-measurement.
 */
export function remeasureFonts() {
    FontMeasurements.clearAllFontInfos();
}
/**
 * Register a command.
 */
export function registerCommand(id, handler) {
    return CommandsRegistry.registerCommand({ id, handler });
}
/**
 * Registers a handler that is called when a link is opened in any editor. The handler callback should return `true` if the link was handled and `false` otherwise.
 * The handler that was registered last will be called first when a link is opened.
 *
 * Returns a disposable that can unregister the opener again.
 */
export function registerLinkOpener(opener) {
    const openerService = StandaloneServices.get(IOpenerService);
    return openerService.registerOpener({
        async open(resource) {
            if (typeof resource === 'string') {
                resource = URI.parse(resource);
            }
            return opener.open(resource);
        }
    });
}
/**
 * Registers a handler that is called when a resource other than the current model should be opened in the editor (e.g. "go to definition").
 * The handler callback should return `true` if the request was handled and `false` otherwise.
 *
 * Returns a disposable that can unregister the opener again.
 *
 * If no handler is registered the default behavior is to do nothing for models other than the currently attached one.
 */
export function registerEditorOpener(opener) {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.registerCodeEditorOpenHandler(async (input, source, sideBySide) => {
        if (!source) {
            return null;
        }
        const selection = input.options?.selection;
        let selectionOrPosition;
        if (selection && typeof selection.endLineNumber === 'number' && typeof selection.endColumn === 'number') {
            selectionOrPosition = selection;
        }
        else if (selection) {
            selectionOrPosition = { lineNumber: selection.startLineNumber, column: selection.startColumn };
        }
        if (await opener.openCodeEditor(source, input.resource, selectionOrPosition)) {
            return source; // return source editor to indicate that this handler has successfully handled the opening
        }
        return null; // fallback to other registered handlers
    });
}
/**
 * @internal
 */
export function createMonacoEditorAPI() {
    return {
        // methods
        create: create,
        getEditors: getEditors,
        getDiffEditors: getDiffEditors,
        onDidCreateEditor: onDidCreateEditor,
        onDidCreateDiffEditor: onDidCreateDiffEditor,
        createDiffEditor: createDiffEditor,
        addCommand: addCommand,
        addEditorAction: addEditorAction,
        addKeybindingRule: addKeybindingRule,
        addKeybindingRules: addKeybindingRules,
        createModel: createModel,
        setModelLanguage: setModelLanguage,
        setModelMarkers: setModelMarkers,
        getModelMarkers: getModelMarkers,
        removeAllMarkers: removeAllMarkers,
        onDidChangeMarkers: onDidChangeMarkers,
        getModels: getModels,
        getModel: getModel,
        onDidCreateModel: onDidCreateModel,
        onWillDisposeModel: onWillDisposeModel,
        onDidChangeModelLanguage: onDidChangeModelLanguage,
        createWebWorker: createWebWorker,
        colorizeElement: colorizeElement,
        colorize: colorize,
        colorizeModelLine: colorizeModelLine,
        tokenize: tokenize,
        defineTheme: defineTheme,
        setTheme: setTheme,
        remeasureFonts: remeasureFonts,
        registerCommand: registerCommand,
        registerLinkOpener: registerLinkOpener,
        registerEditorOpener: registerEditorOpener,
        // enums
        AccessibilitySupport: standaloneEnums.AccessibilitySupport,
        ContentWidgetPositionPreference: standaloneEnums.ContentWidgetPositionPreference,
        CursorChangeReason: standaloneEnums.CursorChangeReason,
        DefaultEndOfLine: standaloneEnums.DefaultEndOfLine,
        EditorAutoIndentStrategy: standaloneEnums.EditorAutoIndentStrategy,
        EditorOption: standaloneEnums.EditorOption,
        EndOfLinePreference: standaloneEnums.EndOfLinePreference,
        EndOfLineSequence: standaloneEnums.EndOfLineSequence,
        MinimapPosition: standaloneEnums.MinimapPosition,
        MinimapSectionHeaderStyle: standaloneEnums.MinimapSectionHeaderStyle,
        MouseTargetType: standaloneEnums.MouseTargetType,
        OverlayWidgetPositionPreference: standaloneEnums.OverlayWidgetPositionPreference,
        OverviewRulerLane: standaloneEnums.OverviewRulerLane,
        GlyphMarginLane: standaloneEnums.GlyphMarginLane,
        RenderLineNumbersType: standaloneEnums.RenderLineNumbersType,
        RenderMinimap: standaloneEnums.RenderMinimap,
        ScrollbarVisibility: standaloneEnums.ScrollbarVisibility,
        ScrollType: standaloneEnums.ScrollType,
        TextEditorCursorBlinkingStyle: standaloneEnums.TextEditorCursorBlinkingStyle,
        TextEditorCursorStyle: standaloneEnums.TextEditorCursorStyle,
        TrackedRangeStickiness: standaloneEnums.TrackedRangeStickiness,
        WrappingIndent: standaloneEnums.WrappingIndent,
        InjectedTextCursorStops: standaloneEnums.InjectedTextCursorStops,
        PositionAffinity: standaloneEnums.PositionAffinity,
        ShowLightbulbIconMode: standaloneEnums.ShowLightbulbIconMode,
        // classes
        ConfigurationChangedEvent: ConfigurationChangedEvent,
        BareFontInfo: BareFontInfo,
        FontInfo: FontInfo,
        TextModelResolvedOptions: TextModelResolvedOptions,
        FindMatch: FindMatch,
        ApplyUpdateResult: ApplyUpdateResult,
        EditorZoom: EditorZoom,
        createMultiFileDiffEditor: createMultiFileDiffEditor,
        // vars
        EditorType: EditorType,
        EditorOptions: EditorOptions
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sbUNBQW1DLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDakYsT0FBTyxFQUE4QyxlQUFlLElBQUkscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHekUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sS0FBSyxTQUFTLE1BQU0sMkJBQTJCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9D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