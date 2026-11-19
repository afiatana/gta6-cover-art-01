# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/afiatana/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/afiatana/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Sunset Cover Maker — turn your photo and a caption into bold multi-panel poster cover art in the style of GTA 6's posters, and export it as a PNG to share. Pick up to three photos from your machine (nothing is uploaded), crop and position each panel, choose a layout (Hero, Triptych or Grid) and a sunset/neon colour grade, write your title and tagline, and export in 1080 × 1080, 1080 × 1350 or 1920 × 1080. Everything is original artwork drawn in code: no Rockstar logo, artwork, character or font. The caption lettering uses Bebas Neue and Anton, both shipped under the SIL Open Font License.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network at runtime — `app/` is plain static files. `main.ts` hands the app in: it copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3ywr8vjw&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
