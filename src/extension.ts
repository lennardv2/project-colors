import * as vscode from 'vscode';
import { getWorkspaceWebview } from './views/workspace';
import { getListWebview } from './views/list';

export type ProjectSettings = {
    projectName: string;
    mainColor: string;
    isActivityBarColored: boolean;
    isTitleBarColored: boolean;
    isStatusBarColored: boolean;
    isProjectNameColored: boolean;
    isActiveItemsColored: boolean;
    setWindowTitle: boolean;
}

export type WorkspaceReference = {
    directory: string;
}

export type WorkspaceGroup = {
    name: string;
    workspaces: WorkspaceReference[];
}

async function readConfig(directory: string): Promise<ProjectSettings> {
    const uri = vscode.Uri.file(directory);
    const configPath = directory.endsWith('.code-workspace') ? uri : uri.with({ path: `${uri.path}/.vscode/settings.json` });
    const config = await vscode.workspace.fs.readFile(configPath);
    const settings = JSON.parse(config.toString());

    const fallbackProjectName = directory.split('/').pop() || 'Untitled Project';

    const projectColors = directory.endsWith('.code-workspace') ? settings['settings'] : settings;

    return {
        projectName: projectColors['projectColors.name'] || fallbackProjectName,
        mainColor: projectColors['projectColors.mainColor'] || '#681DD7',
        isActivityBarColored: projectColors['projectColors.isActivityBarColored'] ?? false,
        isTitleBarColored: projectColors['projectColors.isTitleBarColored'] ?? false,
        isStatusBarColored: projectColors['projectColors.isStatusBarColored'] ?? false,
        isProjectNameColored: projectColors['projectColors.isProjectNameColored'] ?? true,
        isActiveItemsColored: projectColors['projectColors.isActiveItemsColored'] ?? true,
        setWindowTitle: projectColors['projectColors.setWindowTitle'] ?? true
    };
}

async function saveWorkspaceReference(reference: WorkspaceReference): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    const references = config.get<WorkspaceReference[]>('workspaces') || [];
    const existingIndex = references.findIndex(ref => ref.directory === reference.directory);

    if (existingIndex >= 0) {
        references[existingIndex] = reference;
    } else {
        references.push(reference);
    }

    await config.update('workspaces', references, vscode.ConfigurationTarget.Global);
}

async function deleteWorkspaceReference(directory: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    let references = config.get<WorkspaceReference[]>('workspaces') || [];
    references = references.filter(ref => ref.directory !== directory);
    await config.update('workspaces', references, vscode.ConfigurationTarget.Global);
}

async function moveWorkspace(draggedDirectory: string, targetDirectory: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    let references = config.get<WorkspaceReference[]>('workspaces') || [];
    const draggedIndex = references.findIndex(ref => ref.directory === draggedDirectory);
    const targetIndex = references.findIndex(ref => ref.directory === targetDirectory);

    if (draggedIndex >= 0 && targetIndex >= 0) {
        const [draggedItem] = references.splice(draggedIndex, 1);
        references.splice(targetIndex, 0, draggedItem);
        await config.update('workspaces', references, vscode.ConfigurationTarget.Global);
    }
}

async function saveWorkspaceGroup(group: WorkspaceGroup): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    const groups = config.get<WorkspaceGroup[]>('groups') || [];
    const existingIndex = groups.findIndex(g => g.name === group.name);

    if (existingIndex >= 0) {
        groups[existingIndex] = group;
    } else {
        groups.push(group);
    }

    await config.update('groups', groups, vscode.ConfigurationTarget.Global);
}

async function deleteWorkspaceGroup(groupName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    let groups = config.get<WorkspaceGroup[]>('groups') || [];
    groups = groups.filter(g => g.name !== groupName);
    await config.update('groups', groups, vscode.ConfigurationTarget.Global);
}

function loadWorkspaceReferences(): WorkspaceReference[] {
    const config = vscode.workspace.getConfiguration('projectColors');
    return config.get<WorkspaceReference[]>('workspaces') || [];
}

