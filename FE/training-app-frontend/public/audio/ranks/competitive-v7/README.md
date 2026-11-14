# Progressive rank cues v7

Nine separate stereo WAV mixes with increasing peak strength (0.45–0.89), duration (2.3–4.7 seconds) and effects layering. Iron uses one restrained hit; Bronze adds a finish; Silver introduces a short riser; Gold and Platinum add rhythmic accents; Diamond expands the motif; Elite, Master and Legend add multi-stage finishing impacts. Neural spoken names are embedded into the WAV and preserved in full.

Sources and voice are inherited from competitive-v6/README.md; Kenney Sci-fi Sounds CC0 licence is in ../Kenney-SciFi-License.txt. Build: scripts/Mix-RankAnnouncerV7.cjs. Validate: node scripts/Verify-RankProgression.cjs.

Playback uses a shared promise cache, one retry on transient fetch/decode failure, WAV signature validation, and failed-request eviction. Failed background preloads do not change the visible playback-error state; only the current audition may do so. A fresh replay clears the previous error first.
