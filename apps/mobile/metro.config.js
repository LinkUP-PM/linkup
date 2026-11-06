const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
if (!config.resolver.sourceExts.includes("mjs")) {
  config.resolver.sourceExts.push("mjs");
}

const unpdfStub = path.resolve(projectRoot, "src/lib/unpdf.stub.js");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "unpdf") {
    return { type: "sourceFile", filePath: unpdfStub };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