function loadWorkspaceGroups(): WorkspaceGroup[] {
    const config = vscode.workspace.getConfiguration('projectColors');
    return config.get<WorkspaceGroup[]>('groups') || [];
}

async function loadWorkspaceConfig(directory: string): Promise<ProjectSettings | null> {
    try {
        return await readConfig(directory);
    } catch (error: any) {
        console.error(`Failed to load workspace config for ${directory}: ${error.message}`);
        return null;
    }
}

function createListCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('project-colors.openList', async () => {
        const panel = vscode.window.createWebviewPanel(
            'workspaceList',
            'Workspace List',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        async function updateWebview() {
            const groups = loadWorkspaceGroups();
            const workspaces = await Promise.all(groups.map(async group => {
                const workspaceConfigs = await Promise.all(group.workspaces.map(async ref => {
                    const config = await loadWorkspaceConfig(ref.directory);
                    return config ? { ...ref, ...{ settings: config } } : null;
                }));
                return { ...group, workspaces: workspaceConfigs.filter(Boolean) as (WorkspaceReference & { settings: ProjectSettings })[] };
            }));
            panel.webview.html = getListWebview(workspaces);
        }

        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'openWorkspace') {
                    const workspace = loadWorkspaceReferences().find(ws => ws.directory === message.directory);
                    if (workspace) {
                        console.log(`Opening workspace: ${workspace.directory}`);
                        const uri = vscode.Uri.file(workspace.directory);
                        const isWorkspaceFile = workspace.directory.endsWith('.code-workspace');
                        vscode.commands.executeCommand('vscode.openFolder', uri, isWorkspaceFile);
                    } else {
                        console.error(`Workspace not found: ${message.directory}`);
                    }
                } else if (message.command === 'createNewWorkspace') {
                    const uri = await vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: true,
                        canSelectMany: false,
                        openLabel: 'Select Folder or Workspace File',
                        filters: {
                            'Workspace Files': ['code-workspace'],
                            'All Files': ['*']
                        }
                    });

                    if (uri && uri[0]) {
                        const directory = uri[0].fsPath;

                        const newWorkspace: WorkspaceReference = {
                            directory
                        };

                        await saveWorkspaceReference(newWorkspace);
                        await updateWebview();
                    }
                } else if (message.command === 'deleteWorkspace') {
                    await deleteWorkspaceReference(message.directory);
                    await updateWebview();
                } else if (message.command === 'moveWorkspace') {
                    await moveWorkspace(message.draggedDirectory, message.targetDirectory);
                    await updateWebview();
                } else if (message.command === 'createGroup') {
                    const groupName = message.groupName;
                    const newGroup: WorkspaceGroup = { name: groupName, workspaces: [] };
                    await saveWorkspaceGroup(newGroup);
                    await updateWebview();
                } else if (message.command === 'deleteGroup') {
                    await deleteWorkspaceGroup(message.groupName);
                    await updateWebview();
                } else if (message.command === 'addWorkspaceToGroup') {
                    const groupName = message.groupName;
                    const directory = message.directory;
                    const groups = loadWorkspaceGroups();
                    const group = groups.find(g => g.name === groupName);
                    if (group) {
                        group.workspaces.push({ directory });
                        await saveWorkspaceGroup(group);
                        await updateWebview();
                    }
                } else if (message.command === 'removeWorkspaceFromGroup') {
                    const groupName = message.groupName;
                    const directory = message.directory;
                    const groups = loadWorkspaceGroups();
                    const group = groups.find(g => g.name === groupName);
                    if (group) {
                        group.workspaces = group.workspaces.filter(ws => ws.directory !== directory);
                        await saveWorkspaceGroup(group);
                        await updateWebview();
                    }
                } else if (message.command === 'showInputBox') {
                    const groupName = await vscode.window.showInputBox({ placeHolder: message.placeholder });
                    if (groupName) {
                        panel.webview.postMessage({ command: 'createGroup', groupName });
                    }
                }
            },
            undefined,
            context.subscriptions
        );

        await updateWebview();
    });
    context.subscriptions.push(disposable);
}

