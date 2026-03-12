import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';

// Define the exact rigid output schema desired for the UI
const feedbackSchema = z.object({
  hint: z.string().describe("A Socratic hint guiding the student towards the answer without providing any direct code or syntactical fixes."),
  concept_reference: z.string().describe("The core computer science or web development concept the student needs to review (e.g., 'CSS Specificity', 'Event Bubbling', 'Flexbox Alignment')."),
  encouragement: z.string().describe("A brief positive reinforcement motivating the student to try again.")
});

export class PedagogicalAgent {
  private llm: ChatOpenAI;
  private parser: StructuredOutputParser<typeof feedbackSchema>;
  
  constructor(openAIApiKey: string) {
    // We instantiate the model. GPT-4o is excellent at following negative constraints.
    this.llm = new ChatOpenAI({
      openAIApiKey,
      modelName: "gpt-4o",
      temperature: 0.2, // Low temperature for deterministic pedagogical advice rather than creative stories
    });

    this.parser = StructuredOutputParser.fromZodSchema(feedbackSchema);
  }

  public async generateFeedback(denseContextPayload: string): Promise<z.infer<typeof feedbackSchema>> {
    
    // The Rigorous System Prompt mapping Socratic behaviors
    const promptTemplate = `
You are an expert computer science teaching assistant. 
Your goal is to guide the student towards understanding why their submission failed the automated tests.

CRITICAL INSTRUCTIONS:
1. NEVER provide direct code solutions, syntax fixes, or rewrite the student's functions. 
2. Act strictly as a Socratic tutor. Ask leading questions. Explain the logical consequences of the code they wrote.
3. Use the provided Abstract Syntax Tree (AST) to understand their logic structure, but do not reference AST nodes to the student. Speak in terminology they understand.
4. If they failed a visual regression test, explain layout concepts (Box Model, Flexbox, Grid) rather than giving them exact px values.

CONTEXT:
{context}

{format_instructions}
`;

    const prompt = PromptTemplate.fromTemplate(promptTemplate);

    // Build the Langchain Runnable Sequence (Pipeline)
    const chain = RunnableSequence.from([
      prompt,
      this.llm,
      this.parser
    ]);

    try {
      // Execute the chain wrapping the parser instructions into the prompt payload
      const response = await chain.invoke({
        context: denseContextPayload,
        format_instructions: this.parser.getFormatInstructions(),
      });
      
      return response;
    } catch (error) {
      console.error("AI Generation Error: LLM failed to generate structured feedback.", error);
      // Fallback response guarantees UI does not break
      return {
        hint: "We ran into an issue generating your custom hint. Please review the assignment requirements and check your browser console for clues.",
        concept_reference: "General Debugging",
        encouragement: "Keep trying! Debugging is a core engineering skill."
      };
    }
  }
}
