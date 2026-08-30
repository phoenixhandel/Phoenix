export const passwordIssue = (password: string, language: "de" | "en") => {
  const requirements = [
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
  if (requirements.every(Boolean)) return null;
  return language === "de"
    ? "Ihr Passwort benötigt mindestens 12 Zeichen sowie einen Kleinbuchstaben, Großbuchstaben, eine Zahl und ein Sonderzeichen."
    : "Your password needs at least 12 characters, including a lowercase letter, uppercase letter, number, and special character.";
};
