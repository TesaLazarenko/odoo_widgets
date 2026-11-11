import { expect, test } from "@odoo/hoot";
import { queryAll, queryFirst } from "@odoo/hoot-dom";
import {
    contains,
    defineModels,
    fields,
    makeTestApp,
    models,
    mountView,
    webModels,
} from "@web/../tests/web_test_helpers";
import { durationParts, formatDuration } from "@web_widget_duration/duration_field";

const { ResCompany, ResPartner, ResUsers } = webModels;

class Foo extends models.Model {
    duration = fields.Float({ aggregator: "sum" });
    seconds = fields.Integer();

    _records = [
        { id: 1, duration: 90061.5, seconds: 3600 },
        { id: 2, duration: 1.31, seconds: 0 },
    ];
}

class Task extends models.Model {
    team = fields.Char();
    duration = fields.Float({ aggregator: "sum" });
    plain = fields.Float({ aggregator: "sum" });

    _records = [
        { id: 1, team: "A", duration: 90061.5, plain: 90061.5 },
        { id: 2, team: "A", duration: 3599.6, plain: 3599.6 },
        { id: 3, team: "B", duration: -75.5, plain: -75.5 },
    ];
}

defineModels([Foo, Task, ResCompany, ResPartner, ResUsers]);

const texts = (selector) => queryAll(selector).map((cell) => cell.textContent.trim());

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

test("splits a duration into units", async () => {
    await makeTestApp();
    expect(durationParts(90061.5).map((part) => part.text)).toEqual([
        "1d",
        "1h",
        "1m",
        "1s",
        "500ms",
    ]);
    expect(durationParts(1.31).map((part) => part.unit)).toEqual(["seconds", "milliseconds"]);
    expect(formatDuration(0.0004)).toBe("0.4ms");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(-5)).toBe("-5s");
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(false)).toBe("");
});

test("max_units and min_unit round to the smallest unit shown", async () => {
    await makeTestApp();
    expect(formatDuration(90061.5, { maxUnits: 2 })).toBe("1d 1h");
    expect(formatDuration(86700, { maxUnits: 2 })).toBe("1d");
    expect(formatDuration(3599.6, { maxUnits: 2 })).toBe("1h");
    expect(formatDuration(1.0004, { maxUnits: 2 })).toBe("1s 0.4ms");
    expect(formatDuration(90061.5, { minUnit: "minutes" })).toBe("1d 1h 1m");
    expect(formatDuration(90061.5, { maxUnits: 3, minUnit: "hours" })).toBe("1d 1h");
    expect(formatDuration(1.31, { minUnit: "seconds" })).toBe("1s");
    expect(formatDuration(0.4, { minUnit: "seconds" })).toBe("");
});

test("min_unit auto drops the units too small for the largest one", async () => {
    await makeTestApp();
    const auto = { minUnit: "auto" };
    expect(formatDuration(90061.5, auto)).toBe("1d 1h 1m");
    expect(formatDuration(3725.125, auto)).toBe("1h 2m 5s");
    expect(formatDuration(75.5, auto)).toBe("1m 16s");
    expect(formatDuration(59.6, auto)).toBe("59.6s");
    expect(formatDuration(1.31, auto)).toBe("1.31s");
    expect(formatDuration(12.34567, auto)).toBe("12.35s");
    expect(formatDuration(1.0004, auto)).toBe("1s");
    expect(formatDuration(59.999, auto)).toBe("1m");
    expect(formatDuration(-1.31, auto)).toBe("-1.31s");
    expect(formatDuration(0.0004, auto)).toBe("0.4ms");
    expect(formatDuration(3599.6, auto)).toBe("1h");
    expect(formatDuration(-90061.5, auto)).toBe("-1d 1h 1m");
    expect(formatDuration(3725.125, { ...auto, maxUnits: 2 })).toBe("1h 2m");
});

test("without max_units and min_unit the formatter follows min_unit auto", async () => {
    await makeTestApp();
    expect(formatDuration(90061.5)).toBe("1d 1h 1m");
    expect(formatDuration(1.0004)).toBe("1s");
    expect(formatDuration(90061.5, { minUnit: "milliseconds" })).toBe("1d 1h 1m 1s 500ms");
    expect(formatDuration(90061.5, { maxUnits: 4 })).toBe("1d 1h 1m 2s");
});

test("pivot formats the measure with the widget", async () => {
    await mountView({
        type: "pivot",
        resModel: "foo",
        arch: `<pivot><field name="duration" type="measure" widget="human_duration"/></pivot>`,
    });
    expect(texts(".o_pivot_cell_value")).toEqual(["1d 1h 1m"]);
});

test("pivot passes the widget options to the formatter", async () => {
    await mountView({
        type: "pivot",
        resModel: "foo",
        arch: `
            <pivot>
                <field name="duration" type="measure" widget="human_duration" options="{'min_unit': 'milliseconds'}"/>
            </pivot>`,
    });
    expect(texts(".o_pivot_cell_value")).toEqual(["1d 1h 1m 2s 810ms"]);
});

test("negative durations keep their sign on the first unit", async () => {
    await makeTestApp();
    expect(formatDuration(-75.5, { minUnit: "milliseconds" })).toBe("-1m 15s 500ms");
    expect(durationParts(-75.5).map((part) => part.text)).toEqual(["-1m", "15s", "500ms"]);
    expect(formatDuration(-0.0004)).toBe("-0.4ms");
    expect(formatDuration(-75.5, { maxUnits: 2 })).toBe("-1m 16s");
    expect(formatDuration(-0.4, { minUnit: "seconds" })).toBe("");
});

