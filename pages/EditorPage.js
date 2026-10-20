export class EditorPage {
  constructor(page) {
    this.page = page;
    this.titleInput = page.locator('[formcontrolname="title"]');
    this.descriptionInput = page.locator('[formcontrolname="description"]');
    this.bodyInput = page.locator('[formcontrolname="body"]');
    this.tagsInput = page.locator('input[placeholder="Enter tags"]');
    this.publishButton = page.locator('button', { hasText: 'Publish Article' });
    this.errorMessages = page.locator('.error-messages li');
  }

  async goto() {
    await this.page.goto('/editor');
  }

  async gotoEdit(slug) {
    await this.page.goto(`/editor/${slug}`);
  }

  async fillForm({ title, description, body, tagList = [] }) {
    if (title != null) await this.titleInput.fill(title);
    if (description != null) await this.descriptionInput.fill(description);
    if (body != null) await this.bodyInput.fill(body);
    for (const tag of tagList) {
      await this.addTag(tag);
    }
  }

  async addTag(tag) {
    await this.tagsInput.fill(tag);
    await this.tagsInput.press('Enter');
  }

  async publish() {
    await this.publishButton.click();
  }

  async getErrors() {
    return this.errorMessages.allInnerTexts();
  }
}
