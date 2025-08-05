import * as vscode from 'vscode';
import { ProjectSettings, WorkspaceReference, WorkspaceGroup } from './extension';
import { getContrastColor, generateRandomColor } from './helpers';

export async function loadWorkspaces(): Promise<(WorkspaceReference & { settings: ProjectSettings })[]> {
    const references = loadWorkspaceReferences();
    return await Promise.all(references.map(async ref => {
        const config = await loadWorkspaceConfig(ref.directory);
        return config ? { ...ref, ...{ settings: config } } : null;
    })).then(results => results.filter(Boolean) as (WorkspaceReference & { settings: ProjectSettings })[]);
}

export async function readConfig(directory: string): Promise<ProjectSettings> {
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

    const fallbackProjectName = directory.split('/').pop() || 'Untitled Project';
    const projectColors = directory.endsWith('.code-workspace') ? (settings['settings'] || {}) : settings;
    // console.log('[DEBUG] Extracted projectColors:', JSON.stringify(projectColors, null, 2));
    
    // Only generate random color if no color exists
    const existingColor = projectColors['projectColors.mainColor'];
    const mainColor = existingColor || generateRandomColor();
    // console.log('[DEBUG] Using main color:', mainColor, '(existing:', existingColor, ')');

    const result = {
        projectName: projectColors['projectColors.name'] || fallbackProjectName,
        mainColor: mainColor,
        mainColorContrast: getContrastColor(mainColor),
        isActivityBarColored: projectColors['projectColors.isActivityBarColored'] ?? false,
        isTitleBarColored: projectColors['projectColors.isTitleBarColored'] ?? false,
        isStatusBarColored: projectColors['projectColors.isStatusBarColored'] ?? true,
        isProjectNameColored: projectColors['projectColors.isProjectNameColored'] ?? true,
        isActiveItemsColored: projectColors['projectColors.isActiveItemsColored'] ?? true,
        setWindowTitle: projectColors['projectColors.setWindowTitle'] ?? true
    };
    // console.log('[DEBUG] readConfig returning:', JSON.stringify(result, null, 2));
    return result;
}

export async function saveWorkspaceReference(reference: WorkspaceReference): Promise<void> {
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

export async function deleteWorkspaceReference(directory: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    let references = config.get<WorkspaceReference[]>('workspaces') || [];
    references = references.filter(ref => ref.directory !== directory);
    await config.update('workspaces', references, vscode.ConfigurationTarget.Global);
}

export async function moveWorkspace(draggedDirectory: string, targetDirectory: string): Promise<void> {
    const groups = loadWorkspaceGroups();

    const draggedGroup = groups.find(group => group.workspaces.some(workspace => workspace.directory === draggedDirectory));
    const targetGroup = groups.find(group => group.workspaces.some(workspace => workspace.directory === targetDirectory));

    if (!draggedGroup || !targetGroup) {
        throw new Error('Both dragged and target directories must belong to a group');
    }

    const draggedWorkspace = draggedGroup.workspaces.find(workspace => workspace.directory === draggedDirectory);
    if (!draggedWorkspace) {
        throw new Error('Dragged workspace not found in its group');
    }

    // Remove the workspace from the dragged group
    draggedGroup.workspaces = draggedGroup.workspaces.filter(workspace => workspace.directory !== draggedDirectory);

    // If the dragged and target directories are in the same group, update the group
    if (draggedGroup === targetGroup) {
        const targetIndex = targetGroup.workspaces.findIndex(workspace => workspace.directory === targetDirectory);
        targetGroup.workspaces.splice(targetIndex, 0, draggedWorkspace);
    } else {
        // Otherwise, move it to the new group before the target
        const targetIndex = targetGroup.workspaces.findIndex(workspace => workspace.directory === targetDirectory);
        targetGroup.workspaces.splice(targetIndex, 0, draggedWorkspace);
    }

    await saveWorkspaceGroup(draggedGroup);
    await saveWorkspaceGroup(targetGroup);
}

export async function saveWorkspaceGroup(group: WorkspaceGroup): Promise<void> {
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

export async function deleteWorkspaceGroup(groupName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    let groups = config.get<WorkspaceGroup[]>('groups') || [];
    groups = groups.filter(g => g.name !== groupName);
    await config.update('groups', groups, vscode.ConfigurationTarget.Global);
}

export function loadWorkspaceReferences(): WorkspaceReference[] {
    const config = vscode.workspace.getConfiguration('projectColors');
    return config.get<WorkspaceReference[]>('workspaces') || [];
}

export function loadWorkspaceGroups(): WorkspaceGroup[] {
    const config = vscode.workspace.getConfiguration('projectColors');
    return config.get<WorkspaceGroup[]>('groups') || [];
}

export async function loadWorkspaceConfig(directory: string): Promise<ProjectSettings | null> {
    try {
        return await readConfig(directory);
    } catch (error: any) {
        console.error(`Failed to load workspace config for ${directory}: ${error.message}`);
        return null;
    }
}

export async function saveToWorkspaceConfig(key: string, value: string | boolean): Promise<void> {
    // console.log('[DEBUG] saveToWorkspaceConfig called with key:', key, 'value:', value);
    const config = vscode.workspace.getConfiguration('projectColors');
    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    // console.log('[DEBUG] saveToWorkspaceConfig completed for key:', key);
}

export async function saveWorkspaceToGroup(groupName: string, workspace: WorkspaceReference): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    const groups = config.get<WorkspaceGroup[]>('groups') || [];
    const group = groups.find(g => g.name === groupName) || { name: groupName, workspaces: [] };
    group.workspaces.push(workspace);
    await saveWorkspaceGroup(group);
}

export async function renameWorkspaceGroup(oldName: string, newName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColors');
    let groups = config.get<WorkspaceGroup[]>('groups') || [];
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
