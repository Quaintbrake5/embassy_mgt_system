import validator from 'validator';

export class RegisterDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  password!: string;
  phone?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
      errors.push('First name is required');
    } else if (data.firstName.trim().length > 100) {
      errors.push('First name must not exceed 100 characters');
    }

    if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
      errors.push('Last name is required');
    } else if (data.lastName.trim().length > 100) {
      errors.push('Last name must not exceed 100 characters');
    }

    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    } else if (data.email.length > 255) {
      errors.push('Email must not exceed 255 characters');
    }

    if (!data.password || typeof data.password !== 'string') {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else if (data.password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    } else {
      // Check password strength
      const hasUpper = /[A-Z]/.test(data.password);
      const hasLower = /[a-z]/.test(data.password);
      const hasNumber = /\d/.test(data.password);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(data.password);
      if (!(hasUpper && hasLower && hasNumber && hasSymbol)) {
        errors.push('Password must contain uppercase, lowercase, number, and special character');
      }
    }

    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      if (typeof data.phone !== 'string') {
        errors.push('Phone must be a string');
      } else if (!/^\+?[1-9]\d{1,14}$/.test(data.phone.replace(/\s/g, ''))) {
        errors.push('Invalid phone number format (use E.164 format)');
      }
    }

    return errors;
  }

  static sanitize(data: any): RegisterDto {
    const dto = new RegisterDto();
    dto.firstName = data.firstName?.trim();
    dto.lastName = data.lastName?.trim();
    dto.email = data.email?.trim().toLowerCase();
    dto.password = data.password;
    dto.phone = data.phone?.trim();
    return dto;
  }
}

export class LoginDto {
  email!: string;
  password!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.password || typeof data.password !== 'string') {
      errors.push('Password is required');
    }

    return errors;
  }

  static sanitize(data: any): LoginDto {
    const dto = new LoginDto();
    dto.email = data.email?.trim().toLowerCase();
    dto.password = data.password;
    return dto;
  }
}

export class RefreshDto {
  refreshToken!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.refreshToken || typeof data.refreshToken !== 'string') {
      errors.push('Refresh token is required');
    }

    return errors;
  }

  static sanitize(data: any): RefreshDto {
    const dto = new RefreshDto();
    dto.refreshToken = data.refreshToken?.trim();
    return dto;
  }
}

export class ChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.currentPassword || typeof data.currentPassword !== 'string') {
      errors.push('Current password is required');
    }

    if (!data.newPassword || typeof data.newPassword !== 'string') {
      errors.push('New password is required');
    } else if (data.newPassword.length < 8) {
      errors.push('New password must be at least 8 characters');
    } else if (data.newPassword.length > 128) {
      errors.push('New password must not exceed 128 characters');
    } else {
      const hasUpper = /[A-Z]/.test(data.newPassword);
      const hasLower = /[a-z]/.test(data.newPassword);
      const hasNumber = /\d/.test(data.newPassword);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(data.newPassword);
      if (!(hasUpper && hasLower && hasNumber && hasSymbol)) {
        errors.push('New password must contain uppercase, lowercase, number, and special character');
      }
    }

    if (data.currentPassword === data.newPassword) {
      errors.push('New password must be different from current password');
    }

    return errors;
  }

  static sanitize(data: any): ChangePasswordDto {
    const dto = new ChangePasswordDto();
    dto.currentPassword = data.currentPassword;
    dto.newPassword = data.newPassword;
    return dto;
  }
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    userid: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    roleId?: string;
    status: string;
    emailVerified: boolean;
  };
}