export const MESSAGES = {
  COMMON: {
    SERVER_ERROR: "Có lỗi xảy ra trên server",
    NOT_FOUND: "Không tìm thấy tài nguyên",
    VALIDATION_ERROR: "Dữ liệu không hợp lệ",
    INVALID_ID: "ID không hợp lệ",
  },

  AUTH: {
    LOGIN_SUCCESS: "Đăng nhập thành công",
    LOGIN_FAILED: "Thông tin đăng nhập không chính xác",
    TOKEN_REQUIRED: "Access token is required",
    TOKEN_INVALID: "Invalid token",
    USER_INACTIVE: "Tài khoản đã bị vô hiệu hóa",
    CREDENTIALS_REQUIRED: "Vui lòng nhập đầy đủ thông tin đăng nhập",
  },

  USER: {
    USERNAME_EXISTS: "Tên đăng nhập đã tồn tại",
    NOT_FOUND: "Không tìm thấy người dùng",
  },

  DAY: {
    NOT_FOUND: "Không tìm thấy list ngày này",
    INVALID_DATE: "Ngày không hợp lệ",
  },

  DEFAULT: {
    NOT_FOUND: "Không tìm thấy item",
  },
} as const;
