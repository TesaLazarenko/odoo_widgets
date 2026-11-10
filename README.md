# odoo_widgets

Technical field widgets for Odoo, one module per widget.

Each branch is an Odoo series (`17.0`, `18.0`, `19.0`, `20.0`) and holds the modules ported to it.
Modules sit at the repository root, so the checkout can be added to `addons_path` as is.

| Module | Widget | Field types | Description |
|--------|--------|-------------|-------------|
| [`web_widget_duration`](web_widget_duration) | `human_duration` | `float`, `integer` | seconds shown as `1d 1h 1m 1s 500ms` |

## Install

```bash
git clone -b 17.0 git@github.com:TesaLazarenko/odoo_widgets.git
```

Add the clone to `addons_path` and install the module from Apps.

## Tests

Python tests run with `--test-tags /web_widget_duration`. JavaScript tests are in the module's
`static/tests` and run in the web client test suite (`/web/tests?filter=web_widget_duration`,
Hoot).

## License

LGPL-3.0, see [LICENSE](LICENSE).
