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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2Fubm90YXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUU3RyxTQUFTLE9BQU8sQ0FBQyxHQUFXO0lBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDdEUsQ0FBQztBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUIsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDO1lBQzVCLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO1lBQ3hDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQztZQUN2QixNQUFNLGVBQWUsR0FBRyw4QkFBOEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQyxFQUFFLGVBQWUsRUFBRSxD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