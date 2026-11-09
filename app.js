const TOPICS = [
  { icon: "123", name: "Number", sub: "Fractions, percentages, indices", points: [
    "Types of number: integers, primes, factors, multiples, HCF & LCM",
    "Fractions, decimals and percentages, including converting between them",
    "Percentage increase/decrease, reverse percentages, compound interest",
    "Indices laws, standard form, surds (Extended)",
    "Ratio, proportion, rates and upper/lower bounds",
  ]},
  { icon: "x", name: "Algebra", sub: "Equations, graphs, sequences", points: [
    "Simplifying, expanding brackets and factorising",
    "Solving linear, simultaneous and quadratic equations",
    "Rearranging formulae and changing the subject",
    "Inequalities and regions on graphs",
    "Sequences: nth term of linear and quadratic sequences",
    "Functions: composite and inverse functions (Extended)",
  ]},
  { icon: "y=", name: "Coordinate geometry", sub: "Lines and gradients", points: [
    "Gradient = rise ÷ run, and equation of a line y = mx + c",
    "Midpoint and length of a line segment",
    "Parallel lines have equal gradients",
    "Perpendicular gradients multiply to −1 (Extended)",
  ]},
  { icon: "△", name: "Geometry", sub: "Angles, shapes, circles", points: [
    "Angle facts: on a line, around a point, in triangles and polygons",
    "Angles in parallel lines: alternate, corresponding, co-interior",
    "Similarity and congruence",
    "Circle theorems (Extended)",
    "Constructions, loci and symmetry",
  ]},
  { icon: "cm²", name: "Mensuration", sub: "Area, perimeter, volume", points: [
    "Area of triangles, parallelograms, trapezia and circles",
    "Arc length and sector area",
    "Surface area and volume of prisms, cylinders, cones, spheres and pyramids",
    "Converting between units of length, area and volume",
  ]},
  { icon: "θ", name: "Trigonometry", sub: "Pythagoras & SOHCAHTOA", points: [
    "Pythagoras' theorem in 2D and 3D",
    "SOHCAHTOA for right-angled triangles",
    "Bearings and angles of elevation/depression",
    "Sine rule, cosine rule and ½ab sin C (Extended)",
  ]},
  { icon: "→", name: "Vectors & transformations", sub: "Reflect, rotate, translate", points: [
    "Reflection, rotation, translation and enlargement",
    "Describing transformations fully",
    "Column vectors, adding and scaling vectors",
    "Magnitude of a vector and vector geometry (Extended)",
  ]},
  { icon: "P", name: "Probability", sub: "Chance and outcomes", points: [
    "Probability scale from 0 to 1, P(not A) = 1 − P(A)",
    "Relative frequency and expected outcomes",
    "Sample space diagrams, Venn diagrams and tree diagrams",
    "Conditional probability (Extended)",
  ]},
  { icon: "x̄", name: "Statistics", sub: "Averages and charts", points: [
    "Mean, median, mode and range",
    "Bar charts, pie charts, pictograms and stem-and-leaf diagrams",
    "Scatter diagrams and correlation",
    "Cumulative frequency, histograms and quartiles (Extended)",
  ]},
];

const FORMULAS = [
  { title: "Area & perimeter", items: [
    ["Triangle", "A = ½ × b × h", true],
    ["Trapezium", "A = ½(a + b)h", true],
    ["Circle", "A = πr²   C = 2πr", true],
    ["Sector", "A = (θ/360) × πr²", false],
    ["Arc length", "L = (θ/360) × 2πr", false],
  ]},
  { title: "Volume & surface area", items: [
    ["Prism", "V = area of cross-section × length", true],
    ["Cylinder", "V = πr²h   CSA = 2πrh", true],
    ["Cone", "V = ⅓πr²h   CSA = πrl", false],
    ["Sphere", "V = ⁴⁄₃πr³   SA = 4πr²", false],
    ["Pyramid", "V = ⅓ × base area × h", false],
  ]},
  { title: "Trigonometry", items: [
    ["Pythagoras", "a² + b² = c²", true],
    ["SOHCAHTOA", "sin = O/H, cos = A/H, tan = O/A", true],
    ["Sine rule", "a/sin A = b/sin B = c/sin C", false],
    ["Cosine rule", "a² = b² + c² − 2bc cos A", false],
    ["Area", "A = ½ab sin C", false],
  ]},
  { title: "Algebra & graphs", items: [
    ["Quadratic formula", "x = (−b ± √(b² − 4ac)) / 2a", false],
    ["Straight line", "y = mx + c", true],
    ["Gradient", "m = (y₂ − y₁)/(x₂ − x₁)", true],
    ["Midpoint", "((x₁ + x₂)/2, (y₁ + y₂)/2)", true],
    ["Length", "√((x₂ − x₁)² + (y₂ − y₁)²)", true],
  ]},
  { title: "Number & money", items: [
    ["Percentage change", "(change ÷ original) × 100", true],
    ["Compound interest", "A = P(1 + r/100)ⁿ", true],
    ["Simple interest", "I = PRT/100", true],
    ["Speed", "speed = distance ÷ time", true],
    ["Density", "density = mass ÷ volume", true],
  ]},
  { title: "Indices", items: [
    ["Multiply", "aᵐ × aⁿ = aᵐ⁺ⁿ", true],
    ["Divide", "aᵐ ÷ aⁿ = aᵐ⁻ⁿ", true],
    ["Power", "(aᵐ)ⁿ = aᵐⁿ", true],
    ["Negative", "a⁻ⁿ = 1/aⁿ", true],
    ["Fractional", "a^(1/n) = ⁿ√a", true],
  ]},
];

