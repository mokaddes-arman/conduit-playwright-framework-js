import { faker } from '@faker-js/faker';

/**
 * Unique suffix keeps slugs/titles unique across runs (slug collisions otherwise).
 */
const unique = () => `${Date.now()}${faker.string.alphanumeric(5)}`;

export function generateUser() {
  const id = unique();
  return {
    username: `pw${id}`.slice(0, 20),
    email: `pw${id}@test.com`,
    password: 'password123',
  };
}

export function generateArticle(overrides = {}) {
  return {
    title: `Art ${faker.lorem.words(3)} ${unique()}`,
    description: faker.lorem.sentence(),
    body: `${faker.lorem.paragraph()}\n\n${faker.lorem.paragraph()}`,
    tagList: [faker.word.noun(), faker.word.noun()],
    ...overrides,
  };
}

export function generateComment() {
  return { body: `Comment ${faker.lorem.sentence()} ${unique()}` };
}

export function generateSettings() {
  return {
    bio: faker.lorem.sentence(),
    image: faker.image.avatarGitHub(),
  };
}
