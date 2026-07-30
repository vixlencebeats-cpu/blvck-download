const createDesktopShortcut = require('create-desktop-shortcuts');
const path = require('path');

const projectPath = __dirname;
const batPath = path.join(projectPath, 'run.bat');
const iconPath = path.join(projectPath, 'blvckicon.ico');

const success = createDesktopShortcut({
  windows: {
    filePath: batPath,
    name: 'blvck-download',
    icon: iconPath,
    workingDirectory: projectPath,
  }
});

if (success) {
  console.log('✅ Desktop shortcut "blvck-download" created automatically!');
} else {
  console.log('⚠️ Could not auto-create desktop shortcut.');
}