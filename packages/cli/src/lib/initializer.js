'use strict';

import { exec } from 'child-process-promise';
import { getPackage, putPackage, isYarnPreferred, task } from '@voila/common';
import { run } from './runner';

export async function initialize({ pkgDir, stage, type, yarn }) {
  let pkg = getPackage(pkgDir);

  let config = pkg.voila;
  if (!config) {
    config = {};
    // Add the 'voila' field now so it has more chance
    // to be placed before the 'devDependencies' field
    pkg.voila = config;
    putPackage(pkgDir, pkg);
  }

  if (type !== config.type) {
    await remove({ pkgDir, stage, type: config.type, yarn });
  }

  await install({ pkgDir, stage, type, yarn });

  if (type !== config.type) {
    pkg = getPackage(pkgDir);
    config.type = type;
    pkg.voila = config;
    putPackage(pkgDir, pkg);
  }

  const args = [
    'initialize',
    `--package-dir=${pkgDir}`,
    `--stage=${stage}`
  ];
  if (yarn != null) args.push(`--yarn=${yarn}`);
  await run({ pkgDir, type, args });
}

async function install({ pkgDir, type, yarn }) {
  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `Installing ${type} using ${yarnPreferred ? 'yarn' : 'npm'}...`;
  const successMessage = `${type} installed`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn add ${type} --dev`;
    } else {
      cmd = `npm install ${type} --save-dev`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}

async function remove({ pkgDir, type, yarn }) {
  const pkg = getPackage(pkgDir);

  if (!(pkg.devDependencies && pkg.devDependencies.hasOwnProperty(type))) return;

  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `Removing ${type} using ${yarnPreferred ? 'yarn' : 'npm'}...`;
  const successMessage = `${type} removed`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn remove ${type} --dev`;
    } else {
      cmd = `npm rm ${type} --save-dev`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}
