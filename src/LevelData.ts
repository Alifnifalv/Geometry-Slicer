export type ItemType =
  | 'pizza' | 'watermelon' | 'gear' | 'chocolate' | 'cheese'
  | 'cookie' | 'brick' | 'leaf' | 'wood' | 'metal' | 'starfish'
  | 'origami' | 'paint' | 'fried_egg';

export type HintType = 'circle-parallel' | 'circle-vcut' | 'rectangle-thirds';

export interface LevelConfig {
  shape: number[][];    // The starting polygon
  targetPieces: number; // Number of pieces required to win
  maxCuts: number;      // Maximum slice actions allowed
  tolerance: number;    // Accuracy requirement (e.g., 0.15 = 15% tolerance)
  mathHint?: string;    // Optional mathematical hint to help the player
  hintGraph?: HintType; // Visual mathematical diagram type
  itemType?: ItemType;  // Real-world item theme for minimal styling
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

function generateUShape(width: number = 0.6, height: number = 0.6, thickness: number = 0.2): number[][] {
  const w = width / 2;
  const h = height / 2;
  return [
    [-w, -h], [-w + thickness, -h], [-w + thickness, h - thickness],
    [w - thickness, h - thickness], [w - thickness, -h], [w, -h],
    [w, h], [-w, h]
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

function generateHammer(): number[][] {
  return [
    [-0.4, -0.05], [0.2, -0.05],
    [0.2, -0.25], [0.4, -0.25],
    [0.4, 0.25], [0.2, 0.25],
    [0.2, 0.05], [-0.4, 0.05]
  ];
}

function generateTaperedL(): number[][] {
  return [
    [-0.3, -0.4], [0.1, -0.4],
    [0.1, 0.0], [0.4, 0.0],
    [0.4, 0.15], [-0.15, 0.15],
    [-0.15, 0.4], [-0.3, 0.4]
  ];
}

function generateTrickTriangle(): number[][] {
  return [
    [-0.4, -0.3], [0.5, -0.3],
    [0.2, 0.4]
  ];
}

function generateTrickCross(): number[][] {
  return [
    [-0.1, -0.4], [0.1, -0.4],
    [0.1, -0.1], [0.5, -0.1],
    [0.5, 0.1], [0.1, 0.1],
    [0.1, 0.3], [-0.1, 0.3],
    [-0.1, 0.1], [-0.3, 0.1],
    [-0.3, -0.1], [-0.1, -0.1]
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

function generateFatCross(size: number = 0.45, cutout: number = 0.15): number[][] {
  return [
    [-size, -size+cutout], [-size+cutout, -size+cutout], [-size+cutout, -size],
    [size-cutout, -size], [size-cutout, -size+cutout], [size, -size+cutout],
    [size, size-cutout], [size-cutout, size-cutout], [size-cutout, size],
    [-size+cutout, size], [-size+cutout, size-cutout], [-size, size-cutout]
  ];
}

// ---------------------------------------------------------
// LEVEL CONFIGURATIONS
// ---------------------------------------------------------
function getTolerance(globalLevelIndex: number): number {
  const maxTol = 0.20;
  const minTol = 0.06;
  return maxTol - (globalLevelIndex / 99) * (maxTol - minTol);
}

const chapter1Levels: LevelConfig[] = [
  { shape: generateRectangle(0.8, 0.3), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), mathHint: "Math Fact: A rectangle cut into 3 equal strips with parallel lines needs cuts exactly 1/6th of the width from the center!", hintGraph: 'rectangle-thirds', itemType: 'wood' },
  { shape: generateRectangle(0.5, 0.5), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), mathHint: "Math Fact: A square cut into 3 equal pieces with 2 parallel lines requires cuts exactly 1/6th of the width from the center.", hintGraph: 'rectangle-thirds', itemType: 'cheese' },
  { shape: generateCircle(0.4), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), mathHint: "Math Fact: To cut a circle into 3 equal areas with 2 parallel lines, cut at exactly 0.265R from the center, not 0.33R! Alternatively, make a V-cut meeting at the crust.", hintGraph: 'circle-parallel', itemType: 'pizza' },
  { shape: generateCircle(0.4), targetPieces: 4, maxCuts: 2, tolerance: getTolerance(1), mathHint: "Math Fact: A grid cut of a circle into 4 equal quadrants requires cuts exactly through the center.", itemType: 'cookie' },
  { shape: generatePolygon(3, 0.45), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), mathHint: "Math Fact: Dividing a triangle into 3 equal horizontal strips requires cuts at ~18.4% and ~42.3% of the height from the base.", itemType: 'watermelon' },
  { shape: generateRectangle(0.5, 0.5), targetPieces: 4, maxCuts: 2, tolerance: getTolerance(1), itemType: 'chocolate' },
  { shape: generatePolygon(5, 0.4), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), itemType: 'brick' },
  { shape: generatePolygon(6, 0.4), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), mathHint: "Math Fact: A hexagon can be split into 3 equal areas with 2 parallel cuts at roughly 20.4% of the width from the center.", itemType: 'metal' },
  { shape: generatePolygon(6, 0.4), targetPieces: 4, maxCuts: 2, tolerance: getTolerance(1), itemType: 'wood' },
  { shape: generatePolygon(8, 0.4), targetPieces: 3, maxCuts: 2, tolerance: getTolerance(1), itemType: 'pizza' }
];

