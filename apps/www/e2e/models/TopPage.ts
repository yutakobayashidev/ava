import { Base } from "./Base";

export class TopPage extends Base {
  async goTo() {
    return await this.page.goto("/");
  }
}
