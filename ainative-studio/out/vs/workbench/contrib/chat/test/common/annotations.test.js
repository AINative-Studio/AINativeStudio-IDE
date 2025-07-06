/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { annotateSpecialMarkdownContent, extractVulnerabilitiesFromText } from '../../common/annotations.js';
function content(str) {
    return { kind: 'markdownContent', content: new MarkdownString(str) };
}
suite('Annotations', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('extractVulnerabilitiesFromText', () => {
        test('single line', async () => {
            const before = 'some code ';
            const vulnContent = 'content with vuln';
            const after = ' after';
            const annotatedResult = annotateSpecialMarkdownContent([content(before), { kind: 'markdownVuln', content: new MarkdownString(vulnContent), vulnerabilities: [{ title: 'title', description: 'vuln' }] }, content(after)]);
            await assertSnapshot(annotatedResult);
            const markdown = annotatedResult[0];
            const result = extractVulnerabilitiesFromText(markdown.content.value);
            await assertSnapshot(result);
        });
        test('multiline', async () => {
            const before = 'some code\nover\nmultiple lines ';
            const vulnContent = 'content with vuln\nand\nnewlines';
            const after = 'more code\nwith newline';
            const annotatedResult = annotateSpecialMarkdownContent([content(before), { kind: 'markdownVuln', content: new MarkdownString(vulnContent), vulnerabilities: [{ title: 'title', description: 'vuln' }] }, content(after)]);
            await assertSnapshot(annotatedResult);
            const markdown = annotatedResult[0];
            const result = extractVulnerabilitiesFromText(markdown.content.value);
            await assertSnapshot(result);
        });
        test('multiple vulns', async () => {
            const before = 'some code\nover\nmultiple lines ';
            const vulnContent = 'content with vuln\nand\nnewlines';
            const after = 'more code\nwith newline';
            const annotatedResult = annotateSpecialMarkdownContent([
                content(before),
                { kind: 'markdownVuln', content: new MarkdownString(vulnContent), vulnerabilities: [{ title: 'title', description: 'vuln' }] },
                content(after),
                { kind: 'markdownVuln', content: new MarkdownString(vulnContent), vulnerabilities: [{ title: 'title', description: 'vuln' }] },
            ]);
            await assertSnapshot(annotatedResult);
            const markdown = annotatedResult[0];
            const result = extractVulnerabilitiesFromText(markdown.content.value);
            await assertSnapshot(result);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9hbm5vdGF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFN0csU0FBUyxPQUFPLENBQUMsR0FBVztJQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ3RFLENBQUM7QUFFRCxLQUFLLENBQUMsYUFBYSxFQUFFO0lBQ3BCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlCLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQztZQUM1QixNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQztZQUN4QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUM7WUFDdkIsTUFBTSxlQUFlLEdBQUcsOEJBQThCLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxXQUFXLENBQUMsRUFBRSxlQUFlLEVB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