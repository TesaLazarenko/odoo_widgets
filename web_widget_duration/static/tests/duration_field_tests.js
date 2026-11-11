/** @odoo-module **/

import { click, getFixture } from "@web/../tests/helpers/utils";
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
                task: {
                    fields: {
                        team: { string: "Team", type: "char", searchable: true, sortable: true },
                        duration: {
                            string: "Duration",
                            type: "float",
                            group_operator: "sum",
                            searchable: true,
                        },
                        plain: {
                            string: "Plain",
                            type: "float",
                            group_operator: "sum",
                            searchable: true,
                        },
                    },
                    records: [
                        { id: 1, team: "A", duration: 90061.5, plain: 90061.5 },
                        { id: 2, team: "A", duration: 3599.6, plain: 3599.6 },
                        { id: 3, team: "B", duration: -75.5, plain: -75.5 },
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
        assert.strictEqual(formatDuration(-5), "-5s");
        assert.strictEqual(formatDuration(0), "");
        assert.strictEqual(formatDuration(false), "");
    });

    QUnit.test("max_units and min_unit round to the smallest unit shown", (assert) => {
        assert.strictEqual(formatDuration(90061.5, { maxUnits: 2 }), "1d 1h");
        assert.strictEqual(formatDuration(86700, { maxUnits: 2 }), "1d", "zero units count");
        assert.strictEqual(formatDuration(3599.6, { maxUnits: 2 }), "1h", "rounding carries");
        assert.strictEqual(formatDuration(1.0004, { maxUnits: 2 }), "1s 0.4ms");
        assert.strictEqual(formatDuration(90061.5, { minUnit: "minutes" }), "1d 1h 1m");
        assert.strictEqual(formatDuration(90061.5, { maxUnits: 3, minUnit: "hours" }), "1d 1h");
        assert.strictEqual(formatDuration(1.31, { minUnit: "seconds" }), "1s");
        assert.strictEqual(formatDuration(0.4, { minUnit: "seconds" }), "");
    });

    QUnit.test("min_unit auto drops the units too small for the largest one", (assert) => {
        const auto = { minUnit: "auto" };
        assert.strictEqual(formatDuration(90061.5, auto), "1d 1h 1m", "days down to minutes");
        assert.strictEqual(formatDuration(3725.125, auto), "1h 2m 5s", "hours down to seconds");
        assert.strictEqual(formatDuration(75.5, auto), "1m 16s", "minutes down to seconds");
        assert.strictEqual(formatDuration(59.6, auto), "59.6s", "seconds alone keep a fraction");
        assert.strictEqual(formatDuration(1.31, auto), "1.31s");
        assert.strictEqual(formatDuration(12.34567, auto), "12.35s", "rounded to two decimals");
        assert.strictEqual(formatDuration(1.0004, auto), "1s");
        assert.strictEqual(formatDuration(59.999, auto), "1m", "rounding carries to minutes");
        assert.strictEqual(formatDuration(-1.31, auto), "-1.31s");
        assert.strictEqual(formatDuration(0.0004, auto), "0.4ms");
        assert.strictEqual(formatDuration(3599.6, auto), "1h", "rounding carries");
        assert.strictEqual(formatDuration(-90061.5, auto), "-1d 1h 1m");
        assert.strictEqual(formatDuration(3725.125, { ...auto, maxUnits: 2 }), "1h 2m");
    });

    QUnit.test("without max_units and min_unit the formatter follows min_unit auto", (assert) => {
        assert.strictEqual(formatDuration(90061.5), "1d 1h 1m");
        assert.strictEqual(formatDuration(1.0004), "1s");
        assert.strictEqual(formatDuration(90061.5, { minUnit: "milliseconds" }), "1d 1h 1m 1s 500ms");
        assert.strictEqual(formatDuration(90061.5, { maxUnits: 4 }), "1d 1h 1m 2s");
    });

    QUnit.test("pivot formats the measure with the widget", async (assert) => {
        await makeView({
            serverData,
            type: "pivot",
            resModel: "partner",
            arch: `<pivot><field name="duration" type="measure" widget="human_duration"/></pivot>`,
        });
        assert.deepEqual(
            [...target.querySelectorAll(".o_pivot_cell_value")].map((cell) => cell.textContent.trim()),
            ["1d 1h 1m"]
        );
    });

    QUnit.test("negative durations keep their sign on the first unit", (assert) => {
        assert.strictEqual(formatDuration(-75.5, { minUnit: "milliseconds" }), "-1m 15s 500ms");
        assert.deepEqual(
            durationParts(-75.5).map((part) => part.text),
            ["-1m", "15s", "500ms"]
        );
        assert.strictEqual(formatDuration(-0.0004), "-0.4ms");
        assert.strictEqual(formatDuration(-75.5, { maxUnits: 2 }), "-1m 16s");
        assert.strictEqual(formatDuration(-0.4, { minUnit: "seconds" }), "", "no negative zero");
    });

    QUnit.test("form view applies max_units and min_unit", async (assert) => {
        await makeView({
            serverData,
            type: "form",
            resModel: "task",
            resId: 1,
            arch: `
                <form>
                    <field name="duration" widget="human_duration" options="{'min_unit': 'minutes'}"/>
                    <field name="plain" widget="human_duration" options="{'max_units': 1}"/>
                </form>`,
        });
        assert.deepEqual(
            [...target.querySelectorAll(".o_human_duration")].map((widget) => widget.textContent),
            ["1d1h1m", "1d"]
        );
    });

    QUnit.test("list rows, group rows and totals use max_units", async (assert) => {
        await makeView({
            serverData,
            type: "list",
            resModel: "task",
            arch: `
                <tree>
                    <field name="team"/>
                    <field name="duration" widget="human_duration" options="{'max_units': 2}" sum="Total"/>
                    <field name="plain" widget="human_duration" options="{'min_unit': 'milliseconds'}" sum="Total"/>
                </tree>`,
        });
        const cells = (selector) =>
            [...target.querySelectorAll(selector)].map((cell) => cell.textContent.trim());
        assert.deepEqual(cells(".o_data_row td[name=duration]"), ["1d1h", "1h", "-1m16s"]);
        assert.deepEqual(cells("tfoot td").filter(Boolean), [
            "1d 2h",
            "1d 1h 59m 45s 600ms",
        ]);
    });

    QUnit.test("grouped list formats group rows and totals with max_units", async (assert) => {
        await makeView({
            serverData,
            type: "list",
            resModel: "task",
            groupBy: ["team"],
            arch: `
                <tree>
                    <field name="team"/>
                    <field name="duration" widget="human_duration" options="{'max_units': 2}" sum="Total"/>
                    <field name="plain" widget="human_duration" options="{'min_unit': 'milliseconds'}" sum="Total"/>
                </tree>`,
        });
        const groups = [...target.querySelectorAll(".o_group_header")].map((row) =>
            [...row.querySelectorAll("td")].map((cell) => cell.textContent.trim()).filter(Boolean)
        );
        assert.deepEqual(groups, [
            ["1d 2h", "1d 2h 1m 1s 100ms"],
            ["-1m 16s", "-1m 15s 500ms"],
        ]);
        assert.deepEqual(
            [...target.querySelectorAll("tfoot td")].map((cell) => cell.textContent.trim()).filter(Boolean),
            ["1d 2h", "1d 1h 59m 45s 600ms"]
        );
    });

    QUnit.test("grouped list applies min_unit auto to rows, groups and totals", async (assert) => {
        await makeView({
            serverData,
            type: "list",
            resModel: "task",
            groupBy: ["team"],
            arch: `
                <tree>
                    <field name="team"/>
                    <field name="plain" widget="human_duration" options="{'min_unit': 'auto'}" sum="Total"/>
                </tree>`,
        });
        const texts = (selector) =>
            [...target.querySelectorAll(selector)].map((cell) => cell.textContent.trim()).filter(Boolean);
        assert.deepEqual(texts(".o_group_header td"), ["1d 2h 1m", "-1m 16s"]);
        assert.deepEqual(texts("tfoot td"), ["1d 2h"]);
        await click(target.querySelector(".o_group_header"));
        assert.deepEqual(texts(".o_data_row td[name=plain]"), ["1d1h1m", "1h"]);
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
            "1d 1h 1m",
            "the total follows min_unit auto, the rows keep every unit"
        );
    });
});
