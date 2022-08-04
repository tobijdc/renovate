import { logger } from '../../../logger';
import { findLocalSiblingOrParent, readLocalFile } from '../../../util/fs';
import { regEx } from '../../../util/regex';
import { GithubTagsDatasource } from '../../datasource/github-tags';
import type { PackageDependency, PackageFile } from '../types';
import {
  ArchLinuxManagerData,
  ArrayField,
  OptionalField,
  RequiredField,
  SrcInfo,
  arrayFields,
  digestFields,
  partialFields,
  requiredFields,
} from './types';

const gitHubArchiveRegex = regEx(
  /^(.*::)?https:\/\/github.com\/(?<depName>\S+\/\S+)\/archive\/?(?<currentValue>v?\S+).tar.gz$/
);

function parseLine(line: string): readonly [string, string] | null {
  const result = /^\s*(?<key>\S+)\s*=\s*(?<value>.+)\s*$/.exec(line);
  if (!result) {
    return null;
  }
  const { key, value } = result.groups!;
  return [key, value];
}

type SrcInfoLines = ReadonlyArray<readonly [string, string]>;

function getUnique(
  source: SrcInfoLines,
  key: RequiredField | OptionalField
): string | undefined {
  return source.find((pair) => key === pair[0])?.[1];
}

function getArray(source: SrcInfoLines, key: ArrayField): string[] {
  return source.filter((pair) => key === pair[0]).map((pair) => pair[1]);
}

function parseSrcInfo(content: string, fileName: string): SrcInfo | null {
  const lines = content
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter((x) => x.line.trim())
    .map(({ line, index }) => ({ line, index, entry: parseLine(line) }));

  for (const { line, entry } of lines) {
    if (!entry) {
      logger.warn(`Invalid line in ${fileName}: ${line}`);
      return null;
    }
  }

  for (const field of requiredFields) {
    if (!lines.some((x) => field === x.entry?.[0])) {
      logger.warn(`Field "${field}" is required but not found`);
      return null;
    }
  }

  const parsedSource: SrcInfoLines = lines.map((x) => x.entry!);

  const uniques = Object.fromEntries(
    [...requiredFields, ...partialFields].map((field) => [
      field,
      getUnique(parsedSource, field),
    ])
  );

  const arrays = Object.fromEntries(
    arrayFields.map((field) => [field, getArray(parsedSource, field)])
  );

  return { ...uniques, ...arrays } as any;
}

function parseSource(source: string): PackageDependency | null {
  if (gitHubArchiveRegex.test(source)) {
    const { groups } = gitHubArchiveRegex.exec(source)!;
    if (groups) {
      return {
        depName: groups.depName,
        currentValue: groups.currentValue,
        datasource: GithubTagsDatasource.id,
      };
    }
  }

  return null;
}

function parseDigests(srcInfo: SrcInfo): ArchLinuxManagerData | null {
  const digests: ArchLinuxManagerData = {} as ArchLinuxManagerData;
  for (const digest of digestFields) {
    const value = srcInfo[digest];
    switch (digest) {
      case 'md5sums':
        digests['md5'] = value[0];
        break;
      case 'sha1sums':
        digests['sha1'] = value[0];
        break;
      case 'sha224sums':
        digests['sha224'] = value[0];
        break;
      case 'sha256sums':
        digests['sha256'] = value[0];
        break;
      case 'sha348sums':
        digests['sha348'] = value[0];
        break;
      case 'sha512sums':
        digests['sha512'] = value[0];
        break;
      case 'b2sums':
        digests['b2'] = value[0];
        break;
    }
  }

  return digests;
}

export async function extractPackageFile(
  content: string,
  fileName: string
): Promise<PackageFile<ArchLinuxManagerData> | null> {
  const srcInfoPath = await findLocalSiblingOrParent(fileName, '.SRCINFO');
  if (!srcInfoPath) {
    logger.warn(`No .SRCINFO found for ${fileName}`);
    return null;
  }

  const srcInfoContent = await readLocalFile(srcInfoPath, 'utf8');
  const srcInfo = parseSrcInfo(srcInfoContent!, fileName);

  if (!srcInfo) {
    return null;
  }

  if (srcInfo.source.length > 1) {
    logger.debug(`Multiple sources found in ${fileName}`);
    return null;
  }

  const deps: PackageDependency[] = [];

  const dep = parseSource(srcInfo.source[0]);
  const digests = parseDigests(srcInfo);

  if (dep && digests) {
    deps.push({ ...dep, managerData: { ...digests } });
  }

  return { deps };
}
