import { expect } from 'chai';
import 'mocha';
import { Absolute3DPosition } from '@openhps/core';
import { DistanceFunction } from '../../src/nodes/DistanceFunction';
import { Fingerprint } from '../../src/data/Fingerprint';
import { KDTree } from '../../src/utils/KDTree';

describe('utils kd-tree', () => {
    /**
     * Build a 3-D RSSI grid whose fingerprints are one dB apart on every axis.
     * @param size Number of fingerprints along each axis
     * @returns The fingerprints of the grid
     */
    function createGrid(size = 4): Fingerprint[] {
        const fingerprints: Fingerprint[] = [];
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                for (let z = 0; z < size; z++) {
                    const fingerprint = new Fingerprint(`fp-${x}-${y}-${z}`);
                    fingerprint.vector = [-40 - x, -50 - y, -60 - z];
                    fingerprint.position = new Absolute3DPosition(x, y, z);
                    fingerprints.push(fingerprint);
                }
            }
        }
        return fingerprints;
    }

    it('should return the exact neighbour in a 3-D grid for k = 1', () => {
        const fingerprints = createGrid();
        const tree = new KDTree(fingerprints, DistanceFunction.EUCLIDEAN);

        fingerprints.forEach((fingerprint) => {
            const results = tree.nearest([...fingerprint.vector], 1);
            expect(results).to.have.length(1);
            // Every grid point is an exact match of itself, so it must win over the
            // 1 dB / 1.41 dB neighbours that a faulty branch-pruning traversal returned.
            expect(results[0][0]).to.equal(fingerprint.position);
            expect(results[0][1]).to.be.lessThan(1e-4);
        });
    });

    it('should return the nearest neighbours ordered by distance for small k', () => {
        const fingerprints = createGrid();
        const tree = new KDTree(fingerprints, DistanceFunction.EUCLIDEAN);
        const exact = fingerprints.find((fingerprint) => fingerprint.displayName === 'fp-1-1-0');
        const results = tree.nearest([...exact.vector], 3);

        expect(results).to.have.length(3);
        expect(results[0][0]).to.equal(exact.position);
        for (let i = 1; i < results.length; i++) {
            expect(results[i][1]).to.be.at.least(results[i - 1][1]);
        }
    });
});
