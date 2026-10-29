const {
  withAppBuildGradle,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const KEYSTORE_NAME = "linkup-release.keystore";
const PROPERTIES = `storePassword=linkup-sideload
keyPassword=linkup-sideload
keyAlias=linkup
storeFile=linkup-release.keystore
`;

const RELEASE_SIGNING_CONFIG = `        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
`;

function ensureSigningFiles(projectRoot, androidAppDir) {
  const source = path.join(projectRoot, "credentials", KEYSTORE_NAME);
  const destKeystore = path.join(androidAppDir, KEYSTORE_NAME);
  const destProps = path.join(androidAppDir, "keystore.properties");

  if (!fs.existsSync(source)) {
    throw new Error(
      `Keystore não encontrado em ${source}. Gere apps/mobile/credentials/${KEYSTORE_NAME}.`,
    );
  }

  fs.copyFileSync(source, destKeystore);
  fs.writeFileSync(destProps, PROPERTIES, "utf8");
}

function applySigningBlock(buildGradle) {
  let next = buildGradle;

  if (!next.includes("keystorePropertiesFile")) {
    const header = `def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;
    next = next.replace(/android\s*\{/, `${header}android {`);
  }

  if (!/signingConfigs\s*\{[\s\S]*?\brelease\s*\{/.test(next)) {
    if (/signingConfigs\s*\{/.test(next)) {
      next = next.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {\n${RELEASE_SIGNING_CONFIG}`,
      );
    } else {
      next = next.replace(
        /buildTypes\s*\{/,
        `signingConfigs {\n${RELEASE_SIGNING_CONFIG}    }\n    buildTypes {`,
      );
    }
  }

  if (!next.includes("signingConfig signingConfigs.release")) {
    next = next.replace(
      /buildTypes\s*\{([\s\S]*?)release\s*\{/,
      (match) =>
        match.replace(
          /release\s*\{/,
          `release {
            signingConfig signingConfigs.release`,
        ),
    );
  }

  return next;
}

function withAndroidReleaseSigning(config) {
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidAppDir = path.join(cfg.modRequest.platformProjectRoot, "app");
      ensureSigningFiles(projectRoot, androidAppDir);
      return cfg;
    },
  ]);

  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applySigningBlock(cfg.modResults.contents);
    return cfg;
  });

  return config;
}

module.exports = withAndroidReleaseSigning;
