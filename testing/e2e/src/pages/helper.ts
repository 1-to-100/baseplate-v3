export class UserPageHelper {
  static toCamelCase(text: string): string {
    return text
      .split(' ')
      .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join('');
  }

  static deleteSpaces(text: string): string {
    return text.replace(/\s+/g, '');
  }

  static getRandomValue<T>(options: T[]): T {
    return options[Math.floor(Math.random() * options.length)];
  }

  static toConstantCase(text: string): string {
    return text.replace(/[\s-]/g, '_').toUpperCase();
  }
}
