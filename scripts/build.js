#!/usr/bin/env node

"use strict";

const fs = require("fs-extra");
const child_process = require("child_process");
const path = require("path");

const INJECTED_FILES = {
    "package.json": "./package.json",
    "README.md": "./README.md",
    "LICENSE": "./LICENSE"
};

const BUILD_DIR = "./dist";

(function main() {
    fs.removeSync(BUILD_DIR);

    // UMD
    compile("es5", undefined, `--rootDir ./src --module amd --outFile ${BUILD_DIR}/bundles/lithium.umd.js`);

    // ES5, ES2015
    compile("es5", "esm5", "--rootDir ./src --declaration");
    compile("es2015", "esm2015", "--rootDir ./src --declaration");

    // Typings
    compile("esnext", undefined, " --declaration --emitDeclarationOnly", "tsc");

    for (let injectedFileName in INJECTED_FILES) {
        fs.copy(INJECTED_FILES[injectedFileName], path.join(BUILD_DIR, injectedFileName));
    }
})();

function compile(target, outDir, options, compiler) {
    outDir = outDir || "";
    options = options || "";
    compiler = compiler || "ngc";

    child_process.execSync(`${compiler} -p tsconfig.json --target ${target} --outDir ./dist/${outDir} ${options}`);
}