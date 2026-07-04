import { WorkflowEntrypoint } from "cloudflare:workers";
import { EDfunction } from "../backend/ecole_directe/index.js";
import { sendNotifierMessage } from "../backend/notifications/notifier.js";

export class CheckGradesWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const env = this.env;
    
    // Boucle infinie pour vérifier les notes régulièrement
    while (true) {
      try {
        // Délai aléatoire entre 2h30 (9000s) et 4h (14400s)
        const minDelay = 9000; // 2h30 en secondes
        const maxDelay = 14400; // 4h en secondes
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        
        // Attendre le délai aléatoire
        await step.sleep(`sleep-${Date.now()}`, randomDelay);
        
        // Récupérer les nouvelles notes via EDfunction
        const headers = new Headers({
          "filter": "true",
          "new_token": "false"
        });
        
        const newGrades = await step.do(`fetch-new-grades-${Date.now()}`, async () => {
          return await EDfunction(env, "new-grades", "GET", headers, null);
        });
        
        // Vérifier s'il y a des nouvelles notes et envoyer des notifications
        if (newGrades && typeof newGrades === "object" && Object.keys(newGrades).length > 0) {
          await step.do(`send-notifications-${Date.now()}`, async () => {
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
      } catch (error) {
        console.error("Error in CheckGradesWorkflow:", error);
        // Continuer même en cas d'erreur
      }
    }
  }
}
