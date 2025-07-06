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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmFsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2VkaXRvci5hbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLGlEQUFpRCxDQUFDO0FBQ3pELE9BQU8sd0RBQXdELENBQUM7QUFDaEUsT0FBTyxnREFBZ0QsQ0FBQztBQUN4RCxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTyxnREFBZ0QsQ0FBQztBQUN4RCxPQUFPLDBDQUEwQyxDQUFDO0FBQ2xELE9BQU8seURBQXlELENBQUM7QUFDakUsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLDBEQUEwRCxDQUFDO0FBQ2xFLE9BQU8sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLDRDQUE0QyxDQUFDO0FBQ3BELE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyw0REFBNEQsQ0FBQztBQUNwRSxPQUFPLGlFQUFpRSxDQUFDO0FBQ3pFLE9BQU8sMENBQTBDLENBQUM7QUFDbEQsT0FBTyxzQ0FBc0MsQ0FBQztBQUM5QyxPQUFPLHdDQUF3QyxDQUFDO0FBQ2hELE9BQU8sMkNBQTJDLENBQUM7QUFDbkQsT0FBTyxzREFBc0QsQ0FBQztBQUM5RCxPQUFPLHVFQUF1RSxDQUFDO0FBQy9FLE9BQU8sb0RBQW9ELENBQUM7QUFDNUQsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sMENBQTBDLENBQUM7QUFDbEQsT0FBTyxxQ0FBcUMsQ0FBQztBQUM3QyxPQUFPLDhDQUE4QyxDQUFDO0FBQ3RELE9BQU8sOENBQThDLENBQUM7QUFDdEQsT0FBTyx3REFBd0QsQ0FBQztBQUNoRSxPQUFPLG9EQUFvRCxDQUFDO0FBQzVELE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sa0RBQWtELENBQUM7QUFDMUQsT0FBTyxrQ0FBa0MsQ0FBQztBQUMxQyxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sOENBQThDLENBQUM7QUFDdEQsT0FBTyxvREFBb0QsQ0FBQztBQUM1RCxPQUFPLG1FQUFtRSxDQUFDO0FBQzNFLE9BQU8sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyxvREFBb0QsQ0FBQztBQUM1RCxPQUFPLDREQUE0RCxDQUFDO0FBQ3BFLE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLGlEQUFpRCxDQUFDO0FBQ3pELE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTyxnREFBZ0QsQ0FBQztBQUN4RCxPQUFPLHVEQUF1RCxDQUFDO0FBQy9ELE9BQU8sZ0RBQWdELENBQUM7QUFDeEQsT0FBTyw0REFBNEQsQ0FBQztBQUNwRSxPQUFPLDREQUE0RCxDQUFDO0FBQ3BFLE9BQU8sb0VBQW9FLENBQUM7QUFDNUUsT0FBTyxzREFBc0QsQ0FBQztBQUM5RCxPQUFPLG9EQUFvRCxDQUFDO0FBQzVELE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTyxtREFBbUQsQ0FBQztBQUMzRCxPQUFPLHlEQUF5RCxDQUFDO0FBRWpFLGtFQUFrRTtBQUNsRSxrQ0FBa0M7QUFDbEMsT0FBTywrQkFBK0IsQ0FBQztBQUV2QyxPQUFPLDhDQUE4QyxDQUFDLENBQUMsbURBQW1EIn0=