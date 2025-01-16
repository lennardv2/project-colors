import { ProjectSettings } from "../extension";

export function getListWebview(workspaces: ProjectSettings[]): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workspaces</title>
      <style>
        body {
          font-family: var(--vscode-font-family, Arial, sans-serif);
          color: var(--vscode-editor-foreground);
          background-color: var(--vscode-editor-background);
          margin: 0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: var(--vscode-font-size, 14px);
        }

        h1 {
          font-size: 1.2rem;
          color: var(--vscode-editorWidget-foreground);
        }

        ul {
          list-style: none;
          padding: 0;
          width: 100%;
          max-width: 500px;
        }

        li {
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          padding: 8px;
          margin: 8px 0;
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          cursor: pointer;
        }

        li:hover {
          background-color: var(--vscode-input-hoverBackground);
        }
      </style>
    </head>
    <body>
      <h1>Workspaces</h1>
      <ul>
        ${workspaces.map(workspace => `
          <li onclick="openWorkspace('${workspace.projectName}')">
            ${workspace.projectName}
          </li>
        `).join('')}
      </ul>
      <script>
        const vscode = acquireVsCodeApi();

        function openWorkspace(projectName) {
          vscode.postMessage({ command: 'openWorkspace', projectName });
        }
      </script>
    </body>
    </html>
  `;
}
