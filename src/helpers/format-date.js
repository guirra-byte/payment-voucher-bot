function getAbbreviatedMonth(monthNumber) {
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return months[monthNumber - 1];
}

function formatDateToCustomFormat(dateString) {
  const formats = [
    { regex: /(\d{2})\/(\d{2})\/(\d{4})/, format: "dd/mm/yyyy" }, // dd/mm/yyyy
    { regex: /(\d{4})-(\d{2})-(\d{2})/, format: "yyyy-mm-dd" }, // yyyy-mm-dd
    { regex: /(\d{2})-(\d{2})-(\d{4})/, format: "dd-mm-yyyy" }, // dd-mm-yyyy
    { regex: /(\d{2})\.(\d{2})\.(\d{4})/, format: "dd.mm.yyyy" }, // dd.mm.yyyy
    { regex: /(\d{2}) ([a-z]{3}) (\d{4})/i, format: "dd mmm yyyy" }, // dd mmm yyyy (ex: 05 ago 2024)
    { regex: /([a-z]{3}) (\d{2}), (\d{4})/i, format: "mmm dd, yyyy" }, // mmm dd, yyyy (ex: Aug 05, 2024)
  ];

  for (let { regex, format } of formats) {
    const match = dateString.match(regex);
    if (match) {
      let day, month, year;
      switch (format) {
        case "dd/mm/yyyy":
          [_, day, month, year] = match;
          break;
        case "yyyy-mm-dd":
          [_, year, month, day] = match;
          break;
        case "dd-mm-yyyy":
          [_, day, month, year] = match;
          break;
        case "dd.mm.yyyy":
          [_, day, month, year] = match;
          break;
        case "dd mmm yyyy":
          [_, day, month, year] = match;
          month = getAbbreviatedMonth(parseMonth(month));
          break;
        case "mmm dd, yyyy":
          [_, month, day, year] = match;
          month = month.toLowerCase();
          month = getAbbreviatedMonth(parseMonthFromName(month));
          break;
      }
      return `${getAbbreviatedMonth(parseInt(month))}/${year}`;
    }
  }

  return null;
}

const months = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

function parseMonthFromName(monthName) {
  return months[monthName] || 0;
}

function nxtMonth(period) {
  const [, monthName] = period.split("/");
  const nxtMonth = months[monthName] + 1;
  return nxtMonth;
}

function parseMonth(monthNumber) {
  return parseInt(monthNumber, 10);
}

module.exports = {
  formatDate: formatDateToCustomFormat,
  nxtMonth,
  months: [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ],
};
