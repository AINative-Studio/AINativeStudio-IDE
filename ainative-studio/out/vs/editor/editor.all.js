/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './browser/coreCommands.js';
import './browser/widget/codeEditor/codeEditorWidget.js';
import './browser/widget/diffEditor/diffEditor.contribution.js';
import './contrib/anchorSelect/browser/anchorSelect.js';
import './contrib/bracketMatching/browser/bracketMatching.js';
import './contrib/caretOperations/browser/caretOperations.js';
import './contrib/caretOperations/browser/transpose.js';
import './contrib/clipboard/browser/clipboard.js';
import './contrib/codeAction/browser/codeActionContributions.js';
import './contrib/codelens/browser/codelensController.js';
import './contrib/colorPicker/browser/colorPickerContribution.js';
import './contrib/comment/browser/comment.js';
import './contrib/contextmenu/browser/contextmenu.js';
import './contrib/cursorUndo/browser/cursorUndo.js';
import './contrib/dnd/browser/dnd.js';
import './contrib/dropOrPasteInto/browser/copyPasteContribution.js';
import './contrib/dropOrPasteInto/browser/dropIntoEditorContribution.js';
import './contrib/find/browser/findController.js';
import './contrib/folding/browser/folding.js';
import './contrib/fontZoom/browser/fontZoom.js';
import './contrib/format/browser/formatActions.js';
import './contrib/documentSymbols/browser/documentSymbols.js';
import './contrib/inlineCompletions/browser/inlineCompletions.contribution.js';
import './contrib/inlineProgress/browser/inlineProgress.js';
import './contrib/gotoSymbol/browser/goToCommands.js';
import './contrib/gotoSymbol/browser/link/goToDefinitionAtPosition.js';
import './contrib/gotoError/browser/gotoError.js';
import './contrib/gpu/browser/gpuActions.js';
import './contrib/hover/browser/hoverContribution.js';
import './contrib/indentation/browser/indentation.js';
import './contrib/inlayHints/browser/inlayHintsContribution.js';
import './contrib/inPlaceReplace/browser/inPlaceReplace.js';
import './contrib/insertFinalNewLine/browser/insertFinalNewLine.js';
import './contrib/lineSelection/browser/lineSelection.js';
import './contrib/linesOperations/browser/linesOperations.js';
import './contrib/linkedEditing/browser/linkedEditing.js';
import './contrib/links/browser/links.js';
import './contrib/longLinesHelper/browser/longLinesHelper.js';
import './contrib/multicursor/browser/multicursor.js';
import './contrib/parameterHints/browser/parameterHints.js';
import './contrib/placeholderText/browser/placeholderText.contribution.js';
import './contrib/rename/browser/rename.js';
import './contrib/sectionHeaders/browser/sectionHeaders.js';
import './contrib/semanticTokens/browser/documentSemanticTokens.js';
import './contrib/semanticTokens/browser/viewportSemanticTokens.js';
import './contrib/smartSelect/browser/smartSelect.js';
import './contrib/snippet/browser/snippetController2.js';
import './contrib/stickyScroll/browser/stickyScrollContribution.js';
import './contrib/suggest/browser/suggestController.js';
import './contrib/suggest/browser/suggestInlineCompletions.js';
import './contrib/tokenization/browser/tokenization.js';
import './contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js';
import './contrib/unicodeHighlighter/browser/unicodeHighlighter.js';
import './contrib/unusualLineTerminators/browser/unusualLineTerminators.js';
import './contrib/wordHighlighter/browser/wordHighlighter.js';
import './contrib/wordOperations/browser/wordOperations.js';
import './contrib/wordPartOperations/browser/wordPartOperations.js';
import './contrib/readOnlyMessage/browser/contribution.js';
import './contrib/diffEditorBreadcrumbs/browser/contribution.js';
// Load up these strings even in VSCode, even if they are not used
// in order to get them translated
import './common/standaloneStrings.js';
import '../base/browser/ui/codicons/codiconStyles.js'; // The codicons are defined here and must be loaded
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmFsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvZWRpdG9yLmFsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8saURBQWlELENBQUM7QUFDekQsT0FBTyx3REFBd0QsQ0FBQztBQUNoRSxPQUFPLGdEQUFnRCxDQUFDO0FBQ3hELE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTyxzREFBc0QsQ0FBQztBQUM5RCxPQUFPLGdEQUFnRCxDQUFDO0FBQ3hELE9BQU8sMENBQTBDLENBQUM7QUFDbEQsT0FBTyx5REFBeUQsQ0FBQztBQUNqRSxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sMERBQTBELENBQUM7QUFDbEUsT0FBTyxzQ0FBc0MsQ0FBQztBQUM5QyxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8sNENBQTRDLENBQUM7QUFDcEQsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLDREQUE0RCxDQUFDO0FBQ3BFLE9BQU8saUVBQWlFLENBQUM7QUFDekUsT0FBTywwQ0FBMEMsQ0FBQztBQUNsRCxPQUFPLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sd0NBQXdDLENBQUM7QUFDaEQsT0FBTywyQ0FBMkMsQ0FBQztBQUNuRCxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sdUVBQXVFLENBQUM7QUFDL0UsT0FBTyxvREFBb0QsQ0FBQztBQUM1RCxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTywwQ0FBMEMsQ0FBQztBQUNsRCxPQUFPLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sOENBQThDLENBQUM7QUFDdEQsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLHdEQUF3RCxDQUFDO0FBQ2hFLE9BQU8sb0RBQW9ELENBQUM7QUFDNUQsT0FBTyw0REFBNEQsQ0FBQztBQUNwRSxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLG9EQUFvRCxDQUFDO0FBQzVELE9BQU8sbUVBQW1FLENBQUM7QUFDM0UsT0FBTyxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLG9EQUFvRCxDQUFDO0FBQzVELE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTyw0REFBNEQsQ0FBQztBQUNwRSxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8saURBQWlELENBQUM7QUFDekQsT0FBTyw0REFBNEQsQ0FBQztBQUNwRSxPQUFPLGdEQUFnRCxDQUFDO0FBQ3hELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyxnREFBZ0QsQ0FBQztBQUN4RCxPQUFPLDREQUE0RCxDQUFDO0FBQ3BFLE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTyxvRUFBb0UsQ0FBQztBQUM1RSxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sb0RBQW9ELENBQUM7QUFDNUQsT0FBTyw0REFBNEQsQ0FBQztBQUNwRSxPQUFPLG1EQUFtRCxDQUFDO0FBQzNELE9BQU8seURBQXlELENBQUM7QUFFakUsa0VBQWtFO0FBQ2xFLGtDQUFrQztBQUNsQyxPQUFPLCtCQUErQixDQUFDO0FBRXZDLE9BQU8sOENBQThDLENBQUMsQ0FBQyxtREFBbUQifQ==