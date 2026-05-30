export interface LevelConfig {
  shape: number[][];    // The starting polygon
  targetPieces: number; // Number of pieces required to win
  maxCuts: number;      // Maximum slice actions allowed
  tolerance: number;    // Accuracy requirement (e.g., 0.15 = 15% tolerance)
}

export interface ChapterConfig {
  name: string;
  levels: LevelConfig[];
}

// ---------------------------------------------------------
// BASIC GENERATORS
// ---------------------------------------------------------
function generatePolygon(sides: number, radius: number = 0.4): number[][] {
  const points: number[][] = [];
  const angleStep = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep - Math.PI / 2;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
}

function generateCircle(radius: number = 0.4): number[][] {
  return generatePolygon(60, radius);
}

function generateRectangle(width: number = 0.76, height: number = 0.48): number[][] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [
    [-halfWidth, -halfHeight], [halfWidth, -halfHeight],
    [halfWidth, halfHeight], [-halfWidth, halfHeight]
  ];
}

function generateStar(points: number, outerRadius: number = 0.4, innerRadius: number = 0.2): number[][] {
  const shape: number[][] = [];
  const angleStep = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2;
    shape.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return shape;
}

function generateCross(thickness: number = 0.2, length: number = 0.4): number[][] {
  const t = thickness / 2;
  return [
    [-t, -length], [t, -length], [t, -t], [length, -t],
    [length, t], [t, t], [t, length], [-t, length],
    [-t, t], [-length, t], [-length, -t], [-t, -t]
  ];
}

function generateHShape(width: number = 0.6, height: number = 0.6, thickness: number = 0.2): number[][] {
  const w = width / 2;
  const h = height / 2;
  const t = thickness / 2;
  return [
    [-w, -h], [-w + thickness, -h], [-w + thickness, -t],
    [w - thickness, -t], [w - thickness, -h], [w, -h],
    [w, h], [w - thickness, h], [w - thickness, t],
    [-w + thickness, t], [-w + thickness, h], [-w, h]
  ];
}

// ---------------------------------------------------------
// DONUT & HOLLOW FAMILY (Chapter 7)
// ---------------------------------------------------------
function generateHollowPolygon(sides: number, outer: number = 0.4, inner: number = 0.2, gapAngle: number = 0.02): number[][] {
  const shape: number[][] = [];
  const startAngle = gapAngle / 2 - Math.PI / 2;
  const endAngle = Math.PI * 2 - gapAngle / 2 - Math.PI / 2;
  for (let i = 0; i <= sides; i++) {
    const t = i / sides;
    const angle = startAngle + (endAngle - startAngle) * t;
    shape.push([Math.cos(angle) * outer, Math.sin(angle) * outer]);
  }
  for (let i = sides; i >= 0; i--) {
    const t = i / sides;
    const angle = startAngle + (endAngle - startAngle) * t;
    shape.push([Math.cos(angle) * inner, Math.sin(angle) * inner]);
  }
  return shape;
}

function generateOpenDonut(outer: number = 0.4, inner: number = 0.2): number[][] {
  return generateHollowPolygon(60, outer, inner, 0.02);
}

function generateHorseshoe(outer: number = 0.4, inner: number = 0.2): number[][] {
  return generateHollowPolygon(40, outer, inner, Math.PI * 0.5);
}

function generateKeyhole(): number[][] {
  const shape: number[][] = [];
  const points = 30;
  for (let i = 0; i <= points; i++) {
    const angle = Math.PI - (Math.PI * 2 * (i / points));
    if (angle > -Math.PI / 4 && angle < Math.PI + Math.PI / 4) {
      shape.push([Math.cos(angle) * 0.3, Math.sin(angle) * 0.3 - 0.1]);
    }
  }
  shape.push([0.15, 0.4]);
  shape.push([-0.15, 0.4]);
  return shape;
}

// ---------------------------------------------------------
// ASYMMETRIC & PUZZLE BLOCKS (Chapter 6)
// ---------------------------------------------------------
const zShape = [
  [-0.4, -0.4], [0.1, -0.4], [0.1, 0.0], [0.4, 0.0],
  [0.4, 0.4], [-0.1, 0.4], [-0.1, 0.0], [-0.4, 0.0]
];

