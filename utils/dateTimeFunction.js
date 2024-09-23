////////////////////////////////
exports.calculateAge = (dateOfBirthString) => {
  const dob = new Date(dateOfBirthString);
  const ageDiffMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDiffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

exports.getCurrentTimeInEgypt = () => {
  const options = {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const [date, time] = formatter.format(now).split(", ");
  const [day, month, year] = date.split("/");
  const [hour, minute, second] = time.split(":");

  // Manually construct the ISO 8601 format string
  const egyptTime = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;

  return egyptTime;
};

exports.addDaysToDate = (dateString, days) => {
  const date = new Date(dateString);

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
