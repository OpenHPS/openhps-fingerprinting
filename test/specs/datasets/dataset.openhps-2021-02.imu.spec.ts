import { Absolute2DPosition, AbsolutePosition, AngleUnit, CallbackSinkNode, DataFrame, DataObject, GraphBuilder, MemoryDataService, Model, ModelBuilder, Orientation, RelativeRSSIPosition, RelativeValue } from "@openhps/core";
import { CSVDataSource } from '@openhps/csv';
import { DistanceFunction, Fingerprint, FingerprintService, KNNFingerprintingNode, OfflineFingerprintingNode, WeightFunction } from "../../../src";
import { expect } from "chai";
import { EvaluationDataFrame } from "../../mock/data/EvaluationDataFrame";

describe('dataset ipin2021', () => {
    describe('imu fingerprinting dataset', () => {
        let model: Model;
        let service: FingerprintService;
        let testSink: CallbackSinkNode<any> = new CallbackSinkNode();
        let algorithm: KNNFingerprintingNode<any>;
        let trainData: CSVDataSource<any>;
        let testDataMean: CSVDataSource<any>;

        before(function(done) {
            service = new FingerprintService(new MemoryDataService(Fingerprint), {
            });
    
            trainData = new CSVDataSource(
                "test/data/OpenHPS-2021-02/train/aggregated/imu_fingerprints.csv", 
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
                    const data = ["MAG_X", "MAG_Y", "MAG_Z", "MAG_SD_X", "MAG_SD_Y", "MAG_SD_Z"];
                    data.forEach(d => {
                        object.addRelativePosition(new RelativeValue(
                            d,
                            parseFloat(row[d])
                        ));
                    });
                    return new DataFrame(object);
                },
                {
                    uid: "train-data",
                    persistence: false
                }
            );
    
            testDataMean = new CSVDataSource(
                "test/data/OpenHPS-2021-02/test/aggregated/imu_fingerprints.csv", 
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
                    const data = ["MAG_X", "MAG_Y", "MAG_Z", "MAG_SD_X", "MAG_SD_Y", "MAG_SD_Z"];
                    data.forEach(d => {
                        object.addRelativePosition(new RelativeValue(
                            d,
                            parseFloat(row[d])
                        ));
                    });
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
    
            algorithm = new KNNFingerprintingNode({
                weighted: true,
                k: 5,
                weightFunction: WeightFunction.DEFAULT,
                similarityFunction: DistanceFunction.EUCLIDEAN
            });
            
            ModelBuilder.create()
                .addService(service)
                .addShape(GraphBuilder.create()
                    .from(trainData)
                    .via(new OfflineFingerprintingNode())
                    .to())
                .addShape(GraphBuilder.create()
                    .from(testDataMean)
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
            service.options.groupBy = (pos) => 
                JSON.stringify({ pos: pos.toVector3(), orientation: pos.orientation });
            service.update().then(() => {
                expect(service.cache.length).to.equal(416);
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
                    JSON.stringify({ pos: pos.toVector3(), orientation: pos.orientation });
                service.update().then(() => {
                    return testDataMean.reset();
                }).then(() => {
                    done();
                }).catch(done);
            });

            it('should have an average accuracy of 1.8 meters', (done) => {
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
                    const stats = [
                        Math.max(...errors),
                        Math.min(...errors),
                        errors.reduce((a, b) => a + b, 0) / errors.length
                    ];
                    console.log(stats)
                    expect(stats[0]).to.be.lessThan(10.15);
                    expect(stats[1]).to.be.lessThan(0.20);
                    expect(stats[2]).to.be.lessThan(12.42);
                    done();
                }).catch(done);
            });

        });

    });
    
});