const tShape = [
  [-0.4, -0.4], [0.4, -0.4], [0.4, 0.0], [0.1, 0.0],
  [0.1, 0.4], [-0.1, 0.4], [-0.1, 0.0], [-0.4, 0.0]
];

const lShape = [
  [-0.3, -0.4], [-0.1, -0.4], [-0.1, 0.2], [0.3, 0.2], [0.3, 0.4], [-0.3, 0.4]
];

const scaleneTriangle = [
  [-0.4, 0.3], [0.4, 0.4], [0.1, -0.4]
];

const lightningBolt = [
  [-0.2, -0.5], [0.3, -0.5], [0.1, -0.1], [0.4, -0.1],
  [0.0, 0.5], [0.1, 0.1], [-0.2, 0.1]
];

function generateWrench(): number[][] {
  return [
    [-0.4, -0.2], [-0.2, -0.2], [-0.2, -0.1], [0.2, -0.1],
    [0.2, -0.3], [0.5, -0.3], [0.5, 0.3], [0.2, 0.3],
    [0.2, 0.1], [-0.2, 0.1], [-0.2, 0.2], [-0.4, 0.2]
  ];
}

// ---------------------------------------------------------
// ORGANIC & IRREGULAR CURVES (Chapter 8)
// ---------------------------------------------------------
function generateCrescent(): number[][] {
  const shape: number[][] = [];
  const points = 30;
  for (let i = 0; i <= points; i++) {
    const angle = -Math.PI / 2 + Math.PI * (i / points);
    shape.push([Math.cos(angle) * 0.4, Math.sin(angle) * 0.4]);
  }
  for (let i = points - 1; i >= 1; i--) {
    const angle = Math.PI / 2 - Math.PI * (i / points);
    shape.push([Math.cos(angle) * 0.15, Math.sin(angle) * 0.4]);
  }
  return shape;
}

function generateTeardrop(): number[][] {
  const shape: number[][] = [];
  const points = 30;
  for (let i = 0; i <= points; i++) {
    const t = Math.PI + Math.PI * (i / points);
    shape.push([0.3 * Math.cos(t), 0.3 * Math.sin(t) + 0.1]);
  }
  shape.push([0, -0.4]);
  return shape;
}

function generateAmoeba(): number[][] {
  const shape: number[][] = [];
  const points = 50;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2) * (i / points);
    const radius = 0.35 + 0.08 * Math.sin(angle * 3) + 0.05 * Math.cos(angle * 5) + 0.03 * Math.sin(angle * 2);
    shape.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return shape;
}

function generateInkSplat(): number[][] {
  const shape: number[][] = [];
  const points = 60;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2) * (i / points);
    const radius = 0.3 + 0.15 * Math.pow(Math.sin(angle * 4), 3) + 0.1 * Math.cos(angle * 7);
    shape.push([Math.cos(angle) * Math.abs(radius), Math.sin(angle) * Math.abs(radius)]);
  }
  return shape;
}

