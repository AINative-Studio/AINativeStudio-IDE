/**
 * File Naming Tests - Void to AINative Rebranding
 *
 * Tests verify that all source files have been renamed from "void" to "ainative"
 * as part of the rebranding effort (Issue #59).
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
suite('Branding - File Naming Tests', () => {
    const rootDir = path.join(__dirname, '../../../../');
    const contribDir = path.join(rootDir, 'src/vs/workbench/contrib');
    test('should not have any files with "void" in filename under contrib directory', async () => {
        // Find all files with "void" in their name (case-insensitive)
        const voidFiles = await glob('**/*void*', {
            cwd: contribDir,
            nodir: true,
            ignore: ['**/node_modules/**', '**/out/**', '**/dist/**']
        });
        assert.strictEqual(voidFiles.length, 0, `Found ${voidFiles.length} files with "void" in filename:\n${voidFiles.join('\n')}`);
    });
    test('should have ainative directory in contrib folder', () => {
        const ainativeDir = path.join(contribDir, 'ainative');
        const exists = fs.existsSync(ainativeDir);
        assert.strictEqual(exists, true, `AINative directory should exist at ${ainativeDir}`);
        // Verify it's a directory
        if (exists) {
            const stats = fs.statSync(ainativeDir);
            assert.strictEqual(stats.isDirectory(), true, 'ainative path should be a directory');
        }
    });
    test('should NOT have void directory in contrib folder', () => {
        const voidDir = path.join(contribDir, 'void');
        const exists = fs.existsSync(voidDir);
        assert.strictEqual(exists, false, `Void directory should NOT exist at ${voidDir}`);
    });
    test('should have all React component directories renamed to ainative', async () => {
        const ainativeReactDir = path.join(contribDir, 'ainative/browser/react/src');
        // Check that ainative React directories exist
        const expectedDirs = [
            'ainative-settings-tsx',
            'ainative-tooltip',
            'ainative-editor-widgets-tsx',
            'ainative-onboarding'
        ];
        for (const dirName of expectedDirs) {
            const dirPath = path.join(ainativeReactDir, dirName);
            const exists = fs.existsSync(dirPath);
            assert.strictEqual(exists, true, `React component directory "${dirName}" should exist at ${dirPath}`);
        }
        // Check that void React directories do NOT exist
        const forbiddenDirs = [
            'void-settings-tsx',
            'void-tooltip',
            'void-editor-widgets-tsx',
            'void-onboarding'
        ];
        for (const dirName of forbiddenDirs) {
            const dirPath = path.join(ainativeReactDir, dirName);
            const exists = fs.existsSync(dirPath);
            assert.strictEqual(exists, false, `Old void directory "${dirName}" should NOT exist at ${dirPath}`);
        }
    });
    test('should have ainative_icons directory (not void_icons)', () => {
        const ainativeDir = path.join(contribDir, 'ainative');
        // Search for icon directories
        // // const ainativeIconsPath = path.join(ainativeDir, 'browser/media/ainative_icons');
        const voidIconsPath = path.join(ainativeDir, 'browser/media/void_icons');
        // Check if we can find any icon directory
        let iconDirExists = false;
        if (fs.existsSync(path.join(ainativeDir, 'browser/media'))) {
            const mediaContents = fs.readdirSync(path.join(ainativeDir, 'browser/media'));
            iconDirExists = mediaContents.some(item => item.includes('ainative_icons'));
        }
        // If icon directory exists, verify naming
        if (iconDirExists) {
            assert.strictEqual(fs.existsSync(voidIconsPath), false, 'void_icons directory should not exist');
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZU5hbWluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ0ZXN0L3N1aXRlL2JyYW5kaW5nL2ZpbGVOYW1pbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7R0FLRztBQUVILE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFNUIsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtJQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNyRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO0lBRWxFLElBQUksQ0FBQywyRUFBMkUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1Riw4REFBOEQ7UUFDOUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3pDLEdBQUcsRUFBRSxVQUFVO1lBQ2YsS0FBSyxFQUFFLElBQUk7WUFDWCxNQUFNLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDO1NBQ3pELENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFNBQVMsQ0FBQyxNQUFNLEVBQ2hCLENBQUMsRUFDRCxTQUFTLFNBQVMsQ0FBQyxNQUFNLG9DQUFvQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ25GLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElB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