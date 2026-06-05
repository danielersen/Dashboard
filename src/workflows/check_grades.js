import { WorkflowEntrypoint } from "cloudflare:workers";

export class CheckGradesWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    return { success: true };
  }
}