// ---------------------------------------------------------
// ADVANCED SYMMETRICAL SHAPES (Chapter 5 & 10)
// ---------------------------------------------------------
function generateGear(teeth: number, outer: number = 0.4, inner: number = 0.25): number[][] {
  const shape: number[][] = [];
  const angleStep = Math.PI / (teeth * 2);
  for (let i = 0; i < teeth * 4; i++) {
    const radius = Math.floor(i / 2) % 2 === 0 ? outer : inner;
    const angle = i * angleStep;
    shape.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return shape;
}

function generatePinwheel(blades: number = 4, outer: number = 0.45, inner: number = 0.1): number[][] {
  const shape: number[][] = [];
  const angleStep = (Math.PI * 2) / blades;
  for (let i = 0; i < blades; i++) {
    const baseAngle = i * angleStep;
    shape.push([Math.cos(baseAngle) * inner, Math.sin(baseAngle) * inner]);
    shape.push([Math.cos(baseAngle + 0.4) * outer, Math.sin(baseAngle + 0.4) * outer]);
    shape.push([Math.cos(baseAngle + 0.6) * outer, Math.sin(baseAngle + 0.6) * outer]);
  }
  return shape;
}

function generateShield(): number[][] {
  const shape: number[][] = [];
  shape.push([-0.3, -0.4]);
  shape.push([0.3, -0.4]);
  const points = 15;
  for (let i = 1; i <= points; i++) {
    const t = i / points;
    shape.push([0.3 * (1 - t) + 0.1 * Math.sin(t * Math.PI), -0.4 + 0.8 * t]);
  }
  for (let i = points - 1; i >= 1; i--) {
    const t = i / points;
    shape.push([-0.3 * (1 - t) - 0.1 * Math.sin(t * Math.PI), -0.4 + 0.8 * t]);
  }
  return shape;
}

function generateShuriken(points: number = 4, outer: number = 0.45, inner: number = 0.15): number[][] {
  const shape: number[][] = [];
  const angleStep = (Math.PI * 2) / points;
  for (let i = 0; i < points; i++) {
    const angle = i * angleStep;
    shape.push([Math.cos(angle - 0.2) * inner, Math.sin(angle - 0.2) * inner]);
    shape.push([Math.cos(angle) * outer, Math.sin(angle) * outer]);
    shape.push([Math.cos(angle + 0.4) * inner, Math.sin(angle + 0.4) * inner]);
  }
  return shape;
}

function generateSawblade(points: number, outer: number = 0.45, inner: number = 0.35, skew: number = 0.15): number[][] {
  const evenPoints = points % 2 !== 0 ? points + 1 : points;
  const shape: number[][] = [];
  const angleStep = Math.PI / evenPoints;
  for (let i = 0; i < evenPoints * 2; i++) {
    const isOuter = i % 2 === 0;
    const radius = isOuter ? outer : inner;
    const angleOffset = isOuter ? skew : -skew; 
    const angle = i * angleStep - Math.PI / 2 + angleOffset;
    shape.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return shape;
}

function generatePointSymmetricGear(teeth: number, outer: number = 0.45, inner: number = 0.15): number[][] {
  const shape: number[][] = [];
  const evenTeeth = teeth % 2 !== 0 ? teeth + 1 : teeth;
  const angleStep = Math.PI / (evenTeeth * 2);
  const halfRadii: number[] = [];
  for (let i = 0; i < evenTeeth * 2; i++) {
    const chaoticFactor = (i % 3 === 0) ? 1.0 : (i % 2 === 0 ? 0.6 : 0.3);
    halfRadii.push(inner + (outer - inner) * chaoticFactor);
  }
  const fullRadii = [...halfRadii, ...halfRadii];
  for (let i = 0; i < evenTeeth * 4; i++) {
    const angle = i * angleStep;
    shape.push([Math.cos(angle) * fullRadii[i], Math.sin(angle) * fullRadii[i]]);
  }
  return shape;
}

// ---------------------------------------------------------
// LEVEL CONFIGURATIONS
// ---------------------------------------------------------
function getTolerance(globalLevelIndex: number): number {
  const maxTol = 0.18;
  const minTol = 0.01;
  return maxTol - (globalLevelIndex / 99) * (maxTol - minTol);
}

const chapter1Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = i < 4 ? 0.2 : getTolerance(i);
  // Only perfectly symmetric shapes that halve into mirror images for Chapter 1
  if (i === 0) chapter1Levels.push({ shape: generateRectangle(), targetPieces: 2, maxCuts: 1, tolerance: tol });
  else if (i === 1) chapter1Levels.push({ shape: generateCircle(0.38), targetPieces: 2, maxCuts: 1, tolerance: tol });
  else if (i === 2) chapter1Levels.push({ shape: generatePolygon(4, 0.4), targetPieces: 2, maxCuts: 1, tolerance: tol });
  else if (i === 3) chapter1Levels.push({ shape: generatePolygon(6, 0.4), targetPieces: 2, maxCuts: 1, tolerance: tol });
  else if (i === 4) chapter1Levels.push({ shape: generateHShape(0.6, 0.6, 0.2), targetPieces: 2, maxCuts: 1, tolerance: tol });
  else if (i === 6) chapter1Levels.push({ shape: generateCross(0.2, 0.4), targetPieces: 2, maxCuts: 1, tolerance: tol });
  else chapter1Levels.push({ shape: generatePolygon(i + 3 > 5 ? i + 3 : 8), targetPieces: 2, maxCuts: 1, tolerance: tol });
}

const chapter2Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(10 + i);
  const target = i % 2 === 0 ? 4 : 3; 
  if (i === 1) chapter2Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts: 2, tolerance: tol });
  else if (i === 4) chapter2Levels.push({ shape: generateTeardrop(), targetPieces: target, maxCuts: 2, tolerance: tol });
  else if (i === 7) chapter2Levels.push({ shape: generateGear(6), targetPieces: target, maxCuts: 2, tolerance: tol });
  else if (i > 5) chapter2Levels.push({ shape: generateStar(i, 0.4, 0.2), targetPieces: target, maxCuts: 2, tolerance: tol });
  else chapter2Levels.push({ shape: generatePolygon(i + 4), targetPieces: target, maxCuts: 2, tolerance: tol });
}

