/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
suite('CSS Class Branding Tests', () => {
    const cssFilePath = path.join(__dirname, '../../../../src/vs/workbench/contrib/ainative/browser/media/ainative.css');
    test('CSS file should exist at correct path', () => {
        assert.ok(fs.existsSync(cssFilePath), 'CSS file should exist at void.css path');
    });
    test('Should not contain any .void- CSS classes', () => {
        const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
        const voidClassMatches = cssContent.match(/\.void-[a-zA-Z0-9-]+/g);
        if (voidClassMatches) {
            assert.fail(`Found ${voidClassMatches.length} .void- classes that should be renamed to .ainative-:\n${voidClassMatches.join('\n')}`);
        }
    });
    test('Should use .ainative- prefix for all custom classes', () => {
        const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
        // Check for ainative classes (should have at least 8)
        const ainativeClassMatches = cssContent.match(/\.ainative-[a-zA-Z0-9-]+/g);
        const uniqueAinativeClasses = ainativeClassMatches ? [...new Set(ainativeClassMatches)] : [];
        assert.ok(uniqueAinativeClasses.length >= 8, `Expected at least 8 unique .ainative- classes, found ${uniqueAinativeClasses.length}`);
    });
    test('Should not contain any --vscode-void- theme variables', () => {
        const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
        const voidVarMatches = cssContent.match(/--vscode-void-[a-zA-Z0-9-]+/g);
        if (voidVarMatches) {
            assert.fail(`Found ${voidVarMatches.length} --vscode-void- variables that should be renamed to --vscode-ainative-:\n${voidVarMatches.join('\n')}`);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzQ2xhc3Nlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ0ZXN0L3N1aXRlL2JyYW5kaW5nL2Nzc0NsYXNzZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUU3QixLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDBFQUEwRSxDQUFDLENBQUM7SUFFckgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztJQUNqRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekQsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFbkUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFNLDBEQUEwRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RJLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFekQsc0RBQXNEO1FBQ3RELE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQzNFLE1BQU0scUJBQXFCLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUU3RixNQUFNLENBQUMsRUFBRSxDQUNSLHFCQUFxQixDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQ2pDLHdEQUF3RCxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FDdEYsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEdBQUcsRUFBRTtRQUNsRSxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFFeEUsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsY0FBYyxDQUFDLE1BQU0sNEVBQTRFLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BKLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=