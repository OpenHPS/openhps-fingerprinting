import { 
    Absolute3DPosition,
    CallbackSinkNode,
    DataFrame,
    DataObject,
    MemoryDataService,
    Model,
    ModelBuilder, 
} from "@openhps/core";
import { 
    CSVDataSource 
} from "@openhps/csv";
import {
    RelativeRSSI
} from '@openhps/rf';
import { expect } from 'chai';
import { EvaluationDataFrame } from "../../mock/data/EvaluationDataFrame";
import { 
    WeightFunction,
    FingerprintService,
    Fingerprint,
    KNNFingerprintingNode,
    FingerprintingNode,
    DistanceFunction
} from '../../../src/';

describe('dataset', () => {
    describe('ujiindoorloc', function () {
        let offlineModel: Model;
        let onlineModel: Model;
        let onlineSink: CallbackSinkNode<any> = new CallbackSinkNode();

        before(function(done) {
            this.timeout(600000);

            ModelBuilder.create()
                .addService(new FingerprintService(new MemoryDataService(Fingerprint), {
                    defaultValue: -95,
                }))
                // Pull request will use training data
                .from(new CSVDataSource("test/data/UJIIndoorLoc/trainingData.csv", (row) => {
                    const phone = new DataObject(row['PHONEID']);
                    const position = new Absolute3DPosition(
                        parseFloat(row['LATITUDE']),
                        parseFloat(row['LONGITUDE']),
                        parseInt(row['FLOOR'])
                    );
                    phone.setPosition(position);
                    for (let i = 1 ; i <= 520 ; i++) {
                        const accessPoint = `WAP${String(i).padStart(3, "0")}`;
                        const rssi = parseInt(row[accessPoint]);
                        if (rssi !== 100)
                            phone.addRelativePosition(new RelativeRSSI(
                                accessPoint, 
                                rssi));
                    }
                    return new DataFrame(phone);
                }))
                .via(new FingerprintingNode())
                .to(new CallbackSinkNode())
                .build().then(m => {
                    offlineModel = m;
                    return ModelBuilder.create()
                        .addService(offlineModel.findDataService(Fingerprint))
                        .from(new CSVDataSource("test/data/UJIIndoorLoc/validationData.csv", (row) => {
                            const phone = new DataObject("phone");
                            const position = new Absolute3DPosition(
                                parseFloat(row['LATITUDE']),
                                parseFloat(row['LONGITUDE']),
                                parseInt(row['FLOOR'])
                            );
                            for (let i = 1 ; i <= 520 ; i++) {
                                const accessPoint = `WAP${String(i).padStart(3, "0")}`;
                                const rssi = parseInt(row[accessPoint]);
                                if (rssi !== 100)
                                    phone.addRelativePosition(new RelativeRSSI(
                                        accessPoint, 
                                        rssi));
                            }
                            const frame = new EvaluationDataFrame(phone);
                            const evaluationObject = new DataObject("phone");
                            evaluationObject.setPosition(position);
                            frame.evaluationObjects.set("phone", evaluationObject);
                            return frame;
                        }, {
                            persistence: false
                        }))
                        .via(new KNNFingerprintingNode({
                            k: 3,
                            weighted: true,
                            weightFunction: WeightFunction.SQUARE,
                            similarityFunction: DistanceFunction.EUCLIDEAN
                        }))
                        .to(onlineSink)
                        .build();
                }).then(m => {
                    onlineModel = m;
                    return offlineModel.pull({
                        count: 19937,
                        sequentialPull: false
                    });
                }).then(() => {
                    const service = onlineModel.findDataService(Fingerprint) as FingerprintService;
                    return service.update();
                }).then(() => {
                    done();
                }).catch(done);
        });

        after(() => {
            onlineModel.emit('destroy');
            offlineModel.emit('destroy');
        });

        it('should process all fingerprint locations', (done) => {
            const service = onlineModel.findDataService(Fingerprint) as FingerprintService;
            expect(service.cache.length).to.equal(933);
            done();
        });

        it('should have an accuracy of less than 15meters without optimizations', (done) => {
            let totalError = 0;
            let totalValues = 0;
            onlineSink.callback = (data: EvaluationDataFrame) => {
                const calculatedLocation: Absolute3DPosition = data.source
                    .position as Absolute3DPosition;
                // Accurate control location
                const expectedLocation: Absolute3DPosition = data.evaluationObjects.get('phone')
                    .position as Absolute3DPosition;
                totalError += expectedLocation.distanceTo(calculatedLocation);
                totalValues++;
            };

            // Perform a pull
            onlineModel.pull({
                count: 1111,
                sequentialPull: false
            }).then(() => {
                expect(totalError / totalValues).to.be.lessThan(18);
                done();
            }).catch(done);
        });
    });
});
