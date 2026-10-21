(function (global) {
  'use strict';

  var WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function weekdayOf(dateISO) {
    var d = new Date(dateISO + 'T00:00:00Z');
    return WEEKDAYS[d.getUTCDay()];
  }

  function daysInMonth(year, month) {
    // month は1始まり（1=1月）
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDate(year, month, day) {
    return year + '-' + pad2(month) + '-' + pad2(day);
  }

  function findException(exceptions, dateISO) {
    var found;
    (exceptions || []).forEach(function (exception) {
      if (exception.date === dateISO) {
        found = exception;
      }
    });
    return found;
  }

  function resolveDay(calendarData, dateISO) {
    var weekday = weekdayOf(dateISO);
    var weeklyStatus = (calendarData.weekly_pattern || {})[weekday] || 'closed';
    var exception = findException(calendarData.exceptions, dateISO);

    var status = weeklyStatus;
    var note = '';

    if (exception) {
      if (exception.status) {
        status = exception.status;
      }
      if (exception.note) {
        note = exception.note;
      }
    }

    var confirmedUntil = calendarData.confirmed_until;
    var provisional = !confirmedUntil || dateISO > confirmedUntil;

    return {
      date: dateISO,
      weekday: weekday,
      status: status,
      note: note,
      provisional: provisional
    };
  }

  function getMonthsToShow(calendarData, todayISO) {
    var year = parseInt(todayISO.slice(0, 4), 10);
    var month = parseInt(todayISO.slice(5, 7), 10);

    var firstMonth = { year: year, month: month };
    var secondMonth = month === 12
      ? { year: year + 1, month: 1 }
      : { year: year, month: month + 1 };

    return [firstMonth, secondMonth].map(function (m) {
      var total = daysInMonth(m.year, m.month);
      var days = [];
      for (var day = 1; day <= total; day++) {
        days.push(resolveDay(calendarData, formatDate(m.year, m.month, day)));
      }
      return { year: m.year, month: m.month, days: days };
    });
  }

  function getTodayInJST(now) {
    now = now || new Date();
    var formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  }

  var CoffeeRhythmCalendar = {
    resolveDay: resolveDay,
    getMonthsToShow: getMonthsToShow,
    getTodayInJST: getTodayInJST
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeeRhythmCalendar;
  } else {
    global.CoffeeRhythmCalendar = CoffeeRhythmCalendar;
  }
})(typeof window !== 'undefined' ? window : globalThis);
