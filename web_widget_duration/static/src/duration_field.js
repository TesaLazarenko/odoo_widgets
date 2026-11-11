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
    { unit: "milliseconds", size: MS },
];
export const DURATION_UNITS = UNITS.map(({ unit }) => unit);
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

// min_unit "auto": the smallest unit worth showing next to the largest non-zero one;
// seconds alone keep their fraction instead of milliseconds: 59.6s, not 59s 600ms
const AUTO_MIN_UNITS = {
    days: "minutes",
    hours: "seconds",
    minutes: "seconds",
    seconds: "seconds",
    milliseconds: "milliseconds",
};
export const MIN_UNITS = [...DURATION_UNITS, "auto"];

// index of the smallest unit shown and whether it keeps a fraction: min_unit, for "auto" the
// AUTO_MIN_UNITS entry of the largest non-zero unit, capped by max_units counted from that unit;
// milliseconds always keep their fraction, seconds do when "auto" shows them alone
function smallestUnit(rest, { maxUnits, minUnit }) {
    const first = UNITS.findIndex(({ size }) => rest >= size);
    const largest = first === -1 ? UNITS.length - 1 : first;
    const auto = minUnit === "auto";
    const unit = auto ? AUTO_MIN_UNITS[DURATION_UNITS[largest]] : minUnit;
    let last = DURATION_UNITS.includes(unit) ? DURATION_UNITS.indexOf(unit) : UNITS.length - 1;
    if (maxUnits > 0) {
        last = Math.min(last, largest + Math.floor(maxUnits) - 1);
    }
    const fraction = last === UNITS.length - 1 || (auto && DURATION_UNITS[largest] === "seconds");
    return { last, fraction };
}

export function durationParts(seconds, options = {}) {
    const sign = seconds < 0 ? -1 : 1;
    let rest = Math.round(Math.abs(seconds || 0) * 1_000 * MS);
    const { last, fraction } = smallestUnit(rest, options);
    // the smallest unit rounds to whole ones, or to the two decimals shown when it keeps a fraction
    const step = fraction ? UNITS[last].size / 100 : UNITS[last].size;
    rest = Math.round(rest / step) * step;
    const parts = [];
    for (const [index, { unit, size }] of UNITS.slice(0, last + 1).entries()) {
        const amount = fraction && index === last ? rest / size : Math.floor(rest / size);
        rest -= Math.floor(amount) * size;
        if (amount > 0) {
            parts.push(part(unit, parts.length ? amount : sign * amount));
        }
    }
    return parts;
}

export function durationOptions(options = {}) {
    return { maxUnits: options.max_units, minUnit: options.min_unit };
}

// values shown without the field component (list group rows and totals, pivot, graph) follow
// min_unit "auto" unless max_units or min_unit is given
export function formatDuration(value, options = {}) {
    if (value === false) {
        return "";
    }
    const { maxUnits, minUnit = maxUnits === undefined ? "auto" : undefined } = options;
    return durationParts(value, { maxUnits, minUnit })
        .map((part) => part.text)
        .join(" ");
}

// list group rows and totals, pivot and graph pass the options of their field to the formatter
formatDuration.extractOptions = ({ options }) => durationOptions(options);

export class DurationField extends Component {
    static template = "web_widget_duration.DurationField";
    props = useProps({
        ...standardFieldProps,
        align: t.selection(["start", "center", "end"]).optional(),
        maxUnits: t
            .customValidator(t.number(), (maxUnits) => Number.isInteger(maxUnits) && maxUnits > 0)
            .optional(),
        minUnit: t.selection(MIN_UNITS).optional(),
    });

    get parts() {
        const { maxUnits, minUnit } = this.props;
        return durationParts(this.props.record.data[this.props.name], { maxUnits, minUnit });
    }
}

export const durationField = {
    component: DurationField,
    displayName: _t("Duration"),
    supportedTypes: ["float", "integer"],
    extractProps: ({ options }) => ({ align: options.align, ...durationOptions(options) }),
};

registry.category("fields").add("human_duration", durationField);

registry.category("formatters").add("human_duration", formatDuration);
