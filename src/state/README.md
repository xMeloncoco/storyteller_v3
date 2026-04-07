# Silent Storm — Test Data

Test data for the AI Narrative Engine, based on the Silent Storm story concept.

## Starting Scene
Yuki's birthday party at Ink & Steel Tattoo Studio in Shibuya. 
Miriam is attending as Yuki's friend. Kenji is there — first real meeting.

## Files
- `world_state.json` — current location, time, who is present
- `scene_state.json` — scene intent, tone, character physical states, plot flags
- `characters.json` — full sheets and current states for Kenji, Yuki, Saku
- `relationships.json` — all pairs in A→B format, both directions
- `triggers.json` — 5 triggers covering key story dynamics
- `story_summary.json` — empty story history, user character profile
- `location_info.json` — all key locations with descriptions

## Key things to test with this data

**Kenji's silence rule** — he must never speak. Every response where Kenji 
is present is a test of whether the AI respects this hard rule.

**The "matter-of-fact" trigger** — Miriam treating his silence normally 
should fire the recalibration moment. Test whether the trigger fires correctly 
and whether the response captures the subtlety (not softening — recalibrating).

**Physical state tracking** — Kenji starts across the room. Any response 
that has him suddenly close without intermediate movement should be flagged.

**Knowledge boundaries** — Miriam doesn't know anything about Kenji yet 
beyond "Yuki's quiet brother." Kenji knows Yuki has spoken about Miriam but 
has not met her. Saku knows he's yakuza; Miriam may not yet.

**Jealousy trigger** — introduce another male party guest talking to Miriam 
to test whether Kenji's response is appropriately subtle (watching, going flat) 
rather than dramatic.

## Suggested opening message to test with
"I scan the room looking for Yuki, holding two beers I grabbed from the table."