test("form view applies max_units and min_unit", async () => {
    await mountView({
        type: "form",
        resModel: "task",
        resId: 1,
        arch: `
            <form>
                <field name="duration" widget="human_duration" options="{'min_unit': 'minutes'}"/>
                <field name="plain" widget="human_duration" options="{'max_units': 1}"/>
            </form>`,
    });
    expect(texts(".o_human_duration")).toEqual(["1d1h1m", "1d"]);
});

test("list rows, group rows and totals use max_units", async () => {
    await mountView({
        type: "list",
        resModel: "task",
        arch: `
            <list>
                <field name="team"/>
                <field name="duration" widget="human_duration" options="{'max_units': 2}" sum="Total"/>
                <field name="plain" widget="human_duration" options="{'min_unit': 'milliseconds'}" sum="Total"/>
            </list>`,
    });
    expect(texts(".o_data_row td[name=duration]")).toEqual(["1d1h", "1h", "-1m16s"]);
    expect(texts("tfoot td").filter(Boolean)).toEqual(["1d 2h", "1d 1h 59m 45s 600ms"]);
});

test("grouped list formats group rows and totals with max_units", async () => {
    await mountView({
        type: "list",
        resModel: "task",
        groupBy: ["team"],
        arch: `
            <list>
                <field name="team"/>
                <field name="duration" widget="human_duration" options="{'max_units': 2}" sum="Total"/>
                <field name="plain" widget="human_duration" options="{'min_unit': 'milliseconds'}" sum="Total"/>
            </list>`,
    });
    const groups = queryAll(".o_group_header").map((row) =>
        [...row.querySelectorAll("td")].map((cell) => cell.textContent.trim()).filter(Boolean)
    );
    expect(groups).toEqual([
        ["1d 2h", "1d 2h 1m 1s 100ms"],
        ["-1m 16s", "-1m 15s 500ms"],
    ]);
    expect(texts("tfoot td").filter(Boolean)).toEqual(["1d 2h", "1d 1h 59m 45s 600ms"]);
});

test("grouped list applies min_unit auto to rows, groups and totals", async () => {
    await mountView({
        type: "list",
        resModel: "task",
        groupBy: ["team"],
        arch: `
            <list>
                <field name="team"/>
                <field name="plain" widget="human_duration" options="{'min_unit': 'auto'}" sum="Total"/>
            </list>`,
    });
    expect(texts(".o_group_header td").filter(Boolean)).toEqual(["1d 2h 1m", "-1m 16s"]);
    expect(texts("tfoot td").filter(Boolean)).toEqual(["1d 2h"]);
    await contains(".o_group_header").click();
    expect(texts(".o_data_row td[name=plain]")).toEqual(["1d1h1m", "1h"]);
});

test("form view follows the cell alignment", async () => {
    await mountView({
        type: "form",
        resModel: "foo",
        resId: 1,
        arch: `<form><field name="duration" widget="human_duration"/></form>`,
    });
    const widget = queryFirst(".o_field_widget[name=duration] .o_human_duration");
    expect(widget).toHaveClass("d-inline-flex");
    const { left, widget: rect } = edges(widget);
    expect(Math.abs(rect.left - left)).toBeLessThan(1);
    const parts = queryAll(".o_field_widget[name=duration] .o_human_duration > span");
    expect(parts.map((span) => [span.textContent, span.title])).toEqual([
        ["1d", "day(s)"],
        ["1h", "hour(s)"],
        ["1m", "minute(s)"],
        ["1s", "second(s)"],
        ["500ms", "millisecond(s)"],
    ]);
});

test("form view lines the units up with the inputs of editable fields", async () => {
    await mountView({
        type: "form",
        resModel: "foo",
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
    const input = queryFirst(".o_field_widget[name=seconds] input");
    const [editable, readonly] = queryAll(".o_human_duration");
    const textStart = (element) =>
        element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingLeft);
    expect(Math.abs(textStart(editable) - textStart(input))).toBeLessThan(1);
    expect(editable.getBoundingClientRect().height).toBe(input.getBoundingClientRect().height);
    expect(getComputedStyle(readonly).paddingLeft).toBe("0px");
});

test("list view follows the column alignment and formats totals", async () => {
    await mountView({
        type: "list",
        resModel: "foo",
        arch: `
            <list>
                <field name="duration" widget="human_duration" sum="Total"/>
                <field name="seconds" widget="human_duration" options="{'align': 'center'}"/>
            </list>`,
    });
    const cells = queryAll(".o_data_row .o_human_duration");
    expect(cells.map((cell) => cell.textContent)).toEqual(["1d1h1m1s500ms", "1h", "1s310ms", ""]);
    expect(cells[0]).toHaveClass("d-inline-flex");
    expect(cells[0].closest(".o_data_cell")).toHaveClass("o_list_number");
    const { right, widget: rect } = edges(cells[0]);
    expect(Math.abs(rect.right - right)).toBeLessThan(1);
    cells[0].closest(".o_data_cell").style.textAlign = "left";
    const moved = edges(cells[0]);
    expect(Math.abs(moved.widget.left - moved.left)).toBeLessThan(1);
    expect(cells[1]).toHaveClass(["d-flex", "justify-content-center"]);
    expect(queryFirst("tfoot td:nth-child(2)")).toHaveText("1d 1h 1m");
});
