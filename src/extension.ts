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

let workspaceStatusbar : vscode.StatusBarItem;
let isInitializing = true;

export async function activate(context: vscode.ExtensionContext) {
    // Check if we have a workspace file (.code-workspace)
    let currentWorkspace: string;
    if (vscode.workspace.workspaceFile) {
        // Use the workspace file path if it exists
        currentWorkspace = vscode.workspace.workspaceFile.fsPath;
    } else {
        // Otherwise use the first workspace folder
        currentWorkspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    }
    
    if (!currentWorkspace) {
        return
    }
    // console.log('[DEBUG] Reading initial config for workspace:', currentWorkspace);
    let currentConfig = await readConfig(currentWorkspace);
    // console.log('[DEBUG] Initial config read:', JSON.stringify(currentConfig, null, 2));
    
    // Check if we need to save default values
    const workspaceConfig = vscode.workspace.getConfiguration('projectColors');
    const needsDefaults = !workspaceConfig.get('mainColor') || 
                         workspaceConfig.get('isStatusBarColored') === undefined ||
                         workspaceConfig.get('isProjectNameColored') === undefined ||
                         workspaceConfig.get('isActiveItemsColored') === undefined ||
                         workspaceConfig.get('setWindowTitle') === undefined;
    
    if (needsDefaults) {
        // Save all default values at once to avoid multiple config change events
        const savePromises = [];
        
        if (!workspaceConfig.get('mainColor') && currentConfig.mainColor) {
            savePromises.push(saveToWorkspaceConfig('mainColor', currentConfig.mainColor));
        }
        if (workspaceConfig.get('isStatusBarColored') === undefined) {
            savePromises.push(saveToWorkspaceConfig('isStatusBarColored', currentConfig.isStatusBarColored));
        }
        if (workspaceConfig.get('isProjectNameColored') === undefined) {
            savePromises.push(saveToWorkspaceConfig('isProjectNameColored', currentConfig.isProjectNameColored));
        }
        if (workspaceConfig.get('isActiveItemsColored') === undefined) {
            savePromises.push(saveToWorkspaceConfig('isActiveItemsColored', currentConfig.isActiveItemsColored));
        }
        if (workspaceConfig.get('setWindowTitle') === undefined) {
            savePromises.push(saveToWorkspaceConfig('setWindowTitle', currentConfig.setWindowTitle));
        }
        
        // Wait for all saves to complete
        await Promise.all(savePromises);
        
        // Re-read config after saving defaults to ensure consistency
        // console.log('[DEBUG] Re-reading config after saving defaults');
        currentConfig = await readConfig(currentWorkspace);
        // console.log('[DEBUG] Config after saving defaults:', JSON.stringify(currentConfig, null, 2));
    }

    // listStatusbar = vscode.window.createStatusBarItem(
    //     vscode.StatusBarAlignment.Left,
    //     Infinity
    // );

    // updateListStatusbar(listStatusbar, currentConfig);
    // listStatusbar.command = 'project-colors.openList';
    // listStatusbar.show();

    // context.subscriptions.push(listStatusbar);

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

    // createListCommand(context);
    createWorkspaceSettingsCommand(context);

    // Initialize window title on activation
    updateWindowTitle(currentConfig);

    // Apply color customizations AFTER all configurations are saved
    // This ensures the settings.json exists with all values before applying colors
    // console.log('[DEBUG] Applying initial color customizations');
    const initialCustomizations = generateColorCustomizations(currentConfig);
    // console.log('[DEBUG] Initial color customizations generated:', JSON.stringify(initialCustomizations, null, 2));
    await applyColorCustomizations(initialCustomizations);
    // console.log('[DEBUG] Initial color customizations applied');

    // Mark initialization as complete
    isInitializing = false;

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('projectColors') && !isInitializing) {
                // console.log('[DEBUG] Configuration change detected, isInitializing:', isInitializing);
                const updatedConfig = await readConfig(currentWorkspace);
                // console.log('[DEBUG] Updated config after change:', JSON.stringify(updatedConfig, null, 2));
                const updatedCustomizations = generateColorCustomizations(updatedConfig);
                // console.log('[DEBUG] Updated color customizations generated:', JSON.stringify(updatedCustomizations, null, 2));
                await applyColorCustomizations(updatedCustomizations);
                // console.log('[DEBUG] Updated color customizations applied');
                updateWorkspaceStatusbar(workspaceStatusbar, updatedConfig);
                updateWindowTitle(updatedConfig);
            } else {
                // console.log('[DEBUG] Configuration change ignored - affectsProjectColors:', e.affectsConfiguration('projectColors'), 'isInitializing:', isInitializing);
            }
        })
    );
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
                
                // Apply colors immediately for instant feedback (don't await)
                // console.log('[DEBUG] Applying colors from webview message with props:', JSON.stringify(newProps, null, 2));
                const webviewCustomizations = generateColorCustomizations(newProps);
                // console.log('[DEBUG] Webview color customizations generated:', JSON.stringify(webviewCustomizations, null, 2));
                applyColorCustomizations(webviewCustomizations);
                // console.log('[DEBUG] Webview color customizations applied');
                
                if (editingIsCurrentWorkspace) {
                    updateWorkspaceStatusbar(workspaceStatusbar, newProps);
                    updateWindowTitle(newProps);
                }
                
                // Save configurations in parallel
                const savePromises = [
                    saveToWorkspaceConfig('name', newProps.projectName),
                    saveToWorkspaceConfig('mainColor', newProps.mainColor),
                    saveToWorkspaceConfig('isActivityBarColored', newProps.isActivityBarColored),
                    saveToWorkspaceConfig('isTitleBarColored', newProps.isTitleBarColored),
                    saveToWorkspaceConfig('isStatusBarColored', newProps.isStatusBarColored),
                    saveToWorkspaceConfig('isProjectNameColored', newProps.isProjectNameColored),
                    saveToWorkspaceConfig('isActiveItemsColored', newProps.isActiveItemsColored),
                    saveToWorkspaceConfig('setWindowTitle', newProps.setWindowTitle)
                ];

                // Save workspace reference with correct path
                const reference: WorkspaceReference = {
                    directory: directory
                };
                savePromises.push(saveWorkspaceReference(reference));

                await Promise.all(savePromises);
            }
        },
        undefined,
        context.subscriptions
    );

    await updateWebview();
}

function createWorkspaceSettingsCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('project-colors.openSettings', async () => {
        // Check if we have a workspace file (.code-workspace)
        let currentWorkspace: string;
        if (vscode.workspace.workspaceFile) {
            // Use the workspace file path if it exists
            currentWorkspace = vscode.workspace.workspaceFile.fsPath;
        } else {
            // Otherwise use the first workspace folder
            currentWorkspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
        }
        await createWorkspaceSettingsWebview(context, currentWorkspace);
    });
    context.subscriptions.push(disposable);
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
    // console.log('[DEBUG] Generating color customizations for:', JSON.stringify(args, null, 2));
    const contrastColor = getContrastColor(args.mainColor);
    // console.log('[DEBUG] Contrast color calculated:', contrastColor);

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

    // console.log('[DEBUG] Final customizations generated:', JSON.stringify(customizations, null, 2));
    return customizations;
}

export function deactivate() { }