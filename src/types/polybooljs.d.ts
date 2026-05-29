declare module 'polybooljs' {
  export type Region = number[][];
  export interface Polygon {
    regions: Region[];
    inverted: boolean;
  }
  
  export function intersect(poly1: Polygon, poly2: Polygon): Polygon;
  export function union(poly1: Polygon, poly2: Polygon): Polygon;
  export function difference(poly1: Polygon, poly2: Polygon): Polygon;
  export function differenceRev(poly1: Polygon, poly2: Polygon): Polygon;
  export function xor(poly1: Polygon, poly2: Polygon): Polygon;
}
