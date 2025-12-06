import { Base } from "./Base";

export class LoginPage extends Base {
  async goTo() {
    return await this.page.goto("/login");
  }
}
