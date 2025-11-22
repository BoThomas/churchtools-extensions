declare module 'virtual:extension-info' {
  export interface ExtensionInfo {
    name: string;
    version: string;
    description: string;
    gitHash: string;
    gitBranch: string;
    buildDate: string;
  }

  const extensionInfo: ExtensionInfo;
  export default extensionInfo;
}
