import * as vscode from 'vscode';

type ProjectSettings = {
    projectName: string;
    mainColor: string;
    isActivityBarColored: boolean;
    isTitleBarColored: boolean;
    isStatusBarColored: boolean;
    isProjectNameColored: boolean;
    isActiveItemsColored: boolean;
    setWindowTitle: boolean;
}

function readConfig(): ProjectSettings {
    const config = vscode.workspace.getConfiguration('projectColors');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let fallbackProjectName = 'Untitled Project';
    if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceFolder = workspaceFolders[0];
        fallbackProjectName = workspaceFolder.name;
    }
    let projectName = config.get<string>('name') || fallbackProjectName;
    let mainColor = config.get<string>('mainColor') || '#681DD7';
    let isTitleBarColored = config.get<boolean>('isTitleBarColored') ?? false;
    let isActivityBarColored = config.get<boolean>('isActivityBarColored') ?? false;
    let isStatusBarColored = config.get<boolean>('isStatusBarColored') ?? false;
    let isProjectNameColored = config.get<boolean>('isProjectNameColored') ?? true;
    let isActiveItemsColored = config.get<boolean>('isActiveItemsColored') ?? true;
    let setWindowTitle = config.get<boolean>('setWindowTitle') ?? true;

    return {
        projectName,
        mainColor,
        isActivityBarColored,
        isTitleBarColored,
        isStatusBarColored,
        isProjectNameColored,
        isActiveItemsColored,
        setWindowTitle
    };
}

