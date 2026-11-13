import { AbsolutePosition } from '@openhps/core';
import { Fingerprint } from '../data';
import { BinaryHeap } from './_internal/BinaryHeap';

export class KDTree {
    axis: number;
    fingerprint: Fingerprint;
    left: KDTree;
    right: KDTree;
    private _distanceFn: (pointA: number[], pointB: number[]) => number;

    constructor(fingerprints: Fingerprint[], distanceFn: (pointA: number[], pointB: number[]) => number, depth = 0) {
        this._distanceFn = distanceFn;
        // No fingerprints in cache
        if (fingerprints.length === 0) {
            return;
        }

        const dimensions = fingerprints[0].vector.length;
        this.axis = depth % dimensions;

        // Sort a copy so the caller's array (e.g. the fingerprint service cache) is not mutated
        const sortedFingerprints = [...fingerprints];
        sortedFingerprints.sort((a, b) => a.vector[this.axis] - b.vector[this.axis]);

        const medianIndex = Math.floor(sortedFingerprints.length / 2);

        this.fingerprint = sortedFingerprints[medianIndex];

        const leftFingerprints = sortedFingerprints.slice(0, medianIndex);
        if (leftFingerprints.length) {
            this.left = new KDTree(leftFingerprints, this._distanceFn, depth + 1);
        }

        const rightFingerprints = sortedFingerprints.slice(medianIndex + 1);
        if (rightFingerprints.length) {
            this.right = new KDTree(rightFingerprints, this._distanceFn, depth + 1);
        }
    }

    private _nearestSearch(point: number[], bestNodes: BinaryHeap<[KDTree, number]>, count: number, node: KDTree) {
        let ownDistance = this._distanceFn(point, node.fingerprint.vector);
        if (ownDistance === 0) {
            ownDistance = 1e-5;
        }
        const vector = [...node.fingerprint.vector];

        // Project the query point onto this node's splitting plane. Using the node's own axis
        // (not the root node's axis) is essential: otherwise the distance to the plane is
        // overestimated for every node below the root and valid branches get pruned.
        vector[node.axis] = point[node.axis];

        if (node.right === undefined && node.left === undefined) {
            if (bestNodes.size() < count || ownDistance < bestNodes.peek()[1]) {
                bestNodes.push([node, ownDistance]);
                if (bestNodes.size() > count) {
                    bestNodes.pop();
                }
            }
            return;
        }

        const [subtree, otherSubtree] =
            point[node.axis] < node.fingerprint.vector[node.axis] ? [node.left, node.right] : [node.right, node.left];

        if (subtree) {
            this._nearestSearch(point, bestNodes, count, subtree);
        }

        if (bestNodes.size() < count || ownDistance < bestNodes.peek()[1]) {
            bestNodes.push([node, ownDistance]);
            if (bestNodes.size() > count) {
                bestNodes.pop();
            }
        }

        if (bestNodes.size() < count || this._distanceFn(vector, node.fingerprint.vector) < bestNodes.peek()[1]) {
            if (otherSubtree !== undefined) {
                this._nearestSearch(point, bestNodes, count, otherSubtree);
            }
        }
    }

    nearest(point: number[], count = 1, maxDistance?: number): Array<[AbsolutePosition, number]> {
        // An empty tree (no fingerprints in the cache) has no nodes to search
        if (this.fingerprint === undefined) {
            return [];
        }

        const bestNodes = new BinaryHeap<[KDTree, number]>((element: [KDTree, number]) => {
            return -element[1];
        });

        if (maxDistance) {
            for (let i = 0; i < count; i++) {
                bestNodes.push([null, maxDistance]);
            }
        }

        this._nearestSearch(point, bestNodes, count, this);

        const result: Array<[AbsolutePosition, number]> = [];

        for (let i = 0; i < Math.min(count, bestNodes.content.length); i += 1) {
            if (bestNodes.content[i][0]) {
                result.push([bestNodes.content[i][0].fingerprint.position, bestNodes.content[i][1]]);
            }
        }
        // The binary heap only guarantees that the largest distance is at the root; return the
        // neighbours ordered from nearest to farthest so callers can rely on result[0].
        result.sort((a, b) => a[1] - b[1]);
        return result;
    }

    get balanceFactor(): number {
        /**
         * Get the height of the tree node
         * @param {KDTree} node KD tree node
         * @returns {number} Height of the tree
         */
        function height(node: KDTree): number {
            if (node === undefined) {
                return 0;
            }
            return Math.max(height(node.left), height(node.right)) + 1;
        }

        /**
         * Count the nodes in the tree
         * @param {KDTree} node KD tree node
         * @returns {number} number of nodes in the tree
         */
        function count(node: KDTree): number {
            if (node === undefined) {
                return 0;
            }
            return count(node.left) + count(node.right) + 1;
        }

        return height(this) / (Math.log(count(this)) / Math.log(2));
    }
}
