import { expect } from 'chai';
import 'mocha';
import { EvaluationDataFrame } from '../../mock/data/EvaluationDataFrame';
import {
    Model,
    DataFrame,
    CallbackSinkNode,
    DataObjectService,
    MemoryDataService,
    ModelBuilder,
    DataObject,
    RelativeDistance,
    Absolute3DPosition,
    ObjectMergeNode
} from '@openhps/core';
import { CSVDataSource } from '@openhps/csv';
import { 
    FingerprintService,
    Fingerprint,
    KNNFingerprintingNode,
    FingerprintingNode
} from '../../../src/';

/**
 * @param rssi
 */
function rssiToDistance(rssi: number) {
    return Math.pow(10, (-28 - rssi) / (10 * 2.8));
}

describe('dataset', () => {
    describe('richter2018', function () {
        this.timeout(20000);

        let calibrationModel: Model<DataFrame, DataFrame>;
        let trackingModel: Model<DataFrame, DataFrame>;

        let callbackNode: CallbackSinkNode<DataFrame>;

        const aps = [];

        /**
         * Initialize the data set and model
         */
        before(function (done) {
            this.timeout(20000);

            // Calibration model to set-up or train the model
            for (let i = 0; i < 489; i++) aps.push(`AP${i + 1}`);

            const fingerprintService = new FingerprintService(new MemoryDataService(Fingerprint));

            const rssSource = new CSVDataSource(
                'test/data/richter2018/Training_rss.csv',
                (row: any) => {
                    const dataFrame = new DataFrame();
                    const phoneObject = new DataObject('phone');
                    aps.forEach((ap) => {
                        const rssi = parseFloat(row[ap]);
                        const distance = rssiToDistance(rssi);
                        const object = new DataObject(ap);
                        dataFrame.addObject(object);
                        phoneObject.addRelativePosition(new RelativeDistance(object, distance));
                    });
                    dataFrame.addObject(phoneObject);
                    return dataFrame;
                },
                {
                    headers: aps,
                },
            );

            const locationSource = new CSVDataSource(
                'test/data/richter2018/Training_coordinates.csv',
                (row: any) => {
                    const dataFrame = new DataFrame();
                    const phoneObject = new DataObject('phone');
                    phoneObject.position = new Absolute3DPosition(
                        parseFloat(row.x),
                        parseFloat(row.y),
                        parseFloat(row.z),
                    );
                    dataFrame.addObject(phoneObject);
                    return dataFrame;
                },
                {
                    headers: ['x', 'y', 'z'],
                },
            );

            ModelBuilder.create()
                .addService(fingerprintService)
                .from(rssSource, locationSource)
                .via(
                    new ObjectMergeNode(
                        (frame: DataFrame) => {
                            return frame.source.uid;
                        },
                        {
                            objectFilter: (object: DataObject) => object.uid == 'phone',
                        }
                    ),
                )
                .via(
                    new FingerprintingNode()
                )
                .to(new CallbackSinkNode())
                .build()
                .then((model) => {
                    calibrationModel = model;
                    callbackNode = new CallbackSinkNode<EvaluationDataFrame>();

                    const pullPromises = [];
                    for (let i = 0; i < 446; i++) {
                        pullPromises.push(model.pull());
                    }

                    Promise.all(pullPromises).then(() => {
                        return (model.findDataService(Fingerprint) as FingerprintService).update();
                    }).then(() => {
                        done();
                    });
                });
        });

        after(() => {
            calibrationModel.emit('destroy');
        });

        describe('calibration', () => {
            it('should contain fingerprints', (done) => {
                const fingerprintService = calibrationModel.findDataService(Fingerprint) as DataObjectService<
                    Fingerprint
                >;

                const rssiVector = [
                    100,
                    100,
                    -90,
                    -85.5,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -68.1,
                    -70.5,
                    -69.6,
                    -70.25,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -71.583,
                    -71.75,
                    -72.833,
                    -71.333,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -79.1,
                    -80.4,
                    -80,
                    -80.333,
                    -85,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -88.143,
                    100,
                    -76.333,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -92,
                    -92,
                    -89,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -56.917,
                    -59,
                    -57.75,
                    -57.917,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -88,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -76.333,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -85.4,
                    -86,
                    100,
                    100,
                    100,
                    -83.4,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -87,
                    100,
                    100,
                    100,
                    -90,
                    -83.667,
                    -91,
                    100,
                    -93,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -81,
                    -78,
                    -76,
                    -72,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -70,
                    -70.167,
                    -70.25,
                    -70.917,
                    -76.5,
                    -75,
                    -87,
                    -83,
                    -83,
                    100,
                    -79,
                    -80,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    -82,
                    -80.333,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                    100,
                ];
                fingerprintService.findAll().then((fingerprints) => {
                    fingerprints.forEach((fingerprint) => {
                        const location = fingerprint.position as Absolute3DPosition;
                        if (location.x === 227.94 && location.y === 142.04 && location.z === 0) {
                            expect(rssiVector.length).to.equal(fingerprint.features.size);
                            for (let i = 0; i < rssiVector.length; i++) {
                                const rssi = rssiVector[i];
                                const distance = rssiToDistance(rssi);
                                const relativeLocation = Array.from(fingerprint.features.values())[i];
                                expect(distance).to.equal(relativeLocation.values[0]);
                            }
                            return done();
                        }
                    });
                }).catch(done);
            }).timeout(10000);
        });

        describe('online stage knn with k=5', () => {
            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(Fingerprint))
                    .from(
                        new CSVDataSource(
                            'test/data/richter2018/Test_rss.csv',
                            (row: any) => {
                                const dataFrame = new EvaluationDataFrame();
                                const phoneObject = new DataObject('phone');
                                aps.forEach((ap) => {
                                    const rssi = parseFloat(row[ap]);
                                    const distance = rssiToDistance(rssi);
                                    const object = new DataObject(ap);
                                    dataFrame.addObject(object);
                                    phoneObject.addRelativePosition(new RelativeDistance(object, distance));
                                });
                                dataFrame.evaluationObjects = null;
                                dataFrame.addObject(phoneObject);
                                return dataFrame;
                            },
                            {
                                headers: aps,
                            },
                        ),
                        new CSVDataSource(
                            'test/data/richter2018/Test_coordinates.csv',
                            (row: any) => {
                                const dataFrame = new EvaluationDataFrame();

                                const phoneObject = new DataObject('phone');
                                dataFrame.addObject(phoneObject);

                                const evaluationObject = new DataObject('phone');
                                evaluationObject.position = new Absolute3DPosition(
                                    parseFloat(row.x),
                                    parseFloat(row.y),
                                    parseFloat(row.z),
                                );
                                dataFrame.evaluationObjects.set('phone', evaluationObject);
                                return dataFrame;
                            },
                            {
                                headers: ['x', 'y', 'z'],
                            },
                        ),
                    )
                    .via(
                        new ObjectMergeNode<EvaluationDataFrame>(
                            (frame: EvaluationDataFrame) => frame.source.uid,
                            {
                                objectFilter: (object: DataObject) => object.uid == 'phone',
                            }
                        ),
                    )
                    .via(
                        new KNNFingerprintingNode({
                            k: 5,
                            weighted: false,
                            naive: true,
                        }),
                    )
                    .to(callbackNode)
                    .build()
                    .then((model) => {
                        trackingModel = model;
                        done();
                    });
            });

            after(() => {
                trackingModel.emit('destroy');
            });

            it('should have an average error of less than 23 meters', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    const calculatedLocation: Absolute3DPosition = data.getObjectByUID('phone')
                        .position as Absolute3DPosition;
                    // Accurate control location
                    const expectedLocation: Absolute3DPosition = data.evaluationObjects.get('phone')
                        .position as Absolute3DPosition;
                    totalError += expectedLocation.distanceTo(calculatedLocation);
                    totalValues++;
                };

                // Perform a pull
                const promises = [];
                for (let i = 0; i < 100; i++) {
                    promises.push(trackingModel.pull());
                }
                Promise.all(promises)
                    .then(() => {
                        expect(totalError / totalValues).to.be.lessThan(23);
                        done();
                    })
                    .catch(done);
            }).timeout(50000);
        });

        describe('online stage weighted knn with k=5', () => {
            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(Fingerprint))
                    .from(
                        new CSVDataSource(
                            'test/data/richter2018/Test_rss.csv',
                            (row: any) => {
                                const dataFrame = new EvaluationDataFrame();
                                const phoneObject = new DataObject('phone');
                                aps.forEach((ap) => {
                                    const rssi = parseFloat(row[ap]);
                                    const distance = rssiToDistance(rssi);
                                    const object = new DataObject(ap);
                                    dataFrame.addObject(object);
                                    phoneObject.addRelativePosition(new RelativeDistance(object, distance));
                                });
                                dataFrame.evaluationObjects = null;
                                dataFrame.addObject(phoneObject);
                                return dataFrame;
                            },
                            {
                                headers: aps,
                            },
                        ),
                        new CSVDataSource(
                            'test/data/richter2018/Test_coordinates.csv',
                            (row: any) => {
                                const dataFrame = new EvaluationDataFrame();

                                const phoneObject = new DataObject('phone');
                                dataFrame.addObject(phoneObject);

                                const evaluationObject = new DataObject('phone');
                                evaluationObject.position = new Absolute3DPosition(
                                    parseFloat(row.x),
                                    parseFloat(row.y),
                                    parseFloat(row.z),
                                );
                                dataFrame.evaluationObjects.set('phone', evaluationObject);
                                return dataFrame;
                            },
                            {
                                headers: ['x', 'y', 'z'],
                            },
                        ),
                    )
                    .via(
                        new ObjectMergeNode<EvaluationDataFrame>(
                            (frame: EvaluationDataFrame) => frame.source.uid,
                            {
                                objectFilter: (object: DataObject) => object.uid == 'phone',
                            }
                        ),
                    )
                    .via(
                        new KNNFingerprintingNode({
                            k: 5,
                            weighted: true,
                            naive: true,
                        }),
                    )
                    .to(callbackNode)
                    .build()
                    .then((model) => {
                        trackingModel = model;
                        done();
                    });
            });

            after(() => {
                trackingModel.emit('destroy');
            });

            it('should have an average error of less than 23 meters', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    const calculatedLocation: Absolute3DPosition = data.getObjectByUID('phone')
                        .position as Absolute3DPosition;
                    // Accurate control location
                    const expectedLocation: Absolute3DPosition = data.evaluationObjects.get('phone')
                        .position as Absolute3DPosition;

                    totalError += expectedLocation.distanceTo(calculatedLocation);
                    totalValues++;
                };

                // Perform a pull
                const promises = [];
                for (let i = 0; i < 100; i++) {
                    promises.push(trackingModel.pull());
                }
                Promise.all(promises)
                    .then(() => {
                        expect(totalError / totalValues).to.be.lessThan(23);
                        done();
                    })
                    .catch(done);
            }).timeout(50000);
        });
    });
});
