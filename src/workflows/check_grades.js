import { WorkflowEntrypoint } from "cloudflare:workers";
import { EDfunction } from "../backend/ecole_directe/index.js";
import { sendNotifierMessage } from "../backend/notifications/notifier.js";

export class CheckGradesWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const env = this.env;
    
    try {
      // Récupérer les nouvelles notes via EDfunction
      const headers = new Headers({
        "filter": "true",
        "new_token": "false"
      });
      
      const newGrades = await step.do("fetch-new-grades", async () => {
        return await EDfunction(env, "new-grades", "GET", headers, null);
      });
      
      // Vérifier s'il y a des nouvelles notes et envoyer des notifications
      if (newGrades && typeof newGrades === "object" && Object.keys(newGrades).length > 0) {
        await step.do("send-notifications", async () => {
          for (const [periode, matieres] of Object.entries(newGrades)) {
            for (const [matiere, notes] of Object.entries(matieres)) {
              if (Array.isArray(notes) && notes.length > 0) {
                // Préparer les informations des notes
                const gradeTexts = notes.map(note => {
                  const noteValue = note.note;
                  const maxValue = note.noteSur || "20";
                  return `${noteValue}/${maxValue}`;
                }).join(", ");
                
                const gradeBrief = notes.length === 1 ? "New grade" : "New grades";
                
                // Envoyer la notification
                await sendNotifierMessage(env, {
                  title: `${gradeBrief} in ${matiere}`,
                  message: `${gradeBrief}: ${gradeTexts} in ${matiere} (Period: ${periode})`
                });
              }
            }
          }
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error in CheckGradesWorkflow:", error);
      return { success: false, error: error.message };
    }
  }
}
