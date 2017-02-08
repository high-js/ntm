'use strict';

import fs from 'fs';
import { join } from 'path';
import fsp from 'fs-promise';
import { exec } from 'child-process-promise';
import { task, formatMessage } from '@voila/common';

const VOILA_MODULE_CLIENT_VERSION = '^0.1.7';

export async function buildClient({ inputDir, clientDir, name, version, isPrivate, stage }) {
  let msg;

  const clientName = name + '-client';

  msg = formatMessage({ name: clientName, stage, message: 'Generating files' });
  await task(msg, async () => {
    // package.json
    const clientPkgFile = join(clientDir, 'package.json');
    const clientPkg = {
      name: clientName,
      moduleName: name,
      version,
      files: ['index.js'],
      dependencies: {
        '@voila/module-client': VOILA_MODULE_CLIENT_VERSION
      }
    };
    if (isPrivate != null) clientPkg.private = isPrivate;
    await fsp.outputFile(clientPkgFile, JSON.stringify(clientPkg, undefined, 2));

    // index.js
    const clientIndexFile = join(clientDir, 'index.js');
    let code = `"use strict";

module.exports = function(options) {
  var url = options && options.url;

  var client = require("@voila/module-client")({ url: url });

  return {\n`;

    const module = require(inputDir);
    for (let key of Object.keys(module)) {
      if (key === '__esModule') continue;
      let value = module[key];
      key = JSON.stringify(key);
      if (typeof value === 'function') {
        value = `client.createFunction(${key})`;
      } else {
        value = JSON.stringify(value);
      }
      code += `    ${key}: ${value},\n`;
    }
    if (code.slice(-2) === ',\n') code = code.slice(0, -2) + '\n';

    code += '  };\n};\n';

    await fsp.outputFile(clientIndexFile, code);

    // .npmrc
    const npmConfigFile = join(inputDir, '.npmrc');
    const clientNPMConfigFile = join(clientDir, '.npmrc');
    if (fs.existsSync(npmConfigFile)) {
      await fsp.copy(npmConfigFile, clientNPMConfigFile);
    } else {
      await fsp.remove(clientNPMConfigFile);
    }

    // .gitignore
    const clientGitIgnoreFile = join(clientDir, '.gitignore');
    const gitIgnore = '.DS_Store\n.npmrc\nnode_modules\nnpm-debug.log\n';
    await fsp.outputFile(clientGitIgnoreFile, gitIgnore);
  });

  msg = formatMessage({ name: clientName, stage, message: 'Installing dependencies' });
  await task(msg, async () => {
    await exec('npm install', { cwd: clientDir });
  });
}