const chapter2Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(10 + i);
  // 2 cuts -> 4 pieces
  if (i === 0) chapter2Levels.push({ shape: generateRectangle(), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'chocolate' });
  else if (i === 1) chapter2Levels.push({ shape: generatePolygon(4, 0.4), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'cheese' });
  else if (i === 2) chapter2Levels.push({ shape: generateCross(0.2, 0.4), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 3) chapter2Levels.push({ shape: generateFatCross(0.45, 0.15), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'brick' });
  else if (i === 4) chapter2Levels.push({ shape: generatePolygon(8, 0.4), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'metal' });
  else if (i === 5) chapter2Levels.push({ shape: generateHShape(0.6, 0.6, 0.2), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 6) chapter2Levels.push({ shape: generateCircle(0.4), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'pizza' });
  else if (i === 7) chapter2Levels.push({ shape: generateStar(4, 0.4, 0.2), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'starfish' });
  else if (i === 8) chapter2Levels.push({ shape: generatePolygon(6, 0.4), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'cookie' });
  else chapter2Levels.push({ shape: generateStar(8, 0.4, 0.2), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'starfish' });
}

// Chapter 3: Stars & Pinwheels (Deceptive Centers)
const chapter3Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const target = i % 2 === 0 ? 3 : 4;
  const maxCuts = i % 2 === 0 ? 2 : 3;
  const tol = getTolerance(3);

  let itemType: ItemType = 'origami';
  let shape: number[][] = [];
  let mathHint: string | undefined;

  if (i < 3) {
    shape = generateStar(4, 0.45, 0.15);
    itemType = 'starfish';
    if (target === 4) mathHint = "Math Fact: A 4-point star's area is heavily concentrated in the center core. Cuts must cross very close to the middle!";
  } else if (i < 6) {
    shape = generatePinwheel(4);
    itemType = 'origami';
  } else if (i < 8) {
    shape = generateShuriken(4);
    itemType = 'metal';
    if (target === 3) mathHint = "Math Fact: With rotational symmetry, horizontal or vertical parallel cuts will struggle to find a perfect 1/3rd balance. Diagonal cuts may be needed.";
  } else {
    shape = generateStar(5, 0.4, 0.2);
    itemType = 'starfish';
  }

  chapter3Levels.push({ shape, targetPieces: target, maxCuts, tolerance: tol, mathHint, itemType });
}

const chapter4Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(30 + i);
  // 3 cuts -> 6 pieces
  const target = 6;
  const maxCuts = 3;
  if (i === 0) chapter4Levels.push({ shape: generatePolygon(6, 0.4), targetPieces: target, maxCuts, tolerance: tol, itemType: 'cookie' });
  else if (i === 1) chapter4Levels.push({ shape: generateStar(6, 0.4, 0.2), targetPieces: target, maxCuts, tolerance: tol, itemType: 'starfish' });
  else if (i === 2) chapter4Levels.push({ shape: generatePolygon(3, 0.4), targetPieces: target, maxCuts, tolerance: tol, itemType: 'watermelon' });
  else if (i === 3) chapter4Levels.push({ shape: generateStar(3, 0.4, 0.2), targetPieces: target, maxCuts, tolerance: tol, itemType: 'origami' });
  else if (i === 4) chapter4Levels.push({ shape: generateSawblade(6, 0.45, 0.3, 0.15), targetPieces: target, maxCuts, tolerance: tol, itemType: 'gear' });
  else if (i === 5) chapter4Levels.push({ shape: generatePinwheel(3), targetPieces: target, maxCuts, tolerance: tol, itemType: 'origami' });
  else if (i === 6) chapter4Levels.push({ shape: generateShuriken(3), targetPieces: target, maxCuts, tolerance: tol, itemType: 'metal' });
  else if (i === 7) chapter4Levels.push({ shape: generateGear(3), targetPieces: target, maxCuts, tolerance: tol, itemType: 'gear' });
  else if (i === 8) chapter4Levels.push({ shape: generateFatCross(0.45, 0.15), targetPieces: target, maxCuts, tolerance: tol, itemType: 'brick' });
  else chapter4Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts, tolerance: tol, itemType: 'pizza' });
}

