import { MIN_PASSWORD_LENGTH } from "../constants/authConstants";

export function validatePasswordLength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

export function validatePasswordMatch(
  password: string,
  confirm: string,
): string | null {
  if (password !== confirm) {
    return "Las contraseñas no coinciden";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return "Ingresa tu email primero";
  }
  return null;
}
