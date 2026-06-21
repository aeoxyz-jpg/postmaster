<!-- Thanks for contributing to Postmaster! -->

## What & why

<!-- What does this change, and what problem does it solve? -->

## Checklist

- [ ] `npm run build` and `npx tsc --noEmit` pass
- [ ] `npm test` passes
- [ ] For changes that touch real Mail/Calendar behavior: verified on a real machine with a reversible / self-addressed / throwaway target (never on real mail; nothing sent without confirmation)
- [ ] No hardcoded accounts, paths, timezone, or secrets (runtime detection only)
- [ ] Destructive/outward-facing actions stay behind two-step confirmation
- [ ] Docs updated if behavior or tools changed

## Notes

<!-- Anything reviewers should know: deviations, follow-ups, manual test results. -->
