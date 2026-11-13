# Summary

<!-- What does this change, and why? The diff already says what; explain why. -->

## Related issues

<!-- e.g. Closes #12 -->

## Verification

CI runs these on Node 22 and 24, plus the offline E2E suite. Confirm you ran them locally:

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e:offline`

<!-- If you exercised the live Google/Gemini paths (npm run test:e2e), say so. -->

## Cost impact

Discovery and generation are the two operations that spend money.

- [ ] This change does not increase the number of paid API calls, and adds no Places field from a more expensive tier
- [ ] It does, and the summary above explains why that is justified

## Translations

- [ ] UI strings were added to both `app/i18n/en.ts` and `app/i18n/tr.ts`
- [ ] If `README.md` changed, its translations (`README.<lang>.md`) were updated or a follow-up issue is linked

## Checklist

- [ ] No secrets, API keys, or `.env` contents are included in this diff
- [ ] `LICENSE` and `NOTICE` are untouched
- [ ] No verification gate was weakened to make this pass
- [ ] Docs updated if behaviour, setup, or environment variables changed
