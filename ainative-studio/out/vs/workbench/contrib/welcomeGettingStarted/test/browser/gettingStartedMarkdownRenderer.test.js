/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess } from '../../../../../base/common/network.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { GettingStartedDetailsRenderer } from '../../browser/gettingStartedDetailsRenderer.js';
import { convertInternalMediaPathToFileURI } from '../../browser/gettingStartedService.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
suite('Getting Started Markdown Renderer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('renders theme picker markdown with images', async () => {
        const fileService = new TestFileService();
        const languageService = new LanguageService();
        const renderer = new GettingStartedDetailsRenderer(fileService, new TestNotificationService(), new TestExtensionService(), languageService);
        const mdPath = convertInternalMediaPathToFileURI('theme_picker').with({ query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker' }) });
        const mdBase = FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/');
        const rendered = await renderer.renderMarkdown(mdPath, mdBase);
        const imageSrcs = [...rendered.matchAll(/img src="[^"]*"/g)].map(match => match[0]);
        for (const src of imageSrcs) {
            const targetSrcFormat = /^img src=".*\/vs\/workbench\/contrib\/welcomeGettingStarted\/common\/media\/.*.png"$/;
            assert(targetSrcFormat.test(src), `${src} didnt match regex`);
        }
        languageService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRNYXJrZG93blJlbmRlcmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL3Rlc3QvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZE1hcmtkb3duUmVuZGVyZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHeEYsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtJQUUvQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxXQUFXLEVBQUUsSUFBSSx1QkFBdUIsRUFBRSxFQUFFLElBQUksb0JBQW9CLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM1SSxNQUFNLE1BQU0sR0FBRyxpQ0FBaUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxzRUFBc0UsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZMLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsMERBQTBELENBQUMsQ0FBQztRQUNoRyxNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9ELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixLQUFLLE1BQU0sR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sZUFBZSxHQUFHLHNGQUFzRixDQUFDO1lBQy9HLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFDRCxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9