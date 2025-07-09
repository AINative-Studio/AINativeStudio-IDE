/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../common/descriptors.js';
import { InstantiationService, Trace } from '../../common/instantiationService.js';
import { ServiceCollection } from '../../common/serviceCollection.js';
const isSinonSpyLike = (fn) => fn && 'callCount' in fn;
export class TestInstantiationService extends InstantiationService {
    constructor(_serviceCollection = new ServiceCollection(), strict = false, parent, _properDispose) {
        super(_serviceCollection, strict, parent);
        this._serviceCollection = _serviceCollection;
        this._properDispose = _properDispose;
        this._servciesMap = new Map();
    }
    get(service) {
        return super._getOrCreateServiceInstance(service, Trace.traceCreation(false, TestInstantiationService));
    }
    set(service, instance) {
        return this._serviceCollection.set(service, instance);
    }
    mock(service) {
        return this._create(service, { mock: true });
    }
    stub(serviceIdentifier, arg2, arg3, arg4) {
        const service = typeof arg2 !== 'string' ? arg2 : undefined;
        const serviceMock = { id: serviceIdentifier, service: service };
        const property = typeof arg2 === 'string' ? arg2 : arg3;
        const value = typeof arg2 === 'string' ? arg3 : arg4;
        const stubObject = this._create(serviceMock, { stub: true }, service && !property);
        if (property) {
            if (stubObject[property]) {
                if (stubObject[property].hasOwnProperty('restore')) {
                    stubObject[property].restore();
                }
                if (typeof value === 'function') {
                    const spy = isSinonSpyLike(value) ? value : sinon.spy(value);
                    stubObject[property] = spy;
                    return spy;
                }
                else {
                    const stub = value ? sinon.stub().returns(value) : sinon.stub();
                    stubObject[property] = stub;
                    return stub;
                }
            }
            else {
                stubObject[property] = value;
            }
        }
        return stubObject;
    }
    stubPromise(arg1, arg2, arg3, arg4) {
        arg3 = typeof arg2 === 'string' ? Promise.resolve(arg3) : arg3;
        arg4 = typeof arg2 !== 'string' && typeof arg3 === 'string' ? Promise.resolve(arg4) : arg4;
        return this.stub(arg1, arg2, arg3, arg4);
    }
    spy(service, fnProperty) {
        const spy = sinon.spy();
        this.stub(service, fnProperty, spy);
        return spy;
    }
    _create(arg1, options, reset = false) {
        if (this.isServiceMock(arg1)) {
            const service = this._getOrCreateService(arg1, options, reset);
            this._serviceCollection.set(arg1.id, service);
            return service;
        }
        return options.mock ? sinon.mock(arg1) : this._createStub(arg1);
    }
    _getOrCreateService(serviceMock, opts, reset) {
        const service = this._serviceCollection.get(serviceMock.id);
        if (!reset && service) {
            if (opts.mock && service['sinonOptions'] && !!service['sinonOptions'].mock) {
                return service;
            }
            if (opts.stub && service['sinonOptions'] && !!service['sinonOptions'].stub) {
                return service;
            }
        }
        return this._createService(serviceMock, opts);
    }
    _createService(serviceMock, opts) {
        serviceMock.service = serviceMock.service ? serviceMock.service : this._servciesMap.get(serviceMock.id);
        const service = opts.mock ? sinon.mock(serviceMock.service) : this._createStub(serviceMock.service);
        service['sinonOptions'] = opts;
        return service;
    }
    _createStub(arg) {
        return typeof arg === 'object' ? arg : sinon.createStubInstance(arg);
    }
    isServiceMock(arg1) {
        return typeof arg1 === 'object' && arg1.hasOwnProperty('id');
    }
    createChild(services) {
        return new TestInstantiationService(services, false, this);
    }
    dispose() {
        sinon.restore();
        if (this._properDispose) {
            super.dispose();
        }
    }
}
export function createServices(disposables, services) {
    const serviceIdentifiers = [];
    const serviceCollection = new ServiceCollection();
    const define = (id, ctorOrInstance) => {
        if (!serviceCollection.has(id)) {
            if (typeof ctorOrInstance === 'function') {
                serviceCollection.set(id, new SyncDescriptor(ctorOrInstance));
            }
            else {
                serviceCollection.set(id, ctorOrInstance);
            }
        }
        serviceIdentifiers.push(id);
    };
    for (const [id, ctor] of services) {
        define(id, ctor);
    }
    const instantiationService = disposables.add(new TestInstantiationService(serviceCollection, true));
    disposables.add(toDisposable(() => {
        for (const id of serviceIdentifiers) {
            const instanceOrDescriptor = serviceCollection.get(id);
            if (typeof instanceOrDescriptor.dispose === 'function') {
                instanceOrDescriptor.dispose();
            }
        }
    }));
    return instantiationService;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2VNb2NrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2luc3RhbnRpYXRpb24vdGVzdC9jb21tb24vaW5zdGFudGlhdGlvblNlcnZpY2VNb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBZ0MsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQU90RSxNQUFNLGNBQWMsR0FBRyxDQUFDLEVBQVksRUFBd0IsRUFBRSxDQUFDLEVBQUUsSUFBSSxXQUFXLElBQUksRUFBRSxDQUFDO0FBRXZGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxvQkFBb0I7SUFJakUsWUFBb0IscUJBQXdDLElBQUksaUJBQWlCLEVBQUUsRUFBRSxTQUFrQixLQUFLLEVBQUUsTUFBaUMsRUFBVSxjQUF3QjtRQUNoTCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRHZCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBNkM7UUFBc0UsbUJBQWMsR0FBZCxjQUFjLENBQVU7UUFHaEwsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztJQUM1RCxDQUFDO0lBRU0sR0FBRyxDQUFJLE9BQTZCO1FBQzFDLE9BQU8sS0FBSyxDQUFDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMs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