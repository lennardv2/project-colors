import * as vscode from 'vscode';
import { getWorkspaceWebview } from './views/workspace';
import { getListWebview } from './views/list';
import {
    getContrastColor,
    lightenOrDarkenColor,
    transparency,
    mixColors,
    hexToRgb
} from './helpers';
import {
    applyColorCustomizations,
    readConfig,
    deleteWorkspaceReference,
    moveWorkspace,
    saveWorkspaceReference,
    saveWorkspaceGroup,
    deleteWorkspaceGroup,
    loadWorkspaceReferences,
    loadWorkspaceGroups,
    loadWorkspaceConfig,
    saveToWorkspaceConfig,
    saveWorkspaceToGroup,
    renameWorkspaceGroup
} from './workspaces';

export type ProjectSettings = {
    projectName: string;
    mainColor: string;
    mainColorContrast?: string;
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

let listStatusbar : vscode.StatusBarItem;
let workspaceStatusbar : vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
    let currentWorkspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    let currentConfig = await readConfig(currentWorkspace);

    listStatusbar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        Infinity
    );

    updateListStatusbar(listStatusbar, currentConfig);
    listStatusbar.command = 'project-colors.openList';
    listStatusbar.show();

    context.subscriptions.push(listStatusbar);

    // Create a status bar item with low priority to appear farthest to the left
    workspaceStatusbar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        Infinity
    );

    updateWorkspaceStatusbar(workspaceStatusbar, currentConfig);
    workspaceStatusbar.command = 'project-colors.openSettings';
    workspaceStatusbar.show();

    // Ensure the status bar item is available immediately on launch
    context.subscriptions.push(workspaceStatusbar);

    createListCommand(context);
    createWorkspaceSettingsCommand(context);

    // Initialize window title on activation
    applyColorCustomizations(generateColorCustomizations(currentConfig));
    updateWindowTitle(currentConfig);
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

        panel.onDidChangeViewState(async () => {
            if (panel.visible) {
                await updateWebview();
            }
        });

        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'openWorkspace') {
                    try {
                        console.log(`Opening workspace: ${message.directory}`);
                        const uri = vscode.Uri.file(message.directory);

                        vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to open workspace: ${error.message}`);
                    }
                } else if (message.command === 'openWorkspaceInNewWindow') {
                    try {
                        console.log(`Opening workspace in new window: ${message.directory}`);
                        const uri = vscode.Uri.file(message.directory);
                        vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to open workspace in new window: ${error.message}`);
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

                        await saveWorkspaceToGroup(message.groupName, newWorkspace);
                        await updateWebview();
                    }
                } else if (message.command === 'deleteWorkspace') {
                    let result = await vscode.window.showInformationMessage(`Are you sure you want to remove this workspace?`,{ modal: true },'Yes','No');
                    if (result === 'Yes') {
                        await deleteWorkspaceReference(message.directory);
                        await updateWebview();
                    }
                } else if (message.command === 'moveWorkspace') {
                    await moveWorkspace(message.draggedDirectory, message.targetDirectory);
                    await updateWebview();
                } else if (message.command === 'createGroup') {
                    const groupName = message.groupName;
                    const newGroup: WorkspaceGroup = { name: groupName, workspaces: [] };
                    await saveWorkspaceGroup(newGroup);
                    await updateWebview();
                } else if (message.command === 'editWorkspace') {
                    // await createWorkspaceSettingsWebview(context, message.directory);
                } else if (message.command === 'deleteGroup') {
                    if (await vscode.window.showInformationMessage(`Are you sure you want to remove this group?`,{ modal: true },'Yes','No') === 'Yes') {
                        await deleteWorkspaceGroup(message.groupName);
                        await updateWebview();
                    }
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
                    if (await vscode.window.showInformationMessage(`Are you sure you want to remove this workspace?`,{ modal: true },'Yes','No') === 'Yes') {
                        const groupName = message.groupName;
                        const directory = message.directory;
                        const groups = loadWorkspaceGroups();
                        const group = groups.find(g => g.name === groupName);
                        if (group) {
                            group.workspaces = group.workspaces.filter(ws => ws.directory !== directory);
                            await saveWorkspaceGroup(group);
                            await updateWebview();
                        }
                    }
                } else if (message.command === 'createNewGroup') {
                    const groupName = await vscode.window.showInputBox({ placeHolder: message.placeholder });
                    if (groupName) {
                        panel.webview.postMessage({ command: 'createGroup', groupName });
                    }
                } else if (message.command === 'renameGroup') {
                    const newGroupName = await vscode.window.showInputBox({ value: message.groupName, placeHolder: "New Group Name" });
                    if (newGroupName) {
                        await renameWorkspaceGroup(message.groupName, newGroupName);
                        await updateWebview();
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

async function createWorkspaceSettingsWebview(context: vscode.ExtensionContext, directory: string) {
    const panel = vscode.window.createWebviewPanel(
        'projectSettings',
        'Project Settings',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    async function updateWebview() {
        const args = await readConfig(directory);
        panel.webview.html = getWorkspaceWebview(args);
    }

    panel.onDidChangeViewState(async () => {
        if (panel.visible) {
            await updateWebview();
        }
    });

    panel.webview.onDidReceiveMessage(
        async (message) => {
            if (message.command === 'setProps') {
                let editingIsCurrentWorkspace = directory === vscode.workspace.workspaceFolders?.[0].uri.fsPath;
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

                if (editingIsCurrentWorkspace) {
                    updateListStatusbar(listStatusbar, newProps);
                    updateWorkspaceStatusbar(workspaceStatusbar, newProps);
                    updateWindowTitle(newProps);
                }
               

                await applyColorCustomizations(generateColorCustomizations(newProps));
            }
        },
        undefined,
        context.subscriptions
    );

    await updateWebview();
}

function createWorkspaceSettingsCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('project-colors.openSettings', async () => {
        await createWorkspaceSettingsWebview(context, vscode.workspace.workspaceFolders?.[0].uri.fsPath || '');
    });
    context.subscriptions.push(disposable);
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

export function deactivate() { }