/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { createCancelablePromise, raceCancellation } from '../../../../base/common/async.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorStateCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { isCodeEditor } from '../../../browser/editorBrowser.js';
import { EditorAction2 } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import * as corePosition from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { isLocationLink } from '../../../common/languages.js';
import { ReferencesController } from './peek/referencesController.js';
import { ReferencesModel } from './referencesModel.js';
import { ISymbolNavigationService } from './symbolNavigation.js';
import { MessageController } from '../../message/browser/messageController.js';
import { PeekContext } from '../../peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { getDeclarationsAtPosition, getDefinitionsAtPosition, getImplementationsAtPosition, getReferencesAtPosition, getTypeDefinitionsAtPosition } from './goToSymbol.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.EditorContextPeek,
    title: nls.localize('peek.submenu', "Peek"),
    group: 'navigation',
    order: 100
});
export class SymbolNavigationAnchor {
    static is(thing) {
        if (!thing || typeof thing !== 'object') {
            return false;
        }
        if (thing instanceof SymbolNavigationAnchor) {
            return true;
        }
        if (corePosition.Position.isIPosition(thing.position) && thing.model) {
            return true;
        }
        return false;
    }
    constructor(model, position) {
        this.model = model;
        this.position = position;
    }
}
export class SymbolNavigationAction extends EditorAction2 {
    static { this._allSymbolNavigationCommands = new Map(); }
    static { this._activeAlternativeCommands = new Set(); }
    static all() {
        return SymbolNavigationAction._allSymbolNavigationCommands.values();
    }
    static _patchConfig(opts) {
        const result = { ...opts, f1: true };
        // patch context menu when clause
        if (result.menu) {
            for (const item of Iterable.wrap(result.menu)) {
                if (item.id === MenuId.EditorContext || item.id === MenuId.EditorContextPeek) {
                    item.when = ContextKeyExpr.and(opts.precondition, item.when);
                }
            }
        }
        return result;
    }
    constructor(configuration, opts) {
        super(SymbolNavigationAction._patchConfig(opts));
        this.configuration = configuration;
        SymbolNavigationAction._allSymbolNavigationCommands.set(opts.id, this);
    }
    runEditorCommand(accessor, editor, arg, range) {
        if (!editor.hasModel()) {
            return Promise.resolve(undefined);
        }
        const notificationService = accessor.get(INotificationService);
        const editorService = accessor.get(ICodeEditorService);
        const progressService = accessor.get(IEditorProgressService);
        const symbolNavService = accessor.get(ISymbolNavigationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const instaService = accessor.get(IInstantiationService);
        const model = editor.getModel();
        const position = editor.getPosition();
        const anchor = SymbolNavigationAnchor.is(arg) ? arg : new SymbolNavigationAnchor(model, position);
        const cts = new EditorStateCancellationTokenSource(editor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
        const promise = raceCancellation(this._getLocationModel(languageFeaturesService, anchor.model, anchor.position, cts.token), cts.token).then(async (references) => {
            if (!references || cts.token.isCancellationRequested) {
                return;
            }
            alert(references.ariaMessage);
            let altAction;
            if (references.referenceAt(model.uri, position)) {
                const altActionId = this._getAlternativeCommand(editor);
                if (altActionId !== undefined && !SymbolNavigationAction._activeAlternativeCommands.has(altActionId) && SymbolNavigationAction._allSymbolNavigationCommands.has(altActionId)) {
                    altAction = SymbolNavigationAction._allSymbolNavigationCommands.get(altActionId);
                }
            }
            const referenceCount = references.references.length;
            if (referenceCount === 0) {
                // no result -> show message
                if (!this.configuration.muteMessage) {
                    const info = model.getWordAtPosition(position);
                    MessageController.get(editor)?.showMessage(this._getNoResultFoundMessage(info), position);
                }
            }
            else if (referenceCount === 1 && altAction) {
                // already at the only result, run alternative
                SymbolNavigationAction._activeAlternativeCommands.add(this.desc.id);
                instaService.invokeFunction((accessor) => altAction.runEditorCommand(accessor, editor, arg, range).finally(() => {
                    SymbolNavigationAction._activeAlternativeCommands.delete(this.desc.id);
                }));
            }
            else {
                // normal results handling
                return this._onResult(editorService, symbolNavService, editor, references, range);
            }
        }, (err) => {
            // report an error
            notificationService.error(err);
        }).finally(() => {
            cts.dispose();
        });
        progressService.showWhile(promise, 250);
        return promise;
    }
    async _onResult(editorService, symbolNavService, editor, model, range) {
        const gotoLocation = this._getGoToPreference(editor);
        if (!(editor instanceof EmbeddedCodeEditorWidget) && (this.configuration.openInPeek || (gotoLocation === 'peek' && model.references.length > 1))) {
            this._openInPeek(editor, model, range);
        }
        else {
            const next = model.firstReference();
            const peek = model.references.length > 1 && gotoLocation === 'gotoAndPeek';
            const targetEditor = await this._openReference(editor, editorService, next, this.configuration.openToSide, !peek);
            if (peek && targetEditor) {
                this._openInPeek(targetEditor, model, range);
            }
            else {
                model.dispose();
            }
            // keep remaining locations around when using
            // 'goto'-mode
            if (gotoLocation === 'goto') {
                symbolNavService.put(next);
            }
        }
    }
    async _openReference(editor, editorService, reference, sideBySide, highlight) {
        // range is the target-selection-range when we have one
        // and the fallback is the 'full' range
        let range = undefined;
        if (isLocationLink(reference)) {
            range = reference.targetSelectionRange;
        }
        if (!range) {
            range = reference.range;
        }
        if (!range) {
            return undefined;
        }
        const targetEditor = await editorService.openCodeEditor({
            resource: reference.uri,
            options: {
                selection: Range.collapseToStart(range),
                selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
                selectionSource: "code.jump" /* TextEditorSelectionSource.JUMP */
            }
        }, editor, sideBySide);
        if (!targetEditor) {
            return undefined;
        }
        if (highlight) {
            const modelNow = targetEditor.getModel();
            const decorations = targetEditor.createDecorationsCollection([{ range, options: { description: 'symbol-navigate-action-highlight', className: 'symbolHighlight' } }]);
            setTimeout(() => {
                if (targetEditor.getModel() === modelNow) {
                    decorations.clear();
                }
            }, 350);
        }
        return targetEditor;
    }
    _openInPeek(target, model, range) {
        const controller = ReferencesController.get(target);
        if (controller && target.hasModel()) {
            controller.toggleWidget(range ?? target.getSelection(), createCancelablePromise(_ => Promise.resolve(model)), this.configuration.openInPeek);
        }
        else {
            model.dispose();
        }
    }
}
//#region --- DEFINITION
export class DefinitionAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, position, false, token), nls.localize('def.title', 'Definitions'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('noResultWord', "No definition found for '{0}'", info.word)
            : nls.localize('generic.noResults', "No definition found");
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeDefinitionCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleDefinitions;
    }
}
registerAction2(class GoToDefinitionAction extends DefinitionAction {
    static { this.id = 'editor.action.revealDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: GoToDefinitionAction.id,
            title: {
                ...nls.localize2('actions.goToDecl.label', "Go to Definition"),
                mnemonicTitle: nls.localize({ key: 'miGotoDefinition', comment: ['&& denotes a mnemonic'] }, "Go to &&Definition"),
            },
            precondition: EditorContextKeys.hasDefinitionProvider,
            keybinding: [{
                    when: EditorContextKeys.editorTextFocus,
                    primary: 70 /* KeyCode.F12 */,
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }, {
                    when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, IsWebContext),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 70 /* KeyCode.F12 */,
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }],
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.1
                }, {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 2,
                }]
        });
        CommandsRegistry.registerCommandAlias('editor.action.goToDeclaration', GoToDefinitionAction.id);
    }
});
registerAction2(class OpenDefinitionToSideAction extends DefinitionAction {
    static { this.id = 'editor.action.revealDefinitionAside'; }
    constructor() {
        super({
            openToSide: true,
            openInPeek: false,
            muteMessage: false
        }, {
            id: OpenDefinitionToSideAction.id,
            title: nls.localize2('actions.goToDeclToSide.label', "Open Definition to the Side"),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDefinitionProvider, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: [{
                    when: EditorContextKeys.editorTextFocus,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 70 /* KeyCode.F12 */),
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }, {
                    when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, IsWebContext),
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 70 /* KeyCode.F12 */),
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }]
        });
        CommandsRegistry.registerCommandAlias('editor.action.openDeclarationToTheSide', OpenDefinitionToSideAction.id);
    }
});
registerAction2(class PeekDefinitionAction extends DefinitionAction {
    static { this.id = 'editor.action.peekDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: PeekDefinitionAction.id,
            title: nls.localize2('actions.previewDecl.label', "Peek Definition"),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDefinitionProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 70 /* KeyCode.F12 */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 68 /* KeyCode.F10 */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 2
            }
        });
        CommandsRegistry.registerCommandAlias('editor.action.previewDeclaration', PeekDefinitionAction.id);
    }
});
//#endregion
//#region --- DECLARATION
class DeclarationAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, position, false, token), nls.localize('decl.title', 'Declarations'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('decl.noResultWord', "No declaration found for '{0}'", info.word)
            : nls.localize('decl.generic.noResults', "No declaration found");
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeDeclarationCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleDeclarations;
    }
}
registerAction2(class GoToDeclarationAction extends DeclarationAction {
    static { this.id = 'editor.action.revealDeclaration'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: GoToDeclarationAction.id,
            title: {
                ...nls.localize2('actions.goToDeclaration.label', "Go to Declaration"),
                mnemonicTitle: nls.localize({ key: 'miGotoDeclaration', comment: ['&& denotes a mnemonic'] }, "Go to &&Declaration"),
            },
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDeclarationProvider, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.3
                }, {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 3,
                }],
        });
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('decl.noResultWord', "No declaration found for '{0}'", info.word)
            : nls.localize('decl.generic.noResults', "No declaration found");
    }
});
registerAction2(class PeekDeclarationAction extends DeclarationAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: 'editor.action.peekDeclaration',
            title: nls.localize2('actions.peekDecl.label', "Peek Declaration"),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDeclarationProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 3
            }
        });
    }
});
//#endregion
//#region --- TYPE DEFINITION
class TypeDefinitionAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, position, false, token), nls.localize('typedef.title', 'Type Definitions'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('goToTypeDefinition.noResultWord', "No type definition found for '{0}'", info.word)
            : nls.localize('goToTypeDefinition.generic.noResults', "No type definition found");
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeTypeDefinitionCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleTypeDefinitions;
    }
}
registerAction2(class GoToTypeDefinitionAction extends TypeDefinitionAction {
    static { this.ID = 'editor.action.goToTypeDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: GoToTypeDefinitionAction.ID,
            title: {
                ...nls.localize2('actions.goToTypeDefinition.label', "Go to Type Definition"),
                mnemonicTitle: nls.localize({ key: 'miGotoTypeDefinition', comment: ['&& denotes a mnemonic'] }, "Go to &&Type Definition"),
            },
            precondition: EditorContextKeys.hasTypeDefinitionProvider,
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.4
                }, {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 3,
                }]
        });
    }
});
registerAction2(class PeekTypeDefinitionAction extends TypeDefinitionAction {
    static { this.ID = 'editor.action.peekTypeDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: PeekTypeDefinitionAction.ID,
            title: nls.localize2('actions.peekTypeDefinition.label', "Peek Type Definition"),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasTypeDefinitionProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 4
            }
        });
    }
});
//#endregion
//#region --- IMPLEMENTATION
class ImplementationAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, position, false, token), nls.localize('impl.title', 'Implementations'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('goToImplementation.noResultWord', "No implementation found for '{0}'", info.word)
            : nls.localize('goToImplementation.generic.noResults', "No implementation found");
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeImplementationCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleImplementations;
    }
}
registerAction2(class GoToImplementationAction extends ImplementationAction {
    static { this.ID = 'editor.action.goToImplementation'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: GoToImplementationAction.ID,
            title: {
                ...nls.localize2('actions.goToImplementation.label', "Go to Implementations"),
                mnemonicTitle: nls.localize({ key: 'miGotoImplementation', comment: ['&& denotes a mnemonic'] }, "Go to &&Implementations"),
            },
            precondition: EditorContextKeys.hasImplementationProvider,
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 70 /* KeyCode.F12 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.45
                }, {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 4,
                }]
        });
    }
});
registerAction2(class PeekImplementationAction extends ImplementationAction {
    static { this.ID = 'editor.action.peekImplementation'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: PeekImplementationAction.ID,
            title: nls.localize2('actions.peekImplementation.label', "Peek Implementations"),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasImplementationProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 70 /* KeyCode.F12 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 5
            }
        });
    }
});
//#endregion
//#region --- REFERENCES
class ReferencesAction extends SymbolNavigationAction {
    _getNoResultFoundMessage(info) {
        return info
            ? nls.localize('references.no', "No references found for '{0}'", info.word)
            : nls.localize('references.noGeneric', "No references found");
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeReferenceCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleReferences;
    }
}
registerAction2(class GoToReferencesAction extends ReferencesAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: 'editor.action.goToReferences',
            title: {
                ...nls.localize2('goToReferences.label', "Go to References"),
                mnemonicTitle: nls.localize({ key: 'miGotoReference', comment: ['&& denotes a mnemonic'] }, "Go to &&References"),
            },
            precondition: ContextKeyExpr.and(EditorContextKeys.hasReferenceProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 70 /* KeyCode.F12 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.45
                }, {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 5,
                }]
        });
    }
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, true, false, token), nls.localize('ref.title', 'References'));
    }
});
registerAction2(class PeekReferencesAction extends ReferencesAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: 'editor.action.referenceSearch.trigger',
            title: nls.localize2('references.action.label', "Peek References"),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasReferenceProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 6
            }
        });
    }
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, false, false, token), nls.localize('ref.title', 'References'));
    }
});
//#endregion
//#region --- GENERIC goto symbols command
class GenericGoToLocationAction extends SymbolNavigationAction {
    constructor(config, _references, _gotoMultipleBehaviour) {
        super(config, {
            id: 'editor.action.goToLocation',
            title: nls.localize2('label.generic', "Go to Any Symbol"),
            precondition: ContextKeyExpr.and(PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
        });
        this._references = _references;
        this._gotoMultipleBehaviour = _gotoMultipleBehaviour;
    }
    async _getLocationModel(languageFeaturesService, _model, _position, _token) {
        return new ReferencesModel(this._references, nls.localize('generic.title', 'Locations'));
    }
    _getNoResultFoundMessage(info) {
        return info && nls.localize('generic.noResult', "No results for '{0}'", info.word) || '';
    }
    _getGoToPreference(editor) {
        return this._gotoMultipleBehaviour ?? editor.getOption(60 /* EditorOption.gotoLocation */).multipleReferences;
    }
    _getAlternativeCommand() {
        return undefined;
    }
}
CommandsRegistry.registerCommand({
    id: 'editor.action.goToLocations',
    metadata: {
        description: 'Go to locations from a position in a file',
        args: [
            { name: 'uri', description: 'The text document in which to start', constraint: URI },
            { name: 'position', description: 'The position at which to start', constraint: corePosition.Position.isIPosition },
            { name: 'locations', description: 'An array of locations.', constraint: Array },
            { name: 'multiple', description: 'Define what to do when having multiple results, either `peek`, `gotoAndPeek`, or `goto`' },
            { name: 'noResultsMessage', description: 'Human readable message that shows when locations is empty.' },
        ]
    },
    handler: async (accessor, resource, position, references, multiple, noResultsMessage, openInPeek) => {
        assertType(URI.isUri(resource));
        assertType(corePosition.Position.isIPosition(position));
        assertType(Array.isArray(references));
        assertType(typeof multiple === 'undefined' || typeof multiple === 'string');
        assertType(typeof openInPeek === 'undefined' || typeof openInPeek === 'boolean');
        const editorService = accessor.get(ICodeEditorService);
        const editor = await editorService.openCodeEditor({ resource }, editorService.getFocusedCodeEditor());
        if (isCodeEditor(editor)) {
            editor.setPosition(position);
            editor.revealPositionInCenterIfOutsideViewport(position, 0 /* ScrollType.Smooth */);
            return editor.invokeWithinContext(accessor => {
                const command = new class extends GenericGoToLocationAction {
                    _getNoResultFoundMessage(info) {
                        return noResultsMessage || super._getNoResultFoundMessage(info);
                    }
                }({
                    muteMessage: !Boolean(noResultsMessage),
                    openInPeek: Boolean(openInPeek),
                    openToSide: false
                }, references, multiple);
                accessor.get(IInstantiationService).invokeFunction(command.run.bind(command), editor);
            });
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'editor.action.peekLocations',
    metadata: {
        description: 'Peek locations from a position in a file',
        args: [
            { name: 'uri', description: 'The text document in which to start', constraint: URI },
            { name: 'position', description: 'The position at which to start', constraint: corePosition.Position.isIPosition },
            { name: 'locations', description: 'An array of locations.', constraint: Array },
            { name: 'multiple', description: 'Define what to do when having multiple results, either `peek`, `gotoAndPeek`, or `goto`' },
        ]
    },
    handler: async (accessor, resource, position, references, multiple) => {
        accessor.get(ICommandService).executeCommand('editor.action.goToLocations', resource, position, references, multiple, undefined, true);
    }
});
//#endregion
//#region --- REFERENCE search special commands
CommandsRegistry.registerCommand({
    id: 'editor.action.findReferences',
    handler: (accessor, resource, position) => {
        assertType(URI.isUri(resource));
        assertType(corePosition.Position.isIPosition(position));
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const codeEditorService = accessor.get(ICodeEditorService);
        return codeEditorService.openCodeEditor({ resource }, codeEditorService.getFocusedCodeEditor()).then(control => {
            if (!isCodeEditor(control) || !control.hasModel()) {
                return undefined;
            }
            const controller = ReferencesController.get(control);
            if (!controller) {
                return undefined;
            }
            const references = createCancelablePromise(token => getReferencesAtPosition(languageFeaturesService.referenceProvider, control.getModel(), corePosition.Position.lift(position), false, false, token).then(references => new ReferencesModel(references, nls.localize('ref.title', 'References'))));
            const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
            return Promise.resolve(controller.toggleWidget(range, references, false));
        });
    }
});
// use NEW command
CommandsRegistry.registerCommandAlias('editor.action.showReferences', 'editor.action.peekLocations');
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9nb1RvQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdGLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQXVCLGtDQUFrQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkgsT0FBTyxFQUFrQyxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTFHLE9BQU8sS0FBSyxZQUFZLE1BQU0sa0NBQWtDLENBQUM7QUFDakUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxjQUFjLEVBQTBCLE1BQU0sOEJBQThCLENBQUM7QUFDdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdEUsT0FB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