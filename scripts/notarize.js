const { notarize } = require('electron-notarize');


exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  
  console.log(appOutDir, appName)

  return await notarize({
    appBundleId: 'com.siempre.siemprevideodesktop',
    appPath: `${appOutDir}/${appName}.app`,
    ascProvider: process.env.APPLEPROVIDER,
    appleId: process.env.APPLEID,
    // TODO make it easier to use this / add instructions
    //appleIdPassword: `@keychain:apple-id-electron-notarize`
    appleIdPassword: process.env.APPLEPASSWORD
  });
};
