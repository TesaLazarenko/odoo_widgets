===============
Duration Widget
===============

``human_duration`` is a field widget for ``float`` and ``integer`` fields that hold a number of
seconds. It shows the value as days, hours, minutes, seconds and milliseconds and skips the zero
units: ``90061.5`` is ``1d 1h 1m 1s 500ms``, ``1.31`` is ``1s 310ms``. Zero and empty values
show nothing. The module depends on ``web`` only and adds no models.

Quick start
===========

Add ``web_widget_duration`` to the ``depends`` of your module and set the widget on the field:

.. code-block:: xml

    <!-- form: every unit, down to milliseconds -->
    <field name="duration" widget="human_duration"/>

    <!-- list: the rows keep every unit, group rows and the total follow min_unit 'auto' -->
    <list>
        <field name="name"/>
        <field name="duration" widget="human_duration" sum="Total"/>
    </list>

Options
=======

.. code-block:: xml

    <field name="duration" widget="human_duration" options="{'max_units': 2}"/>
    <field name="duration" widget="human_duration" options="{'min_unit': 'auto', 'align': 'center'}"/>

``max_units``
    At most this many units, counted from the largest non-zero one with the zero units in
    between; the last one is rounded. With ``2``, ``90061.5`` is ``1d 1h`` and ``86700`` is ``1d``.
``min_unit``
    The smallest unit shown, the value rounded to it: ``days``, ``hours``, ``minutes``,
    ``seconds``, ``milliseconds`` or ``auto``. With ``minutes``, ``90061.5`` is ``1d 1h 1m``;
    ``20`` rounds to zero and shows nothing.
``min_unit: 'auto'``
    The smallest unit depends on the largest non-zero one: days show down to minutes
    (``1d 1h 1m``), hours and minutes down to seconds (``1h 2m 5s``, ``1m 16s``), seconds alone
    with two decimals (``59.6s``, ``1.31s``), values below one second in milliseconds
    (``0.4ms``). The last unit is rounded. With ``max_units`` too, the stricter limit wins:
    ``3725.125`` with ``max_units: 2`` is ``1h 2m``.
``align``
    ``start``, ``center`` or ``end``. Without it the widget follows its column or cell: right in
    lists, like the other numeric columns, left in forms.

Negative values carry the sign on the first unit: ``-75.5`` is ``-1m 15s 500ms``.

Sums and other views
====================

List group rows, list totals, pivot and graph show sums as text, through the ``human_duration``
formatter. Without ``max_units`` or ``min_unit`` they follow ``min_unit: 'auto'``, while the rows
keep every unit: the rows ``1d 1h 1m 1s 500ms`` and ``1s 310ms`` sum to ``1d 1h 1m``. To keep
full precision in the sums, set ``min_unit: 'milliseconds'``; the sum is then
``1d 1h 1m 2s 810ms``. Which views apply the options depends on the series, see below.

.. code-block:: xml

    <field name="duration" widget="human_duration" sum="Total" options="{'min_unit': 'milliseconds'}"/>

Notes for 20.0
==============

List group rows and totals, pivot and graph all receive the widget options through
``formatDuration.extractOptions``; the module does not patch any view.

Translations
============

Unit symbols are translated to Ukrainian, German and Polish (``i18n/``): in German a sum of
``3725.125`` reads ``1 Std. 2 Min. 5 Sek.``. The decimal separator follows the user's language.
In the field widget each unit has its full name, such as "hour(s)", as a tooltip.

JavaScript API
==============

``@web_widget_duration/duration_field`` exports:

- ``formatDuration(value, options)``: the text, empty for ``false``. ``options`` is
  ``{ maxUnits, minUnit }``; with neither it follows ``minUnit: 'auto'``. It is the
  ``human_duration`` formatter.
  ``formatDuration.extractOptions`` hands it the field's view options in the views that
  pass them.
- ``durationParts(seconds, options)``: the shown units as ``{ unit, title, text }``; without
  options it keeps every unit.
- ``durationOptions(options)``: view options ``{ max_units, min_unit }`` as
  ``{ maxUnits, minUnit }``.
- ``DurationField`` and ``durationField``: the component and its ``human_duration`` field
  registry entry, to reuse in other widgets.
- ``DURATION_UNITS`` and ``MIN_UNITS``: the accepted unit names.

.. code-block:: javascript

    import { formatDuration } from "@web_widget_duration/duration_field";

    formatDuration(3725.125); // "1h 2m 5s"
    formatDuration(3725.125, { minUnit: "milliseconds" }); // "1h 2m 5s 125ms"

Tests
=====

- Python, ``tests/test_duration_widget.py``: the unit symbols have Ukrainian, German and Polish
  translations, and the widget files are in ``web.assets_backend``::

      odoo -d <db> -i web_widget_duration --test-enable --test-tags /web_widget_duration --stop-after-init

- JavaScript, Hoot, ``static/tests/duration_field.test.js`` in the ``web.assets_unit_tests``
  bundle: the formatter and its options, negative values, the form, plain and grouped lists
  with totals, alignment, and pivot with and without options. To run them, log in to a database with
  the module installed and open ``/web/tests?filter=web_widget_duration``.

Limitations
===========

- The widget only displays the value: it has no input, so it cannot change the value, even in
  an editable form.
- Days are the largest unit: 400 days is ``400d``.
- Values are rounded to hundredths of a millisecond, so durations below ``0.005ms`` show nothing.
- Sums, pivot and graph show plain text, without the unit tooltips.

Credits
=======

Taras Shabaranskyi, LGPL-3.
