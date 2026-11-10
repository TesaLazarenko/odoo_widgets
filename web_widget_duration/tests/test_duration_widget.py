# -*- coding: UTF-8 -*-
# Copyright 2026 Taras Shabaranskyi <shabaranskij@gmail.com>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl)

from odoo.tests import TransactionCase, tagged
from odoo.tools.translate import code_translations

LANGUAGES = ("uk_UA", "de_DE", "pl_PL")


@tagged("post_install", "-at_install")
class TestDurationWidget(TransactionCase):
    def test_units_have_a_translation_for_the_widget(self) -> None:
        for lang in LANGUAGES:
            messages = code_translations.get_web_translations("web_widget_duration", lang)
            units = {
                message["id"]: message["string"]
                for message in messages["messages"]
                if message["id"].startswith("%(amount)s")
            }
            self.assertEqual(len(units), 5, lang)
            for translation in units.values():
                self.assertEqual(translation.count("%(amount)s"), 1, lang)
        messages = code_translations.get_web_translations("web_widget_duration", "uk_UA")
        seconds = {message["id"]: message["string"] for message in messages["messages"]}
        self.assertEqual(seconds["%(amount)ss"], "%(amount)s\xa0с")

    def test_widget_is_in_the_backend_assets(self) -> None:
        files = self.env["ir.asset"]._get_asset_paths("web.assets_backend", {})
        paths = {path for path, *_ in files}
        for name in ("duration_field.js", "duration_field.xml"):
            self.assertIn(f"/web_widget_duration/static/src/{name}", paths)
