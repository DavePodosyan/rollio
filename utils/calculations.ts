
export function calculateEV100(aperture: number, shutterSpeed: number, iso: number): number {
    return Math.log2((aperture ** 2) / shutterSpeed) - Math.log2(iso / 100);
}