// The house, as best read from house.mp4. Units are metres. x runs left->right
// looking from the street, z runs from the front door (z=0) to the back.
// Room sizes and positions are estimates; fix them here and the 3D model follows.
//
// fixture kinds: light (ceiling), fan, lamp (floor/bedside), strip (LED), exhaust
// furniture types: bed, sofa, sofaL, table, desk, counter, fridge, wardrobe, tv,
//                  stairs, chair, plant, rug, cabinet

export const FLOOR_HEIGHT = 3.2;

export const FLOORS = [
  { id: 0, name: 'Ground floor' },
  { id: 1, name: 'First floor' },
];

export const ROOMS = [
  // ---------------- Ground floor ----------------
  {
    id: 'hall', floor: 0, name: 'Entrance hall', rect: [0, 0, 5, 6], floorColor: '#e9e6df',
    fixtures: [
      { id: 'hall.light', kind: 'light', name: 'Ceiling light', at: [2.8, 2.6] },
      { id: 'hall.fan', kind: 'fan', name: 'Ceiling fan', at: [3.2, 4.2] },
      { id: 'hall.lamp', kind: 'lamp', name: 'Floor lamp', at: [1.9, 4.9] },
    ],
    furniture: [
      { type: 'stairs', at: [0.75, 3.6], size: [1.3, 4.2], dir: 1 },
      { type: 'sofa', at: [2.6, 5.4], size: [1.5, 0.8], color: '#6b4a3a' },
      { type: 'rug', at: [2.6, 4.7], size: [1.6, 1.0], color: '#2b2b2b' },
      { type: 'cabinet', at: [3.6, 5.7], size: [1.1, 0.45], color: '#9a7046' },
      { type: 'plant', at: [4.6, 5.6] },
      { type: 'plant', at: [1.6, 1.0] },
    ],
  },
  {
    id: 'store', floor: 0, name: 'Store (bikes)', rect: [0, 6, 2.5, 8.5], floorColor: '#dedad2',
    fixtures: [
      { id: 'store.light', kind: 'light', name: 'Ceiling light', at: [1.3, 7.2] },
      { id: 'store.exhaust', kind: 'exhaust', name: 'Exhaust fan', at: [0.05, 7.6], wall: 'x' },
    ],
    furniture: [{ type: 'cabinet', at: [0.5, 6.6], size: [0.6, 0.6], color: '#dcdcdc' }],
  },
  {
    id: 'kitchen', floor: 0, name: 'Kitchen', rect: [0, 8.5, 4.5, 12.5], floorColor: '#ecebe6',
    fixtures: [
      { id: 'kitchen.light', kind: 'light', name: 'Ceiling light', at: [2.3, 10.5] },
      { id: 'kitchen.tube', kind: 'strip', name: 'Tube light', at: [2.3, 12.45], wall: 'z', len: 1.2 },
      { id: 'kitchen.exhaust', kind: 'exhaust', name: 'Cooker hood', at: [0.05, 11.6], wall: 'x' },
    ],
    furniture: [
      { type: 'counter', at: [0.35, 10.6], size: [0.6, 3.4], color: '#9b7a55' },
      { type: 'counter', at: [2.3, 12.2], size: [3.4, 0.6], color: '#9b7a55' },
      { type: 'fridge', at: [4.1, 9.1], size: [0.7, 0.7] },
      { type: 'cabinet', at: [3.0, 8.9], size: [1.0, 0.45], color: '#222' },
    ],
  },
  {
    id: 'dining', floor: 0, name: 'Dining', rect: [4.5, 6, 10, 10], floorColor: '#e9e6df',
    fixtures: [
      { id: 'dining.pendant1', kind: 'light', name: 'Chandelier 1', at: [6.6, 8], pendant: true },
      { id: 'dining.pendant2', kind: 'light', name: 'Chandelier 2', at: [8.2, 8], pendant: true },
      { id: 'dining.fan', kind: 'fan', name: 'Ceiling fan', at: [5.4, 6.9] },
      { id: 'dining.lamp', kind: 'lamp', name: 'Floor lamp', at: [9.6, 9.5] },
    ],
    furniture: [
      { type: 'rug', at: [7.4, 8], size: [3.4, 2.4], color: '#8a7a5a' },
      { type: 'table', at: [7.4, 8], size: [2.2, 1.1], color: '#f2efe8' },
      { type: 'chair', at: [6.7, 7.2] }, { type: 'chair', at: [7.4, 7.2] }, { type: 'chair', at: [8.1, 7.2] },
      { type: 'chair', at: [6.7, 8.8] }, { type: 'chair', at: [7.4, 8.8] }, { type: 'chair', at: [8.1, 8.8] },
      { type: 'plant', at: [4.9, 9.6] },
    ],
  },
  {
    id: 'living', floor: 0, name: 'Living room', rect: [5, 0, 10, 6], floorColor: '#efece5',
    fixtures: [
      { id: 'living.fan', kind: 'fan', name: 'Ceiling fan', at: [7.5, 3] },
      { id: 'living.sconce1', kind: 'light', name: 'Wall light left', at: [6.6, 0.15], wallLight: true },
      { id: 'living.sconce2', kind: 'light', name: 'Wall light right', at: [8.6, 0.15], wallLight: true },
      { id: 'living.light', kind: 'light', name: 'Ceiling light', at: [7.5, 4.6] },
    ],
    furniture: [
      { type: 'rug', at: [7.5, 2.8], size: [2.6, 2.0], color: '#7a3e2e' },
      { type: 'sofa', at: [7.5, 0.6], size: [2.2, 0.9], color: '#8a6a33' },
      { type: 'sofa', at: [9.5, 2.8], size: [0.9, 2.0], color: '#8a6a33' },
      { type: 'chair', at: [5.7, 1.0], big: true, color: '#1d1d1d' },
      { type: 'table', at: [7.5, 2.8], size: [1.1, 0.7], color: '#222', low: true },
      { type: 'tv', at: [9.8, 5.2] },
      { type: 'plant', at: [9.5, 0.5] },
    ],
  },
  {
    id: 'master', floor: 0, name: 'Master bedroom', rect: [4.5, 10, 10, 16], floorColor: '#e6e2da',
    fixtures: [
      { id: 'master.light', kind: 'light', name: 'Ceiling light', at: [6.7, 13.2] },
      { id: 'master.fan', kind: 'fan', name: 'Ceiling fan', at: [7.4, 12.2] },
      { id: 'master.wall', kind: 'light', name: 'Wall light', at: [7.3, 15.85], wallLight: true },
      { id: 'master.lamp', kind: 'lamp', name: 'Bedside lamp', at: [5.2, 14.9], small: true },
    ],
    furniture: [
      { type: 'rug', at: [6.6, 13.6], size: [2.6, 2.8], color: '#8c8070' },
      { type: 'bed', at: [6.6, 14.8], size: [2.0, 2.1], color: '#a3a3ad', head: '#5b3d2a' },
      { type: 'wardrobe', at: [9.7, 11.6], size: [0.6, 2.4] },
      { type: 'desk', at: [5.0, 11.2], size: [0.6, 1.2], color: '#6b4a2e' },
    ],
  },
  {
    id: 'bath0', floor: 0, name: 'Washroom', rect: [8.4, 14, 10, 16], floorColor: '#d8dde0',
    fixtures: [
      { id: 'bath0.light', kind: 'light', name: 'Light', at: [9.2, 15] },
      { id: 'bath0.exhaust', kind: 'exhaust', name: 'Exhaust', at: [9.95, 15.4], wall: 'x' },
    ],
    furniture: [],
  },
  {
    id: 'lobby', floor: 0, name: 'Side lobby', rect: [0, 12.5, 4.5, 16], floorColor: '#e9e6df',
    fixtures: [
      { id: 'lobby.light', kind: 'light', name: 'Ceiling light', at: [2.3, 14.2] },
      { id: 'lobby.lamp', kind: 'lamp', name: 'Floor lamp', at: [3.9, 15.5] },
    ],
    furniture: [
      { type: 'cabinet', at: [1.2, 15.7], size: [1.6, 0.45], color: '#f2f2f2' },
      { type: 'plant', at: [3.5, 15.6] },
    ],
  },

  // ---------------- First floor ----------------
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