export function activate(context: vscode.ExtensionContext) {
    let args = readConfig();

    // Create a status bar item with low priority to appear farthest to the left
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        Infinity
    );
    updateStatusBarItem(statusBarItem, args);
    statusBarItem.command = 'project-colors.openSettings';
    statusBarItem.show();

    // Ensure the status bar item is available immediately on launch
    context.subscriptions.push(statusBarItem);

    // Register the command to open the settings webview
    const disposable = vscode.commands.registerCommand('project-colors.openSettings', () => {
        args = readConfig();

        const panel = vscode.window.createWebviewPanel(
            'projectSettings',
            'Project Settings',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        // Set the webview's HTML content
        panel.webview.html = getWebviewContent(args);

        panel.webview.onDidReceiveMessage(
            async (message) => {
            if (message.command === 'setProps') {
                    let newProps: ProjectSettings = message.props;
                    await saveToConfig('name', newProps.projectName);
                    await saveToConfig('mainColor', newProps.mainColor);
                    await saveToConfig('isActivityBarColored', newProps.isActivityBarColored);
                    await saveToConfig('isTitleBarColored', newProps.isTitleBarColored);
                    await saveToConfig('isStatusBarColored', newProps.isStatusBarColored);
                    await saveToConfig('isProjectNameColored', newProps.isProjectNameColored);
                    await saveToConfig('isActiveItemsColored', newProps.isActiveItemsColored);
                    await saveToConfig('setWindowTitle', newProps.setWindowTitle);

                    updateStatusBarItem(statusBarItem, newProps);
                    updateWindowTitle(newProps);

                    const customization = generateColorCustomizations(newProps);
                    await applyColorCustomizations(customization);
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);

    // Initialize window title on activation
    applyColorCustomizations(generateColorCustomizations(args));
    updateWindowTitle(args);
}

async function saveToConfig(key: string, value: string | boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
}

function updateStatusBarItem(item: vscode.StatusBarItem, args: ProjectSettings): void {
    item.text = `${args.projectName}`;
    if (args.isProjectNameColored || args.isStatusBarColored) {
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground'); // Use warning color for contrast
        item.color = new vscode.ThemeColor('statusBarItem.warningForeground'); // Use warning foreground color for contrast
    } else {
        item.backgroundColor = undefined;
        item.color = undefined;
    }
    item.tooltip = `Project: ${args.projectName}\nColor: ${args.mainColor}`;
}

function updateWindowTitle(args: ProjectSettings): void {
    const config = vscode.workspace.getConfiguration('window');
    const defaultTitle = config.inspect('title')?.defaultValue || '';
    const customTitle = args.setWindowTitle ? `${args.projectName}` : defaultTitle;

    try {
        config.update('title', customTitle, vscode.ConfigurationTarget.Workspace);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to update window title: ${error.message}`);
    }
}

function getWebviewContent(args: ProjectSettings): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Settings</title>
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
        <h1>Project Colors</h1>
    
        <div class="group">
            <label for="projectName">Project Name:</label>
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
                    <label for="isProjectNameColored">Colorize Project Name</label>
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
          postMessageDebounced({ command: 'setProps', props });
        });

        colorPicker.addEventListener('input', () => {
          const color = colorPicker.value;
          props.mainColor = color;
          postMessageDebounced({ command: 'setProps', props });
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

      </script>
    </body>
    </html>
  `;
}

function lightenOrDarkenColor(color: string, percent: number): string {
    let num = parseInt(color.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let B = ((num >> 8) & 0x00FF) + amt;
    let G = (num & 0x0000FF) + amt;
    let newColor = `#${(0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 + (G < 255 ? (G < 1 ? 0 : G) : 255)).toString(16).slice(1)}`;
    return newColor;
}

function mixColors(color1: string, color2: string, weight: number): string {
    const d2 = weight / 100;
    const d1 = 1 - d2;
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const r = Math.round(rgb1.r * d1 + rgb2.r * d2);
    const g = Math.round(rgb1.g * d1 + rgb2.g * d2);
    const b = Math.round(rgb1.b * d1 + rgb2.b * d2);
    return `#${(r << 16 | g << 8 | b).toString(16)}`;
}

function transparency(color: string, alpha: number): string {
    const rgb = hexToRgb(color);
    return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}


function generateColorCustomizations(args: ProjectSettings): any {
    const contrastColor = getContrastColor(args.mainColor);

    const semiTransparentContrast = `${contrastColor}90`;

    const customizations: any = {
        "workbench.colorCustomizations": {
            
        }
    };

    if (args.isActivityBarColored) {
        customizations["workbench.colorCustomizations"] = {
            ...customizations["workbench.colorCustomizations"],
            "activityBar.background": args.mainColor,
            "activityBar.foreground": contrastColor,
            "activityBar.activeBorder": contrastColor,
            "activityBar.inactiveForeground": semiTransparentContrast,
            "activityBarBadge.background": contrastColor,
            "activityBarBadge.foreground": contrastColor === "#ffffff" ? "#000000" : "#ffffff",
        };
    }

    if (args.isTitleBarColored) {
        customizations["workbench.colorCustomizations"] = {
            ...customizations["workbench.colorCustomizations"],
            "titleBar.activeBackground": args.mainColor,
            "titleBar.activeForeground": contrastColor,
            "titleBar.inactiveBackground": args.mainColor,
            "titleBar.inactiveForeground": semiTransparentContrast,
        };
    }

    if (args.isProjectNameColored) {
        customizations["workbench.colorCustomizations"] = {
            ...customizations["workbench.colorCustomizations"],
            // "statusBar.background": args.mainColor,
            // "statusBar.foreground": contrastColor,

            "statusBarItem.warningBackground": args.mainColor,
            "statusBarItem.warningForeground": contrastColor,
            "statusBarItem.warningHoverBackground": args.mainColor,
            "statusBarItem.warningHoverForeground": semiTransparentContrast,

            // "statusBarItem.hoverBackground": args.mainColor,
            // "statusBarItem.hoverForeground": semiTransparentContrast,
            "statusBarItem.remoteBackground": args.mainColor,
            "statusBarItem.remoteForeground": contrastColor,
            "statusBarItem.remoteHoverBackground": args.mainColor,
            "statusBarItem.remoteHoverForeground": semiTransparentContrast,
        };
    }

    if (args.isStatusBarColored) {
        customizations["workbench.colorCustomizations"] = {
            ...customizations["workbench.colorCustomizations"],
            "statusBar.background": args.mainColor,
            "statusBar.foreground": contrastColor,
            "statusBarItem.warningBackground": args.mainColor,
            "statusBarItem.warningForeground": contrastColor,
            "statusBarItem.warningHoverBackground": args.mainColor,
            "statusBarItem.warningHoverForeground": semiTransparentContrast,
            "statusBar.border": args.mainColor,
            "statusBar.debuggingBackground": args.mainColor,
            "statusBar.debuggingForeground": contrastColor,
            "statusBar.debuggingBorder": args.mainColor,
            "statusBar.noFolderBackground": args.mainColor,
            "statusBar.noFolderForeground": contrastColor,
            "statusBar.noFolderBorder": args.mainColor,
            "statusBar.prominentBackground": args.mainColor,
            "statusBar.prominentForeground": contrastColor,
            "statusBar.prominentHoverBackground": args.mainColor,
            "statusBar.prominentHoverForeground": semiTransparentContrast,

            "statusBarItem.remoteBackground": lightenOrDarkenColor(args.mainColor, 5),
            "statusBarItem.remoteForeground": contrastColor,
            "statusBarItem.remoteHoverBackground": lightenOrDarkenColor(args.mainColor, 10),
            "statusBarItem.remoteHoverForeground": semiTransparentContrast,
        };
    }

    if (args.isActiveItemsColored) {
        customizations["workbench.colorCustomizations"] = {
            ...customizations["workbench.colorCustomizations"],
            "focusBorder": transparency(args.mainColor, 0.6),
            "progressBar.background": args.mainColor,
            "textLink.foreground": lightenOrDarkenColor(args.mainColor, 25),
            "textLink.activeForeground": lightenOrDarkenColor(args.mainColor, 30),
            "selection.background": lightenOrDarkenColor(args.mainColor, -5),
            "activityBarBadge.background": args.mainColor,
            "activityBarBadge.foreground": contrastColor,
            "activityBar.activeBorder": args.mainColor,
            "statusBarItem.remoteBackground": args.mainColor,
            "statusBarItem.remoteForeground": contrastColor,
            "statusBarItem.remoteHoverBackground": args.mainColor,
            "statusBarItem.remoteHoverForeground": semiTransparentContrast,
            "list.highlightForeground": lightenOrDarkenColor(args.mainColor, 0),
            "list.focusAndSelectionOutline": transparency(args.mainColor, 0.6),
            "button.background": args.mainColor,
            "button.foreground": contrastColor,
            "button.hoverBackground": lightenOrDarkenColor(args.mainColor, 5),
            "tab.activeBorderTop": lightenOrDarkenColor(args.mainColor, 5),
            "pickerGroup.foreground": lightenOrDarkenColor(args.mainColor, 5),
            "list.activeSelectionBackground": transparency(args.mainColor, 0.3),
            "panelTitle.activeBorder": lightenOrDarkenColor(args.mainColor, 5),
        };
    }

    return customizations;
}

function getContrastColor(hex: string): string {
    const rgb = hexToRgb(hex);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255; // Relative luminance
    return luminance > 0.5 ? "#000000" : "#ffffff"; // Use black for bright colors, white for dark colors
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

async function applyColorCustomizations(customizations: any) {
    const config = vscode.workspace.getConfiguration();
    try {
        await config.update(
            "workbench.colorCustomizations",
            customizations["workbench.colorCustomizations"],
            vscode.ConfigurationTarget.Workspace
        );
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to apply color customizations: ${error.message}`);
    }
}

export function deactivate() { }