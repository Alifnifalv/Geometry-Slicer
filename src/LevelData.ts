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

// Helper to generate a regular polygon (can be used for circles if sides >= 40)
function generatePolygon(sides: number, radius: number = 0.4): number[][] {
  const points: number[][] = [];
  const angleStep = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep - Math.PI / 2;
    points.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    ]);
  }
  return points;
}

// Helper for Circle
function generateCircle(radius: number = 0.4): number[][] {
  return generatePolygon(60, radius);
}

function generateRectangle(width: number = 0.76, height: number = 0.48): number[][] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight]
  ];
}

// Helper to generate a star shape
function generateStar(points: number, outerRadius: number = 0.4, innerRadius: number = 0.2): number[][] {
  const shape: number[][] = [];
  const angleStep = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2;
    shape.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    ]);
  }
  return shape;
}

// Helper for a complex asymmetrical gear
function generateGear(teeth: number, outer: number = 0.4, inner: number = 0.25): number[][] {
  const shape: number[][] = [];
  const angleStep = Math.PI / (teeth * 2);
  for (let i = 0; i < teeth * 4; i++) {
    const radius = Math.floor(i / 2) % 2 === 0 ? outer : inner;
    const angle = i * angleStep;
    shape.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    ]);
  }
  return shape;
}

// Hand-crafted C Shape
const cShape = [
  [-0.4, -0.4], [0.4, -0.4], [0.4, -0.1], [-0.1, -0.1],
  [-0.1, 0.1], [0.4, 0.1], [0.4, 0.4], [-0.4, 0.4]
];
// Hand-crafted L Shape
const lShape = [
  [-0.3, -0.4], [-0.1, -0.4], [-0.1, 0.2], [0.3, 0.2], [0.3, 0.4], [-0.3, 0.4]
];

// Helper for Sawblade (Forced Even Symmetry)
function generateSawblade(points: number, outer: number = 0.45, inner: number = 0.35, skew: number = 0.15): number[][] {
  // Ensure points is even so opposite peaks/valleys align exactly
  const evenPoints = points % 2 !== 0 ? points + 1 : points;
  const shape: number[][] = [];
  const angleStep = Math.PI / evenPoints;
  for (let i = 0; i < evenPoints * 2; i++) {
    const isOuter = i % 2 === 0;
    const radius = isOuter ? outer : inner;
    const angleOffset = isOuter ? skew : -skew; 
    const angle = i * angleStep - Math.PI / 2 + angleOffset;
    shape.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    ]);
  }
  return shape;
}

// Helper for Cross
function generateCross(thickness: number = 0.2, length: number = 0.4): number[][] {
  const t = thickness / 2;
  return [
    [-t, -length], [t, -length],
    [t, -t], [length, -t],
    [length, t], [t, t],
    [t, length], [-t, length],
    [-t, t], [-length, t],
    [-length, -t], [-t, -t]
  ];
}

// Logic-Based Composite Block Shape (Tetris Style)
function generateCompositeBlock(): number[][] {
  // A shape made of two blocks: e.g. a 0.2x0.6 box and a 0.6x0.2 box
  // Cutting exactly diagonally across the junction perfectly halves it
  return [
    [-0.3, -0.4], [0.1, -0.4],
    [0.1, -0.1], [0.4, -0.1],
    [0.4, 0.3], [-0.1, 0.3],
    [-0.1, 0.0], [-0.3, 0.0]
  ];
}

