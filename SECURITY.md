# Security Policy

Open Social Network Web is early alpha software.

## Reporting Security Issues

Please report suspected vulnerabilities privately through GitHub Security Advisories when available. If advisories are not enabled, open a minimal public issue without exploit details and request a private channel.

## Areas of Interest

We especially care about:

- signature verification bypasses
- rendering unverified posts as trusted
- unsafe handling of remote profile or feed content
- cross-site scripting in rendered post content
- identity confusion across profile URLs, handles, and keys

## Supported Versions

Only the current `main` branch is supported during the alpha period.

## Security Philosophy

Open Social Network treats social identity as portable web infrastructure rather than an account inside one platform. The web aggregator must therefore distinguish clearly between verified protocol data, local browser state, and untrusted remote content.

Security work should prioritize signature verification, identity clarity, safe rendering, local key handling, and user flows that make ownership understandable without exposing private material.
