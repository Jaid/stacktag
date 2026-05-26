export const parsePackageManagerVersion = (packageManager: string | undefined, expectedPackageManager: string) => {
  if (!packageManager) {
    return
  }
  const pattern = new RegExp(`^${expectedPackageManager}[@](?<version>.+)$`, 'i')
  return pattern.exec(packageManager.trim())?.groups?.version
}
