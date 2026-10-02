// Government of India defines a senior citizen as 60 years or older
const SENIOR_CITIZEN_AGE = 60;

function calculateAge(dateOfBirth, today = new Date()) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function isSeniorCitizen(dateOfBirth) {
  const age = calculateAge(dateOfBirth);
  return age !== null && age >= SENIOR_CITIZEN_AGE;
}

module.exports = { calculateAge, isSeniorCitizen, SENIOR_CITIZEN_AGE };
