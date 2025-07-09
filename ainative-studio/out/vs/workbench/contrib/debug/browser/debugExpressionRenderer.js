/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as dom from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Expression, ExpressionContainer, Variable } from '../common/debugModel.js';
import { ReplEvaluationResult } from '../common/replModel.js';
import { splitExpressionOrScopeHighlights } from './baseDebugView.js';
import { handleANSIOutput } from './debugANSIHandling.js';
import { COPY_EVALUATE_PATH_ID, COPY_VALUE_ID } from './debugCommands.js';
import { LinkDetector } from './linkDetector.js';
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
const booleanRegex = /^(true|false)$/i;
const stringRegex = /^(['"]).*\1$/;
var Cls;
(function (Cls) {
    Cls["Value"] = "value";
    Cls["Unavailable"] = "unavailable";
    Cls["Error"] = "error";
    Cls["Changed"] = "changed";
    Cls["Boolean"] = "boolean";
    Cls["String"] = "string";
    Cls["Number"] = "number";
})(Cls || (Cls = {}));
const allClasses = Object.keys({
    ["value" /* Cls.Value */]: 0,
    ["unavailable" /* Cls.Unavailable */]: 0,
    ["error" /* Cls.Error */]: 0,
    ["changed" /* Cls.Changed */]: 0,
    ["boolean" /* Cls.Boolean */]: 0,
    ["string" /* Cls.String */]: 0,
    ["number" /* Cls.Number */]: 0,
});
let DebugExpressionRenderer = class DebugExpressionRenderer {
    constructor(commandService, configurationService, instantiationService, hoverService) {
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.linkDetector = instantiationService.createInstance(LinkDetector);
        this.displayType = observableConfigValue('debug.showVariableTypes', false, configurationService);
    }
    renderVariable(data, variable, options = {}) {
        const displayType = this.displayType.get();
        const highlights = splitExpressionOrScopeHighlights(variable, options.highlights || []);
        if (variable.available) {
            data.type.textContent = '';
            let text = variable.name;
            if (variable.value && typeof variable.name === 'string') {
                if (variable.type && displayType) {
                    text += ': ';
                    data.type.textContent = variable.type + ' =';
                }
                else {
                    text += ' =';
                }
            }
            data.label.set(text, highlights.name, variable.type && !displayType ? variable.type : variable.name);
            data.name.classList.toggle('virtual', variable.presentationHint?.kind === 'virtual');
            data.name.classList.toggle('internal', variable.presentationHint?.visibility === 'internal');
        }
        else if (variable.value && typeof variable.name === 'string' && variable.name) {
            data.label.set(':');
        }
        data.expression.classList.toggle('lazy', !!variable.presentationHint?.lazy);
        const commands = [
            { id: COPY_VALUE_ID, args: [variable, [variable]] }
        ];
        if (variable.evaluateName) {
            commands.push({ id: COPY_EVALUATE_PATH_ID, args: [{ variable }] });
        }
        return this.renderValue(data.value, variable, {
            showChanged: options.showChanged,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            hover: { commands },
            highlights: highlights.value,
            colorize: true,
            session: variable.getSession(),
        });
    }
    renderValue(container, expressionOrValue, options = {}) {
        const store = new DisposableStore();
        // Use remembered capabilities so REPL elements can render even once a session ends
        const supportsANSI = options.session?.rememberedCapabilities?.supportsANSIStyling ?? options.wasANSI ?? false;
        let value = typeof expressionOrValue === 'string' ? expressionOrValue : expressionOrValue.value;
        // remove stale classes
        for (const cls of allClasses) {
            container.classList.remove(cls);
        }
        container.classList.add("value" /* Cls.Value */);
        // when resolving expressions we represent errors from the server as a variable with name === null.
        if (value === null || ((expressionOrValue instanceof Expression || expressionOrValue instanceof Variable || expressionOrValue instanceof ReplEvaluationResult) && !expressionOrValue.available)) {
            container.classList.add("unavailable" /* Cls.Unavailable */);
            if (value !== Expression.DEFAULT_VALUE) {
                container.classList.add("error" /* Cls.Error */);
            }
        }
        else {
            if (typeof expressionOrValue !== 'string' && options.showChanged && expressionOrValue.valueChanged && value !== Expression.DEFAULT_VALUE) {
                // value changed color has priority over other colors.
                container.classList.add("changed" /* Cls.Changed */);
                expressionOrValue.valueChanged = false;
            }
            if (options.colorize && typeof expressionOrValue !== 'string') {
                if (expressionOrValue.type === 'number' || expressionOrValue.type === 'boolean' || expressionOrValue.type === 'string') {
                    container.classList.add(expressionOrValue.type);
                }
                else if (!isNaN(+value)) {
                    container.classList.add("number" /* Cls.Number */);
                }
                else if (booleanRegex.test(value)) {
                    container.classList.add("boolean" /* Cls.Boolean */);
                }
                else if (stringRegex.test(value)) {
                    container.classList.add("string" /* Cls.String */);
                }
            }
        }
        if (options.maxValueLength && value && value.length > options.maxValueLength) {
            value = value.substring(0, options.maxValueLength) + '...';
        }
        if (!value) {
            value = '';
        }
        const session = options.session ?? ((expressionOrValue instanceof ExpressionContainer) ? expressionOrValue.getSession() : undefined);
        // Only use hovers for links if thre's not going to be a hover for the value.
        const hoverBehavior = options.hover === false ? { type: 0 /* DebugLinkHoverBehavior.Rich */, store } : { type: 2 /* DebugLinkHoverBehavior.None */ };
        dom.clearNode(container);
        const locationReference = options.locationReference ?? (expressionOrValue instanceof ExpressionContainer && expressionOrValue.valueLocationReference);
        let linkDetector = this.linkDetector;
        if (locationReference && session) {
            linkDetector = this.linkDetector.makeReferencedLinkDetector(locationReference, session);
        }
        if (supportsANSI) {
            container.appendChild(handleANSIOutput(value, linkDetector, session ? session.root : undefined, options.highlights));
        }
        else {
            container.appendChild(linkDetector.linkify(value, false, session?.root, true, hoverBehavior, options.highlights));
        }
        if (options.hover !== false) {
            const { commands = [] } = options.hover || {};
            store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), container, () => {
                const container = dom.$('div');
                const markdownHoverElement = dom.$('div.hover-row');
                const hoverContentsElement = dom.append(markdownHoverElement, dom.$('div.hover-contents'));
                const hoverContentsPre = dom.append(hoverContentsElement, dom.$('pre.debug-var-hover-pre'));
                if (supportsANSI) {
                    // note: intentionally using `this.linkDetector` so we don't blindly linkify the
                    // entire contents and instead only link file paths that it contains.
                    hoverContentsPre.appendChild(handleANSIOutput(value, this.linkDetector, session ? session.root : undefined, options.highlights));
                }
                else {
                    hoverContentsPre.textContent = value;
                }
                container.appendChild(markdownHoverElement);
                return container;
            }, {
                actions: commands.map(({ id, args }) => {
                    const description = CommandsRegistry.getCommand(id)?.metadata?.description;
                    return {
                        label: typeof description === 'string' ? description : description ? description.value : id,
                        commandId: id,
                        run: () => this.commandService.executeCommand(id, ...args),
                    };
                })
            }));
        }
        return store;
    }
};
DebugExpressionRenderer = __decorate([
    __param(0, ICommandService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IHoverService)
], DebugExpressionRenderer);
export { DebugExpressionRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFeHByZXNzaW9uUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0V4cHJlc3Npb25SZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBRTFHLE9BQU8sRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDOUQsT0FBTyxFQUF5QixnQ0FBZ0MsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMxRSxPQUFPLEVBQXlFLFlBQVksRUFBRSxNQUFNLG1C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