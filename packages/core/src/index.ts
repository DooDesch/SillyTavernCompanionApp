// Public surface of @st/core - the platform-independent SillyTavern engine.
// No React Native imports live here; everything is testable under Node.

// Domain types
export type {
  StCharacter,
  StCharacterData,
  StCharacterExtensions,
  StDepthPrompt,
  StChat,
  StChatHeader,
  StChatMessage,
  StChatMetadata,
  StMessageExtra,
  StVersion,
} from './types/index';

// Networking abstraction
export type { FetchLike, FetchInitLike, FetchResponseLike } from './net/http';

// Connection / API
export { StClient } from './connection/StClient';
export type { StClientOptions, StResponse, BasicAuthCredentials } from './connection/StClient';
export { CookieJar, readSetCookie, splitSetCookieHeader } from './connection/cookies';
export {
  getVersion,
  isReachable,
  getSettings,
  saveSettings,
  getTextCompletionStatus,
  getChatCompletionStatus,
  getKoboldStatus,
  getHordeStatus,
  getHordeModels,
  getHordeWorkers,
  getAllCharacters,
  getCharacter,
  getCharacterChats,
  getChat,
  saveChat,
  renameChat,
  deleteChat,
  getWorldInfo,
} from './connection/endpoints';
export type {
  ChatFileInfo,
  SaveChatResult,
  BackendStatus,
  KoboldBackendStatus,
} from './connection/endpoints';

// Discovery
export type { DiscoveredInstance, DiscoveryProvider, DiscoverySource } from './discovery/types';
export { scanSubnet, probeInstance } from './discovery/subnetScan';
export type { ScanOptions, ProbeOptions } from './discovery/subnetScan';
export { scanForKobold, probeKobold } from './discovery/kobold';
export type { KoboldInstance, KoboldScanOptions, KoboldProbeOptions } from './discovery/kobold';
export { fingerprintVersion, htmlLooksLikeSillyTavern } from './discovery/fingerprint';
export type { Fingerprint } from './discovery/fingerprint';
export { mapPool } from './discovery/pool';
export {
  enumerateSubnet24,
  enumerateSubnetHosts,
  netmaskToPrefix,
  ipv4ToInt,
  intToIpv4,
  sameSubnet24,
} from './discovery/ip';

// Chat (de)serialization + conflict handling
export {
  chatFromArray,
  chatToArray,
  parseChatJsonl,
  stringifyChatJsonl,
  createChatHeader,
} from './chat/serialize';
export { getIntegritySlug, isIntegrityConflict, INTEGRITY_ERROR } from './chat/integrity';

// Prompt engine (text-completion / KoboldCpp)
export * from './prompt-engine/index';

// Streaming
export { SseParser } from './streaming/sseParser';
export type { SseEvent } from './streaming/sseParser';
export { parseTextgenData } from './streaming/textgen';
export type { TextgenDelta } from './streaming/textgen';
export { parseKoboldData, parseTokenFrame } from './streaming/kobold';
export type { TokenFrameDelta } from './streaming/kobold';
export { iterateSseStream } from './streaming/stream';
export type { GenerateStreamRequest, StreamToken, StreamTransport } from './streaming/stream';
export { SmoothPacer, smoothDelayMs, SMOOTH_SPEED_DEFAULT } from './streaming/smooth';
export type { PacerTick, SmoothPacerOptions } from './streaming/smooth';
