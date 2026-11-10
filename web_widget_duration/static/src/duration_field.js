import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { formatFloat } from "@web/core/utils/numbers";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { Component, t, useProps } from "@odoo/owl";

// sizes in hundredths of a millisecond, the precision the duration is rounded to once
const MS = 100;
const UNITS = [
    { unit: "days", size: 86_400_000 * MS },
    { unit: "hours", size: 3_600_000 * MS },
    { unit: "minutes", size: 60_000 * MS },
    { unit: "seconds", size: 1_000 * MS },
];
// the amount with the unit symbol of the user's language: 1s in English, 1 с in Ukrainian
const UNIT_FORMATS = {
    days: (amount) => _t("%(amount)sd", { amount }),
    hours: (amount) => _t("%(amount)sh", { amount }),
    minutes: (amount) => _t("%(amount)sm", { amount }),
    seconds: (amount) => _t("%(amount)ss", { amount }),
    milliseconds: (amount) => _t("%(amount)sms", { amount }),
};
const UNIT_NAMES = {
    days: _t("day(s)"),
    hours: _t("hour(s)"),
    minutes: _t("minute(s)"),
    seconds: _t("second(s)"),
    milliseconds: _t("millisecond(s)"),
};

function part(unit, amount) {
    const text = formatFloat(amount, { digits: [false, 2], trailingZeros: false });
    return { unit, title: UNIT_NAMES[unit], text: UNIT_FORMATS[unit](text) };
}

export function durationParts(seconds) {
    let rest = Math.max(0, Math.round((seconds || 0) * 1_000 * MS));
    const parts = [];
    for (const { unit, size } of UNITS) {
        const amount = Math.floor(rest / size);
        rest -= amount * size;
        if (amount > 0) {
            parts.push(part(unit, amount));
        }
    }
    if (rest > 0) {
        parts.push(part("milliseconds", rest / MS));
    }
    return parts;
}

export function formatDuration(value) {
    if (value === false) {
        return "";
    }
    return durationParts(value).map((part) => part.text).join(" ");
}

export class DurationField extends Component {
    static template = "web_widget_duration.DurationField";
    props = useProps({
        ...standardFieldProps,
        align: t.selection(["start", "center", "end"]).optional(),
    });

    get parts() {
        return durationParts(this.props.record.data[this.props.name]);
    }
}

export const durationField = {
    component: DurationField,
    displayName: _t("Duration"),
    supportedTypes: ["float", "integer"],
    extractProps: ({ options }) => ({ align: options.align }),
};

registry.category("fields").add("human_duration", durationField);

// list group rows and totals format aggregates through the formatter of the column's widget
registry.category("formatters").add("human_duration", formatDuration);
