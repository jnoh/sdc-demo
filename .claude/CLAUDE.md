<!-- BEGIN SELF-DRIVING CODEBASE -->
# Self-Driving Codebase — Coordination Protocol

This project uses an automated multi-agent system. All agents (lead and teammates) follow these protocols.

## Git Protocol

- Branch from main as `sdc/<task-name>`
- Commit frequently with descriptive messages prefixed `sdc:`
- Teammates don't push — the lead handles merges
- Never force-push or rebase shared branches

## Task Protocol (Teammate Lifecycle)

1. Read your assigned GitHub issue fully before writing any code
2. Create branch: `git checkout -b sdc/<task-name>`
3. Stay in scope — note adjacent work in your handoff but don't do it
4. Commit frequently in small, logical chunks
5. Post a **handoff comment** on your issue (format below)
6. Update issue label to `sdc:review`
7. Message the lead that you're done

## Handoff Protocol

When you complete your task, post this comment on your GitHub issue:

```markdown
## Handoff

### Summary
What was built, in 2-3 sentences.

### Changes
- `path/to/file` — description of what this file does

### Decisions Made
- What you chose and why (especially any deviations from spec)

### Concerns
- Anything that worries you about the implementation

### Discovered Work (out of scope)
- Adjacent work you noticed but did not do

### For the Next Agent
- Key exports, patterns, or integration points the next agent needs
```

This is how knowledge flows between agents. Be thorough — your handoff enables the lead to judge your work and feed context to dependent tasks.

## Logging

Log key events to the run log:

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [<role>] <event> <details>" >> .sdc/logs/run-latest.log
```

Events to log:
- `task-started issue=#N branch=sdc/<name>`
- `milestone <description>`
- `task-done issue=#N handoff-posted`

## Constraints

- No TODOs or partial implementations
- No unrelated changes outside your task scope
- No leftover debug code
- If blocked, message the lead immediately — don't spin
- Outside-scope discoveries go in handoff notes, not code changes

## Off-Limits (Read-Only)

These paths are managed by the harness and must not be modified by teammates:
- `.claude/**`
- `specs/**`
- `sdc.sh`
- `.sdc/**`

## Agent Memory

- **Lead** writes to `.claude/agent-memory/lead/` — architectural decisions, cross-cutting concerns, lessons learned
- **Teammates** write to `.claude/agent-memory/workers/` — codebase patterns, gotchas, conventions discovered
- **Lead** reads all memory at startup; teammates read `workers/` for shared knowledge
<!-- END SELF-DRIVING CODEBASE -->
