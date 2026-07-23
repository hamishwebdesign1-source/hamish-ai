// A restrained node-and-line motif — the same visual language used for the
// site's OG share images — for hero/header texture. No glow, no gradient
// blobs; just a fine technical diagram, low-opacity, non-interactive.
const NODES: [number, number, string, number][] = [
  [430, 90, "var(--accent)", 6],
  [500, 220, "var(--gradient-violet)", 5],
  [380, 260, "var(--accent)", 4],
  [520, 380, "var(--clay)", 5],
  [440, 470, "var(--gradient-violet)", 4],
  [340, 400, "var(--accent)", 4],
  [300, 150, "var(--gradient-violet)", 4],
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [3, 4],
  [4, 5],
  [5, 2],
  [0, 6],
  [6, 2],
];

export function ConstellationBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 540 630"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a][0]}
          y1={NODES[a][1]}
          x2={NODES[b][0]}
          y2={NODES[b][1]}
          stroke="var(--foreground)"
          strokeOpacity={0.08}
          strokeWidth={1.5}
        />
      ))}
      {NODES.map(([x, y, color, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={color} fillOpacity={0.55} />
      ))}
      <circle
        cx="80"
        cy="560"
        r="140"
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.05}
        strokeWidth={1.5}
      />
      <circle
        cx="500"
        cy="520"
        r="220"
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.04}
        strokeWidth={1.5}
      />
    </svg>
  );
}
