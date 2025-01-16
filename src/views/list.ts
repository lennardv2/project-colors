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

        * {
          box-sizing: border-box;
        }

        h1 {
          font-size: 1.5rem;
          color: var(--vscode-editorWidget-foreground);
          width: 100%;
          margin-bottom: 16px;
        }

        h2 {
          font-size: 1.2rem;
          color: var(--vscode-editorWidget-foreground);
          width: 100%;
          margin-bottom: 16px;
        }

        ul {
          list-style: none;
          padding: 0;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }

        button {
          padding: 8px 16px;
          font-size: 1rem;
          color: var(--vscode-icon-foreground);
          background-color: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        button:hover {
          background-color: var(--vscode-toolbar-hoverBackground);
        }

        .folder {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          margin-bottom: 16px;
        }

        .folder ul {
          width: 100%;
          padding-left: 0;
        }

        .folder-name {
          cursor: pointer;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          font-weight: bold;
          font-size: 1.2rem;
          margin-bottom: 8px;
        }

        .icon {
          margin-right: 8px;
        }

        button svg {
          width: 24px;
          height: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }

        .content {
          width: 100%;
        }

        .folder-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .folder-header button {
          opacity: 0;
          transition: opacity 0.3s;
        }

        .folder-header:hover button {
          opacity: 1;
        }

        li.workspace-item {
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        li.workspace-item .workspace-color {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px;
          cursor: grab;
        }

        .workspace-name {
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 1.2rem;
          opacity: .9;
        }

        .workspace-directory {
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          font-weight: bold;
          margin-bottom: 8px;
          font-size: .8rem;
          opacity: .5;
        }

        .workspace-buttons {
          display: flex;
          width: 100%;  
        }
        li.workspace-item button {
            padding: 9px 10px;
        }

        li.workspace-item button svg {
            width: 18px;
            height: 18px;
        }

        .ml-auto {
          margin-left: auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>
          Workspaces
        </h1>
        <button class="add-button" onclick="createNewGroup()" title="Create New Group">
          <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> 
        </button>
      </div>
      <div class="content">
      ${groups.map(group => `
        <div class="folder">
          <div class="folder-header">
            <div class="folder-name">${group.name}</div>
            <button class="delete-button" onclick="deleteGroup('${group.name}')" title="Delete Group">
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg> 
            </button>
            <button class="rename-button" onclick="renameGroup('${group.name}')" title="Rename Group">
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="add-button" onclick="addWorkspaceToGroup('${group.name}')" title="Add Workspace to Group">
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> 
            </button>
            <button class="add-button" onclick="addRemoteWorkspaceToGroup('${group.name}')" title="Add Remote Workspace to Group">
              <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <!-- ...icon data... -->
              </svg> 
            </button>
          </div>
          <ul>
            ${group.workspaces.map(workspace => `
              <li class="workspace-item" draggable="true" ondragstart="onDragStart(event, '${workspace.directory}')" ondrop="onDrop(event, '${workspace.directory}')" ondragover="onDragOver(event)">
                <div class="workspace-color" style="background-color: ${workspace.settings.mainColor}; color: ${workspace.settings.mainColorContrast}">
                  <span class="workspace-name">
                    ${workspace.settings.projectName}
                  </span>
                  <span class="workspace-directory">
                    ${workspace.directory}
                  </span>
                </div>
                <div class="workspace-buttons">
                  <button class="edit-button" onclick="editWorkspace('${group.name}', '${workspace.directory}')" title="Edit Workspace">
                    <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button class="delete-button" onclick="removeWorkspaceFromGroup('${group.name}', '${workspace.directory}')" title="Remove Workspace from Group">
                    <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg> 
                  </button>
                  <button class="ml-auto external-button" onclick="openWorkspaceInNewWindow('${workspace.directory}')" title="Open Workspace in New Window">
                    <svg class="w-6 h-6" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m13 3 3.293 3.293-7 7 1.414 1.414 7-7L21 11V3z"/><path d="M19 19H5V5h7l-2-2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5l-2-2v7z"/></svg> 
                  </button>
                  <button class="open-button" onclick="openWorkspace('${workspace.directory}')" title="Open Workspace">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M3 10C3 9.58579 3.33579 9.25 3.75 9.25L14.3879 9.25L10.2302 5.29062C9.93159 5.00353 9.92228 4.52875 10.2094 4.23017C10.4965 3.93159 10.9713 3.92228 11.2698 4.20937L16.7698 9.45937C16.9169 9.60078 17 9.79599 17 10C17 10.204 16.9169 10.3992 16.7698 10.5406L11.2698 15.7906C10.9713 16.0777 10.4965 16.0684 10.2094 15.7698C9.92228 15.4713 9.93159 14.9965 10.2302 14.7094L14.3879 10.75L3.75 10.75C3.33579 10.75 3 10.4142 3 10Z"/> </svg> 
                  </button>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
      </div>
      <script>
        const vscode = acquireVsCodeApi();

        function openWorkspace(directory) {
          vscode.postMessage({ command: 'openWorkspace', directory });
        }
        
        function openWorkspaceInNewWindow(directory) {
          vscode.postMessage({ command: 'openWorkspaceInNewWindow', directory });
        }

        function createNewGroup() {
          vscode.postMessage({ command: 'createNewGroup', placeholder: 'Enter group name' });
        }

        function deleteGroup(groupName) {
          vscode.postMessage({ command: 'deleteGroup', groupName });
        }

        function editWorkspace(groupName, directory) {
          vscode.postMessage({ command: 'editWorkspace', groupName, directory });
        }

        function removeWorkspaceFromGroup(groupName, directory) {
          vscode.postMessage({ command: 'removeWorkspaceFromGroup', groupName, directory });
        }

        function addWorkspaceToGroup(groupName) {
          vscode.postMessage({ command: 'createNewWorkspace', groupName });
        }

        function renameGroup(groupName) {
          vscode.postMessage({ command: 'renameGroup', groupName });
        }

        function addRemoteWorkspaceToGroup(groupName) {
          vscode.postMessage({ command: 'createNewRemoteWorkspace', groupName });
        }

        function onDragStart(event, directory) {
          event.dataTransfer.setData('text/plain', directory);
        }

        function onDrop(event, targetDirectory) {
          debugger
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
