import * as vscode from 'vscode';
import { ProjectSettings, WorkspaceReference, WorkspaceGroup } from './extension';

export async function loadWorkspaces(): Promise<(WorkspaceReference & { settings: ProjectSettings })[]> {
    const references = loadWorkspaceReferences();
    return await Promise.all(references.map(async ref => {
        const config = await loadWorkspaceConfig(ref.directory);
        return config ? { ...ref, ...{ settings: config } } : null;
    })).then(results => results.filter(Boolean) as (WorkspaceReference & { settings: ProjectSettings })[]);
}


export async function readConfig(directory: string): Promise<ProjectSettings> {
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
    const config = vscode.workspace.getConfiguration('projectColors');
    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
}
