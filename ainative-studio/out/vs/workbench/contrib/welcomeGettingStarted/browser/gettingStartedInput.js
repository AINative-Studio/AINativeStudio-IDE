/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/gettingStarted.css';
import { localize } from '../../../../nls.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { Schemas } from '../../../../base/common/network.js';
export const gettingStartedInputTypeId = 'workbench.editors.gettingStartedInput';
export class GettingStartedInput extends EditorInput {
    static { this.ID = gettingStartedInputTypeId; }
    static { this.RESOURCE = URI.from({ scheme: Schemas.walkThrough, authority: 'vscode_getting_started_page' }); }
    get typeId() {
        return GettingStartedInput.ID;
    }
    get editorId() {
        return this.typeId;
    }
    toUntyped() {
        return {
            resource: GettingStartedInput.RESOURCE,
            options: {
                override: GettingStartedInput.ID,
                pinned: false
            }
        };
    }
    get resource() {
        return GettingStartedInput.RESOURCE;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof GettingStartedInput) {
            return other.selectedCategory === this.selectedCategory;
        }
        return false;
    }
    constructor(options) {
        super();
        this._selectedCategory = options.selectedCategory;
        this._selectedStep = options.selectedStep;
        this._showTelemetryNotice = !!options.showTelemetryNotice;
        this._showWelcome = options.showWelcome ?? true;
        this._walkthroughPageTitle = options.walkthroughPageTitle;
    }
    getName() {
        return this.walkthroughPageTitle ? localize('walkthroughPageTitle', 'Walkthrough: {0}', this.walkthroughPageTitle) : localize('getStarted', "Welcome");
    }
    get selectedCategory() {
        return this._selectedCategory;
    }
    set selectedCategory(selectedCategory) {
        this._selectedCategory = selectedCategory;
        this._onDidChangeLabel.fire();
    }
    get selectedStep() {
        return this._selectedStep;
    }
    set selectedStep(selectedStep) {
        this._selectedStep = selectedStep;
    }
    get showTelemetryNotice() {
        return this._showTelemetryNotice;
    }
    set showTelemetryNotice(value) {
        this._showTelemetryNotice = value;
    }
    get showWelcome() {
        return this._showWelcome;
    }
    set showWelcome(value) {
        this._showWelcome = value;
    }
    get walkthroughPageTitle() {
        return this._walkthroughPageTitle;
    }
    set walkthroughPageTitle(value) {
        this._walkthroughPageTitle = value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZElucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSTdELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLHVDQUF1QyxDQUFDO0FBVWpGLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxXQUFXO2FBRW5DLE9BQUUsR0FBRyx5QkFBeUIsQ0FBQzthQUMvQixhQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUM7SUFPL0csSUFBYSxNQUFNO1FBQ2xCLE9BQU8sbUJBQW1CLENBQUMsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDcEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFUSxTQUFTO1FBQ2pCLE9BQU87WUFDTixRQUFRLEVBQUUsbUJBQW1CLENBQUMsUUFBUTtZQUN0QyxPQUFPLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sRUFBRSxLQUFLO2FBQ2I7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