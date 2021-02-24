import { DataFrame, DataObject } from '@openhps/core';
import { Fingerprint } from '../data';
import { FingerprintingNode } from './FingerprintingNode';

export class OfflineFingerprintingNode<InOut extends DataFrame> extends FingerprintingNode<InOut> {
    public processObject(dataObject: DataObject, dataFrame: InOut): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            if (dataObject.position !== undefined) {
                this.offlineFingerprinting(dataObject, dataFrame).then(resolve).catch(reject);
            } else {
                resolve(dataObject);
            }
        });
    }

    /**
     * Offline fingerprinting
     *  Store the fingerprint if it has a position and relative positions.
     *
     * @param {DataObject} dataObject Data object to treat as fingerprinting source
     * @param {DataFrame} dataFrame Data frame this data object was included in
     * @returns {Promise<DataObject>} Data object promise
     */
    protected offlineFingerprinting(dataObject: DataObject, dataFrame: InOut): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            // Create a fingerprint at the current position
            const fingerprint = new Fingerprint();
            fingerprint.source = dataObject;
            fingerprint.createdTimestamp = dataFrame.createdTimestamp;
            fingerprint.position = dataObject.position;
            fingerprint.classifier = this.serviceOptions.classifier;

            // Add relative positions that will define the fingerprint
            dataObject.relativePositions.filter(this.options.valueFilter).forEach((relativePosition) => {
                // Do not add relative position if reference value is unusable
                if (relativePosition.referenceValue !== undefined && !isNaN(relativePosition.referenceValue)) {
                    fingerprint.addRelativePosition(relativePosition);
                }
            });

            if (fingerprint.relativePositions.length > 0) {
                // Store the fingerprint
                this.service
                    .insertObject(fingerprint as any)
                    .then(() => {
                        resolve(dataObject);
                    })
                    .catch(reject);
            } else {
                resolve(dataObject);
            }
        });
    }

    protected onlineFingerprinting(): Promise<DataObject> {
        throw new Error(`Offline fingerprinting node can not perform reverse fingerprinting!`);
    }
}
