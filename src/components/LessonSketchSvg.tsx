import React from 'react';

export type MathDiagramTheme =
  | 'trigonometry'
  | 'quadratics'
  | 'circle'
  | 'fractions'
  | 'linear'
  | 'vectors'
  | 'calculus'
  | 'stats';

export function detectMathDiagramTheme(topicText = '', courseId = ''): MathDiagramTheme {
  const topic = topicText.toLowerCase();

  // 1. Match specific lesson / video / folder keywords first so lessons always override the parent course motif
  if (/vector|translation|column vector|magnitude/.test(topic)) {
    return 'vectors';
  }
  if (/differentiat|integrat|calculus|tangent|gradient function|rate of change|cubic/.test(topic)) {
    return 'calculus';
  }
  if (/trig|sine|cosine|tan\b|pythagoras|triangle|bearing|angle|3d/.test(topic)) {
    return 'trigonometry';
  }
  if (/circle|theorem|mensuration|sector|arc|radius|circumference|transform/.test(topic)) {
    return 'circle';
  }
  if (/quadratic|parabola|function|completing the square|kinematics/.test(topic)) {
    return 'quadratics';
  }
  if (/histogram|probabilit|cumulative|frequency|tree|stat|mean|median|data/.test(topic)) {
    return 'stats';
  }
  if (/linear|simultaneous|gradient|straight line|inequalit|graph|coordinate/.test(topic)) {
    return 'linear';
  }
  if (/bidmas|fraction|ratio|proportion|percent|surd|indic|number|bracket/.test(topic)) {
    return 'fractions';
  }

  // 2. Assign each of the 8 courses its own unique default diagram motif
  const cid = courseId.toLowerCase();
  if (cid === 'year-9') return 'fractions';
  if (cid === 'ol-edexcel-modular-g1') return 'quadratics';
  if (cid === 'ol-edexcel-linear') return 'trigonometry';
  if (cid.includes('cambridge')) return 'circle';
  if (cid === 'year-8') return 'linear';
  if (cid === 'ol-edexcel-modular-g2') return 'vectors';
  if (cid === 'ol-edexcel-modular-g3') return 'calculus';
  if (cid === 'ol-edexcel-modular-rcis') return 'stats';
  if (/algebra/.test(topic)) return 'linear';

  return 'trigonometry';
}

interface LessonSketchSvgProps {
  topicText?: string;
  courseId?: string;
  variant?: 'hero' | 'card' | 'watermark';
  watermarkTone?: 'light' | 'dark';
  labelOverride?: string;
}

const HINT_BY_THEME: Record<MathDiagramTheme, string> = {
  trigonometry: 'a² + b² = c²  ·  sin θ = O/H',
  quadratics: 'y = ax² + bx + c  ·  vertex form',
  circle: 'Area = πr²  ·  C = 2πr',
  fractions: 'BODMAS · Common Denominator',
  linear: 'y = mx + c  ·  m = (y₂ − y₁)/(x₂ − x₁)',
  vectors: 'AB = b − a  ·  |v| = √(x² + y²)',
  calculus: 'dy/dx = lim Δy/Δx  ·  tangent slope',
  stats: 'Normal Curve  ·  P(A ∩ B)',
};

