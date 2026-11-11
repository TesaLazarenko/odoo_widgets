import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";
import { durationOptions, formatDuration, hasDurationOptions } from "./duration_field";

// list aggregates reach the formatter without the widget options, they are formatted again here
function isPreciseDuration(column) {
    return column.widget === "human_duration" && hasDurationOptions(column.options);
}

patch(ListRenderer.prototype, {
    computeAggregates() {
        const aggregates = super.computeAggregates();
        for (const column of this.columns) {
            if (column.name in aggregates && isPreciseDuration(column)) {
                const aggregate = aggregates[column.name];
                aggregates[column.name] = {
                    ...aggregate,
                    value: formatDuration(aggregate.rawValue, durationOptions(column.options)),
                };
            }
        }
        return aggregates;
    },

    formatGroupAggregate(group, column) {
        const result = super.formatGroupAggregate(group, column);
        if (!(column.name in group.aggregates) || !isPreciseDuration(column)) {
            return result;
        }
        const value = group.aggregates[column.name];
        return { ...result, value: formatDuration(value, durationOptions(column.options)) };
    },
});
