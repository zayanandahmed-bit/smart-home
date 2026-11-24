// The house. Units are metres. x runs left->right looking from the street,
// z runs from the front wall of the house (z=0) to the back; the porch and the
// drawing room sit in front of it (negative z).
//
// GROUND FLOOR: measured from the LiDAR scan of 2026-11-25 (house/scans/scan1.glb,
// walls straightened by 26.25 deg). The scan was partial: rooms marked `est: true`
// were not in it and are still estimates.
// FIRST FLOOR: not scanned yet. Rough layout from the video, squeezed to the
// measured 7.6 x 10.7 m footprint.
//
// fixture kinds: light (ceiling), fan, lamp (floor/bedside), strip (LED), exhaust
// furniture types: bed, sofa, sofaL, table, desk, counter, fridge, wardrobe, tv,
//                  stairs, chair, plant, rug, cabinet, car

export const FLOOR_HEIGHT = 3.2;

export const FLOORS = [
  { id: 0, name: 'Ground floor' },
  { id: 1, name: 'First floor' },
];

const GROUND = [
  {
    id: 'porch', floor: 0, name: 'Car porch', rect: [-1.5, -7.5, 3.1, 0], floorColor: '#8f8a80', open: true,
    fixtures: [{ id: 'porch.light', kind: 'light', name: 'Porch light', at: [1.6, -0.25], wallLight: true }],
    furniture: [
      { type: 'car', at: [0.45, -2.9], size: [1.9, 4.7], color: '#9aa3ad' },
      { type: 'plant', at: [2.7, -1.0] }, { type: 'plant', at: [2.7, -2.6] }, { type: 'plant', at: [2.7, -4.2] },
    ],
  },
  {
    id: 'living', floor: 0, name: 'Drawing room', rect: [3.1, -3.35, 7.6, 0], floorColor: '#efece5',
    fixtures: [
      { id: 'living.fan', kind: 'fan', name: 'Ceiling fan', at: [5.35, -1.7] },
      { id: 'living.sconce1', kind: 'light', name: 'Wall light left', at: [4.4, -3.2], wallLight: true },
      { id: 'living.sconce2', kind: 'light', name: 'Wall light right', at: [6.4, -3.2], wallLight: true },
      { id: 'living.light', kind: 'light', name: 'Ceiling light', at: [5.35, -0.7] },
    ],
    furniture: [
      { type: 'rug', at: [5.35, -1.7], size: [2.4, 1.8], color: '#7a3e2e' },
      { type: 'sofa', at: [5.35, -2.85], size: [2.2, 0.85], color: '#8a6a33' },
      { type: 'sofa', at: [7.1, -1.7], size: [0.85, 1.9], color: '#8a6a33' },
      { type: 'chair', at: [3.7, -2.7], big: true, color: '#1d1d1d' },
      { type: 'table', at: [5.35, -1.6], size: [1.0, 0.6], color: '#222', low: true },
      { type: 'tv', at: [3.3, -1.2] },
    ],
  },
  {
    id: 'hall', floor: 0, name: 'Entrance hall', rect: [0, 0, 3.1, 6.0], floorColor: '#e9e6df',
    fixtures: [
      { id: 'hall.light', kind: 'light', name: 'Ceiling light', at: [1.0, 2.6] },
      { id: 'hall.fan', kind: 'fan', name: 'Ceiling fan', at: [1.2, 4.2] },
      { id: 'hall.lamp', kind: 'lamp', name: 'Floor lamp', at: [1.3, 3.36] },
    ],
    furniture: [
      { type: 'sofa', at: [0.6, 0.96], size: [1.2, 1.8], color: '#6b4a3a' },       // striped sofa (scan)
      { type: 'table', at: [0.65, 2.6], size: [1.1, 1.1], color: '#cfe0e6', low: true }, // glass table (scan)
      { type: 'chair', at: [0.6, 4.3], big: true, color: '#3a3a3a' },              // armchair (scan)
      { type: 'stairs', at: [2.1, 2.9], size: [1.0, 3.4], dir: 1 },                // position estimated
      { type: 'rug', at: [1.1, 1.0], size: [1.0, 1.6], color: '#2b2b2b' },
    ],
  },
  {
    id: 'store', floor: 0, name: 'Store (under stairs)', rect: [1.6, 4.6, 3.1, 6.0], floorColor: '#dedad2', est: true, inner: true,
    fixtures: [
      { id: 'store.light', kind: 'light', name: 'Ceiling light', at: [2.35, 5.3] },
      { id: 'store.exhaust', kind: 'exhaust', name: 'Exhaust fan', at: [3.05, 5.3], wall: 'x' },
    ],
    furniture: [],
  },
  {
    id: 'kitchen', floor: 0, name: 'Kitchen', rect: [0, 6.0, 3.1, 10.7], floorColor: '#ecebe6',
    fixtures: [
      { id: 'kitchen.light', kind: 'light', name: 'Ceiling light', at: [1.5, 8.3] },
      { id: 'kitchen.tube', kind: 'strip', name: 'Tube light', at: [1.5, 10.65], wall: 'z', len: 1.2 },
      { id: 'kitchen.exhaust', kind: 'exhaust', name: 'Cooker hood', at: [0.05, 9.0], wall: 'x' },
    ],
    furniture: [
      { type: 'counter', at: [1.55, 10.4], size: [2.9, 0.6], color: '#9b7a55' },  // back counter (scan)
      { type: 'counter', at: [2.8, 8.3], size: [0.6, 4.2], color: '#9b7a55' },    // side counter (scan)
      { type: 'counter', at: [0.3, 8.6], size: [0.6, 1.8], color: '#9b7a55' },    // cooker side (scan)
      { type: 'fridge', at: [1.45, 6.8], size: [0.7, 0.7] },                       // (scan)
    ],
  },
  {
    id: 'dining', floor: 0, name: 'Dining', rect: [3.1, 0, 7.6, 6.2], floorColor: '#e9e6df',
    fixtures: [
      { id: 'dining.pendant1', kind: 'light', name: 'Chandelier 1', at: [5.0, 3.46], pendant: true },
      { id: 'dining.pendant2', kind: 'light', name: 'Chandelier 2', at: [6.4, 3.46], pendant: true },
      { id: 'dining.fan', kind: 'fan', name: 'Ceiling fan', at: [5.6, 5.2] },
      { id: 'dining.lamp', kind: 'lamp', name: 'Floor lamp', at: [7.3, 0.4] },
    ],
    furniture: [
      { type: 'rug', at: [5.65, 3.46], size: [3.6, 2.2], color: '#8a7a5a' },
      { type: 'table', at: [5.65, 3.46], size: [3.1, 1.2], color: '#f2efe8' },    // (scan)
      { type: 'chair', at: [4.6, 2.65] }, { type: 'chair', at: [5.65, 2.65] }, { type: 'chair', at: [6.7, 2.65] },
      { type: 'chair', at: [4.6, 4.27] }, { type: 'chair', at: [5.65, 4.27] }, { type: 'chair', at: [6.7, 4.27] },
      { type: 'cabinet', at: [5.8, 1.86], size: [3.0, 0.5], color: '#7a5a3a' },   // sideboard (scan)
      { type: 'plant', at: [3.4, 0.4] },
    ],
  },
  {
    id: 'master', floor: 0, name: 'Master bedroom', rect: [3.2, 6.2, 7.6, 10.7], floorColor: '#e6e2da',
    fixtures: [
      { id: 'master.light', kind: 'light', name: 'Ceiling light', at: [5.0, 7.0] },
      { id: 'master.fan', kind: 'fan', name: 'Ceiling fan', at: [5.2, 8.4] },
      { id: 'master.wall', kind: 'light', name: 'Wall light', at: [7.45, 8.2], wallLight: true, wall: 'x' },
      { id: 'master.lamp', kind: 'lamp', name: 'Bedside lamp', at: [7.2, 9.6], small: true },
    ],
    furniture: [
      { type: 'rug', at: [5.6, 8.2], size: [2.2, 2.6], color: '#8c8070' },
      { type: 'bed', at: [6.5, 8.2], size: [2.1, 2.0], color: '#a3a3ad', head: '#5b3d2a', rot: 2 }, // (scan)
      { type: 'wardrobe', at: [3.75, 8.6], size: [0.7, 2.8] },                      // (scan)
    ],
  },
  {
    id: 'bath0', floor: 0, name: 'Washroom', rect: [5.6, 9.45, 7.6, 10.7], floorColor: '#d8dde0', est: true, inner: true,
    fixtures: [
      { id: 'bath0.light', kind: 'light', name: 'Light', at: [6.6, 10.1] },
      { id: 'bath0.exhaust', kind: 'exhaust', name: 'Exhaust', at: [7.55, 10.1], wall: 'x' },
    ],
    furniture: [],
  },
];