// Logic-Based Point Symmetric Gear
// This gear is highly chaotic on the outside, but it perfectly mirrors across the center point.
// Any cut exactly through the center dot will perfectly halve the area.
function generatePointSymmetricGear(teeth: number, outer: number = 0.45, inner: number = 0.15): number[][] {
  const shape: number[][] = [];
  // Ensure an even number of teeth for perfect point symmetry
  const evenTeeth = teeth % 2 !== 0 ? teeth + 1 : teeth;
  const angleStep = Math.PI / (evenTeeth * 2);
  
  // Create exactly half the gear with chaotic lengths
  const halfRadii: number[] = [];
  for (let i = 0; i < evenTeeth * 2; i++) {
    const chaoticFactor = (i % 3 === 0) ? 1.0 : (i % 2 === 0 ? 0.6 : 0.3);
    halfRadii.push(inner + (outer - inner) * chaoticFactor);
  }
  
  // Mirror the radii to the second half to guarantee perfect point symmetry
  const fullRadii = [...halfRadii, ...halfRadii];
  
  for (let i = 0; i < evenTeeth * 4; i++) {
    const angle = i * angleStep;
    shape.push([
      Math.cos(angle) * fullRadii[i],
      Math.sin(angle) * fullRadii[i]
    ]);
  }
  return shape;
}

// Determine tolerance based on global level 0 to 99
function getTolerance(globalLevelIndex: number): number {
  // Starts forgiving for onboarding and gradually tightens to 1%.
  const maxTol = 0.18;
  const minTol = 0.01;
  return maxTol - (globalLevelIndex / 99) * (maxTol - minTol);
}

