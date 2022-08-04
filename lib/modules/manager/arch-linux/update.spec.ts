import { join } from 'upath';
import { Fixtures } from '../../../../test/fixtures';
import { updateDependency } from './update';

const yayPkgBuild = Fixtures.get(join('yay', 'PKGBUILD'));
const yaySrcInfo = Fixtures.get(join('yay', 'PKGBUILD'));

describe('modules/manager/arch-linux/update', () => {
  describe('updateDependency()', () => {
    it('should return null if no updated deps', async () => {
      const res = await updateDependency({
        fileContent: yayPkgBuild,
        upgrade: {
          currentValue: '11.1.2',
          newValue: '11.2.0',
        },
      });
      expect(res).toBeNull();
    });
  });
});
