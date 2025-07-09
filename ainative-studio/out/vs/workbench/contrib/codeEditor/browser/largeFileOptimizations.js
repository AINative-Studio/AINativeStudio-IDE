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
import * as nls from '../../../../nls.js';
import * as path from '../../../../base/common/path.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
/**
 * Shows a message when opening a large file which has been memory optimized (and features disabled).
 */
let LargeFileOptimizationsWarner = class LargeFileOptimizationsWarner extends Disposable {
    static { this.ID = 'editor.contrib.largeFileOptimizationsWarner'; }
    constructor(_editor, _notificationService, _configurationService) {
        super();
        this._editor = _editor;
        this._notificationService = _notificationService;
        this._configurationService = _configurationService;
        this._register(this._editor.onDidChangeModel((e) => this._update()));
        this._update();
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        if (model.isTooLargeForTokenization()) {
            const message = nls.localize({
                key: 'largeFile',
                comment: [
                    'Variable 0 will be a file name.'
                ]
            }, "{0}: tokenization, wrapping, folding, codelens, word highlighting and sticky scroll have been turned off for this large file in order to reduce memory usage and avoid freezing or crashing.", path.basename(model.uri.path));
            this._notificationService.prompt(Severity.Info, message, [
                {
                    label: nls.localize('removeOptimizations', "Forcefully Enable Features"),
                    run: () => {
                        this._configurationService.updateValue(`editor.largeFileOptimizations`, false).then(() => {
                            this._notificationService.info(nls.localize('reopenFilePrompt', "Please reopen file in order for this setting to take effect."));
                        }, (err) => {
                            this._notificationService.error(err);
                        });
                    }
                }
            ], { neverShowAgain: { id: 'editor.contrib.largeFileOptimizationsWarner' } });
        }
    }
};
LargeFileOptimizationsWarner = __decorate([
    __param(1, INotificationService),
    __param(2, IConfigurationService)
], LargeFileOptimizationsWarner);
export { LargeFileOptimizationsWarner };
registerEditorContribution(LargeFileOptimizationsWarner.ID, LargeFileOptimizationsWarner, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFyZ2VGaWxlT3B0aW1pemF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvbGFyZ2VGaWxlT3B0aW1pemF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU3SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFMUc7O0dBRUc7QUFDSSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFFcEMsT0FBRSxHQUFHLDZDQUE2QyxBQUFoRCxDQUFpRDtJQUUxRSxZQUNrQixPQUFvQixFQUNFLG9CQUEwQyxFQUN6QyxxQkFBNEM7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFKUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0UseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUN6QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSXBGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVPLE9BQU87UUFDZCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQzNCO2dCQUNDLEdBQUcsRUFBRSxXQUFXO2dCQUNoQixPQUFPLEVBQUU7b0JBQ1IsaUNBQWlDO2lCQUNqQzthQUNELEVBQ0QsOExBQThMLEVBQzlMLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FDN0IsQ0FBQztZQUVGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQ3hEO29CQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDRCQUE0QixDQUFDO29CQUN4RSxHQUFHLEVBQUUsR0FBRyxFQUFFO3dCQUNULElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTs0QkFDeEYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDhEQUE4RCxDQUFDLENBQUMsQ0FBQzt3QkFDbEksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7NEJBQ1YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDdEMsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQztpQkFDRDthQUNELEVBQUUsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLEVBQUUsNkNBQTZDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDL0UsQ0FBQztJQUNGLENBQUM7O0FBOUNXLDRCQUE0QjtJQU10QyxXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7R0FQWCw0QkFBNEIsQ0ErQ3hDOztBQUVELDBCQUEwQixDQUFDLDRCQUE0QixDQUFDLEVBQUUsRUFBRSw0QkFBNEIsMkRBQW1ELENBQUMifQ==