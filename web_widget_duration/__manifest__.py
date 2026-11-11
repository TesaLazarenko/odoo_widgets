# -*- coding: UTF-8 -*-
# Copyright 2026 Taras Shabaranskyi <shabaranskij@gmail.com>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl)

{
    "name": "Duration Widget",
    "summary": "Show a duration in seconds as days, hours, minutes, seconds and milliseconds",
    "category": "Technical",
    "version": "19.0.1.1.0",
    "author": "Taras Shabaranskyi",
    "maintainer": "Taras Shabaranskyi",
    "website": "https://github.com/TesaLazarenko/odoo_widgets",
    "support": "shabaranskij@gmail.com",
    "license": "LGPL-3",
    "price": 0.0,
    "currency": "EUR",
    "depends": ["web"],
    "assets": {
        "web.assets_backend": [
            "web_widget_duration/static/src/**/*",
        ],
        "web.assets_unit_tests": [
            "web_widget_duration/static/tests/**/*",
        ],
    },
    "images": [
        "static/description/banner.png",
        "static/description/images/list_after.png",
        "static/description/images/form_after.png",
    ],
    "installable": True,
    "application": False,
    "auto_install": False,
}