// first floor: video estimates, squeezed from the old 10 x 16 m guess to the measured 7.6 x 10.7 m
const SX = 7.6 / 10, SZ = 10.7 / 16;
const squeeze = r => ({
  ...r, est: true,
  rect: [r.rect[0] * SX, r.rect[1] * SZ, r.rect[2] * SX, r.rect[3] * SZ],
  fixtures: r.fixtures.map(f => ({ ...f, at: [f.at[0] * SX, f.at[1] * SZ] })),
  furniture: r.furniture.map(f => ({ ...f, at: [f.at[0] * SX, f.at[1] * SZ] })),
});
const FIRST = [
  {
    id: 'landing', floor: 1, name: 'Stairs & landing', rect: [0, 0, 2.5, 8], floorColor: '#cfcac2',
    fixtures: [{ id: 'landing.light', kind: 'light', name: 'Stair light', at: [1.3, 5.5] }],
    furniture: [{ type: 'stairs', at: [0.75, 3.6], size: [1.3, 4.2], dir: 1, upper: true }],
  },
  {
    id: 'tvlounge', floor: 1, name: 'TV lounge', rect: [2.5, 0, 10, 6], floorColor: '#d9d6d0', wallColor: '#3a332f',
    fixtures: [
      { id: 'tvlounge.fan', kind: 'fan', name: 'Ceiling fan', at: [5.5, 3] },
      { id: 'tvlounge.light', kind: 'light', name: 'Ceiling light', at: [7.8, 3] },
      { id: 'tvlounge.round1', kind: 'light', name: 'Round wall light', at: [5.6, 0.15], wallLight: true },
      { id: 'tvlounge.round2', kind: 'light', name: 'Wall spots', at: [7.8, 0.15], wallLight: true },
    ],
    furniture: [
      { type: 'sofaL', at: [6.5, 1.2], size: [3.4, 2.2], color: '#5a5a5e' },
      { type: 'table', at: [7.2, 2.6], size: [0.6, 0.6], color: '#f2f2f2', low: true },
      { type: 'cabinet', at: [3.3, 0.6], size: [1.2, 0.5], color: '#5b3d2a' },
    ],
  },
  {
    id: 'corridor1', floor: 1, name: 'Upper corridor', rect: [2.5, 6, 10, 8], floorColor: '#dcd8d1',
    fixtures: [{ id: 'corridor1.light', kind: 'light', name: 'Ceiling light', at: [6, 7] }],
    furniture: [],
  },
  {
    id: 'myroom', floor: 1, name: 'My room', rect: [0, 8, 5, 13.5], floorColor: '#d7d5d2', wallColor: '#2a2a33',
    fixtures: [
      { id: 'myroom.light', kind: 'light', name: 'Ceiling light', at: [2.5, 10.2] },
      { id: 'myroom.fan', kind: 'fan', name: 'Ceiling fan', at: [2.2, 11.2] },
      { id: 'myroom.strip', kind: 'strip', name: 'Headboard LED', at: [1.1, 12.0], wall: 'x', len: 1.8, onBed: true },
      { id: 'myroom.wall', kind: 'light', name: 'LED wall light', at: [0.15, 13.1], wallLight: true, wall: 'x' },
    ],
    furniture: [
      { type: 'bed', at: [1.3, 12.0], size: [2.0, 1.8], color: '#c9d3e6', head: '#141414', rot: 1 },
      { type: 'desk', at: [3.2, 8.4], size: [1.6, 0.6], color: '#9a6b3c' },
      { type: 'tv', at: [3.2, 8.25], monitor: true },
      { type: 'chair', at: [3.2, 9.1], color: '#ddd' },
      { type: 'rug', at: [2.8, 10.6], size: [2.0, 1.6], color: '#9a9890' },
    ],
  },
  {
    id: 'bath1', floor: 1, name: 'Washroom (mine)', rect: [0, 13.5, 2.5, 16], floorColor: '#d8dde0',
    fixtures: [
      { id: 'bath1.light', kind: 'light', name: 'Light', at: [1.25, 14.8] },
      { id: 'bath1.exhaust', kind: 'exhaust', name: 'Exhaust', at: [0.05, 15.2], wall: 'x' },
    ],
    furniture: [],
  },
  {
    id: 'bed3', floor: 1, name: 'Bedroom 3', rect: [5, 8, 10, 14], floorColor: '#e6e2da',
    fixtures: [
      { id: 'bed3.light', kind: 'light', name: 'Ceiling light', at: [7.5, 10.2] },
      { id: 'bed3.fan', kind: 'fan', name: 'Ceiling fan', at: [7.5, 11.4] },
      { id: 'bed3.wall', kind: 'light', name: 'Wall light', at: [9.85, 12.6], wallLight: true, wall: 'x' },
    ],
    furniture: [
      { type: 'bed', at: [8.6, 12.6], size: [2.0, 1.9], color: '#a7a7a2', head: '#cfc5b4', rot: 1 },
      { type: 'wardrobe', at: [5.4, 10.8], size: [0.6, 2.6] },
      { type: 'cabinet', at: [7.0, 13.7], size: [1.2, 0.45], color: '#f2f2f2' },
    ],
  },
  {
    id: 'bath3', floor: 1, name: 'Washroom (bed 3)', rect: [2.5, 13.5, 5, 16], floorColor: '#d8dde0',
    fixtures: [{ id: 'bath3.light', kind: 'light', name: 'Light', at: [3.75, 14.8] }],
    furniture: [],
  },
];

export const ROOMS = [...GROUND, ...FIRST.map(squeeze)];

// overall footprint, used to centre the camera
const xs = ROOMS.flatMap(r => [r.rect[0], r.rect[2]]), zs = ROOMS.flatMap(r => [r.rect[1], r.rect[3]]);
export const BOUNDS = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
