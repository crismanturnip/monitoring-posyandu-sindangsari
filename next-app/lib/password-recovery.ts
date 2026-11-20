export function isValidRecoveredPassword(password: string, confirmation: string): boolean {
  return password.length >= 8 && password === confirmation;
}
