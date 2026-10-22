(function (global) {
  'use strict';

  var MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  var WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
  var WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  var STATUSES = ['open', 'closed'];
  var STATUS_LABELS = { open: '営業', closed: '休' };
  var WEEKDAY_FULL_LABELS = {
    monday: '月曜日',
    tuesday: '火曜日',
    wednesday: '水曜日',
    thursday: '木曜日',
    friday: '金曜日',
    saturday: '土曜日',
    sunday: '日曜日'
  };

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
    var dayNumberClass = 'calendar__day-number' + (day.weekday === 'sunday' ? ' calendar__day-number--sunday' : '');
    var weekdayLabel = WEEKDAY_FULL_LABELS[day.weekday] || '';
    // 営業日は数字だけで足りるので、ラベルは読み上げ用に残して見た目からは外す。
    var statusClass = 'calendar__day-status calendar__day-status--' + status + (status === 'open' ? ' sr-only' : '');
    // 見た目では点線ボーダーで伝える未確定を、読み上げでも伝える。
    var provisionalLabel = day.provisional ? '<span class="sr-only">未確定</span>' : '';

    return '<li class="' + classes.join(' ') + '" data-date="' + escapeHtml(day.date) + '"' + title + '>' +
      '<span class="' + dayNumberClass + '">' + dayNumber + '</span>' +
      '<span class="sr-only">' + escapeHtml(weekdayLabel) + '</span>' +
      provisionalLabel +
      '<span class="' + statusClass + '">' + statusLabel + '</span>' +
      note +
      '</li>';
  }

  // 最小限のMarkdownもどき: 空行区切りの段落と、段落内の改行だけを扱う。
  // 太字・リスト・リンクなどは扱わない（本番ページとプレビューで同じ
  // レンダリングを保証するため、ブラウザにMarkdownパーサーを持ち込まない）。
  function renderParagraphs(text) {
    if (!text) {
      return '';
    }
    return String(text)
      .split(/\n\s*\n/)
      .map(function (paragraph) { return paragraph.trim(); })
      .filter(function (paragraph) { return paragraph.length > 0; })
      .map(function (paragraph) {
        return '<p>' + escapeHtml(paragraph).replace(/\n/g, '<br>') + '</p>';
      })
      .join('');
  }

  function renderEmptyDay() {
    return '<li class="calendar__day calendar__day--empty" aria-hidden="true"></li>';
  }

  function renderWeekdayRow() {
    return '<div class="calendar__weekday-row" aria-hidden="true">' +
      WEEKDAY_LABELS.map(function (label) {
        var classes = 'calendar__weekday' + (label === '日' ? ' calendar__weekday--sunday' : '');
        return '<span class="' + classes + '">' + label + '</span>';
      }).join('') +
      '</div>';
  }

  function renderMonth(month, extraHtml) {
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
      (extraHtml || '') +
      '</div>';
  }

  function renderCalendarHTML(months, hoursNote) {
    var hoursNoteHtml = hoursNote
      ? '<div class="calendar__hours-note">' + renderParagraphs(hoursNote) + '</div>'
      : '';

    return '<div class="calendar__months">' +
      months.map(function (month, index) {
        return renderMonth(month, index === 0 ? hoursNoteHtml : '');
      }).join('') +
      '</div>';
  }

  var CoffeeRhythmCalendarRender = {
    renderCalendarHTML: renderCalendarHTML,
    renderDay: renderDay,
    renderParagraphs: renderParagraphs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeeRhythmCalendarRender;
  } else {
    global.CoffeeRhythmCalendarRender = CoffeeRhythmCalendarRender;
  }
})(typeof window !== 'undefined' ? window : globalThis);
