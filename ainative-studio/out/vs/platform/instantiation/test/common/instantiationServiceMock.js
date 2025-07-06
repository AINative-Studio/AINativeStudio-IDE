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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2VNb2NrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi90ZXN0L2NvbW1vbi9pbnN0YW50aWF0aW9uU2VydmljZU1vY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFnQyxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBT3RFLE1BQU0sY0FBYyxHQUFHLENBQUMsRUFBWSxFQUF3QixFQUFFLENBQUMsRUFBRSxJQUFJLFdBQVcsSUFBSSxFQUFFLENBQUM7QUFFdkYsTUFBTSxPQUFPLHdCQUF5QixTQUFRLG9CQUFvQjtJQUlqRSxZQUFvQixxQkFBd0MsSUFBSSxpQkFBaUIsRUFBRSxFQUFFLFNBQWtCLEtBQUssRUFBRSxNQUFpQyxFQUFVLGNBQXdCO1FBQ2hMLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFEdkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE2QztRQUFzRSxtQkFBYyxHQUFkLGNBQWMsQ0FBVTtRQUdoTCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO0lBQzVELENBQUM7SUFFTSxHQUFHLENBQUksT0FBNkI7UUFDMUMsT0FBTyxLQUFLLENBQUMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxh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