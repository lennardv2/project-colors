import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('project-colors.pickColor', () => {
    // Create and show a new webview
    const panel = vscode.window.createWebviewPanel(
      'colorPicker',
      'Pick a Color',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // Set the webview's HTML content
    panel.webview.html = getWebviewContent();

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'colorSelected') {
          const mainColor = message.color;
          const customization = generateColorCustomizations(mainColor);

          await applyColorCustomizations(customization);
        	//   vscode.window.showInformationMessage(`Applied color: ${mainColor}`);
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Color Picker</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        input[type="color"] {
          width: 100px;
          height: 100px;
          border: none;
          cursor: pointer;
        }
        p {
          margin-top: 10px;
          font-size: 14px;
          color: #555;
        }
      </style>
    </head>
    <body>
      <h1>Pick a Color</h1>
      <input type="color" id="colorPicker" value="#393c71">
      <p>Selected color: <span id="colorValue">#393c71</span></p>
      <script>
        const vscode = acquireVsCodeApi();
        const colorPicker = document.getElementById('colorPicker');
        const colorValue = document.getElementById('colorValue');

        colorPicker.addEventListener('input', () => {
          const color = colorPicker.value;
          colorValue.textContent = color; // Update displayed value
          vscode.postMessage({ command: 'colorSelected', color });
        });
      </script>
    </body>
    </html>
  `;
}

function generateColorCustomizations(mainColor: string): any {
  const contrastColor = getContrastColor(mainColor); // Decide between black and white
  const semiTransparentContrast = `${contrastColor}90`; // Semi-transparent version (90% opacity)

  return {
    "workbench.colorCustomizations": {
      "activityBar.background": mainColor,
      "activityBar.foreground": contrastColor,
      "activityBar.activeBorder": contrastColor,
      "activityBar.inactiveForeground": semiTransparentContrast,
      "activityBarBadge.background": contrastColor,
      "activityBarBadge.foreground": contrastColor === "#ffffff" ? "#000000" : "#ffffff",
      "statusBarItem.remoteBackground": "#ffffff00", // Fully transparent white
      "statusBarItem.remoteForeground": contrastColor,
    }
  };
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

export function deactivate() {}