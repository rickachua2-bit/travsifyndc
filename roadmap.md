## Combined flight search
- [ ] Query XML and Duffel together for API and website searches.
- [ ] Sort final fares cheapest first and verify comparison rules and live results.

## Flight booking repair
- [x] Restore booking page loading and reproduce live flight results.
- [x] Repair flight provider/passenger checkout wiring and checked wallet payments.
- [x] Run four regression tests and verify live search, selection and traveler form without issuing a paid ticket.
- [ ] Verify authenticated wallet checkout: needs the user to sign in in preview; no matching account was available for managed test sign-in.
- [ ] Verify xml.agency production ticketing: user reports IP access resolved and settings are present; issuing a paid ticket still needs an authorized wallet-funded booking.