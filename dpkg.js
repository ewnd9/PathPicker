'use strict';

const execa = require('execa');

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

async function main() {
  const pwd = `${__dirname}/debian`;
  const version = await execa.stdout('python', [`${pwd}/../src/version.py`]);
  const datetime = await execa.stdout('date', ['+%a, %d %b %Y %H:%M:%S %z']);

  console.log(`echo "Building fpp version ${version} at ${datetime}`);

  await execa('mkdir', ['-p', `${pwd}/usr/bin`]);
  await execa('mkdir', ['-p', `${pwd}/usr/share/pathpicker/src/`]);

  await execa.shell(`sed s#__version__#"${version}"# < "${pwd}/DEBIAN/control" > "${pwd}/DEBIAN/control.modif"`);
  await execa('mv', [`${pwd}/DEBIAN/control.modif`, `${pwd}/DEBIAN/control`]);

  console.log('====================');
  console.log('Control file is:');
  console.log('====================');
  await execa('cat', [`${pwd}/DEBIAN/control`], { stdio: 'inherit' });
  console.log('====================');

  await execa('cp', ['-R', `${pwd}/../src`, `${pwd}/usr/share/pathpicker`]);
  await execa('cp', [`${pwd}/../fpp`, `${pwd}/usr/share/pathpicker/fpp`]);

  console.log('Creating symlink...');
  await execa('ln', ['-f', '-s', '../share/pathpicker/fpp', 'fpp'], { cwd: `${pwd}/usr/bin/` });
  await execa.shell(`sed s#__version__#"$VERSION"# < "${pwd}/usr/share/doc/pathpicker/changelog" > "${pwd}/usr/share/doc/pathpicker/changelog.modif"`);
  await execa.shell(`sed s#__date_timestamp__#"$DATETIME"# < "${pwd}/usr/share/doc/pathpicker/changelog.modif" > "${pwd}/usr/share/doc/pathpicker/changelog"`);

  console.log('====================');
  console.log('Changelog is:');
  console.log('====================');
  await execa('cat', [`${pwd}/usr/share/doc/pathpicker/changelog`], { stdio: 'inherit' });
  console.log('====================');

  console.log('Gziping...');
  await execa('gzip', ['-9', `${pwd}/usr/share/doc/pathpicker/changelog`], { stdio: 'inherit' });
  await execa('rm', [`${pwd}/usr/share/doc/pathpicker/changelog.modif`], { stdio: 'inherit' });

  console.log('Setting permissions...');
  await execa.shell('find . -type d -exec chmod 755 {} \\;', { stdio: 'inherit', cwd: pwd });
  await execa.shell('find . -type f -exec chmod 644 {} \\;', { stdio: 'inherit', cwd: pwd });

  console.log('Building package...');
  await execa('rm', [`${pwd}/package.sh`]);
  await execa('chmod', ['755', `${pwd}/usr/share/pathpicker/fpp`]);
  await execa('fakeroot', ['--', 'sh', '-c', `chown -R root:root * && dpkg --build ./ ../fpp_${version}_noarch.deb;`], { cwd: pwd });
  console.log('Restoring template files...');

  const restoreFiles = [`${pwd}/DEBIAN/control`, `${pwd}/usr/share/doc/pathpicker/changelog`, `${pwd}/package.sh`];
  await execa('git', ['checkout', 'HEAD', '--', ...restoreFiles], { cwd: `${pwd}/..`, stdio: 'inherit' });
  await execa('chmod', ['777', `${pwd}/package.sh`]);

  console.log('Done! Check out fpp.deb');
}


