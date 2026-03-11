# Clips Rules

This service manages clip metadata, highlight requests, and clip processing coordination.

## Pipeline

Typical clip flow:

1. mark highlight moment
2. request clip generation
3. trim source segment
4. generate captions
5. transcode
6. store asset
7. publish metadata

## Processing model

- Use async jobs for heavy work.
- Support retries and resumable execution where possible.
- Track job status clearly.
- Keep raw media references intact.

## Detection priorities

Clip-worthy moments often include:
- strong product demos
- offer reveals
- high chat engagement
- conversion spikes
- funny or surprising moments

## Storage rules

- Use deterministic naming
- preserve traceability to session and source timeline
- separate metadata from heavy media processing
