import { Fingerprint } from '../../data';

/**
 * @param fingerprints
 */
export function BicubicInterpolation(fingerprints: Fingerprint[]): Fingerprint[] {
    const positions = fingerprints
        .map((fingerprint) => fingerprint.position.toVector3())
        .sort((a, b) => a.x - b.x || a.y - b.y);
    const x = positions.map((p) => p.x);
    const y = positions.map((p) => p.y);
    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const minY = Math.min(...y);
    const maxY = Math.max(...y);

    return fingerprints;
}
