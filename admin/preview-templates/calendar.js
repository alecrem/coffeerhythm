var CalendarPreview = createClass({
  render: function () {
    var entry = this.props.entry;
    var raw = entry.getIn(['data']).toJS();
    var data = window.CoffeeRhythmCalendar.normalizeCalendarData(raw);
    var today = window.CoffeeRhythmCalendar.getTodayInJST();
    var months = window.CoffeeRhythmCalendar.getMonthsToShow(data, today);
    var html = window.CoffeeRhythmCalendarRender.renderCalendarHTML(months, data.hours_note);
    return h('div', { dangerouslySetInnerHTML: { __html: html } });
  }
});

CMS.registerPreviewTemplate('calendar', CalendarPreview);
