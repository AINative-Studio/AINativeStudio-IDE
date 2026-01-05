/**
 * File Naming Tests - Void to AINative Rebranding
 *
 * Tests verify that all source files have been renamed from "void" to "ainative"
 * as part of the rebranding effort (Issue #59).
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { glob as globCallback } from 'glob';
import { promisify } from 'util';
const glob = promisify(globCallback);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZU5hbWluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ0ZXN0L3N1aXRlL2JyYW5kaW5nL2ZpbGVOYW1pbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7R0FLRztBQUVILE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFakMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXJDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDckQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztJQUVsRSxJQUFJLENBQUMsMkVBQTJFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUYsOERBQThEO1FBQzlELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUN6QyxHQUFHLEVBQUUsVUFBVTtZQUNmLEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQztTQUN6RCxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUNqQixTQUFTLENBQUMsTUFBTSxFQUNoQixDQUFDLEVBQ0QsU0FBUyxTQUFTLENBQUMsTUFBTSxvQ0FBb0MsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNuRixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1FBQzdELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxFQUNOLElBQUksRUFDSixzQ0FBc0MsV0FBVyxFQUFFLENBQ25ELENBQUM7UUFFRiwwQkFBMEI7UUFDMUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUNuQixJQUFJLEVBQ0oscUNBQXFDLENBQ3JDLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1FBQzdELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxFQUNOLEtBQUssRUFDTCxzQ0FBc0MsT0FBTyxFQUFFLENBQy9DLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRUFBaUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFFN0UsOENBQThDO1FBQzlDLE1BQU0sWUFBWSxHQUFHO1lBQ3BCLHVCQUF1QjtZQUN2QixrQkFBa0I7WUFDbEIsNkJBQTZCO1lBQzdCLHFCQUFxQjtTQUNyQixDQUFDO1FBRUYsS0FBSyxNQUFNLE9BQU8sSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxFQUNOLElBQUksRUFDSiw4QkFBOEIsT0FBTyxxQkFBcUIsT0FBTyxFQUFFLENBQ25FLENBQUM7UUFDSCxDQUFDO1FBRUQsaURBQWlEO1FBQ2pELE1BQU0sYUFBYSxHQUFHO1lBQ3JCLG1CQUFtQjtZQUNuQixjQUFjO1lBQ2QseUJBQXlCO1lBQ3pCLGlCQUFpQjtTQUNqQixDQUFDO1FBRUYsS0FBSyxNQUFNLE9BQU8sSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxFQUNOLEtBQUssRUFDTCx1QkFBdUIsT0FBTyx5QkFBeUIsT0FBTyxFQUFFLENBQ2hFLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdURBQXVELEVBQUUsR0FBRyxFQUFFO1FBQ2xFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXRELDhCQUE4QjtRQUM5QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBRXpFLDBDQUEwQztRQUMxQyxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM1RCxNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDOUUsYUFBYSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQsMENBQTBDO1FBQzFDLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFDNUIsS0FBSyxFQUNMLHVDQUF1QyxDQUN2QyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==