/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
suite('SkillsRegistry - Refresh', () => {
    test('should correctly identify updated skills', () => {
        const result = {
            updated: [
                { name: 'git-workflow', oldVersion: '1.0.0', newVersion: '1.1.0' }
            ],
            new: [],
            removed: [],
            unchanged: [],
            total: 1
        };
        assert.strictEqual(result.updated.length, 1);
        assert.strictEqual(result.updated[0].name, 'git-workflow');
        assert.strictEqual(result.updated[0].oldVersion, '1.0.0');
        assert.strictEqual(result.updated[0].newVersion, '1.1.0');
    });
    test('should correctly identify new skills', () => {
        const result = {
            updated: [],
            new: [
                { name: 'new-skill', oldVersion: null, newVersion: '1.0.0' }
            ],
            removed: [],
            unchanged: [],
            total: 1
        };
        assert.strictEqual(result.new.length, 1);
        assert.strictEqual(result.new[0].name, 'new-skill');
        assert.strictEqual(result.new[0].oldVersion, null);
        assert.strictEqual(result.new[0].newVersion, '1.0.0');
    });
    test('should correctly identify removed skills', () => {
        const result = {
            updated: [],
            new: [],
            removed: [
                { name: 'removed-skill', oldVersion: '1.0.0', newVersion: null }
            ],
            unchanged: [],
            total: 0
        };
        assert.strictEqual(result.removed.length, 1);
        assert.strictEqual(result.removed[0].name, 'removed-skill');
        assert.strictEqual(result.removed[0].oldVersion, '1.0.0');
        assert.strictEqual(result.removed[0].newVersion, null);
    });
    test('should handle mixed changes', () => {
        const result = {
            updated: [
                { name: 'updated-skill', oldVersion: '1.0.0', newVersion: '2.0.0' }
            ],
            new: [
                { name: 'new-skill', oldVersion: null, newVersion: '1.0.0' }
            ],
            removed: [
                { name: 'removed-skill', oldVersion: '1.0.0', newVersion: null }
            ],
            unchanged: ['unchanged-skill-1', 'unchanged-skill-2'],
            total: 4
        };
        assert.strictEqual(result.updated.length, 1);
        assert.strictEqual(result.new.length, 1);
        assert.strictEqual(result.removed.length, 1);
        assert.strictEqual(result.unchanged.length, 2);
        assert.strictEqual(result.total, 4);
    });
    test('should calculate correct totals', () => {
        const result = {
            updated: [
                { name: 'skill1', oldVersion: '1.0.0', newVersion: '1.1.0' },
                { name: 'skill2', oldVersion: '1.0.0', newVersion: '1.1.0' }
            ],
            new: [
                { name: 'skill3', oldVersion: null, newVersion: '1.0.0' }
            ],
            removed: [],
            unchanged: ['skill4', 'skill5'],
            total: 5
        };
        const expectedTotal = result.updated.length + result.new.length + result.unchanged.length;
        assert.strictEqual(result.total, expectedTotal);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzUmVnaXN0cnkucmVmcmVzaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9za2lsbHNSZWdpc3RyeS5yZWZyZXNoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFLakMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUV0QyxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELE1BQU0sTUFBTSxHQUF1QjtZQUNsQyxPQUFPLEVBQUU7Z0JBQ1IsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRTthQUNsRTtZQUNELEdBQUcsRUFBRSxFQUFFO1lBQ1AsT0FBTyxFQUFFLEVBQUU7WUFDWCxTQUFTLEVBQUUsRUFBRTtZQUNiLEtBQUssRUFBRSxDQUFDO1NBQ1IsQ0FBQztRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENB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