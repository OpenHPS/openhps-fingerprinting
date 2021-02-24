export class WeightFunction {
    public static readonly DEFAULT = (distance: number) => {
        return 1 / distance;
    };
    public static readonly SQUARE = (distance: number) => {
        return 1 / Math.pow(distance, 2);
    };
}