async function loadWorkspaces(): Promise<(WorkspaceReference & { settings: ProjectSettings })[]> {
    const references = loadWorkspaceReferences();
    return await Promise.all(references.map(async ref => {
        const config = await loadWorkspaceConfig(ref.directory);
        return config ? { ...ref, ...{ settings: config } } : null;
    })).then(results => results.filter(Boolean) as (WorkspaceReference & { settings: ProjectSettings })[]);
}

export async function activate(context: vscode.ExtensionContext) {
    let args = await readConfig(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '');

    const listStatusbar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        Infinity
    );

    updateListStatusbar(listStatusbar, args);
    listStatusbar.command = 'project-colors.openList';
    listStatusbar.show();

    context.subscriptions.push(listStatusbar);

    // Create a status bar item with low priority to appear farthest to the left
    const workspaceStatusbar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        Infinity
    );

    updateWorkspaceStatusbar(workspaceStatusbar, args);
    workspaceStatusbar.command = 'project-colors.openSettings';
    workspaceStatusbar.show();

    // Ensure the status bar item is available immediately on launch
    context.subscriptions.push(workspaceStatusbar);


    // Register the command to open the settings webview
    const disposable = vscode.commands.registerCommand('project-colors.openSettings', async () => {
        args = await readConfig(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '');

        const panel = vscode.window.createWebviewPanel(
            'projectSettings',
            'Project Settings',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        // Set the webview's HTML content
        panel.webview.html = getWorkspaceWebview(args);

        panel.webview.onDidReceiveMessage(
            async (message) => {
            if (message.command === 'setProps') {
                    let newProps: ProjectSettings = message.props;
                    await saveToWorkspaceConfig('name', newProps.projectName);
                    await saveToWorkspaceConfig('mainColor', newProps.mainColor);
                    await saveToWorkspaceConfig('isActivityBarColored', newProps.isActivityBarColored);
                    await saveToWorkspaceConfig('isTitleBarColored', newProps.isTitleBarColored);
                    await saveToWorkspaceConfig('isStatusBarColored', newProps.isStatusBarColored);
                    await saveToWorkspaceConfig('isProjectNameColored', newProps.isProjectNameColored);
                    await saveToWorkspaceConfig('isActiveItemsColored', newProps.isActiveItemsColored);
                    await saveToWorkspaceConfig('setWindowTitle', newProps.setWindowTitle);

                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        const reference: WorkspaceReference = {
                            directory: workspaceFolder.uri.fsPath
                        };
                        await saveWorkspaceReference(reference);
                    }

                    updateListStatusbar(listStatusbar, newProps);
                    updateWorkspaceStatusbar(workspaceStatusbar, newProps);
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

    createListCommand(context);
}

async function saveToWorkspaceConfig(key: string, value: string | boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
}

function updateListStatusbar(item: vscode.StatusBarItem, args: ProjectSettings): void {
    item.text = '$(multiple-windows)';
    if (args.isProjectNameColored || args.isStatusBarColored) {
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground'); // Use warning color for contrast
        item.color = new vscode.ThemeColor('statusBarItem.warningForeground'); // Use warning foreground color for contrast
    } else {
        item.backgroundColor = undefined;
        item.color = undefined;
    }
    item.tooltip = `Show all projects`;
}

function updateWorkspaceStatusbar(item: vscode.StatusBarItem, args: ProjectSettings): void {
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

    if (args.isActivityBarColored) {
        customizations["workbench.colorCustomizations"] = {
            ...customizations["workbench.colorCustomizations"],
            "activityBar.background": args.mainColor,
            "activityBar.foreground": contrastColor,
            "activityBar.activeBorder": contrastColor,
            "activityBar.inactiveForeground": semiTransparentContrast,
            "activityBarBadge.foreground": contrastColor === "#ffffff" ? "#000000" : "#ffffff",
            "activityBarBadge.background": contrastColor === "#ffffff" ? lightenOrDarkenColor(args.mainColor, 75) : lightenOrDarkenColor(args.mainColor, -75),
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