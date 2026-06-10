import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * Sideload self-update: check the GitHub latest release, and on request download the APK
 * and hand it to Android's package installer (content:// URI via FileProvider). Requires
 * the REQUEST_INSTALL_PACKAGES permission; the system still asks the user to confirm and,
 * on first use, to allow installs from this app.
 */
// NOT /releases/latest: that endpoint only knows stable releases and 404s while every
// release of this app is still marked as a pre-release (beta).
const RELEASES_API = 'https://api.github.com/repos/DooDesch/SillyTavernCompanionApp/releases?per_page=10';
export const RELEASES_URL = 'https://github.com/DooDesch/SillyTavernCompanionApp/releases';

export interface UpdateInfo {
  version: string;
  apkUrl: string;
  apkSize: number;
  notes: string;
  htmlUrl: string;
}

/** numeric semver compare ignoring pre-release suffixes; >0 when a is newer. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

interface GithubRelease {
  tag_name?: string;
  body?: string;
  html_url?: string;
  draft?: boolean;
  assets?: { name: string; browser_download_url: string; size: number }[];
}

function releaseVersion(release: GithubRelease): string {
  return (release.tag_name ?? '').replace(/^v/, '').split('-')[0] ?? '';
}

/** Returns update info when the newest GitHub release (incl. pre-releases) beats the running app. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const current = Constants.expoConfig?.version;
  if (!current) return null;
  const res = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const releases = (await res.json()) as GithubRelease[];
  if (!Array.isArray(releases)) return null;
  const newest = releases
    .filter((r) => !r.draft && releaseVersion(r))
    .sort((a, b) => compareVersions(releaseVersion(b), releaseVersion(a)))[0];
  if (!newest) return null;
  const latest = releaseVersion(newest);
  if (compareVersions(latest, current) <= 0) return null;
  const apk = newest.assets?.find((a) => a.name.endsWith('.apk'));
  if (!apk) return null;
  return {
    version: latest,
    apkUrl: apk.browser_download_url,
    apkSize: apk.size,
    notes: (newest.body ?? '').trim(),
    htmlUrl: newest.html_url ?? RELEASES_URL,
  };
}

/**
 * Download the release APK to the cache and open Android's installer with it.
 * Resolves once the installer has been launched (the install itself is up to the user/OS).
 */
export async function downloadAndInstallUpdate(
  info: UpdateInfo,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('android only');
  const target = `${FileSystem.cacheDirectory}SillyTavernCompanion-v${info.version}.apk`;
  const download = FileSystem.createDownloadResumable(
    info.apkUrl,
    target,
    {},
    onProgress
      ? (p) => {
          if (p.totalBytesExpectedToWrite > 0) {
            onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
          }
        }
      : undefined,
  );
  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error('download failed');
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
