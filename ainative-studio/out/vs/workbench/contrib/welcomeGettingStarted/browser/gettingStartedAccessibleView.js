import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { GettingStartedPage, inWelcomeContext } from './gettingStarted.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWalkthroughsService } from './gettingStartedService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { localize } from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { URI } from '../../../../base/common/uri.js';
import { parse } from '../../../../base/common/marshalling.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
export class GettingStartedAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 110;
        this.name = 'walkthroughs';
        this.when = inWelcomeContext;
        this.getProvider = (accessor) => {
            const editorService = accessor.get(IEditorService);
            const editorPane = editorService.activeEditorPane;
            if (!(editorPane instanceof GettingStartedPage)) {
                return;
            }
            const gettingStartedInput = editorPane.input;
            if (!(gettingStartedInput instanceof GettingStartedInput) || !gettingStartedInput.selectedCategory) {
                return;
            }
            const gettingStartedService = accessor.get(IWalkthroughsService);
            const currentWalkthrough = gettingStartedService.getWalkthrough(gettingStartedInput.selectedCategory);
            const currentStepIds = gettingStartedInput.selectedStep;
            if (currentWalkthrough) {
                return new GettingStartedAccessibleProvider(accessor.get(IContextKeyService), accessor.get(ICommandService), accessor.get(IOpenerService), editorPane, currentWalkthrough, currentStepIds);
            }
            return;
        };
    }
}
class GettingStartedAccessibleProvider extends Disposable {
    constructor(contextService, commandService, openerService, _gettingStartedPage, _walkthrough, _focusedStep) {
        super();
        this.contextService = contextService;
        this.commandService = commandService;
        this.openerService = openerService;
        this._gettingStartedPage = _gettingStartedPage;
        this._walkthrough = _walkthrough;
        this._focusedStep = _focusedStep;
        this._currentStepIndex = 0;
        this._activeWalkthroughSteps = [];
        this.id = "walkthrough" /* AccessibleViewProviderId.Walkthrough */;
        this.verbositySettingKey = "accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._activeWalkthroughSteps = _walkthrough.steps.filter(step => !step.when || this.contextService.contextMatchesRules(step.when));
    }
    get actions() {
        const actions = [];
        const step = this._activeWalkthroughSteps[this._currentStepIndex];
        const nodes = step.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => ({ href: node.href, label: node.label }))).flat();
        if (nodes.length === 1) {
            const node = nodes[0];
            actions.push(new Action('walthrough.step.action', node.label, ThemeIcon.asClassName(Codicon.run), true, () => {
                const isCommand = node.href.startsWith('command:');
                const command = node.href.replace(/command:(toSide:)?/, 'command:');
                if (isCommand) {
                    const commandURI = URI.parse(command);
                    let args = [];
                    try {
                        args = parse(decodeURIComponent(commandURI.query));
                    }
                    catch {
                        try {
                            args = parse(commandURI.query);
                        }
                        catch {
                            // ignore error
                        }
                    }
                    if (!Array.isArray(args)) {
                        args = [args];
                    }
                    this.commandService.executeCommand(commandURI.path, ...args);
                }
                else {
                    this.openerService.open(command, { allowCommands: true });
                }
            }));
        }
        return actions;
    }
    provideContent() {
        if (this._focusedStep) {
            const stepIndex = this._activeWalkthroughSteps.findIndex(step => step.id === this._focusedStep);
            if (stepIndex !== -1) {
                this._currentStepIndex = stepIndex;
            }
        }
        return this._getContent(this._walkthrough, this._activeWalkthroughSteps[this._currentStepIndex], /* includeTitle */ true);
    }
    _getContent(waltkrough, step, includeTitle) {
        const description = step.description.map(lt => lt.nodes.filter(node => typeof node === 'string')).join('\n');
        const stepsContent = localize('gettingStarted.step', '{0}\n{1}', step.title, description);
        if (includeTitle) {
            return [
                localize('gettingStarted.title', 'Title: {0}', waltkrough.title),
                localize('gettingStarted.description', 'Description: {0}', waltkrough.description),
                stepsContent
            ].join('\n');
        }
        else {
            return stepsContent;
        }
    }
    provideNextContent() {
        if (++this._currentStepIndex >= this._activeWalkthroughSteps.length) {
            --this._currentStepIndex;
            return;
        }
        return this._getContent(this._walkthrough, this._activeWalkthroughSteps[this._currentStepIndex]);
    }
    providePreviousContent() {
        if (--this._currentStepIndex < 0) {
            ++this._currentStepIndex;
            return;
        }
        return this._getContent(this._walkthrough, this._activeWalkthroughSteps[this._currentStepIndex]);
    }
    onClose() {
        if (this._currentStepIndex > -1) {
            const currentStep = this._activeWalkthroughSteps[this._currentStepIndex];
            this._gettingStartedPage.makeCategoryVisibleWhenAvailable(this._walkthrough.id, currentStep.id);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZEFjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQWtELG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFFckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsTUFBTSxPQUFPLDRCQUE0QjtJ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