export const LessonSketchSvg: React.FC<LessonSketchSvgProps> = ({
  topicText = '',
  courseId = '',
  variant = 'hero',
  watermarkTone = 'light',
  labelOverride,
}) => {
  const theme = detectMathDiagramTheme(topicText, courseId);
  const isHero = variant === 'hero' || variant === 'watermark';
  const strokeMain =
    variant === 'watermark'
      ? watermarkTone === 'dark'
        ? '#dce6f0'
        : '#163252'
      : variant === 'hero'
      ? '#e2ecf7'
      : '#1b3554';
  const strokeMuted =
    variant === 'watermark'
      ? watermarkTone === 'dark'
        ? 'rgba(220, 230, 240, 0.55)'
        : 'rgba(22, 50, 82, 0.45)'
      : variant === 'hero'
      ? 'rgba(226, 236, 247, 0.45)'
      : 'rgba(27, 53, 84, 0.35)';
  const accentColor =
    variant === 'watermark'
      ? watermarkTone === 'dark'
        ? '#9ec2ea'
        : '#2b517c'
      : variant === 'hero'
      ? '#9ec2ea'
      : '#264b75';

  const renderShape = () => {
    switch (theme) {
      case 'fractions':
        return (
          <g>
            {/* Handwritten 1/2 + 1/4 = 3/4 */}
            <g transform={isHero ? 'translate(55, 58)' : 'translate(32, 16)'}>
              <text
                x="14"
                y="24"
                fill={strokeMain}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                1
              </text>
              <line x1="6" y1="30" x2="28" y2="30" stroke={strokeMain} strokeWidth="2" strokeLinecap="round" />
              <text
                x="14"
                y="50"
                fill={strokeMain}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                2
              </text>

              <text
                x="42"
                y="37"
                fill={accentColor}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                +
              </text>

              <text
                x="70"
                y="24"
                fill={strokeMain}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                1
              </text>
              <line x1="62" y1="30" x2="84" y2="30" stroke={strokeMain} strokeWidth="2" strokeLinecap="round" />
              <text
                x="70"
                y="50"
                fill={strokeMain}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                4
              </text>

              <text
                x="98"
                y="37"
                fill={accentColor}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                =
              </text>

              <text
                x="126"
                y="24"
                fill={strokeMain}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                3
              </text>
              <line x1="118" y1="30" x2="140" y2="30" stroke={strokeMain} strokeWidth="2" strokeLinecap="round" />
              <text
                x="126"
                y="50"
                fill={strokeMain}
                fontSize={isHero ? '24' : '16'}
                fontFamily="Caveat, cursive"
                fontWeight="700"
              >
                4
              </text>
            </g>
            {isHero && (
              <text
                x="62"
                y="148"
                fill={accentColor}
                fontSize="16"
                fontFamily="Caveat, cursive"
              >
                2/4 + 1/4 = 3/4  ✓
              </text>
            )}
          </g>
        );

      case 'quadratics':
        return (
          <g transform={isHero ? 'translate(35, 22)' : 'translate(18, 4)'}>
            {/* Coordinate Axes */}
            <line x1="25" y1="78" x2="165" y2="78" stroke={strokeMuted} strokeWidth="1.4" />
            <line x1="88" y1="12" x2="88" y2="96" stroke={strokeMuted} strokeWidth="1.4" />
            {/* Smooth Parabola */}
            <path
              d="M 44 20 Q 88 128 132 20"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="88" cy="74" r="3" fill={accentColor} />
            <text
              x="128"
              y="26"
              fill={strokeMain}
              fontSize={isHero ? '17' : '13'}
              fontFamily="Caveat, cursive"
              fontWeight="600"
            >
              y = x²
            </text>
            {isHero && (
              <text x="115" y="114" fill={accentColor} fontSize="15" fontFamily="Caveat, cursive">
                vertex (0, 0)
              </text>
            )}
          </g>
        );

      case 'circle':
        return (
          <g transform={isHero ? 'translate(50, 26)' : 'translate(35, 6)'}>
            <circle
              cx="62"
              cy="44"
              r={isHero ? '36' : '28'}
              fill="none"
              stroke={strokeMain}
              strokeWidth="2"
            />
            <circle cx="62" cy="44" r="2.6" fill={strokeMain} />
            <line
              x1="62"
              y1="44"
              x2={isHero ? '98' : '90'}
              y2="44"
              stroke={strokeMain}
              strokeWidth="1.6"
              strokeDasharray="3 2"
            />
            <text
              x={isHero ? '76' : '72'}
              y="39"
              fill={accentColor}
              fontSize={isHero ? '16' : '12'}
              fontFamily="Caveat, cursive"
              fontWeight="600"
            >
              r
            </text>
            <text
              x={isHero ? '110' : '100'}
              y="52"
              fill={strokeMain}
              fontSize={isHero ? '22' : '16'}
              fontFamily="Caveat, cursive"
              fontWeight="700"
            >
              πr²
            </text>
            {isHero && (
              <text x="20" y="108" fill={accentColor} fontSize="15" fontFamily="Caveat, cursive">
                C = 2πr  ·  θ = 90°
              </text>
            )}
          </g>
        );

      case 'linear':
        return (
          <g transform={isHero ? 'translate(35, 20)' : 'translate(16, 4)'}>
            <line x1="25" y1="80" x2="165" y2="80" stroke={strokeMuted} strokeWidth="1.4" />
            <line x1="55" y1="12" x2="55" y2="92" stroke={strokeMuted} strokeWidth="1.4" />
            <line x1="35" y1="74" x2="148" y2="24" stroke={strokeMain} strokeWidth="2.1" strokeLinecap="round" />
            <line x1="35" y1="30" x2="148" y2="72" stroke={accentColor} strokeWidth="1.6" strokeDasharray="4 3" />
            <circle cx="94" cy="50" r="4" fill="none" stroke={strokeMain} strokeWidth="1.8" />
            <text x="108" y="34" fill={strokeMain} fontSize={isHero ? '17' : '12'} fontFamily="Caveat, cursive">
              y = mx + c
            </text>
          </g>
        );

      case 'vectors':
        return (
          <g transform={isHero ? 'translate(42, 26)' : 'translate(24, 8)'}>
            <line x1="20" y1="74" x2="108" y2="74" stroke={strokeMain} strokeWidth="2.1" strokeLinecap="round" />
            <polyline points="99,69 108,74 99,79" fill="none" stroke={strokeMain} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="108" y1="74" x2="148" y2="26" stroke={strokeMain} strokeWidth="2.1" strokeLinecap="round" />
            <polyline points="139,28 148,26 146,35" fill="none" stroke={strokeMain} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="20" y1="74" x2="148" y2="26" stroke={accentColor} strokeWidth="1.8" strokeDasharray="4 3" />
            <text x="60" y="90" fill={strokeMain} fontSize={isHero ? '16' : '12'} fontFamily="Caveat, cursive">
              a
            </text>
            <text x="135" y="56" fill={strokeMain} fontSize={isHero ? '16' : '12'} fontFamily="Caveat, cursive">
              b
            </text>
            <text x="66" y="42" fill={accentColor} fontSize={isHero ? '16' : '12'} fontFamily="Caveat, cursive">
              a + b
            </text>
          </g>
        );

      case 'calculus':
        return (
          <g transform={isHero ? 'translate(34, 18)' : 'translate(18, 4)'}>
            <line x1="20" y1="80" x2="162" y2="80" stroke={strokeMuted} strokeWidth="1.3" />
            <line x1="42" y1="14" x2="42" y2="90" stroke={strokeMuted} strokeWidth="1.3" />
            <path
              d="M 32 76 C 64 70, 74 22, 104 44 C 126 60, 140 20, 154 16"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <line x1="68" y1="22" x2="128" y2="56" stroke={accentColor} strokeWidth="1.6" strokeDasharray="3 3" />
            <circle cx="96" cy="38" r="3.2" fill={accentColor} />
            <text x="116" y="34" fill={strokeMain} fontSize={isHero ? '16' : '12'} fontFamily="Caveat, cursive">
              dy/dx
            </text>
          </g>
        );

      case 'stats':
        return (
          <g transform={isHero ? 'translate(38, 22)' : 'translate(22, 6)'}>
            <line x1="20" y1="76" x2="155" y2="76" stroke={strokeMuted} strokeWidth="1.4" />
            <rect x="34" y="48" width="18" height="28" fill="none" stroke={strokeMain} strokeWidth="1.7" />
            <rect x="58" y="26" width="18" height="50" fill="none" stroke={strokeMain} strokeWidth="1.7" />
            <rect x="82" y="36" width="18" height="40" fill="none" stroke={strokeMain} strokeWidth="1.7" />
            <rect x="106" y="56" width="18" height="20" fill="none" stroke={strokeMain} strokeWidth="1.7" />
            <path
              d="M 28 72 Q 67 16 132 70"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.6"
              strokeDasharray="3 3"
            />
            <text x="128" y="32" fill={strokeMain} fontSize={isHero ? '16' : '12'} fontFamily="Caveat, cursive">
              P(A)
            </text>
          </g>
        );

      case 'trigonometry':
      default:
        return (
          <g transform={isHero ? 'translate(36, 30)' : 'translate(26, 8)'}>
            {/* Right-Angled Triangle */}
            <polygon
              points={isHero ? '18,96 112,96 18,32' : '22,74 114,74 22,22'}
              fill="none"
              stroke={strokeMain}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Right-angle marker */}
            <polyline
              points={isHero ? '18,84 30,84 30,96' : '22,64 32,64 32,74'}
              fill="none"
              stroke={strokeMain}
              strokeWidth="1.5"
            />
            <text
              x={isHero ? '5' : '8'}
              y={isHero ? '68' : '52'}
              fill={strokeMain}
              fontSize={isHero ? '16' : '12'}
              fontFamily="Caveat, cursive"
            >
              3
            </text>
            <text
              x={isHero ? '62' : '64'}
              y={isHero ? '114' : '88'}
              fill={strokeMain}
              fontSize={isHero ? '16' : '12'}
              fontFamily="Caveat, cursive"
            >
              4
            </text>
            <text
              x={isHero ? '70' : '74'}
              y={isHero ? '58' : '42'}
              fill={accentColor}
              fontSize={isHero ? '16' : '12'}
              fontFamily="Caveat, cursive"
            >
              5
            </text>

            {/* Formula Annotation */}
            {isHero ? (
              <g transform="translate(132, 34)">
                <text x="0" y="20" fill={strokeMain} fontSize="20" fontFamily="Caveat, cursive" fontWeight="600">
                  3² + 4² = 5²
                </text>
                <text x="0" y="48" fill={accentColor} fontSize="18" fontFamily="Caveat, cursive">
                  9 + 16 = 25
                </text>
              </g>
            ) : (
              <text x="58" y="16" fill={strokeMain} fontSize="14" fontFamily="Caveat, cursive" fontWeight="600">
                a² + b² = c²
              </text>
            )}
          </g>
        );
    }
  };

  if (variant === 'watermark') {
    return (
      <div className="pointer-events-none select-none w-full h-full opacity-30 transition-all duration-500">
        <svg viewBox="0 0 320 190" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <g transform="scale(1.18) translate(-22, -14)">{renderShape()}</g>
        </svg>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="relative w-full h-24 bg-[#dce6f0] overflow-hidden border-b border-[#c5d6e8] group">
        <svg viewBox="0 0 210 92" className="w-full h-full">
          <defs>
            <pattern id={`card-grid-${theme}`} width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(22, 50, 82, 0.08)" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="210" height="92" fill={`url(#card-grid-${theme})`} />
          {renderShape()}
        </svg>
        <div className="pointer-events-none absolute inset-x-2 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-[#163252]/80 bg-white/75 backdrop-blur-xs rounded px-1.5 py-0.5 text-center truncate">
          {labelOverride || HINT_BY_THEME[theme]}
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl bg-[#214266] border border-white/15 p-4 overflow-hidden shadow-inner group">
      <svg viewBox="0 0 320 190" className="w-full h-44 sm:h-48">
        <defs>
          <pattern id={`hero-grid-${theme}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="320" height="190" fill={`url(#hero-grid-${theme})`} rx="8" />
        <text x="16" y="24" fill="rgba(226, 236, 247, 0.8)" fontSize="16" fontFamily="Caveat, cursive">
          Let&apos;s work it out...
        </text>
        {renderShape()}
        <text x="16" y="176" fill="rgba(226, 236, 247, 0.72)" fontSize="15" fontFamily="Caveat, cursive">
          See? One step at a time.
        </text>
        <line
          x1="16"
          y1="181"
          x2="164"
          y2="181"
          stroke="rgba(226, 236, 247, 0.35)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <div className="pointer-events-none absolute right-3 bottom-2.5 text-[10px] font-mono text-sky-100/80 bg-[#163252]/80 border border-white/15 px-2 py-0.5 rounded-full">
        {labelOverride || HINT_BY_THEME[theme]}
      </div>
    </div>
  );
};
