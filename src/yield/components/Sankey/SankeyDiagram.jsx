import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { tooltipProps, useColors } from '../../lib/colors';

const CustomLink = (props) => {
    const { sourceX, sourceY, targetX, targetY, linkWidth, payload, fallback } = props;
    const color = payload.fill || fallback;

    // Midpoint Bezier Curve
    const path = `
        M${sourceX},${sourceY + linkWidth / 2}
        C${sourceX + 100},${sourceY + linkWidth / 2}
         ${targetX - 100},${targetY + linkWidth / 2}
         ${targetX},${targetY + linkWidth / 2}
    `;

    return (
        <path
            d={path}
            stroke={color}
            strokeWidth={Math.max(1, linkWidth)}
            fill="none"
            opacity={0.5}
            className="transition-opacity duration-200 hover:opacity-85"
        />
    );
};

/**
 * Node bar with its name beside it, so the flow reads without hovering (an
 * iPad has no hover). The source column is labelled to the right, the rest to
 * the left; a halo in the card color keeps the text legible over the links.
 */
const SankeyNode = ({ x, y, width, height, payload, c }) => {
    const first = payload.depth === 0;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} rx={2} fill={c.ink3} />
            <text
                x={first ? x + width + 6 : x - 6}
                y={y + height / 2}
                dy="0.35em"
                textAnchor={first ? 'start' : 'end'}
                fontSize={11}
                fontWeight={500}
                fill={c.ink}
                stroke={c.surface}
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
            >
                {payload.name}
            </text>
        </g>
    );
};

/**
 * Recharts <Sankey> chama data.nodes.map() sem checar nada: qualquer coisa que
 * nao seja { nodes: [...], links: [...] } derruba a arvore inteira ate o
 * ErrorBoundary. Era exatamente isso que "View Plant Sankey" fazia - recebia o
 * array de assets e matava o app. Aqui o shape e' validado antes de entrar.
 */
const isValidSankeyShape = (d) =>
    !!d && !Array.isArray(d) && Array.isArray(d.nodes) && Array.isArray(d.links);

const SankeyDiagram = ({ data, width = "100%", height = "100%" }) => {
    const c = useColors();
    const chartData = isValidSankeyShape(data) ? data : { nodes: [], links: [] };

    // Sem nós ou sem ligações o Sankey tambem quebra - mostra vazio no lugar.
    if (chartData.nodes.length === 0 || chartData.links.length === 0) {
        return (
            <div
                style={{ width, height }}
                className="flex min-h-0 items-center justify-center rounded-xl bg-fill/50 text-[12px] text-ink-3"
            >
                No flow data
            </div>
        );
    }

    return (
        <div style={{ width, height }} className="min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <Sankey
                    data={chartData}
                    node={<SankeyNode c={c} />}
                    link={<CustomLink fallback={c.red} />}
                    nodePadding={50}
                    margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
                    nodeWidth={10}
                >
                    <defs>
                        <linearGradient id="gradientUseful" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={c.accent} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={c.accent} stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <Tooltip {...tooltipProps(c)} />
                </Sankey>
            </ResponsiveContainer>
        </div>
    );
};

export default SankeyDiagram;
