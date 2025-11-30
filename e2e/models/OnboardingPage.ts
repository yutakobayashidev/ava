import { Base } from "./Base";

export class OnboardingPage extends Base {
  async goTo() {
    await this.page.goto("/onboarding");
  }
}

export class ConnectSlackPage extends Base {
  async goTo() {
    await this.page.goto("/onboarding/connect-slack");
  }
}

export class SetupMcpPage extends Base {
  async goTo() {
    await this.page.goto("/onboarding/setup-mcp");
  }
}

export class OnboardingCompletePage extends Base {
  async goTo() {
    await this.page.goto("/onboarding/complete");
  }
}
