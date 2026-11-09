const fs = require('fs');
const path = require('path');

const ipynbPath = path.resolve('repos', 'Hand-Written-Equation-Solver', 'Notebook.ipynb');
const nb = JSON.parse(fs.readFileSync(ipynbPath, 'utf8'));

const cells = nb.cells.map((c, idx) => {
  const content = Array.isArray(c.source) ? c.source.join('') : (c.source || '');
  let output = undefined;
  if (c.outputs && c.outputs.length > 0) {
    const texts = c.outputs.map(o => {
      if (o.text) return Array.isArray(o.text) ? o.text.join('') : o.text;
      if (o.data && o.data['text/plain']) return Array.isArray(o.data['text/plain']) ? o.data['text/plain'].join('') : o.data['text/plain'];
      return '';
    }).filter(Boolean);
    if (texts.length > 0) output = texts.join('\n');
  }
  return {
    id: `hw-eq-cell-${idx + 1}`,
    type: c.cell_type === 'markdown' ? 'markdown' : 'code',
    content,
    output
  };
});

const tsCode = `import { NotebookCell } from '../types';

export const HANDWRITTEN_EQUATION_SOLVER_CELLS: NotebookCell[] = ${JSON.stringify(cells, null, 2)};
`;

fs.writeFileSync(path.resolve('src', 'data', 'handwrittenSolverNotebook.ts'), tsCode, 'utf8');
console.log('Successfully written', cells.length, 'cells to src/data/handwrittenSolverNotebook.ts');
