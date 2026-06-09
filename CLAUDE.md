## i18n (Deutsch + Englisch) — MUST be kept in sync

The app is fully internationalized with **i18next + react-i18next** (device language auto-detected via
`expo-localization`, manual override in Settings). There are NO hardcoded user-facing strings.

- Translations live in `apps/mobile/src/i18n/locales/de.json` and `en.json` (nested by namespace:
  `common`, `tabs`, `onboarding`, `chats`, `characters`, `character`, `settings`, `chat`, `authorsNote`,
  `quickSettings`, `lore`). Setup: `apps/mobile/src/i18n/index.ts`; language store: `src/stores/localeStore.ts`.
- In components: `const { t } = useTranslation();` then `t('ns.key')`. Outside components (e.g. a plain
  `.ts` showing an `Alert`): `import i18n from '@/i18n'; i18n.t('ns.key')`.
- Dynamic values use interpolation: `t('ns.key', { name })` with `"{{name}}"` in the JSON value.
- **Maintenance rule — non-negotiable:** every new user-facing string MUST be added as a key to **BOTH**
  `de.json` and `en.json` (same key path) and referenced via `t()` — never hardcode UI text. Keep the two
  files structurally identical (same keys). Reuse `common.*` for shared words (cancel/save/delete/close/…).
  Do NOT translate: code identifiers, log/console strings, API field names, icons/emoji/glyphs, classNames.

## graphify

This project has a graphify knowledge graph at .graphify/.

Rules:
- For codebase or architecture questions, when `.graphify/graph.json` exists, first run `graphify query "<question>"` (or `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`); these return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output
- If .graphify/wiki/index.md exists, navigate it instead of reading raw files
- If .graphify/graph.json is missing but graphify-out/graph.json exists, run `graphify migrate-state --dry-run` first; if tracked legacy artifacts are reported, ask before using the recommended `git mv -f graphify-out .graphify` and commit message
- If .graphify/needs_update exists or .graphify/branch.json has stale=true, warn before relying on semantic results and run /graphify . --update when appropriate
- Before proposing or committing .graphify artifacts, run `graphify portable-check .graphify`; commit-safe graph artifacts must use repo-relative paths, and never commit .graphify/branch.json, .graphify/worktree.json, .graphify/needs_update, or .graphify/cache/. If a repo already tracks any of them, first add them to .gitignore, then propose `git rm --cached .graphify/branch.json .graphify/worktree.json .graphify/needs_update` and `git rm -r --cached .graphify/cache`; never mutate git state without asking
- Before deep graph traversal, prefer `graphify summary --graph .graphify/graph.json` for compact first-hop orientation
- For review impact on changed files, use `graphify review-delta --graph .graphify/graph.json` instead of generic traversal
- Read `.graphify/GRAPH_REPORT.md` only for broad architecture review or when `query` / `path` / `explain` do not surface enough context
- After modifying code files in this session, run `npx graphify hook-rebuild` to keep the graph current
