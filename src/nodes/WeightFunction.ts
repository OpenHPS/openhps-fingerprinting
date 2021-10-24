export class WeightFunction {
    static readonly DEFAULT = (distance: number) => {
        return 1 / distance;
    };
    static readonly SQUARE = (distance: number) => {
        return 1 / Math.pow(distance, 2);
    };
}
