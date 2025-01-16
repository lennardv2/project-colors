import { ProjectSettings, WorkspaceReference } from "../extension";

export function getListWebview(groups: { name: string; workspaces: (WorkspaceReference & { settings: ProjectSettings })[] }[]): string {
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
          display: flex;
          justify-content: space-between;
          width: 100%;
        }

        ul {
          list-style: none;
          padding: 0;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        li {
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          padding: 8px;
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
        }

        li:hover {
          background-color: var(--vscode-input-hoverBackground);
        }

        .workspace-name {
          cursor: pointer;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .workspace-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          margin-bottom: 8px;
        }

        button {
          margin-top: 16px;
          padding: 8px 16px;
          font-size: 1rem;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }

        .delete-button {
          background-color: var(--vscode-errorForeground);
          color: var(--vscode-editor-background);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          padding: 4px 8px;
          margin-top: 8px;
        }

        .delete-button:hover {
          background-color: var(--vscode-errorForeground);
          opacity: 0.8;
        }

        .add-button {
          background-color: var(--vscode-button-background);
          color: var (--vscode-button-foreground);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .add-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }

        .folder {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .folder ul {
          width: 100%;
          padding-left: 16px;
        }

        .folder-name {
          cursor: pointer;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>
        Workspaces
        <button class="add-button" onclick="createNewGroup()">+</button>
      </h1>
      ${groups.map(group => `
        <div class="folder">
          <div class="folder-name">${group.name}</div>
          <ul>
            ${group.workspaces.map(workspace => `
              <li draggable="true" ondragstart="onDragStart(event, '${workspace.directory}')" ondrop="onDrop(event, '${workspace.directory}')" ondragover="onDragOver(event)">
                <div class="workspace-color" style="background-color: ${workspace.settings.mainColor};"></div>
                <span class="workspace-name" onclick="openWorkspace('${workspace.directory}')">
                  ${workspace.settings.projectName}<br>
                  ${workspace.directory}
                </span>
                <button class="delete-button" onclick="removeWorkspaceFromGroup('${group.name}', '${workspace.directory}')">Remove</button>
              </li>
            `).join('')}
          </ul>
          <button class="delete-button" onclick="deleteGroup('${group.name}')">Delete Group</button>
          <button class="add-button" onclick="addWorkspaceToGroup('${group.name}')">Add Workspace</button>
        </div>
      `).join('')}
      <script>
        const vscode = acquireVsCodeApi();

        function openWorkspace(directory) {
          vscode.postMessage({ command: 'openWorkspace', directory });
        }

        function createNewGroup() {
          vscode.postMessage({ command: 'showInputBox', placeholder: 'Enter group name' });
        }

        function deleteGroup(groupName) {
          vscode.postMessage({ command: 'deleteGroup', groupName });
        }

        function removeWorkspaceFromGroup(groupName, directory) {
          vscode.postMessage({ command: 'removeWorkspaceFromGroup', groupName, directory });
        }

        function addWorkspaceToGroup(groupName) {
          vscode.postMessage({ command: 'showOpenDialog', groupName });
        }

        function onDragStart(event, directory) {
          event.dataTransfer.setData('text/plain', directory);
        }

        function onDrop(event, targetDirectory) {
          event.preventDefault();
          const draggedDirectory = event.dataTransfer.getData('text/plain');
          vscode.postMessage({ command: 'moveWorkspace', draggedDirectory, targetDirectory });
        }

        function onDragOver(event) {
          event.preventDefault();
        }

        window.addEventListener('message', event => {
          const message = event.data;
          switch (message.command) {
            case 'createGroup':
              const groupName = message.groupName;
              if (groupName) {
                vscode.postMessage({ command: 'createGroup', groupName });
              }
              break;
          }
        });
      </script>
    </body>
    </html>
  `;
}
