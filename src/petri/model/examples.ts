import type { Lang } from '../i18n';
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

export function examples(lang: Lang): Example[] {
  const L = (pt: string, en: string) => (lang === 'pt' ? pt : en);

  const drill: Example = {
    id: 'drill',
    title: L('Furadeira automática', 'Automatic drill'),
    prompt: L(
      'Furadeira automática: com a peça na morsa e a furadeira em cima, o botão de partida liga o motor e desce até o fim de curso baixo. Espera 1,5 s no fundo, sobe até o fim de curso alto e volta ao repouso.',
      'Automatic drill: with a part in the vise and the drill up, the start button turns the spindle on and feeds down to the lower limit switch. It dwells 1.5 s at the bottom, retracts to the upper limit switch and goes back to idle.',
    ),
    net: {
      name: L('Furadeira automática', 'Automatic drill'),
      description: L('Ciclo de furação com permanência no fundo.', 'Drilling cycle with a dwell at the bottom.'),
      inputs: [
        { name: L('partida', 'start'), description: L('Botão de partida', 'Start push button'), kind: 'button' },
        {
          name: L('peca', 'part_present'),
          description: L('Peça presente na morsa', 'Part in the vise'),
          kind: 'sensor',
        },
        {
          name: L('fc_alto', 'limit_up'),
          description: L('Fim de curso alto (recolhida)', 'Upper limit switch (retracted)'),
          kind: 'sensor',
        },
        {
          name: L('fc_baixo', 'limit_down'),
          description: L('Fim de curso baixo (profundidade)', 'Lower limit switch (depth reached)'),
          kind: 'sensor',
        },
      ],
      outputs: [
        { name: L('desce', 'feed_down'), description: L('Avanço da furadeira', 'Drill feed down') },
        { name: L('sobe', 'retract'), description: L('Recuo da furadeira', 'Drill retract') },
        { name: L('motor', 'spindle'), description: L('Motor do mandril', 'Spindle motor') },
      ],
      places: [
        {
          id: 'P1',
          name: L('Repouso', 'Idle'),
          description: L('Parada em cima, esperando partida', 'Up, waiting for start'),
          tokens: 1,
          capacity: 0,
          actions: [],
        },
        {
          id: 'P2',
          name: L('Descendo', 'Feeding'),
          description: L('Furando até o fim de curso baixo', 'Drilling down to the lower limit'),
          tokens: 0,
          capacity: 0,
          actions: [L('desce', 'feed_down'), L('motor', 'spindle')],
        },
        {
          id: 'P3',
          name: L('No fundo', 'Dwell'),
          description: L('Permanência no fundo do furo', 'Dwell at the bottom of the hole'),
          tokens: 0,
          capacity: 0,
          actions: [L('motor', 'spindle')],
        },
        {
          id: 'P4',
          name: L('Subindo', 'Retracting'),
          description: L('Recolhendo até o fim de curso alto', 'Retracting to the upper limit'),
          tokens: 0,
          capacity: 0,
          actions: [L('sobe', 'retract'), L('motor', 'spindle')],
        },
      ],
      transitions: [
        {
          id: 'T1',
          name: L('Partida', 'Start'),
          description: '',
          guard: L('partida AND peca AND fc_alto', 'start AND part_present AND limit_up'),
          delayMs: 0,
          priority: 1,
        },
        {
          id: 'T2',
          name: L('Chegou ao fundo', 'Bottom reached'),
          description: '',
          guard: L('fc_baixo', 'limit_down'),
          delayMs: 0,
          priority: 2,
        },
        {
          id: 'T3',
          name: L('Fim da permanência', 'Dwell done'),
          description: '',
          guard: '',
          delayMs: 1500,
          priority: 3,
        },
        {
          id: 'T4',
          name: L('Recolhida', 'Retracted'),
          description: '',
          guard: L('fc_alto', 'limit_up'),
          delayMs: 0,
          priority: 4,
        },
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
    title: L('Misturador por batelada', 'Batch mixer'),
    prompt: L(
      'Misturador por batelada: a partida abre as válvulas A e B ao mesmo tempo; cada uma fecha no seu sensor de nível. Com as duas doses prontas, o agitador mistura por 10 s; depois a válvula de dreno abre até o tanque ficar vazio.',
      'Batch mixer: start opens valves A and B at the same time; each one closes on its own level sensor. With both doses in, the agitator mixes for 10 s; then the drain valve opens until the tank is empty.',
    ),
    net: {
      name: L('Misturador por batelada', 'Batch mixer'),
      description: L('Dosagem paralela, mistura temporizada e dreno.', 'Parallel dosing, timed mixing and drain.'),
      inputs: [
        { name: L('partida', 'start'), description: L('Botão de partida', 'Start push button'), kind: 'button' },
        { name: L('nivel_a', 'level_a'), description: L('Dose A completa', 'Dose A reached'), kind: 'sensor' },
        { name: L('nivel_b', 'level_b'), description: L('Dose B completa', 'Dose B reached'), kind: 'sensor' },
        { name: L('vazio', 'empty'), description: L('Tanque vazio', 'Tank empty'), kind: 'sensor' },
      ],
      outputs: [
        { name: L('valvula_a', 'valve_a'), description: L('Válvula do produto A', 'Product A valve') },
        { name: L('valvula_b', 'valve_b'), description: L('Válvula do produto B', 'Product B valve') },
        { name: L('agitador', 'agitator'), description: L('Motor do agitador', 'Agitator motor') },
        { name: L('dreno', 'drain'), description: L('Válvula de dreno', 'Drain valve') },
      ],
      places: [
        {
          id: 'P1',
          name: L('Pronto', 'Ready'),
          description: L('Tanque vazio, esperando partida', 'Tank empty, waiting for start'),
          tokens: 1,
          capacity: 0,
          actions: [],
        },
        {
          id: 'P2',
          name: L('Dosando A', 'Dosing A'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('valvula_a', 'valve_a')],
        },
        {
          id: 'P3',
          name: L('Dosando B', 'Dosing B'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('valvula_b', 'valve_b')],
        },
        { id: 'P4', name: L('A pronto', 'A done'), description: '', tokens: 0, capacity: 0, actions: [] },
        { id: 'P5', name: L('B pronto', 'B done'), description: '', tokens: 0, capacity: 0, actions: [] },
        {
          id: 'P6',
          name: L('Misturando', 'Mixing'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('agitador', 'agitator')],
        },
        {
          id: 'P7',
          name: L('Drenando', 'Draining'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('dreno', 'drain')],
        },
      ],
      transitions: [
        {
          id: 'T1',
          name: L('Iniciar', 'Start'),
          description: L('Abre A e B juntas', 'Opens A and B together'),
          guard: L('partida', 'start'),
          delayMs: 0,
          priority: 1,
        },
        {
          id: 'T2',
          name: L('Dose A ok', 'Dose A ok'),
          description: '',
          guard: L('nivel_a', 'level_a'),
          delayMs: 0,
          priority: 2,
        },
        {
          id: 'T3',
          name: L('Dose B ok', 'Dose B ok'),
          description: '',
          guard: L('nivel_b', 'level_b'),
          delayMs: 0,
          priority: 3,
        },
        {
          id: 'T4',
          name: L('Misturar', 'Mix'),
          description: L('Espera as duas doses', 'Waits for both doses'),
          guard: '',
          delayMs: 0,
          priority: 4,
        },
        { id: 'T5', name: L('Mistura pronta', 'Mix done'), description: '', guard: '', delayMs: 10000, priority: 5 },
        {
          id: 'T6',
          name: L('Esvaziou', 'Emptied'),
          description: '',
          guard: L('vazio', 'empty'),
          delayMs: 0,
          priority: 6,
        },
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
    title: L('Dois robôs, uma área', 'Two robots, one zone'),
    prompt: L(
      'Dois robôs dividem uma área de trabalho: cada um pede para entrar e só recebe a liberação se a área estiver livre. Quando sai, devolve a área. Se os dois pedirem juntos, o robô 1 tem a preferência.',
      'Two robots share one work zone: each asks to enter and only gets the release if the zone is free. On leaving, it hands the zone back. If both ask at once, robot 1 goes first.',
    ),
    net: {
      name: L('Dois robôs, uma área', 'Two robots, one zone'),
      description: L('Exclusão mútua com recurso compartilhado.', 'Mutual exclusion over a shared resource.'),
      inputs: [
        {
          name: L('pede_r1', 'req_r1'),
          description: L('Robô 1 pede a área', 'Robot 1 requests the zone'),
          kind: 'sensor',
        },
        {
          name: L('saiu_r1', 'left_r1'),
          description: L('Robô 1 saiu da área', 'Robot 1 left the zone'),
          kind: 'sensor',
        },
        {
          name: L('pede_r2', 'req_r2'),
          description: L('Robô 2 pede a área', 'Robot 2 requests the zone'),
          kind: 'sensor',
        },
        {
          name: L('saiu_r2', 'left_r2'),
          description: L('Robô 2 saiu da área', 'Robot 2 left the zone'),
          kind: 'sensor',
        },
      ],
      outputs: [
        { name: L('libera_r1', 'grant_r1'), description: L('Liberação para o robô 1', 'Zone granted to robot 1') },
        { name: L('libera_r2', 'grant_r2'), description: L('Liberação para o robô 2', 'Zone granted to robot 2') },
      ],
      places: [
        { id: 'P1', name: L('R1 fora', 'R1 outside'), description: '', tokens: 1, capacity: 0, actions: [] },
        {
          id: 'P2',
          name: L('R1 na área', 'R1 in zone'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('libera_r1', 'grant_r1')],
        },
        {
          id: 'P3',
          name: L('Área livre', 'Zone free'),
          description: L('O recurso compartilhado', 'The shared resource'),
          tokens: 1,
          capacity: 0,
          actions: [],
        },
        { id: 'P4', name: L('R2 fora', 'R2 outside'), description: '', tokens: 1, capacity: 0, actions: [] },
        {
          id: 'P5',
          name: L('R2 na área', 'R2 in zone'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('libera_r2', 'grant_r2')],
        },
      ],
      transitions: [
        {
          id: 'T1',
          name: L('R1 entra', 'R1 enters'),
          description: '',
          guard: L('pede_r1', 'req_r1'),
          delayMs: 0,
          priority: 1,
        },
        {
          id: 'T2',
          name: L('R1 sai', 'R1 leaves'),
          description: '',
          guard: L('saiu_r1', 'left_r1'),
          delayMs: 0,
          priority: 3,
        },
        {
          id: 'T3',
          name: L('R2 entra', 'R2 enters'),
          description: '',
          guard: L('pede_r2', 'req_r2'),
          delayMs: 0,
          priority: 2,
        },
        {
          id: 'T4',
          name: L('R2 sai', 'R2 leaves'),
          description: '',
          guard: L('saiu_r2', 'left_r2'),
          delayMs: 0,
          priority: 4,
        },
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
    title: L('Esteira com buffer de 3', 'Conveyor with a 3-part buffer'),
    prompt: L(
      'Esteira acumuladora de até 3 peças: o sensor de entrada conta cada peça que passa. Com peça acumulada e a estação livre, o motor avança uma peça até o sensor da estação; a lâmpada pede a retirada e o operador confirma no botão.',
      'Accumulating conveyor, up to 3 parts: the infeed sensor counts each passing part. With a part queued and the station free, the motor advances one part to the station sensor; a lamp asks for removal and the operator confirms with a push button.',
    ),
    net: {
      name: L('Esteira com buffer', 'Buffered conveyor'),
      description: L(
        'Contagem de peças com capacidade 3 (marcação inteira).',
        'Part counting with capacity 3 (integer marking).',
      ),
      inputs: [
        {
          name: L('sensor_entrada', 'infeed_sensor'),
          description: L('Peça passando na entrada', 'Part passing the infeed'),
          kind: 'sensor',
        },
        {
          name: L('sensor_estacao', 'station_sensor'),
          description: L('Peça chegou na estação', 'Part at the station'),
          kind: 'sensor',
        },
        {
          name: L('retirada', 'removed'),
          description: L('Operador confirma retirada', 'Operator confirms removal'),
          kind: 'button',
        },
      ],
      outputs: [
        { name: L('motor_esteira', 'conveyor_motor'), description: L('Motor da esteira', 'Conveyor motor') },
        { name: L('lampada_retirar', 'remove_lamp'), description: L('Lâmpada "retire a peça"', '"Remove part" lamp') },
      ],
      places: [
        { id: 'P1', name: L('Entrada pronta', 'Infeed ready'), description: '', tokens: 1, capacity: 0, actions: [] },
        { id: 'P2', name: L('Peça passando', 'Part passing'), description: '', tokens: 0, capacity: 0, actions: [] },
        {
          id: 'P3',
          name: L('No buffer', 'Queued'),
          description: L('Peças acumuladas na esteira', 'Parts queued on the conveyor'),
          tokens: 0,
          capacity: 3,
          actions: [],
        },
        { id: 'P4', name: L('Estação livre', 'Station free'), description: '', tokens: 1, capacity: 0, actions: [] },
        {
          id: 'P5',
          name: L('Avançando', 'Advancing'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('motor_esteira', 'conveyor_motor')],
        },
        {
          id: 'P6',
          name: L('Na estação', 'At station'),
          description: '',
          tokens: 0,
          capacity: 0,
          actions: [L('lampada_retirar', 'remove_lamp')],
        },
      ],
      transitions: [
        {
          id: 'T1',
          name: L('Detecta peça', 'Part detected'),
          description: '',
          guard: L('sensor_entrada', 'infeed_sensor'),
          delayMs: 0,
          priority: 1,
        },
        {
          id: 'T2',
          name: L('Conta peça', 'Count part'),
          description: L('Na borda de descida do sensor', 'On the sensor falling edge'),
          guard: L('NOT sensor_entrada', 'NOT infeed_sensor'),
          delayMs: 0,
          priority: 2,
        },
        { id: 'T3', name: L('Avança', 'Advance'), description: '', guard: '', delayMs: 0, priority: 3 },
        {
          id: 'T4',
          name: L('Chegou', 'Arrived'),
          description: '',
          guard: L('sensor_estacao', 'station_sensor'),
          delayMs: 0,
          priority: 4,
        },
        {
          id: 'T5',
          name: L('Retirada', 'Removed'),
          description: '',
          guard: L('retirada', 'removed'),
          delayMs: 0,
          priority: 5,
        },
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
