const PASSWORD_POLICY_MESSAGE =
  "Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet, dong thoi khong duoc thuoc nhom mat khau yeu pho bien.";

const COMMON_WEAK_PASSWORDS = [
  "123456",
  "password",
  "admin",
  "12345678",
  "123456789",
  "1",
  "123",
];

function getPasswordPolicyError(password) {
  if (typeof password !== "string" || password.length === 0) {
    return "Mat khau khong hop le";
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isWeakPassword = COMMON_WEAK_PASSWORDS.includes(password.toLowerCase());

  if (
    !hasMinLength ||
    !hasUppercase ||
    !hasLowercase ||
    !hasDigit ||
    !hasSpecialChar ||
    isWeakPassword
  ) {
    return PASSWORD_POLICY_MESSAGE;
  }

  return null;
}

module.exports = {
  COMMON_WEAK_PASSWORDS,
  PASSWORD_POLICY_MESSAGE,
  getPasswordPolicyError,
};
