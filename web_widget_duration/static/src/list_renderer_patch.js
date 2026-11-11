/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";
import { durationOptions, formatDuration, hasDurationOptions } from "./duration_field";

// list aggregates reach the formatter without the widget options, they are formatted again here
function isPreciseDuration(column) {
    return column.widget === "human_duration" && hasDurationOptions(column.options);
}

function footerValues(list) {
    if (list.selection && list.selection.length) {
        return list.selection.map((record) => record.data);
    }
    if (list.isGrouped) {
        return list.groups.map((group) => group.aggregates);
    }
    return list.records.map((record) => record.data);
}

function aggregate(values, func) {
    if (func === "max") {
        return Math.max(...values);
    }
    if (func === "min") {
        return Math.min(...values);
    }
    const sum = values.reduce((acc, value) => acc + value, 0);
    return func === "avg" ? sum / values.length : sum;
}

patch(ListRenderer.prototype, {
    get aggregates() {
        const aggregates = super.aggregates;
        const columns = this.allColumns.filter(
            (column) => column.name in aggregates && isPreciseDuration(column)
        );
        if (!columns.length) {
            return aggregates;
        }
        const values = footerValues(this.props.list);
        for (const column of columns) {
            const func = ["sum", "avg", "max", "min"].find((name) => column.attrs[name]);
            const fieldValues = values
                .map((value) => value[column.name])
                .filter((value) => value || value === 0);
            aggregates[column.name] = {
                ...aggregates[column.name],
                value: formatDuration(aggregate(fieldValues, func), durationOptions(column.options)),
            };
        }
        return aggregates;
    },

    formatAggregateValue(group, column) {
        if (!(column.name in group.aggregates) || !isPreciseDuration(column)) {
            return super.formatAggregateValue(group, column);
        }
        return formatDuration(group.aggregates[column.name], durationOptions(column.options));
    },
});