/* ---------- Question generators ---------- */
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const round = (x, dp) => Math.round(x * 10 ** dp) / 10 ** dp;
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

const GENERATORS = {
  Percentages: () => {
    const type = rnd(0, 2);
    if (type === 0) {
      const p = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 75]); const n = rnd(2, 40) * 10;
      return { q: `Find ${p}% of ${n}.`, a: (p * n) / 100, hint: `Divide by 100, then multiply by ${p}.` };
    }
    if (type === 1) {
      const p = pick([10, 15, 20, 25, 30]); const n = rnd(4, 30) * 20; const up = Math.random() < .5;
      return { q: `${up ? "Increase" : "Decrease"} ${n} by ${p}%.`, a: (n * (100 + (up ? p : -p))) / 100, tol: 1e-6,
        hint: `Multiply by ${up ? 1 + p / 100 : 1 - p / 100}.` };
    }
    const P = rnd(5, 40) * 100, r = pick([2, 3, 4, 5]), n = rnd(2, 4);
    return { q: `$${P} is invested at ${r}% compound interest per year. What is it worth after ${n} years? (2 d.p.)`,
      a: round(P * (1 + r / 100) ** n, 2), tol: 0.011, hint: `Use A = P(1 + r/100)ⁿ = ${P} × ${1 + r / 100}^${n}.` };
  },
  "Linear equations": () => {
    const x = rnd(-9, 12), a = rnd(2, 9), b = rnd(-15, 15), c = a * x + b;
    const bStr = b === 0 ? "" : b > 0 ? ` + ${b}` : ` − ${-b}`;
    return { q: `Solve ${a}x${bStr} = ${c}`, a: x, hint: `Undo the ${b >= 0 ? "+" : "−"}${Math.abs(b)} first, then divide by ${a}.` };
  },
  Indices: () => {
    const base = pick(["a", "x", "y"]); const m = rnd(2, 9), n = rnd(2, 7); const type = rnd(0, 3);
    if (type === 0) return { q: `${base}^${m} × ${base}^${n} = ${base}^k. Find k.`, a: m + n, hint: "When multiplying, add the powers." };
    if (type === 1) return { q: `${base}^${m + n} ÷ ${base}^${n} = ${base}^k. Find k.`, a: m, hint: "When dividing, subtract the powers." };
    if (type === 2) return { q: `(${base}^${m})^${n} = ${base}^k. Find k.`, a: m * n, hint: "Power of a power: multiply the powers." };
    const [root, val] = pick([[2, 16], [2, 25], [2, 49], [3, 27], [3, 64], [2, 81], [3, 125]]);
    return { q: `Evaluate ${val}^(1/${root}).`, a: Math.round(val ** (1 / root)), hint: `Find the ${root === 2 ? "square" : "cube"} root.` };
  },
  Pythagoras: () => {
    const [p, q, r] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]]);
    if (Math.random() < .5) {
      return { q: `A right-angled triangle has shorter sides ${p} cm and ${q} cm. Find the hypotenuse in cm.`, a: r, hint: `c = √(${p}² + ${q}²).` };
    }
    return { q: `A right-angled triangle has hypotenuse ${r} cm and one side ${p} cm. Find the other side in cm.`, a: q, hint: `b = √(${r}² − ${p}²).` };
  },
  Trigonometry: () => {
    const ang = rnd(15, 75), h = rnd(5, 20); const fn = pick(["sin", "cos"]);
    const rad = (ang * Math.PI) / 180;
    const ans = round(h * (fn === "sin" ? Math.sin(rad) : Math.cos(rad)), 2);
    return { q: `In a right-angled triangle the hypotenuse is ${h} cm and one angle is ${ang}°. Find the side ${fn === "sin" ? "opposite" : "adjacent to"} that angle. (2 d.p.)`,
      a: ans, tol: 0.011, hint: `${fn === "sin" ? "Opposite" : "Adjacent"} = ${h} × ${fn} ${ang}°.` };
  },
  "Circles": () => {
    const r = rnd(2, 15); const type = rnd(0, 1);
    if (type === 0) return { q: `Find the area of a circle with radius ${r} cm. (1 d.p.)`, a: round(Math.PI * r * r, 1), tol: 0.051, hint: `A = π × ${r}².` };
    return { q: `Find the circumference of a circle with radius ${r} cm. (1 d.p.)`, a: round(2 * Math.PI * r, 1), tol: 0.051, hint: `C = 2 × π × ${r}.` };
  },
  "Averages": () => {
    const n = rnd(5, 7); const data = Array.from({ length: n }, () => rnd(1, 20));
    const type = pick(["mean", "median", "range"]);
    const sorted = [...data].sort((a, b) => a - b);
    let a;
    if (type === "mean") a = round(data.reduce((s, v) => s + v, 0) / n, 2);
    else if (type === "median") a = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    else a = sorted[n - 1] - sorted[0];
    const hints = { mean: "Add them all up and divide by how many there are.", median: "Put them in order and find the middle.", range: "Largest minus smallest." };
    return { q: `Find the ${type} of: ${data.join(", ")}${type === "mean" ? " (2 d.p. if needed)" : ""}`, a, tol: type === "mean" ? 0.011 : 0, hint: hints[type] };
  },
  "Probability": () => {
    const r = rnd(2, 8), b = rnd(2, 8), g = rnd(1, 6); const total = r + b + g;
    const colour = pick([["red", r], ["blue", b], ["green", g]]);
    const d = gcd(colour[1], total);
    return { q: `A bag has ${r} red, ${b} blue and ${g} green balls. One is picked at random. What is P(${colour[0]})? (fraction or decimal, 3 d.p.)`,
      a: colour[1] / total, tol: 0.0006, fraction: `${colour[1] / d}/${total / d}`, hint: `Number of ${colour[0]} ÷ total number of balls (${total}).` };
  },
};

