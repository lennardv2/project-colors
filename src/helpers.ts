import * as vscode from 'vscode';
import { ProjectSettings, WorkspaceReference, WorkspaceGroup } from './extension';
import { saveToWorkspaceConfig } from './workspaces';

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

export function lightenOrDarkenColor(color: string, percent: number): string {
    let num = parseInt(color.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let B = ((num >> 8) & 0x00FF) + amt;
    let G = (num & 0x0000FF) + amt;
    let newColor = `#${(0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 + (G < 255 ? (G < 1 ? 0 : G) : 255)).toString(16).slice(1)}`;
    return newColor;
}

export function mixColors(color1: string, color2: string, weight: number): string {
    const d2 = weight / 100;
    const d1 = 1 - d2;
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const r = Math.round(rgb1.r * d1 + rgb2.r * d2);
    const g = Math.round(rgb1.g * d1 + rgb2.g * d2);
    const b = Math.round(rgb1.b * d1 + rgb2.b * d2);
    return `#${(r << 16 | g << 8 | b).toString(16)}`;
}

export function transparency(color: string, alpha: number): string {
    const rgb = hexToRgb(color);
    return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

export function getContrastColor(hex: string): string {
    const rgb = hexToRgb(hex);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255; // Relative luminance
    return luminance > 0.5 ? "#000000" : "#ffffff"; // Use black for bright colors, white for dark colors
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}
