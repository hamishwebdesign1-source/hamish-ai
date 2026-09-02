import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const BRAND = {
  paper: "#f4f7fb",
  ink: "#0e1624",
  inkSoft: "#5b6472",
  border: "#d6dbe1",
  accent: "#0a73f3",
  violet: "#823feb",
  clay: "#ac7957",
};

// Read from disk rather than fetched over the network at build time. This
// used to fetch both files from github.com/google/fonts on every build —
// fragile in exactly the way that convention warns against elsewhere in
// this codebase: it took down every production deploy the moment GitHub's
// raw-content path 404'd (the repo had reorganised) and, separately,
// raw.githubusercontent.com turned out to rate-limit build traffic (429)
// even when the path is right. Fetched once via the GitHub Contents API
// (a different, non-rate-limited endpoint) and committed to
// src/lib/fonts/ — see the two OFL.txt files alongside them for the
// required SIL Open Font License attribution.
async function readTtf(filename: string) {
  return readFile(path.join(process.cwd(), "src/lib/fonts", filename));
}

let fontsPromise: Promise<{ heading: Buffer; plexMono: Buffer }> | null = null;

function getFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      // Fraunces itself is a variable font with an unusually large axis/instance
      // table that Satori's font parser can't shape (throws mid-render), so the
      // social-card heading uses PT Serif — a static build with real serif
      // character — instead. The live site's headings still render true Fraunces
      // via next/font; this substitution is scoped to this Satori pipeline only.
      readTtf("PT-Serif-Bold.ttf"),
      readTtf("IBMPlexMono-Medium.ttf"),
    ]).then(([heading, plexMono]) => ({ heading, plexMono }));
  }
  return fontsPromise;
}

// A restrained constellation motif — no glow, no gradient hero, just fine
// nodes and connecting lines in the real brand hues, occupying the right
// side of the card while the left stays clean for the title.
function ConstellationSvg() {
  const nodes: [number, number, string, number][] = [
    [430, 90, BRAND.accent, 6],
    [500, 220, BRAND.violet, 5],
    [380, 260, BRAND.accent, 4],
    [520, 380, BRAND.clay, 5],
    [440, 470, BRAND.violet, 4],
    [340, 400, BRAND.accent, 4],
    [300, 150, BRAND.violet, 4],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [1, 3],
    [3, 4],
    [4, 5],
    [5, 2],
    [0, 6],
    [6, 2],
  ];
  return (
    <svg
      width="540"
      height="630"
      viewBox="0 0 540 630"
      style={{ position: "absolute", right: 0, top: 0 }}
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke={BRAND.ink}
          strokeOpacity={0.14}
          strokeWidth={1.5}
        />
      ))}
      {nodes.map(([x, y, color, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={color} fillOpacity={0.9} />
      ))}
      <circle cx="80" cy="560" r="140" fill="none" stroke={BRAND.ink} strokeOpacity={0.06} strokeWidth={1.5} />
      <circle cx="500" cy="520" r="220" fill="none" stroke={BRAND.ink} strokeOpacity={0.05} strokeWidth={1.5} />
    </svg>
  );
}

// Satori's `flexWrap: wrap` doesn't reliably re-break rows of flex-item
// divs the way real CSS does once the row is mixed with sized siblings —
// so line breaks are computed by hand here (a rough average-character-width
// estimate for 60px bold PT Serif) rather than left to the renderer.
function wrapLines(words: string[], maxWidth: number, avgCharWidth: number) {
  const lines: string[][] = [];
  let current: string[] = [];
  let currentWidth = 0;
  for (const word of words) {
    const wordWidth = word.length * avgCharWidth;
    const spaceWidth = current.length > 0 ? avgCharWidth * 0.6 : 0;
    if (current.length > 0 && currentWidth + spaceWidth + wordWidth > maxWidth) {
      lines.push(current);
      current = [word];
      currentWidth = wordWidth;
    } else {
      current.push(word);
      currentWidth += spaceWidth + wordWidth;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

// The words inside `highlight` render in accent blue, the same color as the
// eyebrow, giving each card one real focal point instead of a wall of flat
// ink text.
// Trailing punctuation stripped before comparing, not just an exact
// string match — found live, 2 Sep 2026: a `highlight` phrase landing on
// title's last word (before a full stop) or a word followed by a comma
// silently failed to match ("time" vs title's own "time.", "studies" vs
// "studies,") and rendered the whole highlight in plain ink with no
// error, on 3 separate real pages before this fix (home, book,
// portfolio). Comparing only the stripped form means a caller no longer
// has to remember to duplicate title's own punctuation inside its own
// `highlight` string for this exact, easy-to-miss case — the original,
// punctuated word is still what actually renders.
const stripTrailingPunctuation = (w: string) => w.replace(/[.,!?;:]+$/, "");

function TitleText({ title, highlight }: { title: string; highlight?: string }) {
  const words = title.split(" ");
  let hlStart = -1;
  let hlEnd = -1;
  if (highlight) {
    const hlWords = highlight.split(" ");
    for (let i = 0; i <= words.length - hlWords.length; i++) {
      if (hlWords.every((w, j) => stripTrailingPunctuation(words[i + j]) === stripTrailingPunctuation(w))) {
        hlStart = i;
        hlEnd = i + hlWords.length - 1;
        break;
      }
    }
  }
  const lines = wrapLines(words, 600, 33);
  let idx = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex" }}>
          {line.map((word) => {
            const i = idx++;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  marginRight: 18,
                  color: hlStart !== -1 && i >= hlStart && i <= hlEnd ? BRAND.accent : BRAND.ink,
                }}
              >
                {word}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export async function ogImageResponse({
  eyebrow,
  title,
  highlight,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
}) {
  const { heading, plexMono } = await getFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND.paper,
          position: "relative",
          padding: "76px",
        }}
      >
        <ConstellationSvg />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "640px",
            height: "100%",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "IBM Plex Mono",
                fontSize: 22,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: BRAND.accent,
                marginBottom: 28,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "OgHeading",
                fontSize: 60,
                lineHeight: 1.08,
                color: BRAND.ink,
                letterSpacing: -1,
              }}
            >
              <TitleText title={title} highlight={highlight} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "IBM Plex Mono",
              fontSize: 22,
              color: BRAND.inkSoft,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: BRAND.accent,
                marginRight: 12,
                display: "flex",
              }}
            />
            hamishai.org
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "OgHeading", data: heading, style: "normal", weight: 700 },
        { name: "IBM Plex Mono", data: plexMono, style: "normal", weight: 500 },
      ],
    },
  );
}
