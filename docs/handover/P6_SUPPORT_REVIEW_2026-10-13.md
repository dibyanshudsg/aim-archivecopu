# Dependency and framework support review — 13 October 2026

Compatibility review only; no upgrade or accepted exception. P6-01 stays open.

The 10 October audit retains 96 native-only advisory records / 78 unique identifiers. Root CI installs the whole workspace, so native feature exclusion does not remove tooling exposure. Critical records are shell-quote through React Native devtools (GHSA-w7jw-789q-3m8p, recorded fix >=1.8.4) and tar through Expo CLI (GHSA-23hp-3jrh-7fpw, recorded fix >=7.5.19). Recorded braces, node-forge and sprintf-js findings have no published fix in that audit. This is not a fresh advisory scan.

Source uses Expo 52 / React Native 0.76.9. [Expo guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) recommends incremental SDK upgrades and aligned dependency/doctor checks. A blanket override cannot establish compatibility or resolve no-fix findings. For web delivery, review isolating preserved mobile source from operational web/worker installation; prove a new install/lockfile/audit boundary before claiming remediation. No retirement or native migration was performed.

The [Next support policy](https://nextjs.org/support-policy), checked 13 October, lists 16 as active LTS and 15 as maintenance LTS, with two years from initial release. Applying it to 21 October 2024 gives **21 October 2026** as the Next 15 endpoint (inference). A supported-major migration is release work; it need not withhold source access today.

The [Next 16 guide](https://nextjs.org/docs/app/guides/upgrading/version-16) identifies bundler/cache API changes. Local review found the custom webpack canvas alias in `apps/web/next.config.ts` and one-argument `revalidateTag` in `apps/web/src/lib/public-cache.ts`. Validate bundling and invalidation explicitly, then native PDF/OCR, production build, image optimization, reader/ranges and isolated CI. Preserve PDF.js v4/canvas and React overrides unless separately reworked. No major upgrade was applied.

Share the reviewed source as a development candidate with documented limitations. First hosted CI, staging/origin closure, authentication/security acceptance and receiving operation remain separate; no finding is silently waived.
