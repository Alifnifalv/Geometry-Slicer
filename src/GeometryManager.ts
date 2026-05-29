import * as PolyBool from 'polybooljs';

export class GeometryManager {
  /**
   * Calculates the area of a polygon defined by an array of [x, y] coordinates
   * using the Shoelace (Surveyor's) formula.
   */
  static calculateArea(region: number[][]): number {
    let area = 0;
    const n = region.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += region[i][0] * region[j][1];
      area -= region[j][0] * region[i][1];
    }
    return Math.abs(area / 2);
  }

  /**
   * Slice a set of polygon regions by an infinite line passing through p1 and p2.
   * Returns an array of resulting polygon regions (each region is a piece).
   */
  static slicePolygons(regions: number[][][], p1: {x: number, y: number}, p2: {x: number, y: number}): number[][][] {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return regions; // Invalid line

    // Create a very large rectangle on one side of the line
    // To act as a half-plane
    const HUGE = 20000;
    const nx = (-dy / len) * HUGE;
    const ny = (dx / len) * HUGE;
    
    const ex_x = (dx / len) * HUGE;
    const ex_y = (dy / len) * HUGE;

    // Rectangle representing the "left" side of the line
    const halfPlaneRegion: number[][] = [
      [p1.x - ex_x, p1.y - ex_y],
      [p2.x + ex_x, p2.y + ex_y],
      [p2.x + ex_x + nx, p2.y + ex_y + ny],
      [p1.x - ex_x + nx, p1.y - ex_y + ny]
    ];

    const halfPlanePoly: PolyBool.Polygon = {
      regions: [halfPlaneRegion],
      inverted: false
    };

    const targetPoly: PolyBool.Polygon = {
      regions: regions,
      inverted: false
    };

    // Piece A: intersection with the half-plane
    const pieceA = PolyBool.intersect(targetPoly, halfPlanePoly);
    
    // Piece B: difference with the half-plane
    const pieceB = PolyBool.difference(targetPoly, halfPlanePoly);

    const resultingRegions: number[][][] = [];
    if (pieceA.regions && pieceA.regions.length > 0) {
      resultingRegions.push(...pieceA.regions);
    }
    if (pieceB.regions && pieceB.regions.length > 0) {
      resultingRegions.push(...pieceB.regions);
    }

    return resultingRegions;
  }

  /**
   * Get the centroid of a polygon region for visual separation.
   */
  static getCentroid(region: number[][]): {x: number, y: number} {
    let x = 0;
    let y = 0;
    for (let i = 0; i < region.length; i++) {
      x += region[i][0];
      y += region[i][1];
    }
    return {
      x: x / region.length,
      y: y / region.length
    };
  }
}
