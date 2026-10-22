import { faker } from '@faker-js/faker';

export function matchSemanticProperty(propertyName: string): any {
  if (!propertyName) return undefined;

  const key = propertyName.trim();

  if (/email/i.test(key)) {
    return faker.internet.email();
  }
  if (/uuid/i.test(key)) {
    return faker.string.uuid();
  }
  if (/id$/i.test(key)) {
    return faker.number.int({ min: 1, max: 99999 });
  }
  if (/avatar|image|photo/i.test(key)) {
    return faker.image.avatar();
  }
  if (/phone|mobile/i.test(key)) {
    return faker.phone.number();
  }
  if (/first.*name/i.test(key)) {
    return faker.person.firstName();
  }
  if (/last.*name/i.test(key)) {
    return faker.person.lastName();
  }
  if (/full.*name|name$/i.test(key)) {
    return faker.person.fullName();
  }
  if (/price|amount|cost/i.test(key)) {
    return faker.number.float({ min: 5, max: 500, fractionDigits: 2 });
  }
  if (/currency/i.test(key)) {
    return faker.finance.currencyCode();
  }
  if (/created_at|updated_at|timestamp|date/i.test(key)) {
    return faker.date.recent().toISOString();
  }
  if (/city/i.test(key)) {
    return faker.location.city();
  }
  if (/country/i.test(key)) {
    return faker.location.country();
  }
  if (/url|website/i.test(key)) {
    return faker.internet.url();
  }

  return undefined;
}
