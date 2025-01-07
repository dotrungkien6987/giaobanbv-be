const helpFunction = {};

helpFunction.convertToVietnamDate= (dateString, endOfDay = false) =>{
    const date = new Date(dateString);
    date.setHours(date.getHours() + 7); // Chuyển đổi sang giờ Việt Nam (GMT+7)
    if (endOfDay) {
      date.setHours(23, 59, 59, 999); // Đặt về cuối ngày
    } else {
      date.setHours(0, 0, 0, 0); // Đặt về đầu ngày
    }
    return date;
  }

module.exports = helpFunction;
