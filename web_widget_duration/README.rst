===============
Duration Widget
===============

Field widget ``human_duration`` for ``float`` and ``integer`` fields that hold a number of seconds.
The value is shown as days, hours, minutes, seconds and milliseconds, skipping the zero units:
``90061.5`` becomes ``1d 1h 1m 1s 500ms``, ``1.31`` becomes ``1s 310ms``.

Usage
=====

.. code-block:: xml

    <field name="duration" widget="human_duration"/>
    <field name="duration" widget="human_duration" options="{'align': 'center'}"/>

- The widget follows the alignment of its column or cell: right in lists, like the other
  numeric columns and their header, left in forms.
- ``align``: ``start``, ``center`` or ``end`` forces the alignment.
- List group rows and totals are formatted the same way (``registry.category("formatters")``).
- Unit symbols are translated (uk, de, pl); the full unit name is the tooltip of each part.

JavaScript API
==============

``@web_widget_duration/duration_field`` exports ``durationParts(seconds)``,
``formatDuration(seconds)``, ``DurationField`` and ``durationField`` for reuse in other widgets,
for example to show tracked durations in the chatter.

Credits
=======

Taras Shabaranskyi, LGPL-3.
