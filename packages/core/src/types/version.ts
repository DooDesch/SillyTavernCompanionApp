/** Response of `GET /version` (see src/util.js getVersion). Used as the discovery fingerprint. */
export interface StVersion {
  /** e.g. "SillyTavern:1.18.0:Cohee#1207" */
  agent?: string;
  pkgVersion?: string;
  gitRevision?: string;
  gitBranch?: string;
  commitDate?: string;
  isLatest?: boolean;
}
