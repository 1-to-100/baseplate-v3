import { faker } from '@faker-js/faker';

const NUMBERS = '0123456789';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SYMBOLS = '!@#$%^&*()_+[]{}<>?';

export const randomLetters = (quantity: number): string =>
  Array.from({ length: quantity }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

export const randomNumbers = (quantity: number): string =>
  Array.from({ length: quantity }, () => NUMBERS[Math.floor(Math.random() * NUMBERS.length)]).join('');

export const symbolsNumbers = (quantity: number): string =>
  Array.from({ length: quantity }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]).join('');

export const generateNewUser = () => {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    randomEmail: faker.internet.email(),
    password: randomLetters(10) + randomNumbers(1) + symbolsNumbers(1),
  };
};

export const generateArticleText = (): string => {
  return faker.lorem.paragraphs(3).replace(/\n/g, ' ');
};

export const generateFormattedDate = (): string => {
  const date = new Date();
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};