const chapter3Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(20 + i);
  const maxCuts = i < 5 ? 2 : 3;
  const target = i < 5 ? 4 : 6;
  if (i === 4) chapter3Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 5) chapter3Levels.push({ shape: generateShield(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 8) chapter3Levels.push({ shape: generateGear(8), targetPieces: target, maxCuts, tolerance: tol });
  else if (i % 3 === 0) chapter3Levels.push({ shape: generateStar(5 + i, 0.4, 0.1), targetPieces: target, maxCuts, tolerance: tol });
  else chapter3Levels.push({ shape: generatePolygon(6 + i), targetPieces: target, maxCuts, tolerance: tol });
}

const chapter4Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(30 + i);
  const maxCuts = i < 5 ? 3 : 4;
  const target = i < 5 ? 6 : 8;
  if (i === 2) chapter4Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 4) chapter4Levels.push({ shape: generateShuriken(4), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 6) chapter4Levels.push({ shape: generateGear(12, 0.45, 0.3), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 8) chapter4Levels.push({ shape: generateOpenDonut(0.45, 0.25), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 9) chapter4Levels.push({ shape: generateStar(12, 0.45, 0.35), targetPieces: target, maxCuts, tolerance: tol });
  else if (i % 2 === 0) chapter4Levels.push({ shape: generateStar(6 + i, 0.4, 0.15), targetPieces: target, maxCuts, tolerance: tol });
  else chapter4Levels.push({ shape: generatePolygon(8 + i), targetPieces: target, maxCuts, tolerance: tol });
}

const chapter5Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(40 + i);
  const maxCuts = i < 5 ? 3 : 4;
  const target = i < 5 ? 6 : 8;
  if (i === 2) chapter5Levels.push({ shape: generatePinwheel(3), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 5) chapter5Levels.push({ shape: generateShield(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 8) chapter5Levels.push({ shape: generateShuriken(5), targetPieces: target, maxCuts, tolerance: tol });
  else if (i % 2 === 0) chapter5Levels.push({ shape: generateSawblade(8 + i, 0.45, 0.3, 0.15), targetPieces: target, maxCuts, tolerance: tol });
  else chapter5Levels.push({ shape: generateCross(0.2 - (i*0.01), 0.45), targetPieces: target, maxCuts, tolerance: tol });
}

const chapter6Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(50 + i);
  // Match the cut count perfectly to the implied block composition
  if (i === 0) chapter6Levels.push({ shape: zShape, targetPieces: 4, maxCuts: 3, tolerance: tol });
  else if (i === 1) chapter6Levels.push({ shape: tShape, targetPieces: 4, maxCuts: 3, tolerance: tol });
  else if (i === 2) chapter6Levels.push({ shape: lShape, targetPieces: 3, maxCuts: 2, tolerance: tol });
  else if (i === 3) chapter6Levels.push({ shape: scaleneTriangle, targetPieces: 3, maxCuts: 2, tolerance: tol });
  else if (i === 4) chapter6Levels.push({ shape: lightningBolt, targetPieces: 4, maxCuts: 3, tolerance: tol });
  else if (i === 5) chapter6Levels.push({ shape: generateWrench(), targetPieces: 5, maxCuts: 4, tolerance: tol });
  else if (i === 6) chapter6Levels.push({ shape: zShape, targetPieces: 4, maxCuts: 3, tolerance: tol });
  else if (i === 7) chapter6Levels.push({ shape: tShape, targetPieces: 4, maxCuts: 3, tolerance: tol });
  else if (i === 8) chapter6Levels.push({ shape: lightningBolt, targetPieces: 4, maxCuts: 3, tolerance: tol });
  else chapter6Levels.push({ shape: generateWrench(), targetPieces: 5, maxCuts: 4, tolerance: tol });
}

const chapter7Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(60 + i);
  // Keep hollow cuts low to utilize lines of symmetry cleanly without macaroni pieces
  const maxCuts = i % 2 === 0 ? 2 : 3;
  const target = maxCuts === 2 ? 4 : 6;
  if (i === 0) chapter7Levels.push({ shape: generateOpenDonut(0.45, 0.2), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 1) chapter7Levels.push({ shape: generateHollowPolygon(4, 0.45, 0.25, 0.05), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 2) chapter7Levels.push({ shape: generateHollowPolygon(3, 0.45, 0.2, 0.05), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 3) chapter7Levels.push({ shape: generateHorseshoe(0.45, 0.25), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 4) chapter7Levels.push({ shape: generateKeyhole(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 5) chapter7Levels.push({ shape: generateOpenDonut(0.45, 0.35), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 6) chapter7Levels.push({ shape: generateHollowPolygon(6, 0.45, 0.3, 0.02), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 7) chapter7Levels.push({ shape: generateHorseshoe(0.45, 0.15), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 8) chapter7Levels.push({ shape: generateKeyhole(), targetPieces: target, maxCuts, tolerance: tol });
  else chapter7Levels.push({ shape: generateOpenDonut(0.45, 0.1), targetPieces: target, maxCuts, tolerance: tol });
}

const chapter8Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(70 + i);
  // Strictly 1 or 2 cuts to prevent eyeballing curved multi-slices
  const maxCuts = i < 5 ? 1 : 2;
  const target = maxCuts === 1 ? 2 : 4;
  if (i === 0) chapter8Levels.push({ shape: generateCrescent(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 1) chapter8Levels.push({ shape: generateTeardrop(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 2) chapter8Levels.push({ shape: generateAmoeba(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 3) chapter8Levels.push({ shape: generateInkSplat(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 4) chapter8Levels.push({ shape: generateCrescent(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 5) chapter8Levels.push({ shape: generateAmoeba(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 6) chapter8Levels.push({ shape: generateTeardrop(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 7) chapter8Levels.push({ shape: generateInkSplat(), targetPieces: target, maxCuts, tolerance: tol });
  else if (i === 8) chapter8Levels.push({ shape: generateAmoeba(), targetPieces: target, maxCuts, tolerance: tol });
  else chapter8Levels.push({ shape: generateInkSplat(), targetPieces: target, maxCuts, tolerance: tol });
}

const chapter9Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(80 + i);
  const maxCuts = i < 5 ? 5 : 6;
  const target = i < 5 ? 10 : 12;
  const generators = [
    () => generateInkSplat(),
    () => generateCrescent(),
    () => generateAmoeba(),
    () => generateTeardrop(),
    () => generatePinwheel(5),
    () => generateShield(),
    () => generateKeyhole(),
    () => generateWrench(),
    () => generatePointSymmetricGear(10, 0.45, 0.2),
    () => generateShuriken(6)
  ];
  chapter9Levels.push({ shape: generators[i % generators.length](), targetPieces: target, maxCuts, tolerance: tol });
}

const chapter10Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(90 + i);
  const maxCuts = 6;
  const target = 12;
  if (i === 9) {
    chapter10Levels.push({ shape: generatePointSymmetricGear(20, 0.45, 0.1), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i === 8) {
    chapter10Levels.push({ shape: generatePinwheel(6, 0.45, 0.05), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i % 2 === 0) {
    chapter10Levels.push({ shape: generatePointSymmetricGear(16, 0.45, 0.25), targetPieces: target, maxCuts, tolerance: tol });
  } else {
    chapter10Levels.push({ shape: generateSawblade(16, 0.45, 0.2, 0.25), targetPieces: target, maxCuts, tolerance: tol });
  }
}

export const Chapters: ChapterConfig[] = [
  { name: "The Basics", levels: chapter1Levels },
  { name: "Precision Slicing", levels: chapter2Levels },
  { name: "Complex Geometry", levels: chapter3Levels },
  { name: "Master Slicer", levels: chapter4Levels },
  { name: "Advanced Symmetrical", levels: chapter5Levels },
  { name: "Asymmetric & Puzzle Blocks", levels: chapter6Levels },
  { name: "Negative Space & Hollows", levels: chapter7Levels },
  { name: "Organic & Irregular", levels: chapter8Levels },
  { name: "The Gauntlet", levels: chapter9Levels },
  { name: "Absolute Perfection", levels: chapter10Levels }
];
