declare module 'validate-npm-package-name' {
  export default function validatePackageName(name: string): { validForNewPackages: boolean }
}
