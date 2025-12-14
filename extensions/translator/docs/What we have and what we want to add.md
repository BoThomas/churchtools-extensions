# What we have and what we want to add

## What we have

- Frontend-only Vue app with Pinia store
  - Azure Cognitive Services Speech SDK in-browser:
    - Microphone capture via `sdk.AudioConfig.fromDefaultMicrophoneInput()`
    - Live translation via `sdk.TranslationRecognizer(speechConfig, audioConfig)`
    - Configured input language, single output language, profanity option,
      stable partial result threshold, and optional phrase list
    - TrueText post-processing enabled
  - Real-time UI flow:
    - `onTranslating` (live partial) and `onTranslated` (final) callbacks
    - Updates secondary fullscreen presentation tab via localStorage events
      (`translator_presentation`), using stored presentation settings
  - Presentation view (second tab):
    - Fullscreen UI rendering finalized paragraphs and live text
    - Reads settings from localStorage; responds to pause/resume/stop via keys
    - Can run a “test mode” generator for demo
  - Multi-language translation
    - Translate one spoken input into multiple output languages concurrently
    - Emit per-language live partials and finalized segments
    - Presentationmodes split and multi-window support
  - Settings and variants:
    - API credentials persisted (Azure key/region)
    - Translator settings persisted with variant support (Default + named variants)
    - “Save”, “Save As…”, and delete variant with per-user last selection
    - Language validity checks against JSON option lists
  - Session logging and usage stats:
    - Session start/heartbeat/pause/resume/end via SessionLogger
    - Persisted sessions using PersistanceCategory
    - Aggregated per-user usage statistics (active/paused/total minutes, counts)
    - Generate dummy sessions for testing/reporting
  - Current limitations:
    - Single target language per session in recognizer
    - Broadcast limited to one local presentation tab (localStorage only)
    - No centralized fan-out to multiple devices
    - No long-term archival of transcripts or audio
    - No TTS or speech-to-speech output yet
    - Everything orchestrated from one browser; no serverless fan-out layer

## What we want to add

- Real-time broadcast to multiple devices
  - Subscribers (browsers/phones) can connect and select their preferred output language
  - Low-latency fan-out via managed/edge services (no self-hosting)

- Optional speech output
  - STT -> TTS per-language in near real time (configurable), or
  - Evaluate/enable direct speech-to-speech translation when suitable

- Preferred platform constraints
  - “No hosting” requirement: serverless only (Cloudflare Workers/Durable Objects,
    Cloudflare Pub/Sub/R2) or Azure (Functions, Web PubSub, Blob Storage)
  - Secure access for presenters; read-only for viewers
  - Scalable to many concurrent receivers with predictable cost and latency

- Archival and recordings
  - Persist transcripts per language (e.g., NDJSON or text) for later review
  - Record and store original input audio
  - Store translated audio tracks

## Next TODOs

- add unit tests with Vitest
- add report for which language is used for input and output and how often
- use the way test mode is displaying things optionally for the presentation window as well so the operator can see what is captured in original tone and in the translated languages. this should also work for test presentation with the lorem ipsum in the same way.
- Storing all `finalizedParagraphsByLang` could exceed 5-10MB limit in long sessions. We Should implement sliding window (keep only last N paragraphs)

## Finished TODOs in current branch

- Added support for multiple output languages (with split-screen and multi-screen mode)
- Added the option to show the input language transcription in the presentation
- Optimized the flow for starting and testing a presentation session
- Added support for country-flags under windows (as windows does not support the emoji flags per default)
- Added autoscroll for translation test outputs
- Added browser compatibility alert for non-Chromium browsers
