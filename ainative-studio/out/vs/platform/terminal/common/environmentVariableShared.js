/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// This file is shared between the renderer and extension host
export function serializeEnvironmentVariableCollection(collection) {
    return [...collection.entries()];
}
export function serializeEnvironmentDescriptionMap(descriptionMap) {
    return descriptionMap ? [...descriptionMap.entries()] : [];
}
export function deserializeEnvironmentVariableCollection(serializedCollection) {
    return new Map(serializedCollection);
}
export function deserializeEnvironmentDescriptionMap(serializableEnvironmentDescription) {
    return new Map(serializableEnvironmentDescription ?? []);
}
export function serializeEnvironmentVariableCollections(collections) {
    return Array.from(collections.entries()).map(e => {
        return [e[0], serializeEnvironmentVariableCollection(e[1].map), serializeEnvironmentDescriptionMap(e[1].descriptionMap)];
    });
}
export function deserializeEnvironmentVariableCollections(serializedCollection) {
    return new Map(serializedCollection.map(e => {
        return [e[0], { map: deserializeEnvironmentVariableCollection(e[1]), descriptionMap: deserializeEnvironmentDescriptionMap(e[2]) }];
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyw4REFBOEQ7QUFFOUQsTUFBTSxVQUFVLHNDQUFzQyxDQUFDLFVBQTREO0lBQ2xILE9BQU8sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFFRCxNQUFNLFVBQVUsa0NBQWtDLENBQUMsY0FBMEY7SUFDNUksT0FBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzVELENBQUM7QUFFRCxNQUFNLFVBQVUsd0NBQXdDLENBQ3ZELG9CQUFnRTtJQUVoRSxPQUFPLElBQUksR0FBRyxDQUFzQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzNFLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DLENBQ25ELGtDQUFzRjtJQUV0RixPQUFPLElBQUksR0FBRyxDQUFvRCxrQ0FBa0MsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM3RyxDQUFDO0FBRUQsTUFBTSxVQUFVLHVDQUF1QyxDQUFDLFdBQWdFO0lBQ3ZILE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDaEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDMUgsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLHlDQUF5QyxDQUN4RCxvQkFBaUU7SUFFakUsT0FBTyxJQUFJLEdBQUcsQ0FBeUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ25GLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsd0NBQXdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyJ9