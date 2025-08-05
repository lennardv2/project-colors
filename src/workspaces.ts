import * as vscode from 'vscode';
import { WindowSettings, WindowReference, WindowGroup } from './extension';
import { getContrastColor, generateRandomColor } from './helpers';

export async function loadWorkspaces(): Promise<(WindowReference & { settings: WindowSettings })[]> {
    const references = loadWindowReferences();
    return await Promise.all(references.map(async ref => {
        const config = await loadWorkspaceConfig(ref.directory);
        return config ? { ...ref, ...{ settings: config } } : null;
    })).then(results => results.filter(Boolean) as (WindowReference & { settings: WindowSettings })[]);
}

export async function readConfig(directory: string): Promise<WindowSettings> {
    // console.log('[DEBUG] readConfig called for directory:', directory);
    const uri = vscode.Uri.file(directory);
    const configPath = directory.endsWith('.code-workspace') ? uri : uri.with({ path: `${uri.path}/.vscode/settings.json` });
    // console.log('[DEBUG] Reading config from path:', configPath.fsPath);

    let settings: any;
    try {
        const config = await vscode.workspace.fs.readFile(configPath);
        settings = JSON.parse(config.toString());
        // console.log('[DEBUG] Config file contents:', JSON.stringify(settings, null, 2));
    } catch (error: any) {
        console.error(`Failed to read config file at ${configPath.fsPath}: ${error.message}`);
        settings = {};
    }

    const fallbackWindowName = directory.split('/').pop() || 'Untitled Window';
    const windowColorSettings = directory.endsWith('.code-workspace') ? (settings['settings'] || {}) : settings;
    // console.log('[DEBUG] Extracted windowColorSettings:', JSON.stringify(windowColorSettings, null, 2));
    
    // Only generate random color if no color exists
    const existingColor = windowColorSettings['windowColor.mainColor'];
    const mainColor = existingColor || generateRandomColor();
    // console.log('[DEBUG] Using main color:', mainColor, '(existing:', existingColor, ')');

    const result = {
        windowName: windowColorSettings['windowColor.name'] || fallbackWindowName,
        mainColor: mainColor,
        mainColorContrast: getContrastColor(mainColor),
        isActivityBarColored: windowColorSettings['windowColor.isActivityBarColored'] ?? false,
        isTitleBarColored: windowColorSettings['windowColor.isTitleBarColored'] ?? false,
        isStatusBarColored: windowColorSettings['windowColor.isStatusBarColored'] ?? true,
        isWindowNameColored: windowColorSettings['windowColor.isWindowNameColored'] ?? true,
        isActiveItemsColored: windowColorSettings['windowColor.isActiveItemsColored'] ?? true,
        setWindowTitle: windowColorSettings['windowColor.setWindowTitle'] ?? true
    };
    // console.log('[DEBUG] readConfig returning:', JSON.stringify(result, null, 2));
    return result;
}

export async function saveWindowReference(reference: WindowReference): Promise<void> {
    const config = vscode.workspace.getConfiguration('windowColor');
    const references = config.get<WindowReference[]>('workspaces') || [];
    const existingIndex = references.findIndex(ref => ref.directory === reference.directory);

    if (existingIndex >= 0) {
        references[existingIndex] = reference;
    } else {
        references.push(reference);
    }

    await config.update('workspaces', references, vscode.ConfigurationTarget.Global);
}

export async function deleteWindowReference(directory: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('windowColor');
    let references = config.get<WindowReference[]>('workspaces') || [];
    references = references.filter(ref => ref.directory !== directory);
    await config.update('workspaces', references, vscode.ConfigurationTarget.Global);
}

export async function moveWorkspace(draggedDirectory: string, targetDirectory: string): Promise<void> {
    const groups = loadWindowGroups();

    const draggedGroup = groups.find(group => group.windows.some(window => window.directory === draggedDirectory));
    const targetGroup = groups.find(group => group.windows.some(window => window.directory === targetDirectory));

    if (!draggedGroup || !targetGroup) {
        throw new Error('Both dragged and target directories must belong to a group');
    }

    const draggedWindow = draggedGroup.windows.find(window => window.directory === draggedDirectory);
    if (!draggedWindow) {
        throw new Error('Dragged window not found in its group');
    }

    // Remove the window from the dragged group
    draggedGroup.windows = draggedGroup.windows.filter(window => window.directory !== draggedDirectory);

    // If the dragged and target directories are in the same group, update the group
    if (draggedGroup === targetGroup) {
        const targetIndex = targetGroup.windows.findIndex(window => window.directory === targetDirectory);
        targetGroup.windows.splice(targetIndex, 0, draggedWindow);
    } else {
        // Otherwise, move it to the new group before the target
        const targetIndex = targetGroup.windows.findIndex(window => window.directory === targetDirectory);
        targetGroup.windows.splice(targetIndex, 0, draggedWindow);
    }

    await saveWindowGroup(draggedGroup);
    await saveWindowGroup(targetGroup);
}

