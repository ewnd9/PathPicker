'use strict';

const execa = require('execa');

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

async function main() {
  const version = await execa.stdout('python', [`${__dirname}/src/version.py`]);
  const datetime = await execa.stdout('date', ['+%a, %d %b %Y %H:%M:%S %z']);

  const buildDir = `/tmp/pathpicker-${version}`;
  await execa('rm', ['-rf', buildDir]);
  await execa('cp', ['-R', `${__dirname}/debian/.`, buildDir]);

  console.log(`echo "Building fpp version ${version} at ${datetime}`);

  await execa('mkdir', ['-p', `${buildDir}/usr/bin`]);
  await execa('mkdir', ['-p', `${buildDir}/usr/share/pathpicker/src/`]);

  await execa.shell(`sed s#__version__#"${version}"# < "${buildDir}/DEBIAN/control" > "${buildDir}/DEBIAN/control.modif"`);
  await execa('mv', [`${buildDir}/DEBIAN/control.modif`, `${buildDir}/DEBIAN/control`]);

  console.log('====================');
  console.log('Control file is:');
  console.log('====================');
  await execa('cat', [`${buildDir}/DEBIAN/control`], { stdio: 'inherit' });
  console.log('====================');

  await execa('cp', ['-R', `${__dirname}/src`, `${buildDir}/usr/share/pathpicker`]);
  await execa('cp', [`${__dirname}/fpp`, `${buildDir}/usr/share/pathpicker/fpp`]);

  console.log('Creating symlink...');
  await execa('ln', ['-f', '-s', '../share/pathpicker/fpp', 'fpp'], { cwd: `${buildDir}/usr/bin` });
  await execa.shell(`sed s#__version__#"$VERSION"# < "${buildDir}/usr/share/doc/pathpicker/changelog" > "${buildDir}/usr/share/doc/pathpicker/changelog.modif"`);
  await execa.shell(`sed s#__date_timestamp__#"$DATETIME"# < "${buildDir}/usr/share/doc/pathpicker/changelog.modif" > "${buildDir}/usr/share/doc/pathpicker/changelog"`);

  console.log('====================');
  console.log('Changelog is:');
  console.log('====================');
  await execa('cat', [`${buildDir}/usr/share/doc/pathpicker/changelog`], { stdio: 'inherit' });
  console.log('====================');

  console.log('Gziping...');
  await execa('gzip', ['-9', `${buildDir}/usr/share/doc/pathpicker/changelog`], { stdio: 'inherit' });
  await execa('rm', [`${buildDir}/usr/share/doc/pathpicker/changelog.modif`], { stdio: 'inherit' });

  console.log('Setting permissions...');
  await execa.shell('find . -type d -exec chmod 755 {} \\;', { stdio: 'inherit', cwd: buildDir });
  await execa.shell('find . -type f -exec chmod 644 {} \\;', { stdio: 'inherit', cwd: buildDir });

  console.log('Building package...');
  await execa('rm', [`${buildDir}/package.sh`]);
  await execa('chmod', ['755', `${buildDir}/usr/share/pathpicker/fpp`]);
  await execa('fakeroot', ['--', 'sh', '-c', `chown -R root:root * && dpkg --build ./ ${__dirname}/fpp_${version}_noarch.deb;`], { cwd: buildDir });

  console.log('Done! Check out fpp.deb');
}


