# Color and contrast maintenance

The application keeps its existing green primary (`#23704f`), rust accent (`#b8481e`), white workspace, and soft green, blue, sand, purple, teal, and blush card palette.

Color tokens live in `app/globals.css` under `:root`. The central contrast policy near the end of that file defines the shared rules for soft surfaces, solid actions, neutral text, native fields, disabled controls, semantic badges, and dark headers. Do not add a universal descendant color override: it breaks buttons and nested dark surfaces.

- Use `--primary`, `--primary-hover`, and `--primary-active` for primary actions.
- Keep `--rust` for the existing brand accent; use `--danger` for destructive actions.
- Use `--text-strong` and `--text-secondary` on soft surfaces, and `--on-solid` on approved solid action backgrounds.
- Context tokens allow nested headers, badges, and actions to choose readable text without changing their parent cards.
- Use `--control-border` for essential input boundaries. Decorative card dividers may stay softer.
- Success, warning, error, and information retain their existing color families; badges also retain visible labels/icons.
- Loading/disabled labels remain legible without fading entire components through opacity.
- Chart text uses secondary text; primary plotted lines use the darker existing brand green for visibility.

## Verification

Run `node tests/color-contrast.cjs` to check text against all six card endpoints, solid actions and states, placeholders, disabled controls, dark secondary text, and essential control borders. Targets: 4.5:1 for normal text, 3:1 for essential control graphics.

Run `node scripts/audit-contrast.cjs` against a local app and a **separate test Chrome profile** exposing CDP on port 9231. Set `AUDIT_URL` to select the local server. The JSON report goes to the operating-system temporary directory unless `AUDIT_REPORT` is specified. The audit visits all 11 main pages at 1440px and 390px, plus POS entry/cart/checkout/confirmation, all employee profile sections, all settings sections, expanded sales filters, and notifications. It never completes a transaction or submits a form.

The rendered check samples computed text, button icons, solid background compositing, and gradient endpoints. It is a regression check, not a full WCAG certification: image-dependent contrast, every possible record/dialog state, keyboard behavior, chart distinctions, and screen-reader semantics still require manual review. Desktop dashboard styling was also visually inspected.
