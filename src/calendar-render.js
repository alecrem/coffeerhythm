(function (global) {
  'use strict';

  var MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDay(day) {
    var classes = ['calendar__day', 'calendar__day--' + day.status];
    if (day.provisional) {
      classes.push('calendar__day--provisional');
    }

    var dayNumber = parseInt(day.date.slice(8, 10), 10);
    var title = day.note ? ' title="' + escapeHtml(day.note) + '"' : '';

    return '<li class="' + classes.join(' ') + '" data-date="' + day.date + '"' + title + '>' +
      '<span class="calendar__day-number">' + dayNumber + '</span>' +
      '</li>';
  }

  function renderMonth(month) {
    return '<div class="calendar__month">' +
      '<h3 class="calendar__month-title">' + month.year + '年' + MONTH_LABELS[month.month] + '</h3>' +
      '<ul class="calendar__grid">' +
      month.days.map(renderDay).join('') +
      '</ul>' +
      '</div>';
  }

  function renderCalendarHTML(months) {
    return '<div class="calendar__months">' + months.map(renderMonth).join('') + '</div>';
  }

  var CoffeeRhythmCalendarRender = {
    renderCalendarHTML: renderCalendarHTML
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeeRhythmCalendarRender;
  } else {
    global.CoffeeRhythmCalendarRender = CoffeeRhythmCalendarRender;
  }
})(typeof window !== 'undefined' ? window : globalThis);
