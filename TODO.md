- [v] Color the status bar by default
- [v] Set a random default color
- [v] Introduce some debouncing on the window name. When entering characters for the window name. 
- [v] Sometimes as code-workspace file will load the first subdirs config instead of the code-workspace

BUG:
- [x] The random color should only be applied at startup when no existing color is there. If an existing color is in the window it should show that in the window settings.
- [x] The debounce on the window name should work the same for the other settings (especially the color picker)

- [x] This error happens:

rejected promise not handled within 1 second: CodeExpectedError: Unable to write to User Settings because windowColor.workspaces is not a registered configuration.
extensionHostProcess.js:170
stack trace: CodeExpectedError: Unable to write to User Settings because projectColors.workspaces is not a registered configuration.
    at Twt.z (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:6793)
    at Twt.F (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:9281)
    at Twt.o (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:3874)
    at Object.factory (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:3774)
    at $m.j (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:30:75417)
    at $m.k (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:30:75550)
    at https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:30:75459
extensionHostProcess.js:170
rejected promise not handled within 1 second: CodeExpectedError: Unable to write to User Settings because windowColor.workspaces is not a registered configuration.
extensionHostProcess.js:170
stack trace: CodeExpectedError: Unable to write to User Settings because projectColors.workspaces is not a registered configuration.
    at Twt.z (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:6793)
    at Twt.F (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:9281)
    at Twt.o (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:3874)
    at Object.factory (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:3405:3774)
    at $m.j (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:30:75417)
    at $m.k (https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:30:75550)
    at https://labs.a.spring.nl/vscode/stable-6f3d0a7e5ae5f6623e1963e96adabc3287386006/static/out/vs/code/browser/workbench/workbench.js:30:75459


- [x] When a random color is loaded (on startup) when no existing color is found. That random color is not shown in the window settings color picker (it's a different color there)
- [x] The statusbar is colored is now selected by default, but it s not reflected on startup on the actual color of the statusbar. It's still uncolored somehow.