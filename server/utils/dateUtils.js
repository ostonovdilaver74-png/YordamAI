const getDateKey = (date = new Date()) => {
  const value = new Date(date);

  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const isSameUtcDay = (firstDate, secondDate) => {
  if (!firstDate || !secondDate) {
    return false;
  }

  return getDateKey(firstDate) === getDateKey(secondDate);
};

const addDays = (date, numberOfDays) => {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + Number(numberOfDays));

  return result;
};

const getNextUtcResetDate = () => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
};

module.exports = {
  getDateKey,
  isSameUtcDay,
  addDays,
  getNextUtcResetDate,
};