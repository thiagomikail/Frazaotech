import type { PetriNet } from './types';

/**
 * Ready-made nets: they work without an API key, and each one shows off a
 * different Petri-net idea — a sequence with a timer, fork/join concurrency,
 * a shared resource with a conflict, and a buffer that needs an INT.
 */

export interface Example {
  id: string;
  title: string;
  /** What a user would have typed to get this net. */
  prompt: string;
  net: PetriNet;
}

type Arcs = [string, string, number?][];

const arcs = (list: Arcs) => list.map(([from, to, weight], i) => ({ id: `A${i + 1}`, from, to, weight: weight ?? 1 }));

export function examples(): Example[] {
  const drill: Example = {
    id: 'drill',
    title: 'Automatic drill',
    prompt:
      'Automatic drill: with a part in the vise and the drill up, the start button turns the spindle on and feeds down to the lower limit switch. It dwells 1.5 s at the bottom, retracts to the upper limit switch and goes back to idle.',
    net: {
      name: 'Automatic drill',
      description: 'Drilling cycle with a dwell at the bottom.',
      inputs: [
        { name: 'start', description: 'Start push button', kind: 'button' },
        { name: 'part_present', description: 'Part in the vise', kind: 'sensor' },
        { name: 'limit_up', description: 'Upper limit switch (retracted)', kind: 'sensor' },
        { name: 'limit_down', description: 'Lower limit switch (depth reached)', kind: 'sensor' },
      ],
      outputs: [
        { name: 'feed_down', description: 'Drill feed down' },
        { name: 'retract', description: 'Drill retract' },
        { name: 'spindle', description: 'Spindle motor' },
      ],
      places: [
        { id: 'P1', name: 'Idle', description: 'Up, waiting for start', tokens: 1, capacity: 0, actions: [] },
        {
          id: 'P2',
          name: 'Feeding',
          description: 'Drilling down to the lower limit',
          tokens: 0,
          capacity: 0,
          actions: ['feed_down', 'spindle'],
        },
        {
          id: 'P3',
          name: 'Dwell',
          description: 'Dwell at the bottom of the hole',
          tokens: 0,
          capacity: 0,
          actions: ['spindle'],
        },
        {
          id: 'P4',
          name: 'Retracting',
          description: 'Retracting to the upper limit',
          tokens: 0,
          capacity: 0,
          actions: ['retract', 'spindle'],
        },
      ],
      transitions: [
        {
          id: 'T1',
          name: 'Start',
          description: '',
          guard: 'start AND part_present AND limit_up',
          delayMs: 0,
          priority: 1,
        },
        { id: 'T2', name: 'Bottom reached', description: '', guard: 'limit_down', delayMs: 0, priority: 2 },
        { id: 'T3', name: 'Dwell done', description: '', guard: '', delayMs: 1500, priority: 3 },
        { id: 'T4', name: 'Retracted', description: '', guard: 'limit_up', delayMs: 0, priority: 4 },
      ],
      arcs: arcs([
        ['P1', 'T1'],
        ['T1', 'P2'],
        ['P2', 'T2'],
        ['T2', 'P3'],
        ['P3', 'T3'],
        ['T3', 'P4'],
        ['P4', 'T4'],
        ['T4', 'P1'],
      ]),
    },
  };

  const mixer: Example = {
    id: 'mixer',
    title: 'Batch mixer',
    prompt:
      'Batch mixer: start opens valves A and B at the same time; each one closes on its own level sensor. With both doses in, the agitator mixes for 10 s; then the drain valve opens until the tank is empty.',
    net: {
      name: 'Batch mixer',
      description: 'Parallel dosing, timed mixing and drain.',
      inputs: [
        { name: 'start', description: 'Start push button', kind: 'button' },
        { name: 'level_a', description: 'Dose A reached', kind: 'sensor' },
        { name: 'level_b', description: 'Dose B reached', kind: 'sensor' },
        { name: 'empty', description: 'Tank empty', kind: 'sensor' },
      ],
      outputs: [
        { name: 'valve_a', description: 'Product A valve' },
        { name: 'valve_b', description: 'Product B valve' },
        { name: 'agitator', description: 'Agitator motor' },
        { name: 'drain', description: 'Drain valve' },
      ],
      places: [
        { id: 'P1', name: 'Ready', description: 'Tank empty, waiting for start', tokens: 1, capacity: 0, actions: [] },
        { id: 'P2', name: 'Dosing A', description: '', tokens: 0, capacity: 0, actions: ['valve_a'] },
        { id: 'P3', name: 'Dosing B', description: '', tokens: 0, capacity: 0, actions: ['valve_b'] },
        { id: 'P4', name: 'A done', description: '', tokens: 0, capacity: 0, actions: [] },
        { id: 'P5', name: 'B done', description: '', tokens: 0, capacity: 0, actions: [] },
        { id: 'P6', name: 'Mixing', description: '', tokens: 0, capacity: 0, actions: ['agitator'] },
        { id: 'P7', name: 'Draining', description: '', tokens: 0, capacity: 0, actions: ['drain'] },
      ],
      transitions: [
        { id: 'T1', name: 'Start', description: 'Opens A and B together', guard: 'start', delayMs: 0, priority: 1 },
        { id: 'T2', name: 'Dose A ok', description: '', guard: 'level_a', delayMs: 0, priority: 2 },
        { id: 'T3', name: 'Dose B ok', description: '', guard: 'level_b', delayMs: 0, priority: 3 },
        { id: 'T4', name: 'Mix', description: 'Waits for both doses', guard: '', delayMs: 0, priority: 4 },
        { id: 'T5', name: 'Mix done', description: '', guard: '', delayMs: 10000, priority: 5 },
        { id: 'T6', name: 'Emptied', description: '', guard: 'empty', delayMs: 0, priority: 6 },
      ],
      arcs: arcs([
        ['P1', 'T1'],
        ['T1', 'P2'],
        ['T1', 'P3'],
        ['P2', 'T2'],
        ['T2', 'P4'],
        ['P3', 'T3'],
        ['T3', 'P5'],
        ['P4', 'T4'],
        ['P5', 'T4'],
        ['T4', 'P6'],
        ['P6', 'T5'],
        ['T5', 'P7'],
        ['P7', 'T6'],
        ['T6', 'P1'],
      ]),
    },
  };

  const robots: Example = {
    id: 'robots',
    title: 'Two robots, one zone',
    prompt:
      'Two robots share one work zone: each asks to enter and only gets the release if the zone is free. On leaving, it hands the zone back. If both ask at once, robot 1 goes first.',
    net: {
      name: 'Two robots, one zone',
      description: 'Mutual exclusion over a shared resource.',
      inputs: [
        { name: 'req_r1', description: 'Robot 1 requests the zone', kind: 'sensor' },
        { name: 'left_r1', description: 'Robot 1 left the zone', kind: 'sensor' },
        { name: 'req_r2', description: 'Robot 2 requests the zone', kind: 'sensor' },
        { name: 'left_r2', description: 'Robot 2 left the zone', kind: 'sensor' },
      ],
      outputs: [
        { name: 'grant_r1', description: 'Zone granted to robot 1' },
        { name: 'grant_r2', description: 'Zone granted to robot 2' },
      ],
      places: [
        { id: 'P1', name: 'R1 outside', description: '', tokens: 1, capacity: 0, actions: [] },
        { id: 'P2', name: 'R1 in zone', description: '', tokens: 0, capacity: 0, actions: ['grant_r1'] },
        { id: 'P3', name: 'Zone free', description: 'The shared resource', tokens: 1, capacity: 0, actions: [] },
        { id: 'P4', name: 'R2 outside', description: '', tokens: 1, capacity: 0, actions: [] },
        { id: 'P5', name: 'R2 in zone', description: '', tokens: 0, capacity: 0, actions: ['grant_r2'] },
      ],
      transitions: [
        { id: 'T1', name: 'R1 enters', description: '', guard: 'req_r1', delayMs: 0, priority: 1 },
        { id: 'T2', name: 'R1 leaves', description: '', guard: 'left_r1', delayMs: 0, priority: 3 },
        { id: 'T3', name: 'R2 enters', description: '', guard: 'req_r2', delayMs: 0, priority: 2 },
        { id: 'T4', name: 'R2 leaves', description: '', guard: 'left_r2', delayMs: 0, priority: 4 },
      ],
      arcs: arcs([
        ['P1', 'T1'],
        ['P3', 'T1'],
        ['T1', 'P2'],
        ['P2', 'T2'],
        ['T2', 'P1'],
        ['T2', 'P3'],
        ['P4', 'T3'],
        ['P3', 'T3'],
        ['T3', 'P5'],
        ['P5', 'T4'],
        ['T4', 'P4'],
        ['T4', 'P3'],
      ]),
    },
  };

  const buffer: Example = {
    id: 'buffer',
    title: 'Conveyor with a 3-part buffer',
    prompt:
      'Accumulating conveyor, up to 3 parts: the infeed sensor counts each passing part. With a part queued and the station free, the motor advances one part to the station sensor; a lamp asks for removal and the operator confirms with a push button.',
    net: {
      name: 'Buffered conveyor',
      description: 'Part counting with capacity 3 (integer marking).',
      inputs: [
        { name: 'infeed_sensor', description: 'Part passing the infeed', kind: 'sensor' },
        { name: 'station_sensor', description: 'Part at the station', kind: 'sensor' },
        { name: 'removed', description: 'Operator confirms removal', kind: 'button' },
      ],
      outputs: [
        { name: 'conveyor_motor', description: 'Conveyor motor' },
        { name: 'remove_lamp', description: '"Remove part" lamp' },
      ],
      places: [
        { id: 'P1', name: 'Infeed ready', description: '', tokens: 1, capacity: 0, actions: [] },
        { id: 'P2', name: 'Part passing', description: '', tokens: 0, capacity: 0, actions: [] },
        { id: 'P3', name: 'Queued', description: 'Parts queued on the conveyor', tokens: 0, capacity: 3, actions: [] },
        { id: 'P4', name: 'Station free', description: '', tokens: 1, capacity: 0, actions: [] },
        { id: 'P5', name: 'Advancing', description: '', tokens: 0, capacity: 0, actions: ['conveyor_motor'] },
        { id: 'P6', name: 'At station', description: '', tokens: 0, capacity: 0, actions: ['remove_lamp'] },
      ],
      transitions: [
        { id: 'T1', name: 'Part detected', description: '', guard: 'infeed_sensor', delayMs: 0, priority: 1 },
        {
          id: 'T2',
          name: 'Count part',
          description: 'On the sensor falling edge',
          guard: 'NOT infeed_sensor',
          delayMs: 0,
          priority: 2,
        },
        { id: 'T3', name: 'Advance', description: '', guard: '', delayMs: 0, priority: 3 },
        { id: 'T4', name: 'Arrived', description: '', guard: 'station_sensor', delayMs: 0, priority: 4 },
        { id: 'T5', name: 'Removed', description: '', guard: 'removed', delayMs: 0, priority: 5 },
      ],
      arcs: arcs([
        ['P1', 'T1'],
        ['T1', 'P2'],
        ['P2', 'T2'],
        ['T2', 'P1'],
        ['T2', 'P3'],
        ['P3', 'T3'],
        ['P4', 'T3'],
        ['T3', 'P5'],
        ['P5', 'T4'],
        ['T4', 'P6'],
        ['P6', 'T5'],
        ['T5', 'P4'],
      ]),
    },
  };

  return [drill, mixer, robots, buffer];
}
