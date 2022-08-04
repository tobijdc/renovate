import { join } from 'upath';
import { Fixtures } from '../../../../test/fixtures';
import { fs } from '../../../../test/util';
import { extractPackageFile } from './extract';

jest.mock('../../../util/fs');

const yayPkgBuild = Fixtures.get(join('yay', 'PKGBUILD'));
const yaySrcInfo = Fixtures.get(join('yay', '.SRCINFO'));

describe('modules/manager/arch-linux/extract', () => {
  describe('extractPackageFile()', () => {
    beforeEach(() => {
      fs.findLocalSiblingOrParent.mockResolvedValue('.SRCINFO');
      fs.readLocalFile.mockResolvedValue(yaySrcInfo);
    });

    it('should return null if no sibling .SRCINFO', async () => {
      fs.findLocalSiblingOrParent.mockResolvedValue(null);
      const res = await extractPackageFile(yayPkgBuild, 'PKGBUILD');
      expect(res).toBeNull();
    });

    it('should extract package file', async () => {
      const res = await extractPackageFile(yayPkgBuild, 'PKGBUILD');
      expect(res).toStrictEqual({
        deps: [
          {
            depName: 'Jguer/yay',
            currentValue: 'v11.1.2',
            currentDigest:
              '17240f2eca254814516d38e3cf235211a7015844e835df46465b9f062304d94a',
            datasource: 'github-tags',
          },
        ],
      });
    });
  });
});