const chapter5Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(40 + i);
  // 4 cuts -> 5 pieces (complex shapes, few pieces)
  const target = 5;
  const maxCuts = 4;
  if (i === 0) chapter5Levels.push({ shape: generatePolygon(5, 0.4), targetPieces: target, maxCuts, tolerance: tol, itemType: 'brick' });
  else if (i === 1) chapter5Levels.push({ shape: generateStar(5, 0.4, 0.15), targetPieces: target, maxCuts, tolerance: tol, itemType: 'starfish' });
  else if (i === 2) chapter5Levels.push({ shape: generatePinwheel(5), targetPieces: target, maxCuts, tolerance: tol, itemType: 'origami' });
  else if (i === 3) chapter5Levels.push({ shape: generateShuriken(5), targetPieces: target, maxCuts, tolerance: tol, itemType: 'metal' });
  else if (i === 4) chapter5Levels.push({ shape: generateGear(5), targetPieces: target, maxCuts, tolerance: tol, itemType: 'gear' });
  else if (i === 5) chapter5Levels.push({ shape: generatePointSymmetricGear(10, 0.45, 0.2), targetPieces: target, maxCuts, tolerance: tol, itemType: 'gear' });
  else if (i === 6) chapter5Levels.push({ shape: generatePolygon(10, 0.4), targetPieces: target, maxCuts, tolerance: tol, itemType: 'cookie' });
  else if (i === 7) chapter5Levels.push({ shape: generateStar(10, 0.4, 0.25), targetPieces: target, maxCuts, tolerance: tol, itemType: 'starfish' });
  else if (i === 8) chapter5Levels.push({ shape: generateSawblade(10, 0.45, 0.3, 0.15), targetPieces: target, maxCuts, tolerance: tol, itemType: 'gear' });
  else chapter5Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts, tolerance: tol, itemType: 'pizza' });
}

