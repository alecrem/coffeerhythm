(function (global) {
  'use strict';

  var MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  var WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
  var WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var STATUSES = ['open', 'closed'];
  var STATUS_LABELS = { open: '営業', closed: '休' };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // class 属性に生の値を入れないため、既知の値だけを通し、それ以外は安全側の closed にする。
  function safeStatus(status) {
    return STATUSES.indexOf(status) === -1 ? 'closed' : status;
  }

  function weekdayIndex(weekday) {
    var index = WEEKDAY_KEYS.indexOf(weekday);
    return index === -1 ? 0 : index;
  }

  function renderDay(day) {
    var status = safeStatus(day.status);
    var classes = ['calendar__day', 'calendar__day--' + status];
    if (day.provisional) {
      classes.push('calendar__day--provisional');
    }

    var dayNumber = parseInt(day.date.slice(8, 10), 10);
    var title = day.note ? ' title="' + escapeHtml(day.note) + '"' : '';
    var statusLabel = STATUS_LABELS[status];
    var note = day.note
      ? '<span class="calendar__day-note">' + escapeHtml(day.note) + '</span>'
      : '';

    return '<li class="' + classes.join(' ') + '" data-date="' + escapeHtml(day.date) + '"' + title + '>' +
      '<span class="calendar__day-number">' + dayNumber + '</span>' +
      '<span class="calendar__day-status calendar__day-status--' + status + '">' + statusLabel + '</span>' +
      note +
      '</li>';
  }

  function renderEmptyDay() {
    return '<li class="calendar__day calendar__day--empty" aria-hidden="true"></li>';
  }

  function renderWeekdayRow() {
    return '<div class="calendar__weekday-row" aria-hidden="true">' +
      WEEKDAY_LABELS.map(function (label) {
        return '<span class="calendar__weekday">' + label + '</span>';
      }).join('') +
      '</div>';
  }

  function renderMonth(month) {
    var days = month.days || [];
    var offset = days.length ? weekdayIndex(days[0].weekday) : 0;
    var leading = '';
    for (var i = 0; i < offset; i++) {
      leading += renderEmptyDay();
    }

    return '<div class="calendar__month">' +
      '<h3 class="calendar__month-title">' + month.year + '年' + MONTH_LABELS[month.month] + '</h3>' +
      renderWeekdayRow() +
      '<ul class="calendar__grid">' +
      leading +
      days.map(renderDay).join('') +
      '</ul>' +
      '</div>';
  }

  function renderCalendarHTML(months) {
    return '<div class="calendar__months">' + months.map(renderMonth).join('') + '</div>';
  }

  var CoffeeRhythmCalendarRender = {
    renderCalendarHTML: renderCalendarHTML,
    renderDay: renderDay
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeeRhythmCalendarRender;
  } else {
    global.CoffeeRhythmCalendarRender = CoffeeRhythmCalendarRender;
  }
})(typeof window !== 'undefined' ? window : globalThis);
