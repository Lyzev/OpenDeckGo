# OpenDeckGo

Stream Deck plugin showing your OpenCode Go subscription usage (rolling, weekly, monthly) on a key.

Each key shows a percent, a colored usage bar (green = ok, red = rate-limited) with the reset countdown inside, and the metric name. Three data rows all on one key if you pick `All three (compact)`.

## Settings

- **API key**: your OpenCode Go key from [opencode.ai/console](https://opencode.ai/console)
- **Metric**: Rolling (default), Weekly, Monthly, or All three (compact)
- **Fetch frequency**: 15 min (default), 30 min, 1 h, or on push

## Install

Download `dev.lyzev.opendeckgo.streamDeckPlugin` from [releases](https://github.com/Lyzev/OpenDeckGo/releases) and install it in OpenDeck.

## Development

Sources in `src/dev.lyzev.opendeckgo.sdPlugin`. Tests: `node test/test.js`. Key check before installing: `node test/usage-cli.js "<key>"`. Icons: `node scripts/icons.js` (needs inkscape).

Tags `v<version>` trigger CI test + package + GitHub release; manifest `Version` must match the tag.

## License

[AGPL-3.0](LICENSE)