const chapter6Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(50 + i);
  // Asymmetric & Puzzle Blocks (2-3 cuts)
  if (i === 0) chapter6Levels.push({ shape: zShape, targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 1) chapter6Levels.push({ shape: tShape, targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'brick' });
  else if (i === 2) chapter6Levels.push({ shape: lShape, targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 3) chapter6Levels.push({ shape: scaleneTriangle, targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'cheese' });
  else if (i === 4) chapter6Levels.push({ shape: lightningBolt, targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'metal' });
  else if (i === 5) chapter6Levels.push({ shape: generateWrench(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'metal' });
  else if (i === 6) chapter6Levels.push({ shape: zShape, targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'chocolate' });
  else if (i === 7) chapter6Levels.push({ shape: tShape, targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'wood' });
  else if (i === 8) chapter6Levels.push({ shape: lShape, targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'cheese' });
  else chapter6Levels.push({ shape: generateUShape(0.6, 0.6, 0.2), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'brick' });
}

const chapter7Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(60 + i);
  // Negative Space & Hollows (2 cuts, 3-4 pieces)
  if (i === 0) chapter7Levels.push({ shape: generateOpenDonut(0.45, 0.2), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'cookie' });
  else if (i === 1) chapter7Levels.push({ shape: generateHollowPolygon(4, 0.45, 0.25, 0.05), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 2) chapter7Levels.push({ shape: generateHollowPolygon(3, 0.45, 0.2, 0.05), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'cheese' });
  else if (i === 3) chapter7Levels.push({ shape: generateHorseshoe(0.45, 0.25), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'metal' });
  else if (i === 4) chapter7Levels.push({ shape: generateKeyhole(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'metal' });
  else if (i === 5) chapter7Levels.push({ shape: generateOpenDonut(0.45, 0.35), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'pizza' });
  else if (i === 6) chapter7Levels.push({ shape: generateHollowPolygon(6, 0.45, 0.3, 0.02), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'brick' });
  else if (i === 7) chapter7Levels.push({ shape: generateHorseshoe(0.45, 0.15), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'metal' });
  else if (i === 8) chapter7Levels.push({ shape: generateKeyhole(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'wood' });
  else chapter7Levels.push({ shape: generateUShape(0.8, 0.6, 0.2), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'chocolate' });
}

const chapter8Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(70 + i);
  // Organic & Irregular (2-3 cuts)
  if (i === 0) chapter8Levels.push({ shape: generateCrescent(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'fried_egg' });
  else if (i === 1) chapter8Levels.push({ shape: generateTeardrop(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'leaf' });
  else if (i === 2) chapter8Levels.push({ shape: generateAmoeba(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'paint' });
  else if (i === 3) chapter8Levels.push({ shape: generateInkSplat(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'paint' });
  else if (i === 4) chapter8Levels.push({ shape: generateCrescent(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'watermelon' });
  else if (i === 5) chapter8Levels.push({ shape: generateAmoeba(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'fried_egg' });
  else if (i === 6) chapter8Levels.push({ shape: generateTeardrop(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'leaf' });
  else if (i === 7) chapter8Levels.push({ shape: generateInkSplat(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'paint' });
  else if (i === 8) chapter8Levels.push({ shape: generateAmoeba(), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'fried_egg' });
  else chapter8Levels.push({ shape: generateInkSplat(), targetPieces: 4, maxCuts: 2, tolerance: tol, itemType: 'paint' });
}

const chapter9Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(80 + i);
  // Deceptive Shapes (2 cuts, 3-4 pieces)
  if (i === 0) chapter9Levels.push({ shape: generateHammer(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 1) chapter9Levels.push({ shape: generateTaperedL(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'wood' });
  else if (i === 2) chapter9Levels.push({ shape: generateTrickTriangle(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'cheese' });
  else if (i === 3) chapter9Levels.push({ shape: generateTrickCross(), targetPieces: 3, maxCuts: 2, tolerance: tol, itemType: 'brick' });
  else if (i === 4) chapter9Levels.push({ shape: generateHammer(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'metal' });
  else if (i === 5) chapter9Levels.push({ shape: generateWrench(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'metal' });
  else if (i === 6) chapter9Levels.push({ shape: generateTrickTriangle(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'watermelon' });
  else if (i === 7) chapter9Levels.push({ shape: generateTaperedL(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'wood' });
  else if (i === 8) chapter9Levels.push({ shape: generateTrickCross(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'brick' });
  else chapter9Levels.push({ shape: generateHammer(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'wood' });
}

const chapter10Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(90 + i);
  // Final mix: Human Limits (2-4 cuts, complex center of mass)
  if (i === 0) chapter10Levels.push({ shape: generateAmoeba(), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'fried_egg' });
  else if (i === 1) chapter10Levels.push({ shape: generateOpenDonut(0.45, 0.2), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'cookie' });
  else if (i === 2) chapter10Levels.push({ shape: generateTaperedL(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'wood' });
  else if (i === 3) chapter10Levels.push({ shape: generateSawblade(5, 0.45, 0.3, 0.15), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'gear' });
  else if (i === 4) chapter10Levels.push({ shape: generateTrickTriangle(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'cheese' });
  else if (i === 5) chapter10Levels.push({ shape: generateHammer(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'metal' });
  else if (i === 6) chapter10Levels.push({ shape: generateTeardrop(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'leaf' });
  else if (i === 7) chapter10Levels.push({ shape: generateInkSplat(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'paint' });
  else if (i === 8) chapter10Levels.push({ shape: generatePointSymmetricGear(5, 0.45, 0.25), targetPieces: 4, maxCuts: 3, tolerance: tol, itemType: 'gear' });
  else chapter10Levels.push({ shape: generateTrickCross(), targetPieces: 5, maxCuts: 4, tolerance: tol, itemType: 'brick' });
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
  { name: "Deceptive Shapes", levels: chapter9Levels },
  { name: "Human Limits", levels: chapter10Levels }
];
