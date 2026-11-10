import { expect, test } from "@odoo/hoot";
import { queryAll, queryFirst } from "@odoo/hoot-dom";
import {
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

defineModels([Foo, ResCompany, ResPartner, ResUsers]);

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
    expect(formatDuration(-5)).toBe("");
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(false)).toBe("");
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
    expect(queryFirst("tfoot td:nth-child(2)")).toHaveText("1d 1h 1m 2s 810ms");
});
