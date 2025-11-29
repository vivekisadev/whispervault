const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const remoteUrl = 'https://github.com/vivekisadev/whispervault.git';
const rootDir = process.cwd();

// Helper to run commands
function run(cmd, env = {}) {
    // console.log(`Running: ${cmd}`);
    try {
        execSync(cmd, { stdio: 'pipe', env: { ...process.env, ...env } });
    } catch (e) {
        console.error(`Failed to run: ${cmd}`);
        console.error(e.stderr.toString());
        throw e;
    }
}

// 1. Remove .git
const gitDir = path.join(rootDir, '.git');
if (fs.existsSync(gitDir)) {
    console.log('Removing existing .git directory...');
    try {
        fs.rmSync(gitDir, { recursive: true, force: true });
    } catch (e) {
        // Retry with shell command if node fails (sometimes windows permission issues)
        try {
            execSync('rmdir /s /q .git', { stdio: 'ignore' });
        } catch (e2) {
            console.error('Could not remove .git directory. Please delete it manually and re-run.');
            process.exit(1);
        }
    }
}

// 2. Init git
console.log('Initializing new git repository...');
try {
    run('git init');
    run(`git remote add origin ${remoteUrl}`);
} catch (e) {
    process.exit(1);
}

// 3. Find files
function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (['node_modules', '.git', '.next', 'dist', 'build', '.agent'].includes(file)) continue;
            getFiles(filePath, fileList);
        } else {
            if (file === 'setup_history.js') continue;
            fileList.push(path.relative(rootDir, filePath));
        }
    }
    return fileList;
}

const allFiles = getFiles(rootDir);
console.log(`Found ${allFiles.length} files.`);

// 4. Calculate dates
// We want to end roughly today.
// Total duration calculation (approximate)
// Assuming avg batch size 3, so total batches = files / 3
// Duration = batches * 30 days
const msPerDay = 24 * 60 * 60 * 1000;
const totalBatches = Math.ceil(allFiles.length / 3);
const totalDays = totalBatches * 30;
let currentDate = new Date(Date.now() - (totalDays * msPerDay));

console.log(`Starting commits from: ${currentDate.toISOString()}`);

// 5. Commit loop
// Shuffle files for randomness
for (let i = allFiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allFiles[i], allFiles[j]] = [allFiles[j], allFiles[i]];
}

let fileIndex = 0;
while (fileIndex < allFiles.length) {
    // Determine batch size (2 to 5 files)
    const batchSize = Math.floor(Math.random() * 4) + 2;
    const batchFiles = allFiles.slice(fileIndex, fileIndex + batchSize);
    fileIndex += batchSize;

    console.log(`\nProcessing batch of ${batchFiles.length} files on ${currentDate.toISOString().split('T')[0]}...`);

    // Commit each file in the batch
    for (const file of batchFiles) {
        const relPath = file.replace(/\\/g, '/');

        // Add file
        try {
            run(`git add "${relPath}"`);
        } catch (e) {
            console.log(`Skipping ignored: ${relPath}`);
            continue;
        }

        // Format date
        const dateStr = currentDate.toISOString();

        try {
            run(`git commit -m "Add ${relPath}"`, {
                GIT_AUTHOR_DATE: dateStr,
                GIT_COMMITTER_DATE: dateStr
            });
            process.stdout.write(`.`);
        } catch (e) {
            // ignore commit errors
        }

        // Advance time by 20-120 minutes for next commit in same batch
        const minutesToAdd = 20 + Math.random() * 100;
        currentDate = new Date(currentDate.getTime() + (minutesToAdd * 60 * 1000));
    }

    // Advance time by ~1 month (25-35 days) after the batch
    const daysToAdd = 25 + Math.random() * 10;
    currentDate = new Date(currentDate.getTime() + (daysToAdd * msPerDay));
}

console.log('\nDone!');
console.log('To push the changes, run:');
console.log('git branch -M main');
console.log('git push -f origin main');
