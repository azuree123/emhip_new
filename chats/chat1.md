# C# .NET large-dataset setup

_Started 2026-07-13 08:29 UTC_

---

## User

I want to setup this project in c# latest .net version. with large-dataset based architecture.

## Assistant

_[tool: fig_ls]_

_[tool: fig_read]_

_[tool: questions_v2]_

## User

Questions answered:
- deliverable: Developer handoff package (specs Claude Code can implement in C#), Design system import from the Figma file, Interactive prototype of the EMHIP UI from the Figma file
- stack: .NET 10 / ASP.NET Core Web API, EF Core + SQL Server, Background workers / queues
- audience: Developers implementing it
- figma_role: It's the UI to build/prototype against

## Assistant

_[tool: update_todos]_

_[tool: fig_read]_

_[tool: fig_ls]_

_[tool: fig_ls]_

This is EMHIP — a mental-health hub case-management system (guest registration, CMHW dashboards, urgent cases, reports). Starting the full design-system import.

_[tool: fig_materialize]_

_[tool: fig_materialize]_

_[tool: fig_materialize]_

_[tool: write_file]_

_[tool: fig_ls]_

_[tool: fig_ls]_

Design system materialized. Now extracting the key screens for the prototype as one pre-transpiled bundle.

_[tool: fig_materialize]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: read_skill_prompt]_

Now the handoff package with the .NET architecture spec.

_[tool: copy_files]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: present_fs_item_for_download]_

_[tool: ready_for_verification]_

The prototype is now open in your preview — use the top bar to switch between the nine screens. Next steps if you want: deeper in-screen interactivity (clickable navigation, working forms), more screens from the Prototyping page, or tuning the architecture doc to your real data volumes.

## User

Found issues — fixing…

## Assistant

_[tool: fig_read]_

_[tool: fig_grep]_

_[tool: fig_grep]_

_[tool: fig_grep]_

_[tool: fig_grep]_

_[tool: fig_grep]_

_[tool: fig_ls]_

_[tool: fig_read]_

_[tool: fig_read]_

_[tool: fig_read]_

Prototyping page has clean 1440px screen frames. Re-materializing the bundle from those.

_[tool: fig_materialize]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_set_props]_

_[tool: show_html]_

Fixed — clean 1440px screens now render scaled-to-fit. Syncing the handoff copy.

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Fixed. The first extraction had pulled the whole Figma working canvases (dark backdrop + designer sticky notes). I re-extracted the nine screens from the clean 1440px desktop frames on the Prototyping page and added scale-to-fit, so each screen now fills the card properly. The handoff package and README are updated to match the new screen set.

## User

Found issues — fixing…

## Assistant

_[tool: fig_grep]_

`Desktop---46` is the actual Urgent Cases screen (header "Urgent cases", "Active Urgent Cases" list). Swapping it in.

_[tool: fig_materialize]_

_[tool: dc_js_str_replace]_

_[tool: dc_set_props]_

_[tool: run_script]_

_[tool: copy_files]_

_[tool: ready_for_verification]_

Swapped the wrong follow-up frame for the real Urgent Cases screen (`Desktop---46`, header "Urgent cases" with the Active Urgent Cases list), updated the tab, and re-synced the handoff package.

