# Game Checklist

Each item is a check a player would fail you on. The engine's own performance and rendering pages win over this file on any setting. Godot: https://docs.godotengine.org/en/stable/tutorials/performance/index.html. Unity and Unreal have their own.

## Frame budget

- A target is stated: frames per second and a 1% low, at a resolution, on named minimum hardware. 60 fps is 16.6 ms a frame
- Measured in the busiest scene the game has (most players, weather, effects), never in an empty one. The engine profiler names the top cost
- Static light is baked (lightmaps or baked global illumination). Real-time light is for what moves
- Every shadow-casting light has a reason. Point and omni shadows render several passes each, so they are rare. Every dynamic light has a range and a distance fade
- Distant geometry has level of detail, visibility ranges, or occlusion culling. A model's triangle count fits its size on screen
- Repeated props (trees, rocks, fences, crates) are instanced, not one draw call each
- No first-use hitch: shaders and effects are compiled or warmed during loading
- Moving bodies use simple collision shapes. Mesh colliders are for static ground

## Every verb answers

- The feedback matrix has a row for every verb and every event the player should notice, with visual, sound, interface, and other-player columns
- The response starts on the frame of the input, or on a predicted result in online play
- The verbs the player repeats most get animation and sound at least, with anticipation and impact where the action has weight
- A refused action says why: a sound and a short reason, never nothing

## Sound

- Buses per category (music, effects, ambience, interface, voice), each with its own volume setting, and a limiter on the master
- Each category has a loudness target, checked by a tool. Peak normalization alone is not a mix
- A sound that repeats (steps, hits, pours) has 3 or more variants, no immediate repeat, and small pitch and volume variation
- World sounds are positional, with attenuation set on purpose. Stacked loops have an instance cap
- Every area has an ambience bed. Silence is a choice, not a default

## What the player sees

- Every object the player uses reads as what it is at play distance: a distinct silhouette, plus the detail that names it (a bottle has a neck and a label). Check with a screenshot at play distance
- Every material reads as its material inside the art style. Water: transparency or a depth tint, a moving surface, a highlight that changes with the view angle, and an edge where it meets the shore. Metal shines, cloth does not
- Usable objects are highlighted or prompted when in reach
- Exposure and tone mapping are set, so no area is crushed to black or blown out. Lighting tells the time of day

## Online play

- The server decides anything that matters. The client predicts the player's own movement and actions, then corrects to the server's answer: https://www.gabrielgambetta.com/client-server-game-architecture.html
- Remote players are drawn from an interpolation buffer, with a cap on extrapolation: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- Tested under simulated latency and loss (for example 100 ms and 5 %), with a stated limit on visible pauses
- Join in progress, disconnect, and the host leaving each have a defined, visible outcome

## The shell every shipped game has

- Pause menu, and a settings page for display (mode, resolution, vsync, frame cap), graphics preset, volume per bus, control rebinding, field of view, and subtitles
- Save and load, with a confirmation before progress is lost
- Loading never freezes the window. First-run guidance teaches the core verbs
- Accessibility checked against https://gameaccessibilityguidelines.com/
