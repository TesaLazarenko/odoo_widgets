/** @odoo-module **/

import { getFixture } from "@web/../tests/helpers/utils";
import { makeView, setupViewRegistries } from "@web/../tests/views/helpers";
import { durationParts, formatDuration } from "@web_widget_duration/duration_field";

let serverData;
let target;

function edges(element) {
    const box = element.closest(".o_data_cell, .o_cell") || element.parentElement;
    const style = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    return {
        left: rect.left + parseFloat(style.paddingLeft),
        right: rect.right - parseFloat(style.paddingRight),
        widget: element.getBoundingClientRect(),
    };
}

QUnit.module("web_widget_duration", (hooks) => {
    hooks.beforeEach(() => {
        target = getFixture();
        serverData = {
            models: {
                partner: {
                    fields: {
                        duration: {
                            string: "Duration",
                            type: "float",
                            group_operator: "sum",
                            searchable: true,
                        },
                        seconds: { string: "Seconds", type: "integer", searchable: true },
                    },
                    records: [
                        { id: 1, duration: 90061.5, seconds: 3600 },
                        { id: 2, duration: 1.31, seconds: 0 },
                    ],
                },
            },
        };
        setupViewRegistries();
    });

    QUnit.test("splits a duration into units", (assert) => {
        assert.deepEqual(
            durationParts(90061.5).map((part) => part.text),
            ["1d", "1h", "1m", "1s", "500ms"]
        );
        assert.deepEqual(
            durationParts(1.31).map((part) => part.unit),
            ["seconds", "milliseconds"]
        );
        assert.strictEqual(formatDuration(0.0004), "0.4ms");
        assert.strictEqual(formatDuration(120), "2m");
        assert.strictEqual(formatDuration(-5), "");
        assert.strictEqual(formatDuration(0), "");
        assert.strictEqual(formatDuration(false), "");
    });

    QUnit.test("form view follows the cell alignment", async (assert) => {
        await makeView({
            serverData,
            type: "form",
            resModel: "partner",
            resId: 1,
            arch: `<form><field name="duration" widget="human_duration"/></form>`,
        });
        const widget = target.querySelector(".o_field_widget[name=duration] .o_human_duration");
        assert.hasClass(widget, "d-inline-flex");
        const { left, widget: rect } = edges(widget);
        assert.ok(Math.abs(rect.left - left) < 1, "the units start at the left of the cell");
        assert.deepEqual(
            [...widget.children].map((span) => [span.textContent, span.title]),
            [
                ["1d", "day(s)"],
                ["1h", "hour(s)"],
                ["1m", "minute(s)"],
                ["1s", "second(s)"],
                ["500ms", "millisecond(s)"],
            ]
        );
    });

    QUnit.test("form view lines the units up with the inputs of editable fields", async (assert) => {
        await makeView({
            serverData,
            type: "form",
            resModel: "partner",
            resId: 1,
            arch: `
                <form>
                    <group>
                        <field name="seconds"/>
                        <field name="duration" widget="human_duration"/>
                        <field name="duration" widget="human_duration" readonly="1"/>
                    </group>
                </form>`,
        });
        const input = target.querySelector(".o_field_widget[name=seconds] input");
        const [editable, readonly] = target.querySelectorAll(".o_human_duration");
        const textStart = (element) =>
            element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingLeft);
        assert.ok(Math.abs(textStart(editable) - textStart(input)) < 1, "same text start as an input");
        assert.strictEqual(
            editable.getBoundingClientRect().height,
            input.getBoundingClientRect().height,
            "same height as an input"
        );
        assert.strictEqual(getComputedStyle(readonly).paddingLeft, "0px", "readonly has no padding");
    });

    QUnit.test("list view follows the column alignment and formats totals", async (assert) => {
        await makeView({
            serverData,
            type: "list",
            resModel: "partner",
            arch: `
                <tree>
                    <field name="duration" widget="human_duration" sum="Total"/>
                    <field name="seconds" widget="human_duration" options="{'align': 'center'}"/>
                </tree>`,
        });
        const cells = [...target.querySelectorAll(".o_data_row .o_human_duration")];
        assert.deepEqual(
            cells.map((cell) => cell.textContent),
            ["1d1h1m1s500ms", "1h", "1s310ms", ""]
        );
        assert.hasClass(cells[0], "d-inline-flex");
        assert.ok(
            cells[0].closest(".o_data_cell").classList.contains("o_list_number"),
            "numeric columns are right aligned by the list"
        );
        const { right, widget: rect } = edges(cells[0]);
        assert.ok(Math.abs(rect.right - right) < 1, "the units end at the right of the cell");
        cells[0].closest(".o_data_cell").style.textAlign = "left";
        const moved = edges(cells[0]);
        assert.ok(Math.abs(moved.widget.left - moved.left) < 1, "the units follow a left column");
        assert.hasClass(cells[1], "d-flex");
        assert.hasClass(cells[1], "justify-content-center");
        assert.strictEqual(
            target.querySelector("tfoot td:nth-child(2)").textContent,
            "1d 1h 1m 2s 810ms"
        );
    });
});
