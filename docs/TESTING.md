# Prod Daily — Backend test checklist

Do not mark items passed unless actually executed against a live Supabase project.

## Authentication

- [ ] New Discord user creates profile (role User, setup incomplete)
- [ ] Returning Discord user restores session
- [ ] Incomplete profile redirects to `/profile/setup`
- [ ] Expired / signed-out session handled
- [ ] Logout clears session

## Authorization

- [ ] User denied dashboard (`/admin/*`)
- [ ] Staff/Manager permission enforcement on nav + RPCs
- [ ] Developer access (bypass)
- [ ] Unauthorized role assignment rejected
- [ ] Self-promotion blocked for non-developers
- [ ] Final Developer cannot be demoted

## Wordle

- [ ] Correct / incorrect guesses
- [ ] Repeated-letter feedback
- [ ] Six-guess limit
- [ ] Duplicate completion rejected
- [ ] Streak increase / break / missed day
- [ ] Answer not exposed before completion

## Crosswords

- [ ] Draft create / publish / invalid rejection
- [ ] Progress save + restore
- [ ] Completion validation (server)
- [ ] Assisted vs clean tracking

## Audit

- [ ] Role / puzzle / settings changes logged
- [ ] Audit update/delete rejected
- [ ] Sensitive values redacted when applicable

## Privacy

- [ ] Public profile hides real names / State ID / Discord IDs
- [ ] Crossword answer keys not in player payloads
- [ ] Avatar storage scoped to user folder
