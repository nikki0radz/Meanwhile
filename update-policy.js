// Accept only signed-release metadata published to this app's own repository.
export function parseRelease(data){
 if(!data||data.appId!=='uk.co.nikkiradz.meanwhile'||data.platform!=='android'||!Number.isSafeInteger(data.build)||data.build<1||typeof data.version!=='string'||!/^\d+\.\d+\.\d+$/.test(data.version)||typeof data.sha256!=='string'||!/^[a-f0-9]{64}$/.test(data.sha256))throw Error('The update information is invalid.');
 const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='raw.githubusercontent.com'||url.port||url.username||url.password||url.search||url.hash||url.pathname!==`/nikki0radz/Meanwhile/main/downloads/Meanwhile-${data.version}.apk`)throw Error('The update download address is not trusted.');
 return {version:data.version,build:data.build,url:url.href,sha256:data.sha256,notes:typeof data.notes==='string'?data.notes.slice(0,1500):''};
}
export function newerRelease(data,installedBuild){const release=parseRelease(data);if(!Number.isSafeInteger(installedBuild)||installedBuild<1)throw Error('Could not read the installed app version.');return release.build>installedBuild?release:null;}
