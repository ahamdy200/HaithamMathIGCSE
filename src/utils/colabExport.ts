import { NotebookCell } from '../types';

export function buildIpynbJson(cells: NotebookCell[], title: string = 'Gemini_API_Colab_Quickstart') {
  const ipynbCells = cells.map((cell) => {
    // split content into lines preserving newlines
    const sourceLines = cell.content.split('\n').map((line, idx, arr) => (idx === arr.length - 1 ? line : line + '\n'));

    if (cell.type === 'markdown') {
      return {
        cell_type: 'markdown',
        metadata: {
          id: cell.id,
        },
        source: sourceLines,
      };
    } else {
      const outputList: any[] = [];
      if (cell.output) {
        const outLines = cell.output.split('\n').map((l, i, a) => (i === a.length - 1 ? l : l + '\n'));
        outputList.push({
          name: 'stdout',
          output_type: 'stream',
          text: outLines,
        });
      }

      return {
        cell_type: 'code',
        execution_count: cell.executionCount || null,
        metadata: {
          id: cell.id,
          colab: {
            base_uri: 'https://localhost:8080/',
          },
        },
        outputs: outputList,
        source: sourceLines,
      };
    }
  });

  return {
    cells: ipynbCells,
    metadata: {
      colab: {
        name: `${title}.ipynb`,
        provenance: [],
        toc_visible: true,
      },
      kernelspec: {
        display_name: 'Python 3',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.10.12',
      },
      accelerator: 'GPU',
    },
    nbformat: 4,
    nbformat_minor: 0,
  };
}

export function downloadIpynb(cells: NotebookCell[], filename: string = 'Gemini_API_Colab_Quickstart.ipynb') {
  const data = buildIpynbJson(cells, filename.replace(/\.ipynb$/i, ''));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ipynb') ? filename : `${filename}.ipynb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generatePythonScript(cells: NotebookCell[]): string {
  let script = `#!/usr/bin/env python3
# ==============================================================================
# Google Colab Notebook: Interacting with the Gemini API
# SDK: google-genai (v2+)
# Model: gemini-3.8-flash
# ==============================================================================

`;

  cells.forEach((cell, idx) => {
    if (cell.type === 'markdown') {
      const commented = cell.content
        .split('\n')
        .map((line) => `# ${line}`)
        .join('\n');
      script += `\n# --- [Cell ${idx + 1}: Markdown] ---\n${commented}\n`;
    } else {
      script += `\n# --- [Cell ${idx + 1}: Code] ---\n${cell.content}\n`;
    }
  });

  return script;
}