// Generate 10 levels for Chapter 1 (1 Cut, 2 Pieces)
const chapter1Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = i < 4 ? 0.2 : getTolerance(i);
  if (i === 0) {
    chapter1Levels.push({ shape: generateRectangle(), targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else if (i === 1) {
    chapter1Levels.push({ shape: generateCircle(0.38), targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else if (i === 2) {
    chapter1Levels.push({ shape: generatePolygon(4, 0.4), targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else if (i === 3) {
    chapter1Levels.push({ shape: generatePolygon(6, 0.4), targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else if (i === 4) {
    chapter1Levels.push({ shape: cShape, targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else if (i === 6) {
    chapter1Levels.push({ shape: lShape, targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else if (i === 9) {
    chapter1Levels.push({ shape: generateStar(5, 0.4, 0.15), targetPieces: 2, maxCuts: 1, tolerance: tol });
  } else {
    chapter1Levels.push({ shape: generatePolygon(i + 3), targetPieces: 2, maxCuts: 1, tolerance: tol });
  }
}

// Generate 10 levels for Chapter 2 (2 Cuts, 3 or 4 Pieces)
const chapter2Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(10 + i);
  const target = i % 2 === 0 ? 4 : 3; 
  if (i === 1) {
    chapter2Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts: 2, tolerance: tol });
  } else if (i === 7) {
    chapter2Levels.push({ shape: generateGear(6), targetPieces: target, maxCuts: 2, tolerance: tol });
  } else if (i > 5) {
    chapter2Levels.push({ shape: generateStar(i, 0.4, 0.2), targetPieces: target, maxCuts: 2, tolerance: tol });
  } else {
    chapter2Levels.push({ shape: generatePolygon(i + 4), targetPieces: target, maxCuts: 2, tolerance: tol });
  }
}

// Generate 10 levels for Chapter 3 (2-3 Cuts, 4-6 Pieces)
const chapter3Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(20 + i);
  const maxCuts = i < 5 ? 2 : 3;
  const target = i < 5 ? 4 : 6;
  if (i === 4) {
    chapter3Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i === 8) {
    chapter3Levels.push({ shape: generateGear(8), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i % 3 === 0) {
    chapter3Levels.push({ shape: generateStar(5 + i, 0.4, 0.1), targetPieces: target, maxCuts, tolerance: tol });
  } else {
    chapter3Levels.push({ shape: generatePolygon(6 + i), targetPieces: target, maxCuts, tolerance: tol });
  }
}

// Generate 10 levels for Chapter 4 (3-4 Cuts, 6-8 Pieces)
const chapter4Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(30 + i);
  const maxCuts = i < 5 ? 3 : 4;
  const target = i < 5 ? 6 : 8;
  
  if (i === 2) {
    chapter4Levels.push({ shape: generateCircle(0.4), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i === 6) {
    chapter4Levels.push({ shape: generateGear(12, 0.45, 0.3), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i === 9) {
    chapter4Levels.push({ shape: generateStar(12, 0.45, 0.35), targetPieces: target, maxCuts, tolerance: tol });
  } else if (i % 2 === 0) {
    chapter4Levels.push({ shape: generateStar(6 + i, 0.4, 0.15), targetPieces: target, maxCuts, tolerance: tol });
  } else {
    chapter4Levels.push({ shape: generatePolygon(8 + i), targetPieces: target, maxCuts, tolerance: tol });
  }
}

// Generate 10 levels for Chapter 5 (Sawblades)
const chapter5Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(40 + i);
  const maxCuts = i < 5 ? 3 : 4;
  const target = i < 5 ? 6 : 8;
  if (i % 2 === 0) {
    chapter5Levels.push({ shape: generateSawblade(8 + i, 0.45, 0.3, 0.15), targetPieces: target, maxCuts, tolerance: tol });
  } else {
    chapter5Levels.push({ shape: generateCross(0.2 - (i*0.01), 0.45), targetPieces: target, maxCuts, tolerance: tol });
  }
}

// Generate 10 levels for Chapter 6 (Asymmetry) -> Now "Composite Logic"
const chapter6Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(50 + i);
  const maxCuts = 4;
  const target = 8;
  if (i % 2 === 0) {
    chapter6Levels.push({ shape: generateCompositeBlock(), targetPieces: target, maxCuts, tolerance: tol });
  } else {
    // S-shape blocks
    const sShape = [
      [-0.4, -0.4], [0.1, -0.4], [0.1, -0.1], [0.4, -0.1],
      [0.4, 0.4], [-0.1, 0.4], [-0.1, 0.1], [-0.4, 0.1]
    ];
    chapter6Levels.push({ shape: sShape, targetPieces: target, maxCuts, tolerance: tol });
  }
}

// Generate 10 levels for Chapter 7 (Starburst)
const chapter7Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(60 + i);
  const maxCuts = i < 5 ? 4 : 5;
  const target = i < 5 ? 8 : 10;
  chapter7Levels.push({ shape: generateStar(10 + i, 0.45, 0.1), targetPieces: target, maxCuts, tolerance: tol });
}

// Generate 10 levels for Chapter 8 (Micro Slicing)
const chapter8Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(70 + i);
  const maxCuts = 5;
  const target = 10;
  if (i % 3 === 0) chapter8Levels.push({ shape: generateCircle(0.45), targetPieces: target, maxCuts, tolerance: tol });
  else chapter8Levels.push({ shape: generatePolygon(12 + i), targetPieces: target, maxCuts, tolerance: tol });
}

// Generate 10 levels for Chapter 9 (The Gauntlet)
const chapter9Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(80 + i);
  const maxCuts = i < 5 ? 5 : 6;
  const target = i < 5 ? 10 : 12;
  const generators = [
    () => generateSawblade(12, 0.45, 0.2, 0.2),
    () => generatePointSymmetricGear(10, 0.45, 0.2),
    () => generateCompositeBlock(),
    () => generateStar(14, 0.45, 0.15)
  ];
  chapter9Levels.push({ shape: generators[i % generators.length](), targetPieces: target, maxCuts, tolerance: tol });
}

// Generate 10 levels for Chapter 10 (Absolute Perfection)
const chapter10Levels: LevelConfig[] = [];
for (let i = 0; i < 10; i++) {
  const tol = getTolerance(90 + i);
  const maxCuts = 6;
  const target = 12;
  if (i === 9) {
    // Final Boss: Highly chaotic but mathematically point-symmetric
    chapter10Levels.push({ shape: generatePointSymmetricGear(20, 0.45, 0.1), targetPieces: target, maxCuts, tolerance: tol });
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
  { name: "Sawblades", levels: chapter5Levels },
  { name: "Asymmetry", levels: chapter6Levels },
  { name: "Starburst", levels: chapter7Levels },
  { name: "Micro Slicing", levels: chapter8Levels },
  { name: "The Gauntlet", levels: chapter9Levels },
  { name: "Absolute Perfection", levels: chapter10Levels }
];
