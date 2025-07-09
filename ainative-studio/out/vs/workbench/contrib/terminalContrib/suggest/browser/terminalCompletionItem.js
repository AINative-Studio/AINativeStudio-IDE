/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { SimpleCompletionItem } from '../../../../services/suggest/browser/simpleCompletionItem.js';
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
    // Kinds only for core
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestion"] = 100] = "InlineSuggestion";
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestionAlwaysOnTop"] = 101] = "InlineSuggestionAlwaysOnTop";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
export class TerminalCompletionItem extends SimpleCompletionItem {
    constructor(completion) {
        super(completion);
        this.completion = completion;
        /**
         * A penalty that applies to files or folders starting with the underscore character.
         */
        this.underscorePenalty = 0;
        /**
         * The file extension part from {@link labelLow}.
         */
        this.fileExtLow = '';
        // ensure lower-variants (perf)
        this.labelLowExcludeFileExt = this.labelLow;
        this.labelLowNormalizedPath = this.labelLow;
        if (isFile(completion)) {
            if (isWindows) {
                this.labelLow = this.labelLow.replaceAll('/', '\\');
            }
            // Don't include dotfiles as extensions when sorting
            const extIndex = this.labelLow.lastIndexOf('.');
            if (extIndex > 0) {
                this.labelLowExcludeFileExt = this.labelLow.substring(0, extIndex);
                this.fileExtLow = this.labelLow.substring(extIndex + 1);
            }
        }
        if (isFile(completion) || completion.kind === TerminalCompletionItemKind.Folder) {
            if (isWindows) {
                this.labelLowNormalizedPath = this.labelLow.replaceAll('\\', '/');
            }
            if (completion.kind === TerminalCompletionItemKind.Folder) {
                this.labelLowNormalizedPath = this.labelLowNormalizedPath.replace(/\/$/, '');
            }
            this.underscorePenalty = basename(this.labelLowNormalizedPath).startsWith('_') ? 1 : 0;
        }
    }
}
function isFile(completion) {
    return !!(completion.kind === TerminalCompletionItemKind.File || completion.isFileOverride);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uSXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3Rlcm1pbmFsQ29tcGxldGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRSxPQUFPLEVBQXFCLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFdkgsTUFBTSxDQUFOLElBQVksMEJBWVg7QUFaRCxXQUFZLDBCQUEwQjtJQUNyQywyRUFBUSxDQUFBO0lBQ1IsK0VBQVUsQ0FBQTtJQUNWLCtFQUFVLENBQUE7SUFDViw2RUFBUyxDQUFBO0lBQ1QsbUZBQVksQ0FBQTtJQUNaLCtFQUFVLENBQUE7SUFDVix5RkFBZSxDQUFBO0lBQ2YsMkVBQVEsQ0FBQTtJQUNSLHNCQUFzQjtJQUN0QixxR0FBc0IsQ0FBQTtJQUN0QiwySEFBaUMsQ0FBQTtBQUNsQyxDQUFDLEVBWlcsMEJBQTBCLEtBQTFCLDBCQUEwQixRQVlyQztBQTJCRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsb0JBQW9CO0lBc0IvRCxZQUNtQixVQUErQjtRQUVqRCxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFGQSxlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQVhsRDs7V0FFRztRQUNILHNCQUFpQixHQUFVLENBQUMsQ0FBQztRQUU3Qjs7V0FFRztRQUNILGVBQVUsR0FBVyxFQUFFLENBQUM7UUFPdkIsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBRTVDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDeEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBQ0Qsb0RBQW9EO1lBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hELElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakYsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25FLENBQUM7WUFDRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RSxDQUFDO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxTQUFTLE1BQU0sQ0FBQyxVQUErQjtJQUM5QyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsSUFBSSxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3RixDQUFDIn0=