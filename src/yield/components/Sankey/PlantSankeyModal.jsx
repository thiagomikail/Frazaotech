import React from 'react';
import { GitBranch } from 'lucide-react';
import SankeyDiagram from './SankeyDiagram';
import { IconBadge, Modal, Stat } from '../ui';
import { useColors } from '../../lib/colors';

/**
 * O botao "View Plant Sankey" passava o array de assets direto para
 * <SankeyDiagram>, que espera { nodes, links }. Alem de quebrar, nunca houve
 * um modal: o componente era montado solto, sem overlay e sem fechar.
 *
 * Aqui o array vira o fluxo da planta inteira: entrada total -> cada ativo ->
 * util / perdido. E' o mesmo desenho do painel de ativo, um nivel acima.
 * `colors` pinta as ligacoes: util na cor de destaque, perda em cinza.
 */
const buildPlantFlow = (assets, colors) => {
    if (!Array.isArray(assets) || assets.length === 0) {
        return { nodes: [], links: [] };
    }

    const num = (v) => {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        return Number.isFinite(n) ? Math.abs(n) : 0;
    };

    // 0 = entrada da planta, depois um nó por ativo, e por fim os dois destinos.
    const nodes = [
        { name: 'Plant Input' },
        ...assets.map((a) => ({ name: a.name })),
        { name: 'Useful Energy' },
        { name: 'Losses' }
    ];

    const usefulIdx = assets.length + 1;
    const lossIdx = assets.length + 2;
    const links = [];

    assets.forEach((asset, i) => {
        const assetIdx = i + 1;
        const load = num(asset?.energy?.currentLoad);
        const useful = num(asset?.energy?.usefulEnergy);
        const loss = num(asset?.energy?.totalLoss);

        if (load > 0) {
            links.push({ source: 0, target: assetIdx, value: load, fill: colors.accent });
        }
        if (useful > 0) {
            links.push({ source: assetIdx, target: usefulIdx, value: useful, fill: colors.accent });
        }
        if (loss > 0) {
            links.push({ source: assetIdx, target: lossIdx, value: loss, fill: colors.ink3 });
        }
    });

    return { nodes, links };
};

const PlantSankeyModal = ({ data, onClose }) => {
    const c = useColors();
    const flow = buildPlantFlow(data, c);

    const totalLoad = (data || []).reduce(
        (sum, a) => sum + (parseFloat(a?.energy?.currentLoad) || 0), 0
    );
    const totalLoss = (data || []).reduce(
        (sum, a) => sum + (parseFloat(a?.energy?.totalLoss) || 0), 0
    );
    const efficiency = totalLoad > 0 ? ((totalLoad - totalLoss) / totalLoad) * 100 : 0;

    return (
        <Modal
            title="Plant energy flow"
            subtitle="Every asset, from fuel in to useful heat and losses"
            icon={<IconBadge icon={GitBranch} tone="blue" />}
            onClose={onClose}
            size="lg"
        >
            <div className="flex flex-col gap-4 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-sm border border-line bg-field px-3 py-2.5">
                        <Stat label="Plant input" value={totalLoad.toFixed(1)} unit="MMBtu/hr" />
                    </div>
                    <div className="rounded-sm border border-line bg-field px-3 py-2.5">
                        <Stat label="Total losses" value={`-${totalLoss.toFixed(1)}`} unit="MMBtu/hr" />
                    </div>
                    <div className="rounded-sm border border-line bg-field px-3 py-2.5">
                        <Stat label="Plant efficiency" value={`${efficiency.toFixed(1)}%`} />
                    </div>
                </div>

                <div className="h-[min(55vh,520px)] min-h-[280px] rounded-sm border border-line bg-field p-2">
                    <SankeyDiagram data={flow} />
                </div>
            </div>
        </Modal>
    );
};

export default PlantSankeyModal;
