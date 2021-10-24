import { Absolute2DPosition, AngleUnit, CallbackSinkNode, DataFrame, DataObject, GraphBuilder, MemoryDataService, Model, ModelBuilder, Orientation } from "@openhps/core";
import { CSVDataSource } from '@openhps/csv';
import { DistanceFunction, Fingerprint, FingerprintService, KNNFingerprintingNode, FingerprintingNode, WeightFunction } from "../../../src";
import { expect } from "chai";
import { EvaluationDataFrame } from "../../mock/data/EvaluationDataFrame";
import {
    RelativeRSSI,
} from '@openhps/rf';

describe('dataset ipin2021', () => {
    describe('ble fingerprinting dataset', () => {
        let model: Model;
        let service: FingerprintService;
        let testSink: CallbackSinkNode<any> = new CallbackSinkNode();
        let algorithm: KNNFingerprintingNode<any>;
        let trainData: CSVDataSource<any>;
        let testDataMean: CSVDataSource<any>;
        let testDataRaw: CSVDataSource<any>;

        before(function(done) {
            service = new FingerprintService(new MemoryDataService(Fingerprint), {
                defaultValue: -95
            });
    
            trainData = new CSVDataSource(
                "test/data/OpenHPS-2021-02/train/raw/ble_fingerprints.csv", 
                (row: any) => {
                    const object = new DataObject("phone");
                    const position = new Absolute2DPosition(
                        parseFloat(row['X']),
                        parseFloat(row['Y'])
                    );
                    position.orientation = Orientation.fromEuler({
                        yaw: parseFloat(row['ORIENTATION']),
                        roll: 0,
                        pitch: 0,
                        unit: AngleUnit.DEGREE
                    });
                    object.setPosition(position);
                    for (const prop in row) {
                        if (prop.includes("BEACON_")) {
                            const rssi = parseInt(row[prop]);
                            if (rssi !== 100)
                                object.addRelativePosition(new RelativeRSSI(
                                    prop, 
                                    rssi));
                        }
                    }
                    return new DataFrame(object);
                },
                {
                    uid: "train-data"
                }
            );
    
            testDataMean = new CSVDataSource(
                "test/data/OpenHPS-2021-02/test/aggregated/ble_fingerprints.csv", 
                (row: any) => {
                    const object = new DataObject("phone");
                    const position = new Absolute2DPosition(
                        parseFloat(row['X']),
                        parseFloat(row['Y'])
                    );
                    position.orientation = Orientation.fromEuler({
                        yaw: parseFloat(row['ORIENTATION']),
                        roll: 0,
                        pitch: 0,
                        unit: AngleUnit.DEGREE
                    });
                    for (const prop in row) {
                        if (prop.includes("BEACON_")) {
                            const rssi = parseInt(row[prop]);
                            if (rssi !== 100)
                                object.addRelativePosition(new RelativeRSSI(
                                    prop, 
                                    rssi));
                        }
                    }
                    const evaluationObject = new DataObject("phone");
                    evaluationObject.setPosition(position);
                    const frame = new EvaluationDataFrame(object);
                    frame.evaluationObjects.set('phone', evaluationObject);
                    return frame;
                },
                {
                    uid: "test-data-mean",
                    persistence: false
                }
            );

            testDataRaw = new CSVDataSource(
                "test/data/OpenHPS-2021-02/test/aggregated/ble_fingerprints.csv", 
                (row: any) => {
                    const object = new DataObject("phone");
                    const position = new Absolute2DPosition(
                        parseFloat(row['X']),
                        parseFloat(row['Y'])
                    );
                    position.orientation = Orientation.fromEuler({
                        yaw: parseFloat(row['ORIENTATION']),
                        roll: 0,
                        pitch: 0,
                        unit: AngleUnit.DEGREE
                    });
                    for (const prop in row) {
                        if (prop.includes("BEACON_")) {
                            const rssi = parseInt(row[prop]);
                            if (rssi !== 100)
                                object.addRelativePosition(new RelativeRSSI(
                                    prop, 
                                    rssi));
                        }
                    }
                    const evaluationObject = new DataObject("phone");
                    evaluationObject.setPosition(position);
                    const frame = new EvaluationDataFrame(object);
                    frame.evaluationObjects.set('phone', evaluationObject);
                    return frame;
                },
                {
                    uid: "test-data-raw",
                    persistence: false
                }
            );
    
            algorithm = new KNNFingerprintingNode({
                weighted: true,
                k: 4,
                weightFunction: WeightFunction.SQUARE,
                similarityFunction: DistanceFunction.EUCLIDEAN
            });
            
            ModelBuilder.create()
                .addService(service)
                .addShape(GraphBuilder.create()
                    .from(trainData)
                    .via(new FingerprintingNode())
                    .to())
                .addShape(GraphBuilder.create()
                    .from(testDataMean, testDataRaw)
                    .via(algorithm)
                    .to(testSink))
                .build().then(m => {
                    model = m;
                    return model.pull({
                        count: trainData.size,
                        sequentialPull: false,
                        sourceNode: "train-data"
                    });
                }).then(() => {
                    done();
                }).catch(done);
        });
    
        it('should process the fingerprints for 4 orientations', (done) => {
            service.options.groupBy = (pos) => {
                return JSON.stringify({ pos: pos.toVector3(), orientation: pos.orientation.toArray() })};
            service.update().then(() => {
                expect(service.cache.length).to.equal(412);
                done();
            }).catch(done);
        });

        it('should process the fingerprints for mean orientation', (done) => {
            service.options.groupBy = (pos) => JSON.stringify(pos.toVector3());
            service.update().then(() => {
                expect(service.cache.length).to.equal(104);
                done();
            }).catch(done);
        });
    
        describe('online stage 4 orientations', () => {

            before((done) => {
                service.options.groupBy = (pos) => 
                    JSON.stringify({ pos: pos.toVector3(), orientation: pos.orientation.toArray() });
                service.update().then(() => {
                    return testDataMean.reset();
                }).then(() => {
                    done();
                }).catch(done);
            });

            it('should have an average accuracy of 5 meters', (done) => {
                let errors = []
                testSink.callback = (data: EvaluationDataFrame) => {
                    const calculatedLocation = data.source.position as Absolute2DPosition;
                    // Accurate control location
                    const expectedLocation = data.evaluationObjects.get('phone').position as Absolute2DPosition;
                    errors.push(expectedLocation.distanceTo(calculatedLocation));
                };
    
                // Perform a pull
                testSink.pull({
                    count: testDataMean.size,
                    sequentialPull: false,
                    sourceNode: "test-data-mean"
                }).then(() => {
                    expect(Math.max(...errors)).to.be.lessThan(30);
                    expect(Math.min(...errors)).to.be.lessThan(0.4);
                    expect(errors.reduce((a, b) => a + b) / errors.length).to.be.lessThan(5);
                    done();
                }).catch(done);
            });

        });

        describe('online stage mean orientation', () => {

            before((done) => {
                service.options.groupBy = (pos) => 
                    JSON.stringify(pos.toVector3());
                service.update().then(() => {
                    return testDataMean.reset();
                }).then(() => {
                    done();
                }).catch(done);
            });

            it('should have an average accuracy of 5 meters', (done) => {
                let errors = []
                testSink.callback = (data: EvaluationDataFrame) => {
                    const calculatedLocation = data.source.position as Absolute2DPosition;
                    // Accurate control location
                    const expectedLocation = data.evaluationObjects.get('phone').position as Absolute2DPosition;
                    errors.push(expectedLocation.distanceTo(calculatedLocation));
                };
    
                // Perform a pull
                testSink.pull({
                    count: testDataMean.size,
                    sequentialPull: false,
                    sourceNode: "test-data-mean"
                }).then(() => {
                    expect(Math.max(...errors)).to.be.lessThan(20);
                    expect(Math.min(...errors)).to.be.lessThan(0.4);
                    expect(errors.reduce((a, b) => a + b) / errors.length).to.be.lessThan(5);
                    done();
                }).catch(done);
            });

        });

    });
    
});
