# Publishing Guide

This document explains how to securely publish the extension to both VS Code Marketplace and Open VSX Registry.

## Security Setup

### 1. Local Development

For local publishing, you have two options:

#### Option A: Environment Variables (Recommended)
```bash
export VSCE_PAT="your_azure_devops_token"
export OVSX_PAT="your_openvsx_token"
npm run publish:all
```

#### Option B: Token Files (Local only - never commit)
Create these files in `/home/app/` (they're already in .gitignore):

**`/home/app/.vsce`**:
```json
{
  "publishers": [
    {
      "name": "lennardv",
      "pat": "your_azure_devops_token"
    }
  ]
}
```

**`/home/app/.ovsx`**:
```json
{
  "registries": [
    {
      "url": "https://open-vsx.org",
      "pat": "your_openvsx_token"
    }
  ]
}
```

### 2. GitHub Actions (Automated)

The repository is configured to publish automatically on releases using GitHub Actions secrets.

#### Required GitHub Secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VSCE_PAT`: Your Azure DevOps Personal Access Token
   - `OVSX_PAT`: Your Open VSX Registry Personal Access Token

## Getting Tokens

### VS Code Marketplace (Azure DevOps)
1. Go to https://dev.azure.com/
2. Sign in → Profile → Personal Access Tokens
3. Create new token with "Marketplace: Manage" scope

### Open VSX Registry
1. Go to https://open-vsx.org/
2. Sign in with GitHub → Profile → Access Tokens
3. Generate new token

## Publishing Commands

- `npm run publish:vscode` - Publish to VS Code Marketplace only
- `npm run publish:ovsx` - Publish to Open VSX Registry only  
- `npm run publish:all` - Publish to both marketplaces

## Security Notes

- ✅ Token files are in .gitignore and will never be committed
- ✅ GitHub Actions uses encrypted secrets
- ✅ Environment variables are cleared after use
- ⚠️ Never commit tokens to version control
- ⚠️ Rotate tokens periodically for security