import { Base } from "./Base";

export class DashboardPage extends Base {
  async goTo() {
    return await this.page.goto("/dashboard");
  }
}