export async function saveWindowGroup(group: WindowGroup): Promise<void> {
    const config = vscode.workspace.getConfiguration('windowColor');
    const groups = config.get<WindowGroup[]>('groups') || [];
    const existingIndex = groups.findIndex(g => g.name === group.name);

    if (existingIndex >= 0) {
        groups[existingIndex] = group;
    } else {
        groups.push(group);
    }

    await config.update('groups', groups, vscode.ConfigurationTarget.Global);
}

export async function deleteWindowGroup(groupName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('windowColor');
    let groups = config.get<WindowGroup[]>('groups') || [];
    groups = groups.filter(g => g.name !== groupName);
    await config.update('groups', groups, vscode.ConfigurationTarget.Global);
}

export function loadWindowReferences(): WindowReference[] {
    const config = vscode.workspace.getConfiguration('windowColor');
    return config.get<WindowReference[]>('workspaces') || [];
}

export function loadWindowGroups(): WindowGroup[] {
    const config = vscode.workspace.getConfiguration('windowColor');
    return config.get<WindowGroup[]>('groups') || [];
}

export async function loadWorkspaceConfig(directory: string): Promise<WindowSettings | null> {
    try {
        return await readConfig(directory);
    } catch (error: any) {
        console.error(`Failed to load workspace config for ${directory}: ${error.message}`);
        return null;
    }
}

export async function saveToWorkspaceConfig(key: string, value: string | boolean): Promise<void> {
    // console.log('[DEBUG] saveToWorkspaceConfig called with key:', key, 'value:', value);
    const config = vscode.workspace.getConfiguration('windowColor');
    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    // console.log('[DEBUG] saveToWorkspaceConfig completed for key:', key);
}

export async function saveWorkspaceToGroup(groupName: string, workspace: WindowReference): Promise<void> {
    const config = vscode.workspace.getConfiguration('windowColor');
    const groups = config.get<WindowGroup[]>('groups') || [];
    const group = groups.find(g => g.name === groupName) || { name: groupName, windows: [] };
    group.windows.push(workspace);
    await saveWindowGroup(group);
}

export async function renameWindowGroup(oldName: string, newName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('windowColor');
    let groups = config.get<WindowGroup[]>('groups') || [];
    const group = groups.find(g => g.name === oldName);

    if (group) {
        group.name = newName;
        await config.update('groups', groups, vscode.ConfigurationTarget.Global);
    }
}

export async function applyColorCustomizations(customizations: any) {
    // console.log('[DEBUG] applyColorCustomizations called with:', JSON.stringify(customizations, null, 2));
    const config = vscode.workspace.getConfiguration();
    try {
        // Get existing color customizations to preserve any user-defined colors
        const existingCustomizations = config.get<any>("workbench.colorCustomizations") || {};
        // console.log('[DEBUG] Existing color customizations:', JSON.stringify(existingCustomizations, null, 2));
        
        // Merge with new customizations (new ones override existing)
        const mergedCustomizations = {
            ...existingCustomizations,
            ...customizations["workbench.colorCustomizations"]
        };
        
        // Remove null values to clear disabled colors
        Object.keys(mergedCustomizations).forEach(key => {
            if (mergedCustomizations[key] === null) {
                delete mergedCustomizations[key];
            }
        });
        // console.log('[DEBUG] Merged color customizations:', JSON.stringify(mergedCustomizations, null, 2));
        
        await config.update(
            "workbench.colorCustomizations",
            mergedCustomizations,
            vscode.ConfigurationTarget.Workspace
        );
        // console.log('[DEBUG] Color customizations successfully applied to workspace');
    } catch (error: any) {
        console.error('[DEBUG] Failed to apply color customizations:', error.message);
        vscode.window.showErrorMessage(`Failed to apply color customizations: ${error.message}`);
    }
}
