import { ProjectSettings } from "../extension";

export function getWorkspaceWebview(args: ProjectSettings): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workspace Settings</title>
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

        input[type="text"]:focus,
        input[type="color"]:focus {
            border-color: var(--vscode-focusBorder);
            outline: none;
        }

        input[type="checkbox"]:focus {
            outline: 2px solid var(--vscode-focusBorder); /* Add focus style for accessibility */
        }

        h1 {
          font-size: 1.2rem;
          color: var(--vscode-editorWidget-foreground);
        }

        label {
          font-size: 0.9rem;
          color: var(--vscode-input-foreground);
          display: block;
          cursor: pointer;
        }

        input[type="text"],
        input[type="color"] {
          margin-top: 8px;
          padding: 8px;
          font-size: 0.9rem;
          width: 100%;
          max-width: 400px;
          color: var(--vscode-input-foreground);
          background-color: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
        }

        input[type="checkbox"] {
            /* Remove default styling */
            appearance: none;
            -webkit-appearance: none; /* For older WebKit browsers */
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: white;
            cursor: pointer;
            outline: none;
            transition: background-color 0.2s, border-color 0.2s;
        }

        input[type="checkbox"]:checked {
            background-color: var(--vscode-input-border);
            border-color: var(--vscode-input-border);
            background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white"%3E%3Cpath d="M6.173 10.146L3.473 7.273 2.313 8.453l3.86 3.908L13.686 5.732l-1.177-1.153z"/%3E%3C/svg%3E');
            background-size: 12px 12px;
            background-position: center;
            background-repeat: no-repeat;
        }

        input[type="color"] {
          height: 40px;
          cursor: pointer;
        }

        input[type="checkbox"] {
          margin-right: 8px;
          cursor: pointer;
        }

        .toggle-container {
          display: flex;
          align-items: center;
        }

        button {
          margin-top: 24px;
          padding: 8px 16px;
          font-size: 1rem;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .group {
            margin-top: 16px;
        }

        .group-compact {
            margin-top: 8px;
        }

        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }

        p {
          font-size: 0.9rem;
          color: var(--vscode-editorWidget-foreground);
          margin-top: 8px;
        }

        .container {
          width: 100%;
          max-width: 500px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Workspace Colors</h1>
    
        <div class="group">
            <label for="projectName">Workspace Name:</label>
            <input type="text" id="projectName" value="${args.projectName}" placeholder="Enter project name">

            <div class="group-compact">
                <div class="toggle-container">
                    <input type="checkbox" id="setWindowTitle" ${args.setWindowTitle ? 'checked' : ''}>
                    <label for="setWindowTitle">Set Window Title</label>
                </div>
            </div>
        </div>

        <div class="group">
            <label for="colorPicker">Main Color:</label>
            <input type="color" id="colorPicker" value="${args.mainColor}">
        </div>

        <div class="group">
            <label for="colorPicker">Settings:</label>

            <div class="group-compact">
                <div class="toggle-container">
                    <input type="checkbox" id="isTitleBarColored" ${args.isTitleBarColored ? 'checked' : ''}>
                    <label for="isTitleBarColored">Colorize Title Bar</label>
                </div>
            </div>
            
            <div class="group-compact">
                <div class="toggle-container">
                    <input type="checkbox" id="isActivityBarColored" ${args.isActivityBarColored ? 'checked' : ''}>
                    <label for="isActivityBarColored">Colorize Activity Bar</label>
                </div>
            </div>

            <div class="group-compact">
                <div class="toggle-container">
                    <input type="checkbox" id="isProjectNameColored" ${args.isProjectNameColored ? 'checked' : ''}>
                    <label for="isProjectNameColored">Colorize Workspace Name</label>
                </div>
            </div>

            <div class="group-compact">
                <div class="toggle-container">
                    <input type="checkbox" id="isStatusBarColored" ${args.isStatusBarColored ? 'checked' : ''}>
                    <label for="isStatusBarColored">Colorize Status Bar</label>
                </div>
            </div>

            <div class="group-compact">
                <div class="toggle-container">
                    <input type="checkbox" id="isActiveItemsColored" ${args.isActiveItemsColored ? 'checked' : ''}>
                    <label for="isActiveItemsColored">Colorize Active Items</label>
                </div>
            </div>
        </div>

      </div>
      <script>
        const vscode = acquireVsCodeApi();
        const projectNameInput = document.getElementById('projectName');
        const colorPicker = document.getElementById('colorPicker');
        const colorValue = document.getElementById('colorValue');
        const isActivityBarColored = document.getElementById('isActivityBarColored');
        const isTitleBarColored = document.getElementById('isTitleBarColored');
        const isProjectNameColored = document.getElementById('isProjectNameColored');
        const isStatusBarColored = document.getElementById('isStatusBarColored');
        const isActiveItemsColored = document.getElementById('isActiveItemsColored');
        const setWindowTitle = document.getElementById('setWindowTitle');

        let props = {
            projectName: projectNameInput.value,
            mainColor: colorPicker.value,
            isActivityBarColored: isActivityBarColored.checked,
            isTitleBarColored: isTitleBarColored.checked,
            isProjectNameColored: isProjectNameColored.checked,
            isStatusBarColored: isStatusBarColored.checked,
            isActiveItemsColored: isActiveItemsColored.checked,
            setWindowTitle: setWindowTitle.checked
        };

        projectNameInput.addEventListener('input', () => {
          props.projectName = projectNameInput.value;
          postMessageDebouncedLong({ command: 'setProps', props });
        });

        colorPicker.addEventListener('input', () => {
          const color = colorPicker.value;
          props.mainColor = color;
          postMessageDebouncedLong({ command: 'setProps', props });
        });

        isActivityBarColored.addEventListener('change', () => {
            props.isActivityBarColored = isActivityBarColored.checked;
            postMessageDebounced({ command: 'setProps', props });
        });

        isTitleBarColored.addEventListener('change', () => {
            props.isTitleBarColored = isTitleBarColored.checked;
            postMessageDebounced({ command: 'setProps', props });
        });

        isProjectNameColored.addEventListener('change', () => {
            props.isProjectNameColored = isProjectNameColored.checked;
            postMessageDebounced({ command: 'setProps', props });
        });

        isStatusBarColored.addEventListener('change', () => {
            props.isStatusBarColored = isStatusBarColored.checked;
            postMessageDebounced({ command: 'setProps', props });
        });

        isActiveItemsColored.addEventListener('change', () => {
            props.isActiveItemsColored = isActiveItemsColored.checked;
            postMessageDebounced({ command: 'setProps', props });
        });

        setWindowTitle.addEventListener('change', () => {
            props.setWindowTitle = setWindowTitle.checked;
            postMessageDebounced({ command: 'setProps', props });
        });

        function debounce(func, delay) {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => func(...args), delay);
            };
        }

        const postMessageDebounced = debounce((args) => {
            vscode.postMessage(args);
        }, 150);
        
        const postMessageDebouncedLong = debounce((args) => {
            vscode.postMessage(args);
        }, 500);

      </script>
    </body>
    </html>
  `;
}
