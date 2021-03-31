import { FingerprintingNode, FingerprintingNodeOptions } from './FingerprintingNode';
import { DataFrame, DataObject, RelativePosition, AbsolutePosition, Vector3, RelativeValue } from '@openhps/core';
import { WeightFunction } from './WeightFunction';
import { KDTree } from '../utils/KDTree';
import { DistanceFunction } from './DistanceFunction';

/**
 * KNN Fingerprinting processing node
 *
 * @category Processing node
 */
export class KNNFingerprintingNode<InOut extends DataFrame> extends FingerprintingNode<InOut> {
    protected options: KNNFingerprintingOptions;
    protected kdtree: KDTree;

    constructor(options: KNNFingerprintingOptions) {
        super(options);

        // Default options
        this.options.locked = this.options['locked'] !== undefined ? this.options['locked'] : true;
        this.options.k = this.options.k || 1;
        this.options.similarityFunction = this.options.similarityFunction || DistanceFunction.EUCLIDEAN;
        this.options.weightFunction = this.options.weightFunction || WeightFunction.DEFAULT;

        this.on('build', this._initKDTree.bind(this));
    }

    private _initKDTree(): void {
        if (!this.options.naive) {
            this.kdtree = new KDTree(this.cache, this.options.similarityFunction);
            this.on('update', () => {
                this.kdtree = new KDTree(this.cache, this.options.similarityFunction);
            });
        }
    }

    protected onlineFingerprinting(dataObject: DataObject): Promise<DataObject> {
        return new Promise((resolve) => {
            // Make sure the object has a relative position to all reference objects
            // used for the fingerprinting
            this.cachedReferences.forEach((relativeObject) => {
                if (!dataObject.hasRelativePosition(relativeObject)) {
                    dataObject.addRelativePosition(new RelativeValue(relativeObject, this.serviceOptions.defaultValue));
                }
            });

            const dataObjectPoint: number[] = [];
            dataObject.relativePositions
                // Filter out unneeded relative positions
                .filter((rel) => this.cachedReferences.has(rel.referenceObjectUID))
                // Sort alphabetically
                .sort((a: RelativePosition, b: RelativePosition) =>
                    a.referenceObjectUID.localeCompare(b.referenceObjectUID),
                )
                .forEach((rel) => {
                    dataObjectPoint.push(rel.referenceValue);
                });

            if (dataObjectPoint.length === 0) {
                return resolve(dataObject);
            }

            // Perform reverse fingerprinting
            let results = new Array<[AbsolutePosition, number]>();
            if (this.options.naive) {
                this.cache.forEach((cachedFingerprint) => {
                    let distance = this.options.similarityFunction(dataObjectPoint, cachedFingerprint.vector);
                    if (distance === 0) {
                        distance = 1e-5;
                    }
                    results.push([cachedFingerprint.position, distance]);
                });
                results = results
                    // Sort by euclidean distance
                    .sort((a, b) => a[1] - b[1])
                    // Only the first K neighbours
                    .splice(0, this.options.k);
            } else {
                results = this.kdtree.nearest(dataObjectPoint, this.options.k);
            }

            const point: Vector3 = new Vector3(0, 0, 0);
            if (this.options.weighted) {
                let scale = 0;
                results.forEach((sortedFingerprint) => {
                    const weight = this.options.weightFunction(sortedFingerprint[1]);
                    scale += this.options.weightFunction(sortedFingerprint[1]);
                    point.add(sortedFingerprint[0].toVector3().multiplyScalar(weight));
                });
                point.divideScalar(scale);
            } else {
                results.forEach((sortedFingerprint) => {
                    point.add(sortedFingerprint[0].toVector3());
                });
                point.multiplyScalar(1 / this.options.k);
            }

            // Set a new position
            const newPosition = results[0][0].clone();
            newPosition.fromVector(point);
            dataObject.setPosition(newPosition);
            resolve(dataObject);
        });
    }
}

export interface KNNFingerprintingOptions extends FingerprintingNodeOptions {
    /**
     * Number of neighbours to use
     */
    k?: number;
    /**
     * Use weighted KNN
     */
    weighted?: boolean;
    /**
     * Naive algorithm (no KD-tree)
     */
    naive?: boolean;
    /**
     * Similarity function (distance function)
     *
     * @default DistanceFunction.EUCLIDEAN
     */
    similarityFunction?: (point: number[], fingerprint: number[]) => number;
    /**
     * Weight function
     *
     * @default WeightFunction.DEFAULT
     */
    weightFunction?: (distance: number) => number;
}
