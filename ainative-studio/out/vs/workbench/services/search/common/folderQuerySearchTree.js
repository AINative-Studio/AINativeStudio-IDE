import { TernarySearchTree, UriIterator } from '../../../../base/common/ternarySearchTree.js';
import { ResourceMap } from '../../../../base/common/map.js';
/**
 * A ternary search tree that supports URI keys and query/fragment-aware substring matching, specifically for file search.
 * This is because the traditional TST does not support query and fragments https://github.com/microsoft/vscode/issues/227836
 */
export class FolderQuerySearchTree extends TernarySearchTree {
    constructor(folderQueries, getFolderQueryInfo, ignorePathCasing = () => false) {
        const uriIterator = new UriIterator(ignorePathCasing, () => false);
        super(uriIterator);
        const fqBySameBase = new ResourceMap();
        folderQueries.forEach((fq, i) => {
            const uriWithoutQueryOrFragment = fq.folder.with({ query: '', fragment: '' });
            if (fqBySameBase.has(uriWithoutQueryOrFragment)) {
                fqBySameBase.get(uriWithoutQueryOrFragment).push({ fq, i });
            }
            else {
                fqBySameBase.set(uriWithoutQueryOrFragment, [{ fq, i }]);
            }
        });
        fqBySameBase.forEach((values, key) => {
            const folderQueriesWithQueries = new Map();
            for (const fqBases of values) {
                const folderQueryInfo = getFolderQueryInfo(fqBases.fq, fqBases.i);
                folderQueriesWithQueries.set(this.encodeKey(fqBases.fq.folder), folderQueryInfo);
            }
            super.set(key, folderQueriesWithQueries);
        });
    }
    findQueryFragmentAwareSubstr(key) {
        const baseURIResult = super.findSubstr(key.with({ query: '', fragment: '' }));
        if (!baseURIResult) {
            return undefined;
        }
        const queryAndFragmentKey = this.encodeKey(key);
        return baseURIResult.get(queryAndFragmentKey);
    }
    forEachFolderQueryInfo(fn) {
        return this.forEach(elem => elem.forEach(mapElem => fn(mapElem)));
    }
    encodeKey(key) {
        let str = '';
        if (key.query) {
            str += key.query;
        }
        if (key.fragment) {
            str += '#' + key.fragment;
        }
        return str;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyUXVlcnlTZWFyY2hUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL2ZvbGRlclF1ZXJ5U2VhcmNoVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTdEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxxQkFBK0QsU0FBUSxpQkFBb0Q7SUFDdkksWUFBWSxhQUFrQyxFQUM3QyxrQkFBb0UsRUFDcEUsbUJBQTBDLEdBQUcsRUFBRSxDQUFDLEtBQUs7UUFFckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5CLE1BQU0sWUFBWSxHQUFHLElBQUksV0FBVyxFQUEwQyxDQUFDO1FBQy9FLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsTUFBTSx5QkFBeUIsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUUsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQztnQkFDakQsWUFBWSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzlELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDcEMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUNwRSxLQUFLLE1BQU0sT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEUsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNsRixDQUFDO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxHQUFRO1FBRXBDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUUvQyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsRUFBOEM7UUFDcEUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVPLFNBQVMsQ0FBQyxHQUFRO1FBQ3pCLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2YsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFDbEIsQ0FBQztRQUNELElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUMzQixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0NBRUQifQ==