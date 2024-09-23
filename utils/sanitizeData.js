exports.sanitizeGovernorate = function (governorate) {
  return {
    _id: governorate._id,
    name: governorate.name,
    cities: governorate.cities,
  };
};

exports.sanitizeGovernoratesList = function (governorates) {
  return governorates.map(exports.sanitizeGovernorate);
};

exports.sanitizeCity = function (city) {
  return {
    _id: city._id,
    name: city.name,
    governorate: city.governorate,
    nurses: city.nurses,
  };
};

exports.sanitizeCitiesList = function (cities) {
  return cities.map(exports.sanitizeCity);
};

exports.sanitizeUser = function (user) {
  return {
    _id: user._id,
    name: user.name,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    age: user.age,
    //phone: user.phone,
    email: user.email,
    photo: user.photo,
    governorate: user.governorate,
    city: user.city,
    bloodType: user.bloodType,
    weight: user.weight,
    height: user.height,
    active: user.active,
  };
};

exports.sanitizeUsersList = function (users) {
  return users.map(exports.sanitizeUser);
};

exports.sanitizeNurse = function (nurse) {
  return {
    _id: nurse._id,
    name: nurse.name,
    gender: nurse.gender,
    dateOfBirth: nurse.dateOfBirth,
    age: nurse.age,
    phone: nurse.phone,
    email: nurse.email,
    photo: nurse.photo,
    governorate: nurse.governorate,
    city: nurse.city,
    specialization: nurse.specialization,
    about: nurse.about,
    yearsOfExperience: nurse.yearsOfExperience,
    patients: nurse.patients,
    ratingsAverage: nurse.ratingsAverage,
    reviewersNumber: nurse.reviewersNumber,
    reviews: nurse.reviews,
    available: nurse.available,
    active: nurse.active,
    isFavorite: nurse.isFavorite,
  };
};

exports.sanitizeNurseForAdmin = function (nurse) {
  return {
    _id: nurse._id,
    name: nurse.name,
    gender: nurse.gender,
    dateOfBirth: nurse.dateOfBirth,
    age: nurse.age,
    phone: nurse.phone,
    email: nurse.email,
    photo: nurse.photo,
    idCardFront: nurse.idCardFront,
    idCardBack: nurse.idCardBack,
    certificate: nurse.certificate,
    governorate: nurse.governorate,
    city: nurse.city,
    specialization: nurse.specialization,
    about: nurse.about,
    yearsOfExperience: nurse.yearsOfExperience,
    patients: nurse.patients,
    ratingsAverage: nurse.ratingsAverage,
    reviewersNumber: nurse.reviewersNumber,
    reviews: nurse.reviews,
    available: nurse.available,
    active: nurse.active,
    isFavorite: nurse.isFavorite,
  };
};

exports.sanitizeNursesList = function (nurses) {
  return nurses.map(exports.sanitizeNurse);
};

exports.sanitizeReview = function (review) {
  return {
    _id: review._id,
    review: review.review,
    rating: review.rating,
    nurse: review.nurse,
    user: review.user,
  };
};

exports.sanitizeReviewsList = function (reviews) {
  return reviews.map(exports.sanitizeReview);
};

exports.sanitizeAppointment = function (appointment) {
  return {
    _id: appointment._id,
    appointmentType: appointment.appointmentType,
    serviceOption: appointment.serviceOption,
    frequency: appointment.frequency,
    haveAvailableRoom: appointment.haveAvailableRoom,
    areTherePoepleWithUser: appointment.areTherePoepleWithUser,
    nurse: appointment.nurse,
    user: appointment.user,
    appointmentCode: appointment.appointmentCode,
    date: appointment.date,
    end: appointment.end,
    time: appointment.time,
    days: appointment.days,
    totalCost: appointment.totalCost,
    notes: appointment.notes,
    nurseAcceptance: appointment.nurseAcceptance,
    dateTime: appointment.dateTime,
  };
};

exports.sanitizeAppoinmentsList = function (appointments) {
  return appointments.map(exports.sanitizeAppointment);
};
