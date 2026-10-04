# Scan supplier test

Sends the same garage-sale photos to Claude, Gemini and OpenAI with identical instructions,
image size and answer format, and records each answer, its cost and how long it took.

- Put test photos in `photos/` (JPEG, PNG or WebP).
- Push a commit whose message contains `[run-scan-test]`. The **Scan supplier test** workflow
  runs `run.mjs` and commits the answers to `results/<time>/answers.json` on the same branch.
- Needs repository secrets `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` and `OPENAI_API_KEY`.
- Optional env: `SCAN_TEST_RUNS` (default 2), `SCAN_TEST_SUPPLIERS` (e.g. `claude,gemini`),
  `CLAUDE_MODEL`, `GEMINI_MODEL`, `OPENAI_MODEL`.

Test photos are personal; keep them off `main`.
