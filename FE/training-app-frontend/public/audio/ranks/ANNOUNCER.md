# Rank audio version 5

Nine pre-rendered stereo cues with a synthetic English announcer speaking the rank name. Voice: Microsoft David Desktop via Windows System.Speech; pitch lowered slightly in the final mix. This is synthetic speech, not an actor or a cloned game announcer.

Recorded game-development effects: Kenney Impact Sounds, CC0, https://kenney.nl/assets/impact-sounds . Source distribution mirror: https://github.com/GeorgeQLe/assets-sfx-combat/tree/main/assets/kenney/impact-sounds . Included licence: Kenney-License.txt. No Supercell or Brawl Stars recordings are included.

The mix uses different recorded impacts, reverse transients, bass reinforcement, stereo accents, voice ducking, compression and short vocal reflections and detuned victory stabs. Existing volume and stop/replay controls apply to the entire pre-rendered cue, including the voice. No browser speech service or runtime network voice request is required.

Build: scripts/Mix-RankAnnouncer.cjs, using source OGG and generated voice WAV files in artifacts/rank-sources. scripts/Generate-RankAudio.mjs creates the older procedural cues and will overwrite this mix; run the announcer mixer afterwards to restore version 5.
