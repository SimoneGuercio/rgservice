<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Availability is computed client-side in `src/lib/warehouse.ts` and enforced server-side by the `check_order_item_conflict` DB trigger — keep both in sync.
- Roles live in `user_roles` (admin/dipendente); first signed-up user becomes admin via trigger — never store roles on profiles.
- 3D scene uses one InstancedMesh per category part for performance with 200+ items; keep it lazy-loaded (client-only).
- Status colors in WebGL use `STATUS_HEX`, mirroring the `--status-*` CSS tokens.
