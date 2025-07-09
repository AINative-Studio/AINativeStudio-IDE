/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
export const CodeActionKind = new class {
    constructor() {
        this.QuickFix = new HierarchicalKind('quickfix');
        this.Refactor = new HierarchicalKind('refactor');
        this.RefactorExtract = this.Refactor.append('extract');
        this.RefactorInline = this.Refactor.append('inline');
        this.RefactorMove = this.Refactor.append('move');
        this.RefactorRewrite = this.Refactor.append('rewrite');
        this.Notebook = new HierarchicalKind('notebook');
        this.Source = new HierarchicalKind('source');
        this.SourceOrganizeImports = this.Source.append('organizeImports');
        this.SourceFixAll = this.Source.append('fixAll');
        this.SurroundWith = this.Refactor.append('surround');
    }
};
export var CodeActionAutoApply;
(function (CodeActionAutoApply) {
    CodeActionAutoApply["IfSingle"] = "ifSingle";
    CodeActionAutoApply["First"] = "first";
    CodeActionAutoApply["Never"] = "never";
})(CodeActionAutoApply || (CodeActionAutoApply = {}));
export var CodeActionTriggerSource;
(function (CodeActionTriggerSource) {
    CodeActionTriggerSource["Refactor"] = "refactor";
    CodeActionTriggerSource["RefactorPreview"] = "refactor preview";
    CodeActionTriggerSource["Lightbulb"] = "lightbulb";
    CodeActionTriggerSource["Default"] = "other (default)";
    CodeActionTriggerSource["SourceAction"] = "source action";
    CodeActionTriggerSource["QuickFix"] = "quick fix action";
    CodeActionTriggerSource["FixAll"] = "fix all";
    CodeActionTriggerSource["OrganizeImports"] = "organize imports";
    CodeActionTriggerSource["AutoFix"] = "auto fix";
    CodeActionTriggerSource["QuickFixHover"] = "quick fix hover window";
    CodeActionTriggerSource["OnSave"] = "save participants";
    CodeActionTriggerSource["ProblemsView"] = "problems view";
})(CodeActionTriggerSource || (CodeActionTriggerSource = {}));
export function mayIncludeActionsOfKind(filter, providedKind) {
    // A provided kind may be a subset or superset of our filtered kind.
    if (filter.include && !filter.include.intersects(providedKind)) {
        return false;
    }
    if (filter.excludes) {
        if (filter.excludes.some(exclude => excludesAction(providedKind, exclude, filter.include))) {
            return false;
        }
    }
    // Don't return source actions unless they are explicitly requested
    if (!filter.includeSourceActions && CodeActionKind.Source.contains(providedKind)) {
        return false;
    }
    return true;
}
export function filtersAction(filter, action) {
    const actionKind = action.kind ? new HierarchicalKind(action.kind) : undefined;
    // Filter out actions by kind
    if (filter.include) {
        if (!actionKind || !filter.include.contains(actionKind)) {
            return false;
        }
    }
    if (filter.excludes) {
        if (actionKind && filter.excludes.some(exclude => excludesAction(actionKind, exclude, filter.include))) {
            return false;
        }
    }
    // Don't return source actions unless they are explicitly requested
    if (!filter.includeSourceActions) {
        if (actionKind && CodeActionKind.Source.contains(actionKind)) {
            return false;
        }
    }
    if (filter.onlyIncludePreferredActions) {
        if (!action.isPreferred) {
            return false;
        }
    }
    return true;
}
function excludesAction(providedKind, exclude, include) {
    if (!exclude.contains(providedKind)) {
        return false;
    }
    if (include && exclude.contains(include)) {
        // The include is more specific, don't filter out
        return false;
    }
    return true;
}
export class CodeActionCommandArgs {
    static fromUser(arg, defaults) {
        if (!arg || typeof arg !== 'object') {
            return new CodeActionCommandArgs(defaults.kind, defaults.apply, false);
        }
        return new CodeActionCommandArgs(CodeActionCommandArgs.getKindFromUser(arg, defaults.kind), CodeActionCommandArgs.getApplyFromUser(arg, defaults.apply), CodeActionCommandArgs.getPreferredUser(arg));
    }
    static getApplyFromUser(arg, defaultAutoApply) {
        switch (typeof arg.apply === 'string' ? arg.apply.toLowerCase() : '') {
            case 'first': return "first" /* CodeActionAutoApply.First */;
            case 'never': return "never" /* CodeActionAutoApply.Never */;
            case 'ifsingle': return "ifSingle" /* CodeActionAutoApply.IfSingle */;
            default: return defaultAutoApply;
        }
    }
    static getKindFromUser(arg, defaultKind) {
        return typeof arg.kind === 'string'
            ? new HierarchicalKind(arg.kind)
            : defaultKind;
    }
    static getPreferredUser(arg) {
        return typeof arg.preferred === 'boolean'
            ? arg.preferred
            : false;
    }
    constructor(kind, apply, preferred) {
        this.kind = kind;
        this.apply = apply;
        this.preferred = preferred;
    }
}
export class CodeActionItem {
    constructor(action, provider, highlightRange) {
        this.action = action;
        this.provider = provider;
        this.highlightRange = highlightRange;
    }
    async resolve(token) {
        if (this.provider?.resolveCodeAction && !this.action.edit) {
            let action;
            try {
                action = await this.provider.resolveCodeAction(this.action, token);
            }
            catch (err) {
                onUnexpectedExternalError(err);
            }
            if (action) {
                this.action.edit = action.edit;
            }
        }
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9jb21tb24vdHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFLL0UsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLElBQUk7SUFBQTtRQUNqQixhQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU1QyxhQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELG1CQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsaUJBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWxELGFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTVDLFdBQU0sR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLDBCQUFxQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDOUQsaUJBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxpQkFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7Q0FBQSxDQUFDO0FBRUYsTUFBTSxDQUFOLElBQWtCLG1CQUlqQjtBQUpELFdBQWtCLG1CQUFtQjtJQUNwQyw0Q0FBcUIsQ0FBQTtJQUNyQixzQ0FBZSxDQUFBO0lBQ2Ysc0NBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFJcEM7QUFFRCxNQUFNLENBQU4sSUFBWSx1QkFhWDtBQWJELFdBQVksdUJBQXVCO0lBQ2xDLGdEQUFxQixDQUFBO0lBQ3JCLCtEQUFvQyxDQUFBO0lBQ3BDLGtEQUF1QixDQUFBO0lBQ3ZCLHNEQUEyQixDQUFBO0lBQzNCLHlEQUE4QixDQUFBO0lBQzlCLHdEQUE2QixDQUFBO0lBQzdCLDZDQUFrQixDQUFBO0lBQ2xCLCtEQUFvQyxDQUFBO0lBQ3BDLCtDQUFvQixDQUFBO0lBQ3BCLG1FQUF3QyxDQUFBO0lBQ3hDLHVEQUE0QixDQUFBO0lBQzVCLHlEQUE4QixDQUFBO0FBQy9CLENBQUMsRUFiVyx1QkFBdUIsS0FBdkIsdUJBQXVCLFFBYWxDO0FBU0QsTUFBTSxVQUFVLHVCQUF1QixDQUFDLE1BQXdCLEVBQUUsWUFBOEI7SUFDL0Ysb0VBQW9FO0lBQ3BFLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDaEUsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckIsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDNUYsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVELG1FQUFtRTtJQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDbEYsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxNQUF3QixFQUFFLE1BQTRCO0lBQ25GLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFFL0UsNkJBQTZCO0lBQzdCLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3pELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQixJQUFJLFVBQVUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDeEcsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVELG1FQUFtRTtJQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDbEMsSUFBSSxVQUFVLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxZQUE4QixFQUFFLE9BQXlCLEVBQUUsT0FBcUM7SUFDdkgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUNyQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDMUMsaURBQWlEO1FBQ2pELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQWFELE1BQU0sT0FBTyxxQkFBcUI7SUFDMUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFRLEVBQUUsUUFBZ0U7UUFDaEcsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFDRCxPQUFPLElBQUkscUJBQXFCLENBQy9CLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUN6RCxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUMzRCxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBUSxFQUFFLGdCQUFxQztRQUM5RSxRQUFRLE9BQU8sR0FBRyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RFLEtBQUssT0FBTyxDQUFDLENBQUMsK0NBQWlDO1lBQy9DLEtBQUssT0FBTyxDQUFDLENBQUMsK0NBQWlDO1lBQy9DLEtBQUssVUFBVSxDQUFDLENBQUMscURBQW9DO1lBQ3JELE9BQU8sQ0FBQyxDQUFDLE9BQU8sZ0JBQWdCLENBQUM7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQVEsRUFBRSxXQUE2QjtRQUNyRSxPQUFPLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRO1lBQ2xDLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDaEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztJQUNoQixDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQVE7UUFDdkMsT0FBTyxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssU0FBUztZQUN4QyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVM7WUFDZixDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ1YsQ0FBQztJQUVELFlBQ2lCLElBQXNCLEVBQ3RCLEtBQTBCLEVBQzFCLFNBQWtCO1FBRmxCLFNBQUksR0FBSixJQUFJLENBQWtCO1FBQ3RCLFVBQUssR0FBTCxLQUFLLENBQXFCO1FBQzFCLGNBQVMsR0FBVCxTQUFTLENBQVM7SUFDL0IsQ0FBQztDQUNMO0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFFMUIsWUFDaUIsTUFBNEIsRUFDNUIsUUFBa0QsRUFDM0QsY0FBd0I7UUFGZixXQUFNLEdBQU4sTUFBTSxDQUFzQjtRQUM1QixhQUFRLEdBQVIsUUFBUSxDQUEwQztRQUMzRCxtQkFBYyxHQUFkLGNBQWMsQ0FBVTtJQUM1QixDQUFDO0lBRUwsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUF3QjtRQUNyQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNELElBQUksTUFBK0MsQ0FBQztZQUNwRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BFLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCJ9