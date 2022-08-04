import type { UpdateDependencyConfig } from '../types';

function updateVersion(
  fileContent: string,
  oldVersion: string,
  newVersion: string
): string {
  if (fileContent.includes(oldVersion)) {
    return fileContent.replace(oldVersion, newVersion);
  } else if (
    oldVersion.startsWith('v') &&
    newVersion.startsWith('v') &&
    fileContent.includes(oldVersion.substring(1))
  ) {
    return fileContent.replace(
      oldVersion.substring(1),
      newVersion.substring(1)
    );
  }

  return fileContent;
}

export function updateDependency({
  fileContent,
  upgrade,
}: UpdateDependencyConfig): Promise<string | null> {
  const newFileContent = updateVersion(
    fileContent,
    upgrade.currentValue!,
    upgrade.newValue!
  );
  return Promise.resolve(newFileContent);
}
