// Asset Wolf Build Configuration
export const BUILD_INFO = {
  version: "1.0.0",
  buildNumber: 1,
  buildDate: "2026-04-23",
  checkpoint: "v1-pre-migration",
  description: "Stable baseline before legacy DB migration work",
};

export const getVersion = () => `${BUILD_INFO.version} (Build ${BUILD_INFO.buildNumber})`;