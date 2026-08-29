import { expect } from 'chai';
import 'mocha';
import {
    Absolute2DPosition,
    CallbackSinkNode,
    DataFrame,
    DataObject,
    GraphBuilder,
    MemoryDataService,
    ModelBuilder,
    Pressure,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { RelativeRSSI, RFTransmitterObject } from '@openhps/rf';
import { FingerprintService, Fingerprint, KNNFingerprintingNode, FingerprintingNode } from '../../src/';
import { RelativeValue } from '../../src/data/RelativeValue';
import { AbstractLocation } from '@openhps/geospatial';

describe('node knn fingerprinting', () => {
    it('should initialize without fingerprints', (done) => {
        ModelBuilder.create()
            .addService(new FingerprintService(new MemoryDataService(Fingerprint)))
            .from()
            .via(
                new KNNFingerprintingNode({
                    weighted: false,
                    k: 5,
                }),
            )
            .to()
            .build()
            .then((m) => {
                done();
            })
            .catch(done);
    });

    it('should support multiple types of fingerprints', (done) => {
        ModelBuilder.create()
            .addService(
                new FingerprintService(new MemoryDataService(Fingerprint), {
                    classifier: 'geo',
                    autoUpdate: true,
                }),
            )
            .addService(
                new FingerprintService(new MemoryDataService(Fingerprint), {
                    classifier: 'wlan',
                    autoUpdate: true,
                }),
            )
            .from()
            .via(
                new FingerprintingNode({
                    valueFilter: (pos) => pos.referenceObjectUID.startsWith('MAG_'),
                    classifier: 'geo',
                    name: 'geomagnetic-fingerprinting',
                }),
                new FingerprintingNode({
                    valueFilter: (pos) => pos.referenceObjectType === RFTransmitterObject.name,
                    classifier: 'wlan',
                    name: 'wlan-fingerprinting',
                }),
            )
            .to(new CallbackSinkNode())
            .build()
            .then((m) => {
                const object = new DataObject('phone');
                object.setPosition(new Absolute2DPosition(1, 1));
                object.addRelativePosition(new RelativeValue('MAG_X', 1));
                object.addRelativePosition(new RelativeValue('MAG_Y', 2));
                object.addRelativePosition(new RelativeValue('MAG_Z', 3));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_1'), 4));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_2'), 5));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_3'), 6));
                const frame = new DataFrame(object);
                m.onceCompleted(frame.uid)
                    .then(() => {
                        const node1 = m.findNodeByName('geomagnetic-fingerprinting') as KNNFingerprintingNode<any>;
                        const node2 = m.findNodeByName('wlan-fingerprinting') as KNNFingerprintingNode<any>;
                        expect(node1.cache.length).to.be.equal(1);
                        expect(node2.cache.length).to.be.equal(1);
                        expect(node1.cache[0].vector.length).to.equal(3);
                        expect(node2.cache[0].vector.length).to.equal(3);
                        done();
                    })
                    .catch(done);
                m.push(frame);
            })
            .catch(done);
    });

    it('should support custom features', (done) => {
        @SerializableObject()
        class CustomObject extends DataObject {
            @SerializableMember()
            pressure: Pressure;
        }

        ModelBuilder.create()
            .addService(
                new FingerprintService(new MemoryDataService(Fingerprint), {
                    autoUpdate: true,
                }),
            )
            .addShape(
                GraphBuilder.create()
                    .from('offline')
                    .via(
                        new FingerprintingNode({
                            name: 'fingerprinting',
                            features: [{ key: 'pressure', value: (object: CustomObject) => object.pressure.value }],
                        }),
                    )
                    .to(new CallbackSinkNode()),
            )
            .addShape(
                GraphBuilder.create()
                    .from('online')
                    .via(
                        new KNNFingerprintingNode({
                            features: [{ key: 'pressure', value: (object: CustomObject) => object.pressure.value }],
                        }),
                    )
                    .to(new CallbackSinkNode()),
            )
            .build()
            .then((m) => {
                const object = new CustomObject('phone');
                object.setPosition(new Absolute2DPosition(1, 1));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_1'), 4));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_2'), 5));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_3'), 6));
                object.pressure = new Pressure(1013);
                const frame = new DataFrame(object);
                const offline = m.findNodeByName('offline');
                const online = m.findNodeByName('online');
                offline
                    .onceCompleted(frame.uid)
                    .then(() => {
                        const node1 = m.findNodeByName('fingerprinting') as KNNFingerprintingNode<any>;
                        expect(node1.cache.length).to.be.equal(1);
                        expect(node1.cache[0].vector.length).to.equal(4);
                        // Now test online fingerprinting
                        object.position = undefined;
                        const frame = new DataFrame(object);
                        online.onceCompleted(frame.uid).then(() => {
                            done();
                        });
                        online.push(frame);
                    })
                    .catch(done);
                offline.push(frame);
            })
            .catch(done);
    });

    it('should support abstract locations', (done) => {
        const rooms = [new AbstractLocation('room1'), new AbstractLocation('room2'), new AbstractLocation('room3')];

        ModelBuilder.create()
            .addService(
                new FingerprintService(new MemoryDataService(Fingerprint), {
                    autoUpdate: true,
                }),
            )
            .addShape(
                GraphBuilder.create()
                    .from('offline')
                    .via(
                        new FingerprintingNode({
                            name: 'fingerprinting',
                        }),
                    )
                    .to(new CallbackSinkNode()),
            )
            .addShape(
                GraphBuilder.create()
                    .from('online')
                    .via(
                        new KNNFingerprintingNode({
                            k: 3,
                            weighted: true,
                        }),
                    )
                    .to(new CallbackSinkNode()),
            )
            .build()
            .then((m) => {
                const object = new DataObject('phone');
                object.setPosition(rooms[0]);
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_1'), 4));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_2'), 5));
                object.addRelativePosition(new RelativeRSSI(new RFTransmitterObject('AP_3'), 6));
                const frame = new DataFrame(object);
                const offline = m.findNodeByName('offline');
                const online = m.findNodeByName('online');
                offline
                    .onceCompleted(frame.uid)
                    .then(() => {
                        const node1 = m.findNodeByName('fingerprinting') as FingerprintingNode<any>;
                        expect(node1.cache.length).to.be.equal(1); // For validation purposes test if it registered
                        expect(node1.cache[0].vector.length).to.equal(3); // For validation purposes
                        // Now test online fingerprinting
                        object.position = undefined;
                        const frame = new DataFrame(object);
                        online.onceCompleted(frame.uid).then(() => {
                            // Once the frame is completed, we can check the output
                            m.findDataService(DataObject)
                                .findByUID(object.uid)
                                .then((object) => {
                                    // Check the position of object
                                    // Now manually determine to which room it is closest to
                                    // NOTE: this can be performed in a node but is shown here for demonstration purposes
                                    const distances = rooms.map((room) =>
                                        room.distanceTo(object.position as AbstractLocation),
                                    );
                                    const closestRoomIndex = distances.indexOf(Math.min(...distances));
                                    const closestRoom = rooms[closestRoomIndex];
                                    object.position = closestRoom;
                                    // console.log(closestRoom);
                                    done();
                                });
                        });
                        online.push(frame);
                    })
                    .catch(done);
                offline.push(frame);
            })
            .catch(done);
    });
});
