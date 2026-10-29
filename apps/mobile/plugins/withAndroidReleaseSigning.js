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
  if (buildGradle.includes("keystorePropertiesFile")) {
    return buildGradle;
  }

  const header = `def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;

  let next = buildGradle.replace(
    /android\s*\{/,
    `${header}android {`,
  );

  if (!next.includes("signingConfigs")) {
    next = next.replace(
      /buildTypes\s*\{/,
      `signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {`,
    );
  }

  next = next.replace(
    /buildTypes\s*\{([\s\S]*?)release\s*\{/,
    (match) => {
      if (match.includes("signingConfig signingConfigs.release")) return match;
      return match.replace(
        /release\s*\{/,
        `release {
            signingConfig signingConfigs.release`,
      );
    },
  );

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
