var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IIssueFormService } from '../common/issue.js';
import { BaseIssueReporterService } from './baseIssueReporterService.js';
// GitHub has let us know that we could up our limit here to 8k. We chose 7500 to play it safe.
// ref https://github.com/microsoft/vscode/issues/159191
let IssueWebReporter = class IssueWebReporter extends BaseIssueReporterService {
    constructor(disableExtensions, data, os, product, window, issueFormService, themeService, fileService, fileDialogService) {
        super(disableExtensions, data, os, product, window, true, issueFormService, themeService, fileService, fileDialogService);
        const target = this.window.document.querySelector('.block-system .block-info');
        const webInfo = this.window.navigator.userAgent;
        if (webInfo) {
            target?.appendChild(this.window.document.createTextNode(webInfo));
            this.receivedSystemInfo = true;
            this.issueReporterModel.update({ systemInfoWeb: webInfo });
        }
        this.setEventHandlers();
    }
    setEventHandlers() {
        super.setEventHandlers();
        this.addEventListener('issue-type', 'change', (event) => {
            const issueType = parseInt(event.target.value);
            this.issueReporterModel.update({ issueType: issueType });
            // Resets placeholder
            const descriptionTextArea = this.getElementById('issue-title');
            if (descriptionTextArea) {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', "Please enter a title");
            }
            this.updatePreviewButtonState();
            this.setSourceOptions();
            this.render();
        });
    }
};
IssueWebReporter = __decorate([
    __param(5, IIssueFormService),
    __param(6, IThemeService),
    __param(7, IFileService),
    __param(8, IFileDialogService)
], IssueWebReporter);
export { IssueWebReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZVJlcG9ydGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFLQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sb0JBQW9CLENBQUM7QUFDMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekUsK0ZBQStGO0FBQy9GLHdEQUF3RDtBQUVqRCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLHdCQUF3QjtJQUM3RCxZQUNDLGlCQUEwQixFQUMxQixJQUF1QixFQUN2QixFQUlDLEVBQ0QsT0FBOEIsRUFDOUIsTUFBYyxFQUNLLGdCQUFtQyxFQUN2QyxZQUEyQixFQUM1QixXQUF5QixFQUNuQixpQkFBcUM7UUFFekQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFILE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBYywyQkFBMkIsQ0FBQyxDQUFDO1FBRTVGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztRQUNoRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNsRSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1lBQy9CLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVlLGdCQUFnQjtRQUMvQixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUV6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxDQUFDLEtBQVksRUFBRSxFQUFFO1lBQzlELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBb0IsS0FBSyxDQUFDLE1BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFFekQscUJBQXFCO1lBQ3JCLE1BQU0sbUJBQW1CLEdBQXFCLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDakYsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixtQkFBbUIsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDNUYsQ0FBQztZQUVELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUFoRFksZ0JBQWdCO0lBVzFCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7R0FkUixnQkFBZ0IsQ0FnRDVCIn0=