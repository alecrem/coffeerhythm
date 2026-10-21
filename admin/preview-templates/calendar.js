var CalendarPreview = createClass({
  render: function () {
    var entry = this.props.entry;
    var data = entry.getIn(['data']).toJS();
    var today = window.CoffeeRhythmCalendar.getTodayInJST();
    var months = window.CoffeeRhythmCalendar.getMonthsToShow(data, today);
    var html = window.CoffeeRhythmCalendarRender.renderCalendarHTML(months);
    return h('div', { dangerouslySetInnerHTML: { __html: html } });
  }
});

CMS.registerPreviewTemplate('calendar', CalendarPreview);
