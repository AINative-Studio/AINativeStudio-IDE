/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MarkerSeverity } from '../../common/markers.js';
import * as markerService from '../../common/markerService.js';
function randomMarkerData(severity = MarkerSeverity.Error) {
    return {
        severity,
        message: Math.random().toString(16),
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1
    };
}
suite('Marker Service', () => {
    let service;
    teardown(function () {
        service.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('query', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [{
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData(MarkerSeverity.Error)
            }]);
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ resource: URI.parse('file:///c/test/file.cs') }).length, 1);
        assert.strictEqual(service.read({ owner: 'far', resource: URI.parse('file:///c/test/file.cs') }).length, 1);
        service.changeAll('boo', [{
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData(MarkerSeverity.Warning)
            }]);
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Warning }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Hint }).length, 0);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error | MarkerSeverity.Warning }).length, 2);
    });
    test('changeOne override', () => {
        service = new markerService.MarkerService();
        service.changeOne('far', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        service.changeOne('boo', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        service.changeOne('far', URI.parse('file:///path/only.cs'), [randomMarkerData(), randomMarkerData()]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
    });
    test('changeOne/All clears', () => {
        service = new markerService.MarkerService();
        service.changeOne('far', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        service.changeOne('boo', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        assert.strictEqual(service.read().length, 2);
        service.changeOne('far', URI.parse('file:///path/only.cs'), []);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        assert.strictEqual(service.read().length, 1);
        service.changeAll('boo', []);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 0);
        assert.strictEqual(service.read().length, 0);
    });
    test('changeAll sends event for cleared', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [{
                resource: URI.parse('file:///d/path'),
                marker: randomMarkerData()
            }, {
                resource: URI.parse('file:///d/path'),
                marker: randomMarkerData()
            }]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
        const d = service.onMarkerChanged(changedResources => {
            assert.strictEqual(changedResources.length, 1);
            changedResources.forEach(u => assert.strictEqual(u.toString(), 'file:///d/path'));
            assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        });
        service.changeAll('far', []);
        d.dispose();
    });
    test('changeAll merges', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [{
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData()
            }, {
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData()
            }]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
    });
    test('changeAll must not break integrety, issue #12635', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [{
                resource: URI.parse('scheme:path1'),
                marker: randomMarkerData()
            }, {
                resource: URI.parse('scheme:path2'),
                marker: randomMarkerData()
            }]);
        service.changeAll('boo', [{
                resource: URI.parse('scheme:path1'),
                marker: randomMarkerData()
            }]);
        service.changeAll('far', [{
                resource: URI.parse('scheme:path1'),
                marker: randomMarkerData()
            }, {
                resource: URI.parse('scheme:path2'),
                marker: randomMarkerData()
            }]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
        assert.strictEqual(service.read({ resource: URI.parse('scheme:path1') }).length, 2);
    });
    test('invalid marker data', () => {
        const data = randomMarkerData();
        service = new markerService.MarkerService();
        data.message = undefined;
        service.changeOne('far', URI.parse('some:uri/path'), [data]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        data.message = null;
        service.changeOne('far', URI.parse('some:uri/path'), [data]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        data.message = 'null';
        service.changeOne('far', URI.parse('some:uri/path'), [data]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
    });
    test('MapMap#remove returns bad values, https://github.com/microsoft/vscode/issues/13548', () => {
        service = new markerService.MarkerService();
        service.changeOne('o', URI.parse('some:uri/1'), [randomMarkerData()]);
        service.changeOne('o', URI.parse('some:uri/2'), []);
    });
    test('Error code of zero in markers get removed, #31275', function () {
        const data = {
            code: '0',
            startLineNumber: 1,
            startColumn: 2,
            endLineNumber: 1,
            endColumn: 5,
            message: 'test',
            severity: 0,
            source: 'me'
        };
        service = new markerService.MarkerService();
        service.changeOne('far', URI.parse('some:thing'), [data]);
        const marker = service.read({ resource: URI.parse('some:thing') });
        assert.strictEqual(marker.length, 1);
        assert.strictEqual(marker[0].code, '0');
    });
    test('resource filter hides markers for the filtered resource', () => {
        service = new markerService.MarkerService();
        const resource1 = URI.parse('file:///path/file1.cs');
        const resource2 = URI.parse('file:///path/file2.cs');
        // Add markers to both resources
        service.changeOne('owner1', resource1, [randomMarkerData()]);
        service.changeOne('owner1', resource2, [randomMarkerData()]);
        // Verify both resources have markers
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource: resource1 }).length, 1);
        assert.strictEqual(service.read({ resource: resource2 }).length, 1);
        // Install filter for resource1
        const filter = service.installResourceFilter(resource1, 'Test filter');
        // Verify resource1 markers are filtered out, but have 1 info marker instead
        assert.strictEqual(service.read().length, 2); // 1 real + 1 info
        assert.strictEqual(service.read({ resource: resource1 }).length, 1); // 1 info
        assert.strictEqual(service.read({ resource: resource2 }).length, 1);
        // Dispose filter
        filter.dispose();
        // Verify resource1 markers are visible again
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource: resource1 }).length, 1);
        assert.strictEqual(service.read({ resource: resource2 }).length, 1);
    });
    test('resource filter affects all filter combinations', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        service.changeOne('owner1', resource, [randomMarkerData(MarkerSeverity.Error)]);
        service.changeOne('owner2', resource, [randomMarkerData(MarkerSeverity.Warning)]);
        // Verify initial state
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource }).length, 2);
        assert.strictEqual(service.read({ owner: 'owner1' }).length, 1);
        assert.strictEqual(service.read({ owner: 'owner2' }).length, 1);
        assert.strictEqual(service.read({ owner: 'owner1', resource }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Warning }).length, 1);
        // Install filter
        const filter = service.installResourceFilter(resource, 'Filter reason');
        // Verify information marker is shown for resource queries
        assert.strictEqual(service.read().length, 1); // 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ owner: 'owner1' }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ owner: 'owner2' }).length, 1); // 1 info marker
        // Verify owner+resource query returns an info marker for filtered resources
        const ownerResourceMarkers = service.read({ owner: 'owner1', resource });
        assert.strictEqual(ownerResourceMarkers.length, 1);
        assert.strictEqual(ownerResourceMarkers[0].severity, MarkerSeverity.Info);
        assert.strictEqual(ownerResourceMarkers[0].owner, 'markersFilter');
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ severities: MarkerSeverity.Warning }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ severities: MarkerSeverity.Info }).length, 1); // Our info marker
        // Remove filter and verify markers are visible again
        filter.dispose();
        assert.strictEqual(service.read().length, 2);
    });
    test('multiple filters for same resource are handled correctly', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        // Add marker to resource
        service.changeOne('owner1', resource, [randomMarkerData()]);
        // Verify resource has markers
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
        // Install two filters for the same resource
        const filter1 = service.installResourceFilter(resource, 'First filter');
        const filter2 = service.installResourceFilter(resource, 'Second filter');
        // Verify resource markers are filtered out but info marker is shown
        assert.strictEqual(service.read().length, 1); // 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // 1 info marker
        // Dispose only one filter
        filter1.dispose();
        // Verify resource markers are still filtered out because one filter remains
        assert.strictEqual(service.read().length, 1); // still 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // still 1 info marker
        // Dispose the second filter
        filter2.dispose();
        // Now all filters are gone, so markers should be visible again
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
    });
    test('resource filter with reason shows info marker when markers are filtered', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        // Add error and warning to the resource
        service.changeOne('owner1', resource, [
            randomMarkerData(MarkerSeverity.Error),
            randomMarkerData(MarkerSeverity.Warning)
        ]);
        // Verify initial state
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource }).length, 2);
        // Apply a filter with reason
        const filterReason = 'Test filter reason';
        const filter = service.installResourceFilter(resource, filterReason);
        // Verify that we get a single info marker with our reason
        const markers = service.read({ resource });
        assert.strictEqual(markers.length, 1);
        assert.strictEqual(markers[0].severity, MarkerSeverity.Info);
        assert.ok(markers[0].message.includes(filterReason));
        // Remove filter and verify the original markers are back
        filter.dispose();
        assert.strictEqual(service.read({ resource }).length, 2);
    });
    test('reading all markers shows info marker for filtered resources', () => {
        service = new markerService.MarkerService();
        const resource1 = URI.parse('file:///path/file1.cs');
        const resource2 = URI.parse('file:///path/file2.cs');
        // Add markers to both resources
        service.changeOne('owner1', resource1, [randomMarkerData()]);
        service.changeOne('owner1', resource2, [randomMarkerData()]);
        // Verify initial state
        assert.strictEqual(service.read().length, 2);
        // Filter one resource with a reason
        const filterReason = 'Resource is being edited';
        const filter = service.installResourceFilter(resource1, filterReason);
        // Read all markers
        const allMarkers = service.read();
        // Should have 2 markers - one real marker and one info marker
        assert.strictEqual(allMarkers.length, 2);
        // Find the info marker
        const infoMarker = allMarkers.find(marker => marker.owner === 'markersFilter' &&
            marker.severity === MarkerSeverity.Info);
        // Verify the info marker
        assert.ok(infoMarker);
        assert.strictEqual(infoMarker?.resource.toString(), resource1.toString());
        assert.ok(infoMarker?.message.includes(filterReason));
        // Remove filter
        filter.dispose();
    });
    test('out of order filter disposal works correctly', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        // Add marker to resource
        service.changeOne('owner1', resource, [randomMarkerData()]);
        // Verify resource has markers
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
        // Install three filters for the same resource
        const filter1 = service.installResourceFilter(resource, 'First filter');
        const filter2 = service.installResourceFilter(resource, 'Second filter');
        const filter3 = service.installResourceFilter(resource, 'Third filter');
        // Verify resource markers are filtered out but info marker is shown
        assert.strictEqual(service.read().length, 1); // 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // 1 info marker
        // Dispose filters in a different order than they were created
        filter2.dispose(); // Remove the second filter first
        // Verify resource markers are still filtered out with 2 filters remaining
        assert.strictEqual(service.read().length, 1); // still 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // still 1 info marker
        // Check if message contains the correct count of filters
        const markers = service.read({ resource });
        assert.ok(markers[0].message.includes('Problems are paused because'));
        // Remove remaining filters in any order
        filter3.dispose();
        filter1.dispose();
        // Now all filters are gone, so markers should be visible again
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21hcmtlcnMvdGVzdC9jb21tb24vbWFya2VyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RFLE9BQU8sS0FBSyxhQUFhLE1BQU0sK0JBQStCLENBQUM7QUFFL0QsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFDLEtBQUs7SUFDeEQsT0FBTztRQUNOLFFBQVE7UUFDUixPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDbkMsZUFBZSxFQUFFLENBQUM7UUFDbEIsV0FBVyxFQUFFLENBQUM7UUFDZCxhQUFhLEVBQUUsQ0FBQztRQUNoQixTQUFTLEVBQUUsQ0FBQztLQUNaLENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUU1QixJQUFJLE9BQW9DLENBQUM7SUFFekMsUUFBUSxDQUFDO1FBQ1IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUVsQixPQUFPLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFNUMsT0FB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QUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RCxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RCxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RHLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENB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