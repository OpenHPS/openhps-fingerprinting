import { DataFrame, DataObject } from '@openhps/core';
import { FingerprintingNode } from './FingerprintingNode';

export abstract class OnlineFingerprintingNode<InOut extends DataFrame> extends FingerprintingNode<InOut> {
    public processObject(dataObject: DataObject, dataFrame: InOut): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            if (dataObject.relativePositions.length > 0) {
                this.onlineFingerprinting(dataObject, dataFrame).then(resolve).catch(reject);
            } else {
                resolve(dataObject);
            }
        });
    }

    protected offlineFingerprinting(): Promise<DataObject> {
        throw new Error(`Online fingerprint nodes can not store fingerprints!`);
    }
}
