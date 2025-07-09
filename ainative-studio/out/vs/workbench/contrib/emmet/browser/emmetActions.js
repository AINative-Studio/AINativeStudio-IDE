/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction } from '../../../../editor/browser/editorExtensions.js';
import { grammarsExtPoint } from '../../../services/textMate/common/TMGrammars.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
class GrammarContributions {
    static { this._grammars = {}; }
    constructor(contributions) {
        if (!Object.keys(GrammarContributions._grammars).length) {
            this.fillModeScopeMap(contributions);
        }
    }
    fillModeScopeMap(contributions) {
        contributions.forEach((contribution) => {
            contribution.value.forEach((grammar) => {
                if (grammar.language && grammar.scopeName) {
                    GrammarContributions._grammars[grammar.language] = grammar.scopeName;
                }
            });
        });
    }
    getGrammar(mode) {
        return GrammarContributions._grammars[mode];
    }
}
export class EmmetEditorAction extends EditorAction {
    constructor(opts) {
        super(opts);
        this._lastGrammarContributions = null;
        this._lastExtensionService = null;
        this.emmetActionName = opts.actionName;
    }
    static { this.emmetSupportedModes = ['html', 'css', 'xml', 'xsl', 'haml', 'jade', 'jsx', 'slim', 'scss', 'sass', 'less', 'stylus', 'styl', 'svg']; }
    _withGrammarContributions(extensionService) {
        if (this._lastExtensionService !== extensionService) {
            this._lastExtensionService = extensionService;
            this._lastGrammarContributions = extensionService.readExtensionPointContributions(grammarsExtPoint).then((contributions) => {
                return new GrammarContributions(contributions);
            });
        }
        return this._lastGrammarContributions || Promise.resolve(null);
    }
    run(accessor, editor) {
        const extensionService = accessor.get(IExtensionService);
        const commandService = accessor.get(ICommandService);
        return this._withGrammarContributions(extensionService).then((grammarContributions) => {
            if (this.id === 'editor.emmet.action.expandAbbreviation' && grammarContributions) {
                return commandService.executeCommand('emmet.expandAbbreviation', EmmetEditorAction.getLanguage(editor, grammarContributions));
            }
            return undefined;
        });
    }
    static getLanguage(editor, grammars) {
        const model = editor.getModel();
        const selection = editor.getSelection();
        if (!model || !selection) {
            return null;
        }
        const position = selection.getStartPosition();
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const languageId = model.getLanguageIdAtPosition(position.lineNumber, position.column);
        const syntax = languageId.split('.').pop();
        if (!syntax) {
            return null;
        }
        const checkParentMode = () => {
            const languageGrammar = grammars.getGrammar(syntax);
            if (!languageGrammar) {
                return syntax;
            }
            const languages = languageGrammar.split('.');
            if (languages.length < 2) {
                return syntax;
            }
            for (let i = 1; i < languages.length; i++) {
                const language = languages[languages.length - i];
                if (this.emmetSupportedModes.indexOf(language) !== -1) {
                    return language;
                }
            }
            return syntax;
        };
        return {
            language: syntax,
            parentMode: checkParentMode()
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1tZXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VtbWV0L2Jyb3dzZXIvZW1tZXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQW9DLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLGdCQUFnQixFQUEyQixNQUFNLGlEQUFpRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxpQkFBaUIsRUFBOEIsTUFBTSxtREFBbUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFXbkYsTUFBTSxvQkFBb0I7YUFFVixjQUFTLEdBQWlCLEVBQUUsQ0FBQztJQUU1QyxZQUFZLGFBQXNFO1FBQ2pGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLGFBQXNFO1FBQzlGLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtZQUN0QyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUN0QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUMzQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7Z0JBQ3RFLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMs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