/* ---------- Render topics & formulas ---------- */
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

document.getElementById("topic-grid").innerHTML = TOPICS.map((t) => `
  <details class="topic">
    <summary><span class="icon">${esc(t.icon)}</span><span><h3>${esc(t.name)}</h3><small>${esc(t.sub)}</small></span></summary>
    <ul>${t.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
  </details>`).join("");

document.getElementById("formula-grid").innerHTML = FORMULAS.map((f) => `
  <article class="formula-card"><h3>${esc(f.title)}</h3><dl>
    ${f.items.map(([n, e, learn]) => `<div><dt>${esc(n)} ${learn ? '<span class="tag">learn</span>' : ""}</dt><dd>${esc(e)}</dd></div>`).join("")}
  </dl></article>`).join("");

/* ---------- Practice ---------- */
const chips = document.getElementById("chips");
const els = {
  topic: document.getElementById("q-topic"), text: document.getElementById("q-text"),
  form: document.getElementById("q-form"), input: document.getElementById("q-input"),
  feedback: document.getElementById("feedback"), score: document.getElementById("score"),
};
const names = ["Mixed", ...Object.keys(GENERATORS)];
let current = "Mixed", question = null, answered = false, correct = 0, attempted = 0;

chips.innerHTML = names.map((n) => `<button class="chip" role="tab" aria-selected="${n === current}" data-topic="${esc(n)}">${esc(n)}</button>`).join("");
chips.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip"); if (!btn) return;
  current = btn.dataset.topic;
  chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-selected", c === btn));
  next();
});

function next() {
  const topic = current === "Mixed" ? pick(Object.keys(GENERATORS)) : current;
  question = GENERATORS[topic]();
  answered = false;
  els.topic.textContent = topic;
  els.text.textContent = question.q;
  els.input.value = "";
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.input.focus({ preventScroll: true });
}

function parse(str) {
  const s = str.trim().replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/^x=/i, "").replace(/(cm|\$)/g, "");
  if (/^-?\d+(\.\d+)?\/\d+(\.\d+)?$/.test(s)) { const [n, d] = s.split("/").map(Number); return d ? n / d : NaN; }
  return s === "" ? NaN : Number(s);
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!question) return;
  const val = parse(els.input.value);
  if (Number.isNaN(val)) { els.feedback.textContent = "Please enter a number."; els.feedback.className = "feedback no"; return; }
  const ok = Math.abs(val - question.a) <= (question.tol ?? 1e-9);
  if (!answered) { attempted++; if (ok) correct++; answered = true; }
  els.score.textContent = `Score: ${correct} / ${attempted}`;
  const shown = question.fraction ? `${question.fraction} (≈ ${round(question.a, 3)})` : question.a;
  els.feedback.textContent = ok ? "✓ Correct, well done!" : `✗ Not quite. The answer is ${shown}.`;
  els.feedback.className = `feedback ${ok ? "ok" : "no"}`;
});

document.getElementById("next-btn").addEventListener("click", next);
document.getElementById("hint-btn").addEventListener("click", () => {
  if (!question) return;
  els.feedback.textContent = `Hint: ${question.hint}`;
  els.feedback.className = "feedback hint";
});

document.getElementById("year").textContent = new Date().getFullYear();
question = null;
(function init() {
  const topic = pick(Object.keys(GENERATORS));
  question = GENERATORS[topic]();
  els.topic.textContent = topic;
  els.text.textContent = question.q;
})();
